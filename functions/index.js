// ==============================
// IMPORTS
// ==============================

const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const path = require("path");
const os = require("os");
const fs = require("fs");
const crypto = require("crypto");

const officeParser = require("officeparser");
const pdfParse = require("pdf-parse");
const { GoogleGenAI } = require("@google/genai");
const nodemailer = require("nodemailer");

// Node 18 (Firebase Functions v2) has fetch built-in — no import needed.

admin.initializeApp();
const db = admin.firestore();

// ==============================
// ERROR LOGGER
// Writes critical errors to Firestore errorLogs collection.
// Rate-limited: max 1 log per error signature per hour to prevent flooding.
// ==============================

async function logError({ source, error, uid = null, context = {} }) {
  try {
    const message = error?.message || String(error);
    // Signature = source + first 80 chars of message — groups duplicates together
    const signature = `${source}:${message.substring(0, 80)}`;
    const sigHash = Buffer.from(signature).toString('base64').substring(0, 40);
    const ref = db.collection('errorLogs').doc(sigHash);
    const snap = await ref.get();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (snap.exists && (now - (snap.data().lastSeen || 0)) < oneHour) {
      // Same error within the last hour — just increment count, don't create a new doc
      await ref.update({
        count: admin.firestore.FieldValue.increment(1),
        lastSeen: now,
      });
      return;
    }

    await ref.set({
      source,
      message,
      uid,
      context,
      count: snap.exists ? admin.firestore.FieldValue.increment(1) : 1,
      firstSeen: snap.exists ? snap.data().firstSeen : now,
      lastSeen: now,
      resolved: false,
    }, { merge: true });
  } catch (e) {
    // Never let the logger itself crash anything
    console.error('[logError] Failed to write error log:', e.message);
  }
}

// ==============================
// GEMINI FILES API HELPERS
// ==============================

/**
 * Uploads a local file to the Gemini Files API using a resumable upload.
 * Returns { fileUri, geminiFileName } once the file is ACTIVE.
 * Use this instead of inlineData for anything > ~4 MB (scanned PDFs, large images).
 */
async function uploadToGeminiFiles(localPath, mimeType, apiKey) {
  const fileSize = fs.statSync(localPath).size;
  const displayName = path.basename(localPath);

  // 1. Initiate resumable upload session
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(fileSize),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  );
  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`Gemini Files API init failed (${initRes.status}): ${err}`);
  }
  const uploadUrl = initRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini Files API: no upload URL in response");

  // 2. Upload the file bytes in a single chunk
  const fileBuffer = fs.readFileSync(localPath);
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
      "Content-Type": mimeType,
      "Content-Length": String(fileSize),
    },
    body: fileBuffer,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Gemini Files API upload failed (${uploadRes.status}): ${err}`);
  }
  const uploadData = await uploadRes.json();
  const fileUri      = uploadData.file?.uri;
  const geminiFileName = uploadData.file?.name; // e.g. "files/abc123"
  if (!fileUri) throw new Error("Gemini Files API: no URI in upload response");

  // 3. Poll until ACTIVE (usually immediate; large files may take a few seconds)
  let state = uploadData.file?.state;
  for (let i = 0; i < 12 && state !== "ACTIVE"; i++) {
    if (state === "FAILED") throw new Error("Gemini Files API: server failed to process file");
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${geminiFileName}?key=${apiKey}`
    );
    const statusData = await statusRes.json();
    state = statusData.state;
  }
  if (state !== "ACTIVE") throw new Error("Gemini Files API: file never became ACTIVE");

  console.log(`[GeminiFiles] Uploaded "${displayName}" (${(fileSize / 1024).toFixed(0)} KB) → ${fileUri}`);
  return { fileUri, geminiFileName };
}

/**
 * Deletes a previously uploaded Gemini file. Fire-and-forget — never throws.
 */
async function deleteGeminiFile(geminiFileName, apiKey) {
  if (!geminiFileName) return;
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${geminiFileName}?key=${apiKey}`,
      { method: "DELETE" }
    );
    console.log(`[GeminiFiles] Deleted ${geminiFileName}`);
  } catch (e) {
    console.warn(`[GeminiFiles] Cleanup failed for ${geminiFileName}:`, e.message);
  }
}

// ==============================
// SECRETS
// ==============================

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const PAYSTACK_SECRET = defineSecret("PAYSTACK_SECRET");
const GROQ_API_KEYS = defineSecret("GROQ_API_KEYS");
const YOUTUBE_API_KEY = defineSecret("YOUTUBE_API_KEY");
const gmailPasswordSecret = defineSecret("GMAIL_APP_PASSWORD");


// ==============================
// GROQ KEY MANAGER
// ==============================
//
// STAGGERED ROUND-ROBIN STRATEGY
// ────────────────────────────────
// Keys rotate on a time-based slot system. Each key "owns" a 2-minute
// window before passing to the next. This means:
//   - Keys are NEVER all hammered at the same time
//   - By the time we cycle back to key 1, its rate limit window has
//     partially or fully reset (Groq resets per minute)
//   - If the active key hits a 429, we skip to the next immediately
//     and honour Groq's retry-after header for the cooldown duration
//   - Jitter is added to cooldowns so concurrent Firebase instances
//     don't all retry the same key at exactly the same moment
//   - A key on cooldown is still skipped during rotation but recovers
//     automatically, so you always have fresh keys available

let groqKeyManager = null;
const KEY_SLOT_MS = 2 * 60 * 1000; // each key gets a 2-minute window

function initKeyManager(keysString) {
  if (!groqKeyManager) {
    const keys = keysString.split(",").map(k => k.trim()).filter(Boolean);
    console.log(`Loaded ${keys.length} Groq API keys (staggered round-robin).`);
    groqKeyManager = keys.map((key, index) => ({
      key,
      index,
      usage: 0,
      status: "active",
      cooldownUntil: 0,
    }));
  }
}

function getBestKey() {
  const now = Date.now();
  const n = groqKeyManager.length;

  // Recover any keys whose cooldown has expired
  groqKeyManager.forEach(k => {
    if (k.status === "cooldown" && now > k.cooldownUntil) {
      k.status = "active";
      console.log(`Key ${k.key.substring(0, 8)}... recovered from cooldown.`);
    }
  });

  // Determine which slot we're currently in (rotates every KEY_SLOT_MS)
  const slotIndex = Math.floor(now / KEY_SLOT_MS) % n;

  // Try keys starting from the current slot, wrapping around
  for (let i = 0; i < n; i++) {
    const candidate = groqKeyManager[(slotIndex + i) % n];
    if (candidate.status === "active") {
      return candidate;
    }
  }

  return null; // all keys on cooldown
}

function markKeyCooldown(keyString, retryAfterSeconds = 60) {
  const keyObj = groqKeyManager.find(k => k.key === keyString);
  if (keyObj) {
    keyObj.status = "cooldown";
    // Add jitter (±10s) so concurrent Firebase instances don't all
    // retry the same key at exactly the same time
    const jitterMs = Math.random() * 10_000;
    keyObj.cooldownUntil = Date.now() + (retryAfterSeconds * 1000) + jitterMs;
    console.log(`Key ${keyString.substring(0, 8)}... on cooldown for ${retryAfterSeconds}s (+jitter).`);
  }
}

// ==============================
// GROQ AI REQUESTOR
// ==============================

async function callGroq(payload) {
  let attempts = 0;
  const maxAttempts = groqKeyManager.length;

  while (attempts < maxAttempts) {
    const bestKeyObj = getBestKey();
    if (!bestKeyObj) {
      console.error("All Groq keys are on cooldown.");
      throw new Error("All API keys are currently rate-limited. Please try again shortly.");
    }

    bestKeyObj.usage += 1;
    console.log(`Using key ${bestKeyObj.key.substring(0, 8)}... (Usage: ${bestKeyObj.usage})`);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${bestKeyObj.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        // Honour Groq's actual retry-after instead of guessing
        const retryAfter = parseInt(response.headers.get("retry-after") || "60", 10);
        markKeyCooldown(bestKeyObj.key, retryAfter);
        attempts++;
        continue;
      }

      const data = await response.json();

      if (!response.ok) {
        console.error("Groq error:", data);
        throw new Error(data.error?.message || "Groq API failed");
      }

      return data.choices[0].message.content;

    } catch (error) {
      if (error.message.includes("Groq API failed")) throw error;
      // Network / parse error — move to next key
      console.warn(`Key ${bestKeyObj.key.substring(0, 8)}... network error:`, error.message);
      attempts++;
    }
  }

  console.error("All Groq keys failed.");
  throw new Error("All Groq API requests failed. Please try again later.");
}

async function askGroq(prompt, systemPrompt = null) {
  const defaultSystem = `You are MedExcel Tutor generating HIGH-YIELD MBBS exam questions.
          Output ONLY a raw JSON array of objects with no extra text.

          QUESTION STYLE — CRITICAL:
          - Ask DIRECT, FACTUAL questions. Example: "Where is the site of latency for VZV?" NOT "A 7-year-old presents with vesicular rash..."
          - NO clinical vignettes. NO patient scenarios. NO case presentations. NO demographics.
          - Questions must be short and sharp. Format: "What is...", "Which of the following...", "Where does...", "What is the mechanism of..."

          DIFFICULTY:
          - Mix of recall and 2nd-order application. Distractors must be plausible but wrong to someone who knows the material.

          EXPLANATION:
          - 1-2 sentences MAX. State only why the correct answer is right.`;

  const payload = {
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: systemPrompt || defaultSystem
      },
      { role: "user", content: prompt }
    ]
  };

  return await callGroq(payload);
}

// ==============================
// 1️⃣ ASK GEMINI (General)
// ==============================

exports.askGemini = onRequest(
  { secrets: [GEMINI_API_KEY], cors: true },
  async (req, res) => {
    try {
      if (req.method === "OPTIONS") return res.status(204).send("");

      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!idToken) return res.status(401).json({ error: "Unauthorized." });
      try { await admin.auth().verifyIdToken(idToken); }
      catch(e) { return res.status(401).json({ error: "Invalid token." }); }

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: req.body.prompt
      });

      res.json({ text: response.text });

    } catch (error) {
      console.error("ASK GEMINI ERROR:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ==============================
// 2️⃣ TEXT TO SPEECH (Natural Pace Update)
// ==============================

exports.generateQuizFromFile = onCall(
  { secrets: [GEMINI_API_KEY, GROQ_API_KEYS, YOUTUBE_API_KEY], memory: "1GiB", timeoutSeconds: 300 },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    initKeyManager(GROQ_API_KEYS.value());

    const uid = request.auth.uid;
    const userRef = db.collection("users").doc(uid);
    const { filePath, quizType, fileName, numberOfItems, topicFocus } = request.data;
    const bucket = admin.storage().bucket("medxcel.firebasestorage.app");
    const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
    let geminiFileRef = null;

    // ── Kick off file download in parallel with Firestore user fetch ─────────
    // Download (300–800 ms) overlaps with quota checks (~150 ms), saving time on every call.
    const downloadPromise = bucket.file(filePath).download({ destination: tempFilePath });
    const userSnap = await userRef.get();
    // ─────────────────────────────────────────────────────────────────────────

    let user = userSnap.exists ? userSnap.data() : {
      plan: "free",
      dailyUsage: 0,
      lastDailyReset: new Date().toISOString().split("T")[0]
    };

    user.plan = user.plan || "free";

    // ── Helper: delete the uploaded storage file on early rejection ───────────
    // The download starts before quota checks to save time. Any early throw must
    // clean up the storage file or it accumulates indefinitely and costs money.
    const _cleanupStorage = () => bucket.file(filePath).delete().catch(() => {});
    // ─────────────────────────────────────────────────────────────────────────

    // Auto-downgrade if subscription has expired
    if ((user.plan === "premium" || user.plan === "premium_trial") && user.subscriptionExpiry) {
      if (new Date() > new Date(user.subscriptionExpiry)) {
        console.log(`[Expiry] Downgrading uid:${uid} — expired ${user.subscriptionExpiry}`);
        user.plan = "free";
        await userRef.set({ plan: "free", subscriptionActive: false }, { merge: true });
      }
    }

    // ── Honour active referral boosts server-side ─────────────────────────────
    // week_premium / month_premium / ambassador rewards set referralBoostType on
    // the user doc but don't change user.plan. Without this check, those users
    // are still capped at 5 free generations/day even though the UI shows them
    // premium limits — making the referral reward effectively broken.
    const _boostType   = user.referralBoostType;
    const _boostExpiry = user.referralBoostExpiry;
    const _boostActive = _boostExpiry &&
      (_boostExpiry === 'permanent' || new Date(_boostExpiry) > new Date());
    if (_boostActive && user.plan === 'free' &&
        ['week_premium', 'month_premium', 'ambassador'].includes(_boostType)) {
      user.plan = 'premium'; // honour referral reward for quota + model selection
    }
    // ─────────────────────────────────────────────────────────────────────────

    const today = new Date().toISOString().split("T")[0];
    if (user.lastDailyReset !== today) {
      user.dailyUsage = 0;
      user.lastDailyReset = today;
      await userRef.set({ dailyUsage: 0, planUsed: 0, lastDailyReset: today }, { merge: true });
    }

    if (user.plan === "free" && user.dailyUsage >= 5) {
      _cleanupStorage();
      throw new HttpsError("resource-exhausted", "Free plan: 5 generations per day.");
    }
    if ((user.plan === "premium" || user.plan === "premium_trial") && user.dailyUsage >= 30) {
      _cleanupStorage();
      throw new HttpsError("resource-exhausted", "Premium plan: 30 generations per day.");
    }
    if (user.plan === "elite" && user.dailyUsage >= 50) {
      _cleanupStorage();
      throw new HttpsError("resource-exhausted", "Elite plan: 50 generations per day.");
    }

    // ── Device fingerprint check (free users only) ────────────────────────────
    // Premium/elite users are never blocked.
    // Whitelisted UIDs (set via admin dashboard) are never blocked.
    // Free users are checked against a device registry in Firestore.
    if (user.plan === "free") {
      const deviceId = request.data.deviceId;
      if (deviceId && typeof deviceId === "string" && deviceId.length > 4) {

        // Check whitelist first — whitelisted UIDs bypass device check entirely
        const whitelistSnap = await db.collection("deviceWhitelist").doc(uid).get();
        const isWhitelisted = whitelistSnap.exists;

        if (!isWhitelisted) {
          const deviceRef  = db.collection("deviceRegistry").doc(deviceId);
          const deviceSnap = await deviceRef.get();

          if (deviceSnap.exists) {
            const registeredUid = deviceSnap.data().uid;
            if (registeredUid && registeredUid !== uid) {
              console.log(`[DeviceCheck] Device ${deviceId} blocked — registered to uid:${registeredUid}, attempted by uid:${uid}`);
              _cleanupStorage();
              throw new HttpsError(
                "resource-exhausted",
                "This device is already linked to another account. Upgrade to Premium to use MedExcel on multiple accounts."
              );
            }
            deviceRef.set({ uid, lastSeen: Date.now() }, { merge: true }).catch(() => {});
          } else {
            deviceRef.set({ uid, firstSeen: Date.now(), lastSeen: Date.now() }).catch(() => {});
          }
        } else {
          console.log(`[DeviceCheck] UID ${uid} is whitelisted — device check skipped.`);
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    let maxItems = 15;
    if (user.plan === "premium" || user.plan === "premium_trial") maxItems = 50;
    if (user.plan === "elite") maxItems = 50;

    const itemCount = Math.min(Math.max(parseInt(numberOfItems) || 5, 1), maxItems);

    try {
      await downloadPromise;

      let extractedText = "";
      let isImage = false;
      let imagePart = null;

      const ext = path.extname(fileName).toLowerCase();
      const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".heic", ".gif"];

      if (imageExtensions.includes(ext)) {
        isImage = true;
        const buffer = fs.readFileSync(tempFilePath);

        let mimeType = "image/jpeg";
        if (ext === ".png") mimeType = "image/png";
        if (ext === ".webp") mimeType = "image/webp";
        if (ext === ".heic") mimeType = "image/heic";
        if (ext === ".gif") mimeType = "image/gif";

        imagePart = {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: mimeType
          }
        };
      } else if (ext === ".pdf") {
        const buffer = fs.readFileSync(tempFilePath);
        const data = await pdfParse(buffer);
        extractedText = data.text.trim();
        // Guard: fewer than 150 chars means the PDF has no real text layer
        // (scanned/image-based). Fail fast with a clear message rather than
        // trying to generate questions from garbage or near-empty content.
        if (extractedText.length > 0 && extractedText.length < 150) {
          throw new HttpsError(
            "invalid-argument",
            "This PDF appears to be scanned or image-based and couldn't be read. Please upload a text-based PDF or a Word document."
          );
        }
        if (!extractedText) {
          // Fully empty — upload to Gemini Files API for vision OCR
          console.log("[PDF] No text layer — uploading to Gemini Files API for vision OCR.");
          isImage = true;
          const { fileUri, geminiFileName: gfn } = await uploadToGeminiFiles(
            tempFilePath, "application/pdf", GEMINI_API_KEY.value()
          );
          geminiFileRef = gfn;
          imagePart = {
            fileData: {
              mimeType: "application/pdf",
              fileUri: fileUri,
            }
          };
        }
      } else if (ext === ".txt") {
        extractedText = fs.readFileSync(tempFilePath, "utf8");

        // YouTube placeholder — frontend writes "youtube:VIDEO_ID" as file content
        if (extractedText.trim().startsWith("youtube:")) {
          const videoId = extractedText.trim().replace("youtube:", "").trim();
          console.log(`[YouTube] Fetching content for video: ${videoId}`);
          let transcriptFetched = false;

          try {
            // Try captions list first
            const captionsRes = await fetch(
              `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${YOUTUBE_API_KEY.value()}`
            );
            const captionsData = await captionsRes.json();

            if (captionsRes.ok && captionsData.items && captionsData.items.length > 0) {
              const track = captionsData.items.find(t =>
                ["en","en-US","en-GB"].includes(t.snippet.language)
              ) || captionsData.items[0];

              const dlRes = await fetch(
                `https://www.googleapis.com/youtube/v3/captions/${track.id}?tfmt=srt&key=${YOUTUBE_API_KEY.value()}`,
                { headers: { Accept: "text/plain" } }
              );

              if (dlRes.ok) {
                const srt = await dlRes.text();
                extractedText = srt
                  .split("\n")
                  .filter(l => l.trim() && !/^\d+$/.test(l.trim()) && !/^\d{2}:\d{2}/.test(l.trim()))
                  .join(" ").replace(/\s+/g, " ").trim();
                transcriptFetched = extractedText.length > 50;
                console.log(`[YouTube] SRT transcript: ${extractedText.length} chars`);
              }
            }

            if (!transcriptFetched) {
              // Fallback: title + description
              const videoRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY.value()}`
              );
              const videoData = await videoRes.json();
              if (!videoData.items || videoData.items.length === 0) {
                throw new HttpsError("not-found", "Could not find this YouTube video. Check the URL and try again.");
              }
              const { title, description } = videoData.items[0].snippet;
              extractedText = `Title: ${title}\n\nDescription:\n${description}`;
              console.log(`[YouTube] Title+description fallback: ${extractedText.length} chars`);
            }

            if (!extractedText || extractedText.length < 50) {
              throw new HttpsError("invalid-argument", "This video doesn't have enough content. Try a video with captions or a detailed description.");
            }

          } catch (ytErr) {
            if (ytErr instanceof HttpsError) throw ytErr;
            throw new HttpsError("internal", "Failed to fetch YouTube content: " + ytErr.message);
          }
        }

      } else if ([".docx", ".pptx", ".xlsx", ".odt", ".odp", ".ods", ".rtf", ".doc", ".ppt"].includes(ext)) {
        extractedText = await officeParser.parseOffice(tempFilePath);
      } else {
        throw new HttpsError("invalid-argument", "Unsupported file type.");
      }

      // 1. DYNAMIC FORMATTING
      const formatInstruction = quizType.toLowerCase().includes("flashcard")
        ? `Format for Flashcards ONLY: { "question": "...", "answer": "...", "explanation": "..." }`
        : `Format for Multiple Choice ONLY: { "question": "...", "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, "answer": "...", "explanation": "..." }`;

      // 2. STYLE-BASED SYSTEM RULES
      const questionStyle = request.data.topicFocus || 'direct';

      const styleGuides = {
        direct: `QUESTION STYLE: DIRECT & FACTUAL
- Ask short, direct questions. NO patient scenarios, NO vignettes, NO demographics.
- Good: "Where does VZV establish latency?" / "Which enzyme is deficient in Lesch-Nyhan syndrome?"
- BAD: "A 45-year-old presents with..." — NEVER write this.
- Start with: "What is...", "Which of the following...", "Where does...", "Which drug..."`,

        vignette: `QUESTION STYLE: CLINICAL VIGNETTE
- Start with a 1-2 sentence patient scenario then ask the question.
- Keep scenario concise: age, key symptoms, relevant findings only. No long case studies.
- Example: "A 7-year-old presents with vesicular rash on trunk. Which virus is responsible?"`,

        mechanism: `QUESTION STYLE: MECHANISM BASED
- Focus exclusively on HOW and WHY things work.
- Test mechanisms of action, pathophysiology, receptor pharmacology, enzyme functions.
- Example: "What is the mechanism by which ACE inhibitors reduce blood pressure?"
- NO simple recall — every question must test underlying mechanisms.`,

        mixed: `QUESTION STYLE: MIXED
- Freely mix direct questions, short vignettes, and mechanism questions.
- Aim for variety: roughly 40% direct, 30% vignette, 30% mechanism.`
      };

      const selectedStyleGuide = styleGuides[questionStyle] || styleGuides.direct;

      const systemInstruction = `You are MedExcel Tutor generating HIGH-YIELD MBBS exam questions from the provided source material.

CRITICAL RULES:
1. STRICT JSON: Output ONLY a raw JSON array. No markdown, no extra text.
2. NO LAZY OPTIONS: NEVER use "All of the above", "None of the above", or "Both A and B".
3. Distractors must be plausible and medically relevant.

${selectedStyleGuide}

EXPLANATION:
- MAXIMUM 2 sentences. State only why the correct answer is right. Nothing else.`;

      const configParams = { systemInstruction };
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

      // ── PARALLEL BATCH GENERATION ──────────────────────────────────────────
      // Smaller batches complete faster individually and all run concurrently.
      // 3 batches for 26+ items, 2 for 11–25, 1 for 10 and under.
      // Images always use a single batch (can't split a file reference).
      const batchCount = isImage ? 1 : itemCount > 25 ? 3 : itemCount > 10 ? 2 : 1;
      const baseSize   = Math.floor(itemCount / batchCount);
      const remainder  = itemCount % batchCount;
      const batchSizes = Array.from({ length: batchCount }, (_, i) =>
        baseSize + (i < remainder ? 1 : 0)
      );

      const contextLimit = user.plan === "free" ? 8000 : 25000;
      const sourceText = isImage ? null : extractedText.substring(0, contextLimit);
      const useGroq = (user.plan === "free" || user.plan === "premium_trial") && !isImage;

      async function runBatch(count) {
        const batchPrompt = isImage
          ? `Generate EXACTLY ${count} high-yield MBBS ${quizType} based on the provided file.
${topicFocus ? `Focus specifically on: ${topicFocus}.` : ""}
Carefully read and extract all content — this may be a medical image, a scanned PDF, a photographed page, or handwritten notes. Read every page thoroughly.
Return ONLY a raw JSON array of objects.
${formatInstruction}`
          : `Generate EXACTLY ${count} high-yield MBBS ${quizType} based on the text below.
${topicFocus ? `Focus specifically on: ${topicFocus}.` : ""}
Return ONLY a raw JSON array of objects.
${formatInstruction}

SOURCE TEXT:
${sourceText}`;

        if (useGroq) {
          try {
            return await askGroq(batchPrompt, systemInstruction);
          } catch (groqError) {
            if (user.plan === "premium_trial") throw new HttpsError("internal", "Generation failed. Please try again.");
            console.error("Groq batch failed, falling back to Gemini:", groqError);
            const result = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: batchPrompt, config: configParams });
            return result.text;
          }
        } else {
          const parts = [{ text: batchPrompt }];
          if (isImage) parts.push(imagePart);
          const result = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: parts, config: configParams });
          return result.text;
        }
      }

      // Fire all batches in parallel
      const batchResults = await Promise.all(batchSizes.map(count => runBatch(count)));

      // Parse and merge
      let allCards = [];
      for (const raw of batchResults) {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error("AI Output Failure. Raw response:", raw);
          throw new HttpsError("internal", "AI failed to format data correctly. Please try again.");
        }
        allCards = allCards.concat(JSON.parse(jsonMatch[0]));
      }

      // Deduplicate (parallel batches can occasionally produce the same question)
      const seen = new Set();
      const generatedCards = allCards.filter(card => {
        const key = (card.question || card.front || '').trim().toLowerCase().substring(0, 60);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // ── Parallelize Firestore writes + all cleanup — none depend on each other ──
      await Promise.all([
        db.collection("quizzes").add({
          userId: uid,
          quizType,
          planUsed: user.plan || "free",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          cards: generatedCards
        }),
        userRef.set({ dailyUsage: admin.firestore.FieldValue.increment(1), planUsed: admin.firestore.FieldValue.increment(1) }, { merge: true }),
        (fs.existsSync(tempFilePath) ? Promise.resolve(fs.unlinkSync(tempFilePath)) : Promise.resolve()),
        bucket.file(filePath).delete().catch(e => console.log("[Cleanup] File already deleted or not found:", e.message)),
        deleteGeminiFile(geminiFileRef, GEMINI_API_KEY.value()),
      ]);
      // ─────────────────────────────────────────────────────────────────────

      return { success: true, cards: generatedCards };

    } catch (error) {
      console.error("QUIZ ERROR:", error);
      await logError({ source: 'generateQuizFromFile', error, uid: request.auth?.uid, context: { quizType: request.data?.quizType, fileName: request.data?.fileName } });
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      await deleteGeminiFile(geminiFileRef, GEMINI_API_KEY.value());
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message);
    }
  }
);

// ==============================
// 5️⃣ VERIFY PAYSTACK
// ==============================

// Maps Paystack plan codes → MedXcel plan + billing cycle
const PLAN_MAP = {
  'PLN_jcgt20vstjvnf0p': { plan: 'premium',       days: 30,  label: 'Monthly',   trial: false },
  'PLN_kjs8v6kzn39cjnp': { plan: 'premium',       days: 365, label: 'Yearly',    trial: false },
  'PLN_yegmmewhvf8dw5p': { plan: 'premium_trial', days: 30,  label: 'Trial',     trial: true  },
  'PLN_zkdzu95bbxthyn2': { plan: 'premium',       days: 90,  label: 'Quarterly', trial: false },
};

exports.verifySubscriptionPayment = onCall(
  { secrets: [PAYSTACK_SECRET, gmailPasswordSecret] },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    const { reference } = request.data;
    const uid = request.auth.uid;

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET.value()}` } }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      throw new HttpsError("failed-precondition", "Payment failed.");
    }

    // ── Match plan by plan code (not amount) ─────────────────────────────
    const planCode = verifyData.data?.plan?.plan_code || verifyData.data?.plan;
    let planInfo = PLAN_MAP[planCode];

    if (!planInfo) {
      // Graceful fallback: try matching by amount for legacy one-off payments
      const amount   = verifyData.data.amount;
      const currency = verifyData.data.currency || 'NGN';
      const LEGACY = {
        NGN: { 199900: { plan:'premium', days:30 }, 1499900: { plan:'premium', days:365 },
               25000: { plan:'premium_trial', days:30 }, 499900: { plan:'premium', days:90 } }
      };
      const legacyMatch = LEGACY[currency]?.[amount];
      if (!legacyMatch) {
        console.warn(`[Verify] Unrecognized plan code "${planCode}" and amount ${amount} ${currency}`);
        throw new HttpsError("failed-precondition", "Unrecognized payment. Contact support.");
      }
      planInfo = legacyMatch;
    }

    // ── Trial eligibility check ───────────────────────────────────────────
    const userRef  = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() || {};

    if (planInfo.trial && userData.trialUsed) {
      throw new HttpsError(
        "failed-precondition",
        "You have already used the trial offer. Please choose a regular plan."
      );
    }

    const { plan: assignedPlan, days: durationDays } = planInfo;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + durationDays);

    // ── Store everything Paystack gives us at verification time ──────────
    // subscription_code arrives later via subscription.create webhook; store
    // customer_code now so renewals can look up this user without metadata.
    const customerCode    = verifyData.data?.customer?.customer_code || null;
    const subscriptionCode = verifyData.data?.subscription_code || null; // may be null here

    const writePayload = {
      plan: assignedPlan,
      subscriptionActive: true,
      subscriptionExpiry: expiry.toISOString(),
      planRef: verifyData.data.reference,
      planCode: planCode || null,
      planUpdatedAt: new Date().toISOString(),
      dailyUsage: 0,
      planUsed: 0,
      subscriptionCancelled: false,
      paystackCustomerCode: customerCode,
    };
    if (subscriptionCode) writePayload.paystackSubscriptionCode = subscriptionCode;
    if (planInfo.trial)   writePayload.trialUsed = true;

    await userRef.set(writePayload, { merge: true });

    // ── If trial: auto-disable the Paystack subscription once it arrives ─
    // We don't want the ₦250 trial to auto-renew. The webhook will handle
    // disabling it when subscription.create fires (see paystackWebhook).
    // Flag it here so the webhook knows to cancel it.
    if (planInfo.trial) {
      await userRef.set({ trialAutoCancel: true }, { merge: true });
    }

    // ── Send premium congratulations email ───────────────────────────────
    try {
      const customerEmail = verifyData.data?.customer?.email;
      const customerName  = verifyData.data?.customer?.first_name
        || (customerEmail ? customerEmail.split("@")[0] : null);

      if (customerEmail) {
        const premTransporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: "medexcel.app@gmail.com", pass: gmailPasswordSecret.value() },
        });

        const planLabel    = assignedPlan === "premium_trial" ? "Trial" : "Premium";
        const durationText = durationDays === 365 ? "1 year"
                           : durationDays === 90  ? "3 months"
                           : "30 days";
        const expiryFormatted = expiry.toLocaleDateString("en-GB", {
          day: "numeric", month: "long", year: "numeric",
        });

        await premTransporter.sendMail({
          from: '"MedExcel" <medexcel.app@gmail.com>',
          to: customerEmail,
          subject: `You're now a MedExcel Premium member! ⭐`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

              <div style="background:linear-gradient(135deg,#78350f,#d97706,#fbbf24);padding:36px 32px 32px;text-align:center;">
                <img src="https://medxcel.web.app/logo.png" alt="MedExcel" style="width:56px;height:56px;border-radius:14px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;">
                <div style="font-size:40px;margin-bottom:10px;">⭐</div>
                <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em;">You're Premium Now!</h1>
                <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:6px 0 0;">MedExcel ${planLabel} · ${durationText}</p>
              </div>

              <div style="padding:32px;">
                <p style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 8px;">Congratulations, ${customerName || "there"}! 🎉</p>
                <p style="color:#475569;font-size:14px;line-height:1.75;margin:0 0 24px;">
                  Your MedExcel ${planLabel} subscription is now active. You've just unlocked the full power of the platform — use it well.
                </p>

                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
                  <p style="font-size:12px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Your Plan Details</p>
                  <table style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="font-size:13px;color:#78350f;font-weight:600;padding:5px 0;width:40%;">Plan</td>
                      <td style="font-size:13px;color:#1e293b;font-weight:700;padding:5px 0;">MedExcel ${planLabel}</td>
                    </tr>
                    <tr style="border-top:1px solid #fde68a;">
                      <td style="font-size:13px;color:#78350f;font-weight:600;padding:5px 0;">Duration</td>
                      <td style="font-size:13px;color:#1e293b;font-weight:700;padding:5px 0;">${durationText}</td>
                    </tr>
                    <tr style="border-top:1px solid #fde68a;">
                      <td style="font-size:13px;color:#78350f;font-weight:600;padding:5px 0;">Expires</td>
                      <td style="font-size:13px;color:#1e293b;font-weight:700;padding:5px 0;">${expiryFormatted}</td>
                    </tr>
                  </table>
                </div>

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
                  <p style="font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">What's Unlocked</p>
                  <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                    <span style="color:#d97706;font-weight:800;flex-shrink:0;">✓</span>
                    <span style="font-size:13px;color:#334155;line-height:1.5;">50 AI generations per day (was 5 on free)</span>
                  </div>
                  <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                    <span style="color:#d97706;font-weight:800;flex-shrink:0;">✓</span>
                    <span style="font-size:13px;color:#334155;line-height:1.5;">Up to 50 questions or cards per generation</span>
                  </div>
                  <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                    <span style="color:#d97706;font-weight:800;flex-shrink:0;">✓</span>
                    <span style="font-size:13px;color:#334155;line-height:1.5;">Priority AI processing — faster results</span>
                  </div>
                  <div style="display:flex;align-items:flex-start;gap:10px;">
                    <span style="color:#d97706;font-weight:800;flex-shrink:0;">✓</span>
                    <span style="font-size:13px;color:#334155;line-height:1.5;">Premium profile badge &amp; golden leaderboard ring</span>
                  </div>
                </div>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="https://medxcel.web.app" style="display:inline-block;background:linear-gradient(135deg,#d97706,#f59e0b);color:#ffffff;padding:14px 32px;border-radius:9999px;font-size:15px;font-weight:700;text-decoration:none;">
                    Go Study Now →
                  </a>
                </div>

                <p style="font-size:13px;color:#64748b;line-height:1.65;margin:0;">
                  Your subscription ${planInfo.trial ? 'expires on' : 'renews automatically. Current period ends'} <strong>${expiryFormatted}</strong>.${planInfo.trial ? ' This is a one-time trial — no auto-renewal.' : ' Cancel anytime from your profile.'}
                </p>
              </div>

              <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
                <p style="font-size:11px;color:#94a3b8;margin:0;">&copy; MedExcel · Receipt for your premium subscription.</p>
              </div>
            </div>
          `,
        });

        console.log(`[Premium] Congrats email sent to ${customerEmail}`);
      }
    } catch (emailErr) {
      // Non-fatal — never block the payment response
      console.warn("[Premium] Congrats email failed:", emailErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────

    return { success: true, plan: assignedPlan };
  }
);

// ==============================
// 6️⃣ PAYSTACK WEBHOOK
// ==============================

exports.paystackWebhook = onRequest(
  { secrets: [PAYSTACK_SECRET] },
  async (req, res) => {

    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET.value())
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event    = req.body;
    const data     = event.data;
    const eventType = event.event;

    // ── Helper: find user by subscription code or customer code ────────────
    async function findUserByPaystack(subscriptionCode, customerCode) {
      if (subscriptionCode) {
        const snap = await db.collection("users")
          .where("paystackSubscriptionCode", "==", subscriptionCode)
          .limit(1).get();
        if (!snap.empty) return snap.docs[0];
      }
      if (customerCode) {
        const snap = await db.collection("users")
          .where("paystackCustomerCode", "==", customerCode)
          .limit(1).get();
        if (!snap.empty) return snap.docs[0];
      }
      return null;
    }

    // ── Helper: disable a Paystack subscription ────────────────────────────
    async function disablePaystackSubscription(subscriptionCode, emailToken) {
      if (!subscriptionCode || !emailToken) return;
      try {
        await fetch("https://api.paystack.co/subscription/disable", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET.value()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
        });
        console.log(`[Webhook] Disabled subscription ${subscriptionCode}`);
      } catch (e) {
        console.warn("[Webhook] Failed to disable subscription:", e.message);
      }
    }

    try {

      // ── subscription.create — store subscription_code + email_token ───────
      if (eventType === "subscription.create") {
        const subscriptionCode = data.subscription_code;
        const emailToken       = data.email_token;
        const customerCode     = data.customer?.customer_code;
        const uid              = data.metadata?.uid;

        // Find the user: prefer uid from metadata, fallback to customer lookup
        let userDoc = null;
        if (uid) {
          const snap = await db.collection("users").doc(uid).get();
          if (snap.exists) userDoc = snap;
        }
        if (!userDoc) userDoc = await findUserByPaystack(null, customerCode);

        if (userDoc) {
          await userDoc.ref.set({
            paystackSubscriptionCode: subscriptionCode,
            paystackEmailToken: emailToken,
          }, { merge: true });
          console.log(`[Webhook] subscription.create stored for uid:${userDoc.id}`);

          // If this user flagged trial auto-cancel, disable it immediately
          if (userDoc.data().trialAutoCancel) {
            await disablePaystackSubscription(subscriptionCode, emailToken);
            await userDoc.ref.set({
              subscriptionCancelled: true,
              subscriptionCancelledAt: new Date().toISOString(),
              trialAutoCancel: false, // clear the flag
            }, { merge: true });
            console.log(`[Webhook] Trial auto-cancelled for uid:${userDoc.id}`);
          }
        } else {
          console.warn("[Webhook] subscription.create: could not find user, customerCode:", customerCode);
        }
      }

      // ── charge.success — initial payment OR recurring renewal ─────────────
      else if (eventType === "charge.success") {
        const planCode         = data.plan?.plan_code || data.plan;
        const subscriptionCode = data.subscription_code;
        const customerCode     = data.customer?.customer_code;
        const uid              = data.metadata?.uid;

        // Map plan code to MedXcel plan
        const planInfo = PLAN_MAP[planCode];

        if (!planInfo) {
          // Legacy fallback: amount-based matching for old direct charges
          const amount   = data.amount;
          const currency = data.currency || 'NGN';
          const LEGACY = {
            NGN: { 199900: { plan:'premium', days:30 }, 1499900: { plan:'premium', days:365 },
                   25000: { plan:'premium_trial', days:30 }, 499900: { plan:'premium', days:90 } }
          };
          const legacy = LEGACY[currency]?.[amount];
          if (!legacy || !uid) {
            console.log("[Webhook] charge.success: no plan match and no uid — skipping:", planCode, data.amount);
            return res.status(200).send("OK");
          }
          // Legacy one-off: just ensure user is still upgraded
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + legacy.days);
          await db.collection("users").doc(uid).set({
            plan: legacy.plan, subscriptionActive: true,
            subscriptionExpiry: expiry.toISOString(),
            planRef: data.reference, planUpdatedAt: new Date().toISOString(),
          }, { merge: true });
          console.log(`[Webhook] Legacy charge.success: uid:${uid} → ${legacy.plan}`);
          return res.status(200).send("OK");
        }

        // ── Find the user ─────────────────────────────────────────────────
        let userDoc = null;
        if (uid) {
          const snap = await db.collection("users").doc(uid).get();
          if (snap.exists) userDoc = snap;
        }
        if (!userDoc) userDoc = await findUserByPaystack(subscriptionCode, customerCode);

        if (!userDoc) {
          console.error("[Webhook] charge.success: cannot find user. planCode:", planCode, "customerCode:", customerCode);
          return res.status(200).send("OK — user not found");
        }

        const userData    = userDoc.data();
        const currentExpiry = userData.subscriptionExpiry ? new Date(userData.subscriptionExpiry) : new Date();
        const now         = new Date();

        // Extend from current expiry if it's still in the future (credit renewal correctly)
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const newExpiry = new Date(baseDate);
        newExpiry.setDate(newExpiry.getDate() + planInfo.days);

        await userDoc.ref.set({
          plan: planInfo.plan,
          subscriptionActive: true,
          subscriptionExpiry: newExpiry.toISOString(),
          planRef: data.reference,
          planCode: planCode,
          planUpdatedAt: new Date().toISOString(),
          subscriptionCancelled: false,
          paystackCustomerCode: customerCode || userData.paystackCustomerCode || null,
          ...(subscriptionCode ? { paystackSubscriptionCode: subscriptionCode } : {}),
        }, { merge: true });

        console.log(`[Webhook] ✅ charge.success: uid:${userDoc.id} plan:"${planInfo.plan}" expires:${newExpiry.toISOString()}`);
      }

      // ── subscription.disable — user cancelled or payment failed too many times
      else if (eventType === "subscription.disable" || eventType === "invoice.payment_failed") {
        const subscriptionCode = data.subscription_code;
        const customerCode     = data.customer?.customer_code;

        const userDoc = await findUserByPaystack(subscriptionCode, customerCode);
        if (userDoc) {
          // Don't wipe their plan immediately — keep access until subscriptionExpiry
          // The daily checkExpiredSubscriptions job will downgrade when it expires.
          await userDoc.ref.set({
            subscriptionCancelled: true,
            subscriptionCancelledAt: new Date().toISOString(),
          }, { merge: true });
          console.log(`[Webhook] ${eventType}: marked cancelled for uid:${userDoc.id}`);
        } else {
          console.warn(`[Webhook] ${eventType}: could not find user, subscriptionCode:${subscriptionCode}`);
        }
      }

    } catch (err) {
      console.error(`[Webhook] Error handling ${eventType}:`, err);
    }

    return res.status(200).send("OK");
  }
);

// ==============================
// 7️⃣ VIDEO TUTOR (YouTube + Groq)
// ==============================

exports.findBestVideo = onCall(
  { secrets: [GROQ_API_KEYS, YOUTUBE_API_KEY], memory: "256MiB", cors: true },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    initKeyManager(GROQ_API_KEYS.value());

    const topic = request.data.topic;
    if (!topic) {
      throw new HttpsError("invalid-argument", "Topic string is required.");
    }

    try {
      const searchQuery = encodeURIComponent(`${topic} medical lecture usmle`);
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&maxResults=5&key=${YOUTUBE_API_KEY.value()}`;

      const ytResponse = await fetch(ytUrl);
      const ytData = await ytResponse.json();

      if (!ytResponse.ok) {
        throw new Error(ytData.error?.message || "YouTube API search failed.");
      }

      if (!ytData.items || ytData.items.length === 0) {
        throw new HttpsError("not-found", "No relevant medical videos found for this topic.");
      }

      const videos = ytData.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        description: item.snippet.description
      }));

      const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert medical professor curating content for MBBS students."
          },
          {
            role: "user",
            content: `
              Review these 5 educational videos on "${topic}":
              ${JSON.stringify(videos, null, 2)}
              
              Select the single best video for deep, exam-standard understanding. Focus on clarity, pathophysiological mechanisms, and high-yield board relevance.
              
              Return ONLY raw JSON in this exact format. Do not use markdown blocks outside the JSON:
              {
                "title": "video title",
                "videoId": "video ID",
                "channel": "channel name",
                "reason": "Concise, objective explanation of why this video is the best for mastering this medical topic."
              }
            `
          }
        ]
      };

      const rawText = await callGroq(payload);

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid AI response format from Groq.");
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error("FIND VIDEO ERROR:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message || "Failed to retrieve and analyze video content.");
    }
  }
);

// ==============================
// 8️⃣ GENERATE AI WRAPPER
// ==============================

exports.generateAI = onRequest(
  { secrets: [GROQ_API_KEYS], cors: true },
  async (req, res) => {
    try {
      if (req.method === "OPTIONS") return res.status(204).send("");

      // Verify Firebase ID token — endpoint burns Groq quota so must be authenticated
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!idToken) return res.status(401).json({ error: "Unauthorized." });
      try { await admin.auth().verifyIdToken(idToken); }
      catch(e) { return res.status(401).json({ error: "Invalid or expired token." }); }

      initKeyManager(GROQ_API_KEYS.value());

      const { prompt, systemPrompt, model } = req.body;
      if (!prompt) return res.status(400).json({ error: "Missing prompt" });

      const payload = {
        model: model || "llama-3.3-70b-versatile",
        messages: []
      };

      if (systemPrompt) {
        payload.messages.push({ role: "system", content: systemPrompt });
      }
      
      payload.messages.push({ role: "user", content: prompt });

      const responseText = await callGroq(payload);
      
      res.json({ text: responseText });

    } catch (error) {
      console.error("GENERATE AI ERROR:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ==============================
// 9️⃣ SEND RESET EMAIL
// ==============================

exports.sendResetEmail = onRequest(
  { secrets: [gmailPasswordSecret], cors: true },
  async (req, res) => {
    if (req.method === "OPTIONS") return res.status(204).send("");

    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Missing email address." });

      // Token is optional — profile page sends one, forgot-password page cannot (user not logged in)
      // Unauthenticated callers get a stricter rate limit (1/hr vs 12hr for authenticated)
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      let isAuthed = false;
      if (idToken) {
        try { await admin.auth().verifyIdToken(idToken); isAuthed = true; }
        catch(e) { /* invalid token — treat as unauthenticated */ }
      }

      // Rate limit by hashed email address
      const rateLimitMs = isAuthed ? 12 * 3600000 : 3600000; // 12h if authed, 1h if not
      const rlKey = Buffer.from(email.toLowerCase()).toString("base64").slice(0, 40);
      const rlRef = db.collection("resetEmailLog").doc(rlKey);
      const rlSnap = await rlRef.get();
      const now = Date.now();
      if (rlSnap.exists && (now - (rlSnap.data().lastSent || 0)) < rateLimitMs) {
        return res.status(429).json({ error: "Too many requests. Please wait before requesting another reset link." });
      }
      await rlRef.set({ lastSent: now }, { merge: true });

      const resetLink = await admin.auth().generatePasswordResetLink(email);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "medexcel.app@gmail.com",
          pass: gmailPasswordSecret.value(),
        },
      });

      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; border: 1px solid #eeeeee; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://medxcel.web.app/logo.png" alt="MedExcel Logo" style="width: 60px; height: auto; border-radius: 12px; display: inline-block;" />
          </div>
          <h2 style="color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">MedExcel Password Reset</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your MedExcel account associated with this email address.</p>
          <p>You can securely reset your password by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 14px;">If the button does not work, copy and paste the following link into your browser:</p>
          <p style="font-size: 14px; word-break: break-all; color: #64748b;"><a href="${resetLink}" style="color: #2563eb;">${resetLink}</a></p>
          <p style="font-size: 14px; margin-top: 30px;">If you did not request a password reset, you can safely ignore this email. Your account remains secure.</p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; MedExcel. All rights reserved.</p>
        </div>
      `;

      await transporter.sendMail({
        from: '"MedExcel" <medexcel.app@gmail.com>',
        to: email,
        subject: "Reset your MedExcel password",
        html: htmlBody,
      });

      return res.status(200).json({ success: true, message: "Reset email sent successfully." });

    } catch (error) {
      console.error("SEND RESET EMAIL ERROR:", error);
      return res.status(500).json({ error: "Failed to send password reset email." });
    }
  }
);

// ==============================
// 🔟 PUSH NOTIFICATION SYSTEM
// ==============================

exports.saveToken = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { token, userId } = req.body;

    // Verify Firebase ID token and ensure caller matches userId
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Unauthorized." });
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(idToken); }
    catch(e) { return res.status(401).json({ error: "Invalid token." }); }
    if (decoded.uid !== userId) return res.status(403).json({ error: "Forbidden." });

    if (!token || !userId) {
      console.error("[saveToken] Missing token or userId");
      return res.status(400).json({ error: "Missing token or userId" });
    }

    // FIX: Write token to the `tokens` array field on the user document.
    // Previously wrote to a subcollection which sendToUserById and dailyReminder never read.
    // arrayUnion ensures no duplicates if the same token is registered again.
    await db.collection("users").doc(userId).set(
      { tokens: admin.firestore.FieldValue.arrayUnion(token) },
      { merge: true }
    );

    console.log("[saveToken] ✅ Token saved to users/" + userId + ".tokens array");
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("[saveToken] ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
});

exports.sendNotification = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Unauthorized." });
    try { await admin.auth().verifyIdToken(idToken); }
    catch(e) { return res.status(401).json({ error: "Invalid token." }); }

    const { token, title, body, userId } = req.body;

    if (!token) {
      return res.status(400).json({ error: "No token provided" });
    }

    await admin.messaging().send({
      token: token,
      notification: {
        title: title,
        body: body
      },
      android: {
        priority: "high",
        notification: {
          icon: "ic_stat_logo",
          image: "https://medxcel.web.app/logo.png"
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Notification sent"
    });

  } catch (error) {
    console.error("NOTIFICATION ERROR:", error);

    if (error.code === "messaging/registration-token-not-registered" || error.code === "messaging/invalid-registration-token") {
      console.log("Invalid token:", req.body.token);

      // Remove stale token from the tokens array field on the user document
      const userId = req.body.userId;
      const token = req.body.token;
      if (userId && userId !== "unknown" && token) {
        await db.collection("users")
          .doc(userId)
          .update({ tokens: admin.firestore.FieldValue.arrayRemove(token) })
          .catch(() => {});
      }
    }

    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

exports.sendToUserById = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login required.");
  }

  const { userId, title, body, data } = request.data;
  if (!userId || !title || !body) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  try {
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User not found.");
    }

    const userData = userSnap.data();
    const fcmTokens = userData.tokens || [];

    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) {
      return { success: false, message: "No tokens found for user." };
    }

    const payload = {
      notification: { title, body },
      android: { 
        priority: "high",
        notification: {
          icon: "ic_stat_logo",
          image: "https://medxcel.web.app/logo.png"
        }
      },
      tokens: fcmTokens
    };

    if (data) {
      payload.data = data;
    }

    const response = await admin.messaging().sendEachForMulticast(payload);
    const tokensToRemove = [];

    response.responses.forEach((res, index) => {
      if (!res.success) {
        const errorCode = res.error?.code;
        if (
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/invalid-registration-token"
        ) {
          tokensToRemove.push(fcmTokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await userRef.update({
        tokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
      });
    }

    return { success: true, response, removedTokens: tokensToRemove.length };
  } catch (error) {
    console.error("NOTIFICATION ERROR:", error);
    throw new HttpsError("internal", error.message);
  }
});

// ── Shared helper: send multicast + clean up stale tokens ──────────────────
async function sendMulticast(tokens, tokenToUserMap, title, body) {
  if (tokens.length === 0) return;
  const payload = {
    notification: { title, body },
    android: {
      priority: "high",
      notification: { icon: "ic_stat_logo", image: "https://medxcel.web.app/logo.png" }
    }
  };
  const tokensToRemove = [];
  const batchSize = 500;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const resp = await admin.messaging().sendEachForMulticast({ ...payload, tokens: batch });
    resp.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code;
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          tokensToRemove.push({ userId: tokenToUserMap.get(batch[idx]), token: batch[idx] });
        }
      }
    });
  }
  if (tokensToRemove.length > 0) {
    const cleanupMap = {};
    tokensToRemove.forEach(({ userId, token }) => { if (!cleanupMap[userId]) cleanupMap[userId] = []; cleanupMap[userId].push(token); });
    const fsBatch = db.batch();
    for (const [uid, tks] of Object.entries(cleanupMap)) {
      fsBatch.update(db.collection("users").doc(uid), { tokens: admin.firestore.FieldValue.arrayRemove(...tks) });
    }
    await fsBatch.commit();
    console.log(`Cleaned up ${tokensToRemove.length} stale tokens.`);
  }
}

// ── Helper: get all users who have tokens ────────────────────────────────
async function getAllUsersWithTokens() {
  const snap = await db.collection("users").get();
  const tokens = [], tokenToUserMap = new Map(), userDataMap = new Map();
  snap.forEach(doc => {
    const data = doc.data();
    if (data.tokens && Array.isArray(data.tokens) && data.tokens.length > 0) {
      data.tokens.forEach(t => { tokens.push(t); tokenToUserMap.set(t, doc.id); });
      userDataMap.set(doc.id, data);
    }
  });
  return { tokens, tokenToUserMap, userDataMap };
}

// ── 1. Morning motivation — 8 AM every day ──────────────────────────────
exports.morningReminder = onSchedule("0 8 * * *", async () => {
  try {
    const messages = [
      { title: "Good morning! 🌅", body: "Start your day with a quick study session. Your future self will thank you." },
      { title: "Rise and study! ⚡", body: "Top students review their notes every morning. You've got 5 minutes?" },
      { title: "Morning check-in 📚", body: "New day, new knowledge. Tap to review your flashcards before the day gets busy." },
      { title: "Beat the curve! 🎯", body: "Most students study at night. Study now and stay ahead of the pack." },
    ];
    const msg = messages[new Date().getDay() % messages.length];
    const { tokens, tokenToUserMap } = await getAllUsersWithTokens();
    await sendMulticast(tokens, tokenToUserMap, msg.title, msg.body);
    console.log(`Morning reminder sent to ${tokens.length} tokens.`);
  } catch (e) { console.error("MORNING REMINDER ERROR:", e); }
});

// ── 2. Evening streak protection — 8 PM every day ───────────────────────
exports.eveningReminder = onSchedule("0 20 * * *", async () => {
  try {
    const today = new Date().toDateString();
    const { tokens, tokenToUserMap, userDataMap } = await getAllUsersWithTokens();

    // Split: users who already checked in today vs those who haven't
    const checkedIn = [], notCheckedIn = [], tokenToUserChecked = new Map(), tokenToUserNot = new Map();

    userDataMap.forEach((data, uid) => {
      const lastCheckIn = data.lastCheckIn;
      const checkedToday = lastCheckIn === today;
      if (data.tokens) {
        data.tokens.forEach(t => {
          if (checkedToday) { checkedIn.push(t); tokenToUserChecked.set(t, uid); }
          else { notCheckedIn.push(t); tokenToUserNot.set(t, uid); }
        });
      }
    });

    // Streak at-risk users — urgent message
    if (notCheckedIn.length > 0) {
      await sendMulticast(notCheckedIn, tokenToUserNot,
        "⚠️ Streak at risk!",
        "You haven't studied today. Log in now to protect your streak before midnight!"
      );
    }
    // Already studied — encouragement
    if (checkedIn.length > 0) {
      await sendMulticast(checkedIn, tokenToUserChecked,
        "Evening review 🌙",
        "You studied today — great job! A quick evening review will lock it into memory."
      );
    }
    console.log(`Evening: ${notCheckedIn.length} at-risk, ${checkedIn.length} encouraged.`);
  } catch (e) { console.error("EVENING REMINDER ERROR:", e); }
});

// ── 3. Midday nudge — 1 PM every day ─────────────────────────────────────
exports.middayNudge = onSchedule("0 13 * * *", async () => {
  try {
    const messages = [
      { title: "Lunch break = study time 📖", body: "Even 5 flashcards during lunch adds up to exam success." },
      { title: "Quick knowledge boost ⚡", body: "You have a few minutes. Make them count with a quick quiz." },
      { title: "Midday challenge 🧠", body: "Can you answer 5 MCQs correctly before your next meeting?" },
    ];
    const msg = messages[new Date().getDay() % messages.length];
    const { tokens, tokenToUserMap } = await getAllUsersWithTokens();
    // Only send to ~50% of users to avoid fatigue (alternate by day)
    const dayEven = new Date().getDate() % 2 === 0;
    const targetTokens = tokens.filter((_, i) => dayEven ? i % 2 === 0 : i % 2 !== 0);
    const filteredMap = new Map([...tokenToUserMap].filter(([t]) => targetTokens.includes(t)));
    await sendMulticast(targetTokens, filteredMap, msg.title, msg.body);
    console.log(`Midday nudge sent to ${targetTokens.length} tokens.`);
  } catch (e) { console.error("MIDDAY NUDGE ERROR:", e); }
});

// ── 4. Weekly performance summary — Sunday 6 PM ──────────────────────────
exports.weeklySummary = onSchedule("0 18 * * 0", async () => {
  try {
    const { tokens, tokenToUserMap, userDataMap } = await getAllUsersWithTokens();
    const streakTokens = [], noStreakTokens = [];
    const streakMap = new Map(), noStreakMap = new Map();

    userDataMap.forEach((data, uid) => {
      const streak = data.streak || 0;
      if (data.tokens) {
        data.tokens.forEach(t => {
          if (streak >= 3) { streakTokens.push(t); streakMap.set(t, uid); }
          else { noStreakTokens.push(t); noStreakMap.set(t, uid); }
        });
      }
    });

    if (streakTokens.length > 0) {
      await sendMulticast(streakTokens, streakMap,
        "Weekly recap 🏆",
        "You've been consistent this week! Keep it going — the exam season rewards discipline."
      );
    }
    if (noStreakTokens.length > 0) {
      await sendMulticast(noStreakTokens, noStreakMap,
        "New week, fresh start 💪",
        "Last week is gone. This week, commit to studying daily — even 10 minutes counts."
      );
    }
    console.log(`Weekly summary: ${streakTokens.length} consistent, ${noStreakTokens.length} nudged.`);
  } catch (e) { console.error("WEEKLY SUMMARY ERROR:", e); }

  // ── Weekly error digest ──────────────────────────────────────────────────
  try {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const errSnap = await db.collection('errorLogs')
      .where('lastSeen', '>=', oneWeekAgo)
      .where('resolved', '==', false)
      .orderBy('lastSeen', 'desc')
      .limit(50)
      .get();

    if (errSnap.empty) {
      console.log('[ErrorDigest] No errors this week.');
      return;
    }

    const errors = [];
    errSnap.forEach(doc => errors.push({ id: doc.id, ...doc.data() }));

    const rowsHtml = errors.map(e => `
      <tr style="border-top:1px solid #f1f5f9;">
        <td style="padding:10px 12px;font-size:13px;color:#7C3AED;font-weight:600;">${e.source || '—'}</td>
        <td style="padding:10px 12px;font-size:13px;color:#1e293b;">${(e.message || '').substring(0, 100)}</td>
        <td style="padding:10px 12px;font-size:13px;color:#64748b;text-align:center;">${e.count || 1}</td>
        <td style="padding:10px 12px;font-size:13px;color:#64748b;">${e.uid || '—'}</td>
        <td style="padding:10px 12px;font-size:13px;color:#64748b;">${new Date(e.lastSeen).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
      </tr>`).join('');

    const { gmailPasswordSecret: _gps } = { gmailPasswordSecret };
    const nodemailerLocal = require('nodemailer');
    const transporter = nodemailerLocal.createTransport({
      service: 'gmail',
      auth: { user: 'medexcel.app@gmail.com', pass: gmailPasswordSecret.value() },
    });

    await transporter.sendMail({
      from: '"MedExcel Monitor" <medexcel.app@gmail.com>',
      to: 'medexcel.app@gmail.com',
      subject: `[MedExcel] Weekly Error Digest — ${errors.length} issue${errors.length !== 1 ? 's' : ''}`,
      html: `
        <div style="font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px;">
          <h2 style="color:#7C3AED;margin-bottom:4px;">Weekly Error Digest</h2>
          <p style="color:#64748b;font-size:13px;margin-bottom:20px;">${errors.length} unresolved error${errors.length !== 1 ? 's' : ''} in the past 7 days</p>
          <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;font-size:12px;color:#94a3b8;font-weight:700;text-align:left;text-transform:uppercase;">Source</th>
                <th style="padding:10px 12px;font-size:12px;color:#94a3b8;font-weight:700;text-align:left;text-transform:uppercase;">Error</th>
                <th style="padding:10px 12px;font-size:12px;color:#94a3b8;font-weight:700;text-align:center;text-transform:uppercase;">Count</th>
                <th style="padding:10px 12px;font-size:12px;color:#94a3b8;font-weight:700;text-align:left;text-transform:uppercase;">User</th>
                <th style="padding:10px 12px;font-size:12px;color:#94a3b8;font-weight:700;text-align:left;text-transform:uppercase;">Last Seen</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <p style="font-size:12px;color:#94a3b8;margin-top:16px;">
            Mark errors as resolved in your Firestore console under the <code>errorLogs</code> collection by setting <code>resolved: true</code>.
          </p>
        </div>`,
    });

    console.log(`[ErrorDigest] Sent digest for ${errors.length} errors.`);
  } catch (e) { console.error('[ErrorDigest] Failed:', e.message); }
});

// ── 5. Streak milestone celebration ──────────────────────────────────────
// Called from client via sendToUserById when milestone hit — no schedule needed.
// Milestones: 3, 7, 14, 30, 60, 100 days

// ── 6. New quiz generated — reward notification ───────────────────────────
exports.notifyQuizGenerated = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  const { quizType, count } = request.data;
  const uid = request.auth.uid;
  try {
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) return { success: false };
    const userData = userSnap.data();
    const fcmTokens = userData.tokens || [];
    if (fcmTokens.length === 0) return { success: false, message: "No tokens." };
    const label = quizType && quizType.includes("Multiple") ? "MCQ quiz" : "flashcard deck";
    await admin.messaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: "Your study set is ready! 🎉",
        body: `${count} ${label} questions generated. Start studying now!`
      },
      android: {
        priority: "high",
        notification: { icon: "ic_stat_logo", image: "https://medxcel.web.app/logo.png" }
      }
    });
    return { success: true };
  } catch (e) { console.error("QUIZ NOTIFY ERROR:", e); return { success: false }; }
});


// ==============================
// LOGIN NOTIFICATION EMAIL
// ==============================

exports.sendLoginEmail = onRequest(
  { secrets: [gmailPasswordSecret], cors: true },
  async (req, res) => {
    if (req.method === "OPTIONS") return res.status(204).send("");

    try {
      // Verify Firebase ID token — prevents unauthenticated email triggers
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!idToken) return res.status(401).json({ error: "Unauthorized." });
      try { await admin.auth().verifyIdToken(idToken); }
      catch(e) { return res.status(401).json({ error: "Invalid token." }); }

      const { email, displayName, uid } = req.body;
      if (!email) return res.status(400).json({ error: "Missing email." });

      // Rate limit — only send once per 12 hours per user
      const ref = db.collection("loginEmailLog").doc(uid || email);
      const snap = await ref.get();
      const now = Date.now();
      const twelveHrs = 12 * 60 * 60 * 1000;
      if (snap.exists && (now - (snap.data().lastSent || 0)) < twelveHrs) {
        return res.status(200).json({ skipped: true, reason: "Rate limited" });
      }
      await ref.set({ lastSent: now });

      const name = displayName || email.split("@")[0];
      const time = new Date().toLocaleString("en-GB", {
        weekday: "long", year: "numeric", month: "long",
        day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short"
      });

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "medexcel.app@gmail.com",
          pass: gmailPasswordSecret.value(),
        },
      });

      const htmlBody = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#7C3AED,#6D28D9);padding:32px 32px 28px;text-align:center;">
            <img src="https://medxcel.web.app/logo.png" alt="MedExcel" style="width:52px;height:52px;border-radius:12px;margin-bottom:14px;display:block;margin-left:auto;margin-right:auto;">
            <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em;">MedExcel</h1>
            <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:4px 0 0;">New sign-in to your account</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px;">
            <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 8px;">Hi ${name} 👋</p>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
              We detected a new sign-in to your MedExcel account. Here are the details:
            </p>

            <!-- Details card -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;padding:6px 0;width:35%;">Account</td>
                  <td style="font-size:14px;color:#1e293b;font-weight:600;padding:6px 0;">${email}</td>
                </tr>
                <tr style="border-top:1px solid #e2e8f0;">
                  <td style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;padding:6px 0;">Time</td>
                  <td style="font-size:14px;color:#1e293b;font-weight:600;padding:6px 0;">${time}</td>
                </tr>
                <tr style="border-top:1px solid #e2e8f0;">
                  <td style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;padding:6px 0;">App</td>
                  <td style="font-size:14px;color:#1e293b;font-weight:600;padding:6px 0;">MedExcel Android</td>
                </tr>
              </table>
            </div>

            <p style="color:#475569;font-size:13px;line-height:1.7;margin:0 0 20px;">
              If this was you, no action is needed — get back to studying! 📚<br>
              If you <strong>don't recognise this sign-in</strong>, please reset your password immediately.
            </p>

            <div style="text-align:center;">
              <a href="https://medxcel.web.app?action=login" style="display:inline-block;background:#7C3AED;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:-0.01em;">
                Secure My Account
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="font-size:11px;color:#94a3b8;margin:0;">
              &copy; MedExcel · You're receiving this because you have a MedExcel account.<br>
              This is an automated security notification.
            </p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: '"MedExcel" <medexcel.app@gmail.com>',
        to: email,
        subject: `New sign-in to your MedExcel account`,
        html: htmlBody,
      });

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error("LOGIN EMAIL ERROR:", error);
      return res.status(500).json({ error: "Failed to send login email." });
    }
  }
);

// ==============================
// WELCOME EMAIL
// Sent once to brand-new users on first account creation.
// Call from client inside the new-user else branch of initUserUI:
//   fetch(".../sendWelcomeEmail", { method:"POST", headers:{"Content-Type":"application/json"},
//     body: JSON.stringify({ email: user.email, displayName: user.displayName }) }).catch(()=>{});
// ==============================

exports.sendWelcomeEmail = onRequest(
  { secrets: [gmailPasswordSecret], cors: true },
  async (req, res) => {
    if (req.method === "OPTIONS") return res.status(204).send("");

    try {
      // Verify Firebase ID token
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!idToken) return res.status(401).json({ error: "Unauthorized." });
      try { await admin.auth().verifyIdToken(idToken); }
      catch(e) { return res.status(401).json({ error: "Invalid token." }); }

      const { email, displayName } = req.body;
      if (!email) return res.status(400).json({ error: "Missing email." });

      // Rate-limit: only send once per user (first account creation only)
      const ref  = db.collection("welcomeEmailLog").doc(email);
      const snap = await ref.get();
      if (snap.exists) return res.status(200).json({ skipped: true, reason: "Already sent" });
      await ref.set({ sentAt: Date.now() });

      const name = displayName || email.split("@")[0];

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "medexcel.app@gmail.com", pass: gmailPasswordSecret.value() },
      });

      await transporter.sendMail({
        from: '"MedExcel" <medexcel.app@gmail.com>',
        to: email,
        subject: `Welcome to MedExcel, ${name}! 🎉`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

            <div style="background:linear-gradient(135deg,#7C3AED,#6D28D9);padding:36px 32px 32px;text-align:center;">
              <img src="https://medxcel.web.app/logo.png" alt="MedExcel" style="width:56px;height:56px;border-radius:14px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;">
              <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0;letter-spacing:-0.02em;">Welcome to MedExcel! 🎉</h1>
              <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:6px 0 0;">Your medical exam journey starts now</p>
            </div>

            <div style="padding:32px;">
              <p style="color:#0f172a;font-size:16px;font-weight:700;margin:0 0 8px;">Hi ${name} 👋</p>
              <p style="color:#475569;font-size:14px;line-height:1.75;margin:0 0 28px;">
                We're so glad you're here. MedExcel is built to help you ace your MBBS exams with AI-powered flashcards, MCQs, and smart study tools — all in one place.
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
                <p style="font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px;">What you can do right now</p>
                <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
                  <span style="font-size:16px;flex-shrink:0;line-height:1.5;">🤖</span>
                  <span style="font-size:13px;color:#334155;line-height:1.55;">Generate AI flashcards &amp; MCQs from your own notes or slides</span>
                </div>
                <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
                  <span style="font-size:16px;flex-shrink:0;line-height:1.5;">🔥</span>
                  <span style="font-size:13px;color:#334155;line-height:1.55;">Build a daily study streak and earn XP as you improve</span>
                </div>
                <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
                  <span style="font-size:16px;flex-shrink:0;line-height:1.5;">🏆</span>
                  <span style="font-size:13px;color:#334155;line-height:1.55;">Compete on the leaderboard against other students</span>
                </div>
                <div style="display:flex;align-items:flex-start;gap:10px;">
                  <span style="font-size:16px;flex-shrink:0;line-height:1.5;">📊</span>
                  <span style="font-size:13px;color:#334155;line-height:1.55;">Track accuracy, streaks, and progress with detailed stats</span>
                </div>
              </div>

              <div style="text-align:center;margin-bottom:24px;">
                <a href="https://medxcel.web.app" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#6D28D9);color:#ffffff;padding:14px 32px;border-radius:9999px;font-size:15px;font-weight:700;text-decoration:none;">
                  Start Studying Now →
                </a>
              </div>

              <p style="font-size:13px;color:#64748b;line-height:1.65;margin:0;">
                Pro tip: Start your <strong>first session today</strong> to kick off your streak. Even 5 minutes makes a difference. 📚
              </p>
            </div>

            <div style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="font-size:11px;color:#94a3b8;margin:0;">&copy; MedExcel · You're receiving this because you just created an account.</p>
            </div>
          </div>
        `,
      });

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error("WELCOME EMAIL ERROR:", error);
      return res.status(500).json({ error: "Failed to send welcome email." });
    }
  }
);

// ==============================
// CANCEL SUBSCRIPTION
// Marks subscription as cancelled — user keeps access until expiry
// ==============================

// ==============================
// CLAIM REFERRAL
// Called after a new user signs up — credits the referrer and applies tier rewards.
// Safe to call multiple times: referredBy field prevents double-claiming.
// ==============================

exports.claimReferral = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const claimantUid = request.auth.uid;
  const { code } = request.data;

  if (!code || typeof code !== "string" || code.length < 4) {
    throw new HttpsError("invalid-argument", "Invalid referral code.");
  }

  const normalizedCode = code.trim().toUpperCase();

  // Load claimant doc
  const claimantRef  = db.collection("users").doc(claimantUid);
  const claimantSnap = await claimantRef.get();
  if (!claimantSnap.exists) throw new HttpsError("not-found", "User not found.");

  const claimantData = claimantSnap.data();

  // Already used a referral code — silent success so frontend doesn't show an error
  if (claimantData.referredBy) {
    return { success: true, alreadyClaimed: true };
  }

  // Find the referrer by their referralCode field
  const referrerSnap = await db.collection("users")
    .where("referralCode", "==", normalizedCode)
    .limit(1)
    .get();

  if (referrerSnap.empty) {
    throw new HttpsError("not-found", "Referral code not found.");
  }

  const referrerDoc  = referrerSnap.docs[0];
  const referrerUid  = referrerDoc.id;
  const referrerData = referrerDoc.data();

  // Prevent self-referral
  if (referrerUid === claimantUid) {
    throw new HttpsError("invalid-argument", "You cannot use your own referral code.");
  }

  const oldCount = referrerData.referralCount || 0;
  const newCount = oldCount + 1;

  // Tier milestones — must match REFERRAL_TIERS in the frontend
  const TIERS = [
    { refs: 1,  type: "xp"            },
    { refs: 3,  type: "limit_2x"      },
    { refs: 5,  type: "week_premium"  },
    { refs: 10, type: "month_premium" },
    { refs: 20, type: "ambassador"    },
  ];

  // Find the highest tier the referrer just crossed into
  const crossedTier = [...TIERS].reverse().find(t => oldCount < t.refs && newCount >= t.refs);

  const referrerUpdate = {
    referralCount: newCount,
  };

  let rewardApplied = null;

  if (crossedTier) {
    rewardApplied = crossedTier.type;
    const now = new Date();

    if (crossedTier.type === "xp") {
      referrerUpdate.xp = admin.firestore.FieldValue.increment(500);

    } else if (crossedTier.type === "limit_2x") {
      const expiry = new Date(now); expiry.setDate(expiry.getDate() + 7);
      referrerUpdate.referralBoostType   = "limit_2x";
      referrerUpdate.referralBoostExpiry = expiry.toISOString();

    } else if (crossedTier.type === "week_premium") {
      const expiry = new Date(now); expiry.setDate(expiry.getDate() + 7);
      referrerUpdate.referralBoostType   = "week_premium";
      referrerUpdate.referralBoostExpiry = expiry.toISOString();

    } else if (crossedTier.type === "month_premium") {
      const expiry = new Date(now); expiry.setDate(expiry.getDate() + 30);
      referrerUpdate.referralBoostType   = "month_premium";
      referrerUpdate.referralBoostExpiry = expiry.toISOString();

    } else if (crossedTier.type === "ambassador") {
      referrerUpdate.referralBoostType   = "ambassador";
      referrerUpdate.referralBoostExpiry = "permanent";
    }
  }

  // Write both docs atomically inside a transaction to prevent race conditions
  // where two simultaneous claims of the same code could both read referralCount:N
  // and both write N+1, undercounting referrals.
  await db.runTransaction(async (tx) => {
    // Re-read referrer inside transaction to get the freshest count
    const freshReferrerSnap = await tx.get(referrerDoc.ref);
    if (!freshReferrerSnap.exists) throw new Error("Referrer doc disappeared.");

    const freshCount  = freshReferrerSnap.data().referralCount || 0;
    const freshNew    = freshCount + 1;

    // Recalculate tier with fresh data
    const freshCrossed = [...TIERS].reverse().find(t => freshCount < t.refs && freshNew >= t.refs);
    const txReferrerUpdate = { referralCount: freshNew };

    if (freshCrossed) {
      rewardApplied = freshCrossed.type; // Update outer variable so return value is accurate
      const now = new Date();
      if (freshCrossed.type === "xp") {
        txReferrerUpdate.xp = admin.firestore.FieldValue.increment(500);
      } else if (freshCrossed.type === "limit_2x") {
        const expiry = new Date(now); expiry.setDate(expiry.getDate() + 7);
        txReferrerUpdate.referralBoostType   = "limit_2x";
        txReferrerUpdate.referralBoostExpiry = expiry.toISOString();
      } else if (freshCrossed.type === "week_premium") {
        const expiry = new Date(now); expiry.setDate(expiry.getDate() + 7);
        txReferrerUpdate.referralBoostType   = "week_premium";
        txReferrerUpdate.referralBoostExpiry = expiry.toISOString();
      } else if (freshCrossed.type === "month_premium") {
        const expiry = new Date(now); expiry.setDate(expiry.getDate() + 30);
        txReferrerUpdate.referralBoostType   = "month_premium";
        txReferrerUpdate.referralBoostExpiry = expiry.toISOString();
      } else if (freshCrossed.type === "ambassador") {
        txReferrerUpdate.referralBoostType   = "ambassador";
        txReferrerUpdate.referralBoostExpiry = "permanent";
      }
    }

    tx.update(referrerDoc.ref, txReferrerUpdate);
    tx.update(claimantRef, {
      referredBy:     referrerUid,
      referredByCode: normalizedCode,
      referredAt:     new Date().toISOString(),
      xp:             admin.firestore.FieldValue.increment(100),
    });
  });

  console.log(`[Referral] uid:${claimantUid} claimed code:${normalizedCode} → referrer uid:${referrerUid}, newCount:${newCount}, reward:${rewardApplied || 'none'}`);
  return { success: true, alreadyClaimed: false, rewardApplied };
});

// ==============================
// DELETE USER DATA
// Deletes all Firestore subcollections for a user before account deletion.
// Called from the client's executeDeleteAccount — must run before Auth delete
// so the user is still authenticated and we can verify ownership.
// ==============================

exports.deleteUserData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login required.");
  }

  const uid = request.auth.uid;

  // Delete the quizzes subcollection in batches
  try {
    const quizzesRef = db.collection("users").doc(uid).collection("quizzes");
    let deleted = 0;

    while (true) {
      const snap = await quizzesRef.limit(100).get();
      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deleted += snap.docs.length;
    }

    console.log(`[DeleteUserData] Deleted ${deleted} quizzes for uid:${uid}`);
  } catch (e) {
    console.warn("[DeleteUserData] Quizzes subcollection cleanup failed:", e.message);
    // Non-fatal — still let the Auth account delete proceed
  }

  // Delete the root user document
  try {
    await db.collection("users").doc(uid).delete();
    console.log(`[DeleteUserData] Deleted user doc for uid:${uid}`);
  } catch (e) {
    console.warn("[DeleteUserData] User doc deletion failed:", e.message);
  }

  // Remove FCM tokens (prevents ghost notifications to dead accounts)
  try {
    await db.collection("loginEmailLog").doc(uid).delete();
  } catch (_) {}

  return { success: true };
});

exports.cancelSubscription = onCall(
  { secrets: [PAYSTACK_SECRET] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    const uid     = request.auth.uid;
    const userRef = db.collection("users").doc(uid);
    const snap    = await userRef.get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "User not found.");
    }

    const data = snap.data();

    const PREMIUM_PLANS = ["premium", "premium_trial", "elite"];
    if (!PREMIUM_PLANS.includes(data.plan)) {
      throw new HttpsError("failed-precondition", "No active premium subscription.");
    }

    if (data.subscriptionCancelled) {
      // Already cancelled — return success with expiry so client UI stays consistent
      return { success: true, expiresAt: data.subscriptionExpiry || null };
    }

    // ── Tell Paystack to stop charging ───────────────────────────────────
    const subscriptionCode = data.paystackSubscriptionCode;
    const emailToken       = data.paystackEmailToken;

    if (subscriptionCode && emailToken) {
      try {
        const paystackRes = await fetch("https://api.paystack.co/subscription/disable", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET.value()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
        });
        const paystackData = await paystackRes.json();
        if (!paystackData.status) {
          // Log but don't block — still mark cancelled in Firestore
          console.warn("[Cancel] Paystack disable returned false:", paystackData.message);
        } else {
          console.log(`[Cancel] Paystack subscription disabled: ${subscriptionCode}`);
        }
      } catch (e) {
        // Non-fatal: still cancel in Firestore so user doesn't get charged again
        // if Paystack is temporarily down — support can clean up manually
        console.error("[Cancel] Paystack API call failed:", e.message);
      }
    } else {
      // No subscription code stored yet (e.g. trial or webhook hasn't fired yet)
      console.warn(`[Cancel] uid:${uid} — no subscription code on file, marking cancelled in Firestore only`);
    }

    // Mark cancelled — plan stays premium until subscriptionExpiry
    await userRef.set({
      subscriptionCancelled: true,
      subscriptionCancelledAt: new Date().toISOString(),
    }, { merge: true });

    console.log(`[Cancel] uid:${uid} plan:${data.plan} cancelled, expires: ${data.subscriptionExpiry}`);
    return { success: true, expiresAt: data.subscriptionExpiry || null };
  }
);

// ==============================
// QUIZLET URL IMPORT
// ==============================

exports.checkExpiredSubscriptions = onSchedule("0 0 * * *", async () => {
  try {
    const now = new Date().toISOString();
    const snap = await db.collection("users")
      .where("subscriptionActive", "==", true)
      .where("subscriptionExpiry", "<=", now)
      .get();

    if (snap.empty) {
      console.log("[Expiry] No expired subscriptions found.");
      return;
    }

    const batch = db.batch();
    snap.forEach(doc => {
      batch.update(doc.ref, { plan: "free", subscriptionActive: false });
    });
    await batch.commit();
    console.log(`[Expiry] Downgraded ${snap.size} expired subscription(s).`);
  } catch (e) {
    console.error("[Expiry] checkExpiredSubscriptions error:", e);
  }
});

// ==============================
// CONTACT SUPPORT EMAIL
// ==============================

exports.sendSupportEmail = onRequest(
  { secrets: [gmailPasswordSecret], cors: true },
  async (req, res) => {
    if (req.method === "OPTIONS") return res.status(204).send("");

    try {
      // Verify Firebase ID token — prevents fake support submissions
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!idToken) return res.status(401).json({ error: "Unauthorized." });
      try { await admin.auth().verifyIdToken(idToken); }
      catch(e) { return res.status(401).json({ error: "Invalid token." }); }

      const { name, email, category, message, uid } = req.body;

      if (!email || !message) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // Rate limit — max 3 support emails per user per 24 hours
      const ref = db.collection("supportEmailLog").doc(uid || email);
      const snap = await ref.get();
      const now = Date.now();
      const twentyFourHrs = 24 * 60 * 60 * 1000;
      const log = snap.exists ? snap.data() : { count: 0, window: now };

      if (now - log.window < twentyFourHrs && log.count >= 3) {
        return res.status(429).json({ error: "You've sent too many support requests. Please wait 24 hours." });
      }

      await ref.set({
        count: (now - log.window < twentyFourHrs) ? log.count + 1 : 1,
        window: (now - log.window < twentyFourHrs) ? log.window : now,
        lastSent: now
      });

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "medexcel.app@gmail.com", pass: gmailPasswordSecret.value() },
      });

      // Email to MedExcel support team
      await transporter.sendMail({
        from: '"MedExcel Support" <medexcel.app@gmail.com>',
        to: "medexcel.app@gmail.com",
        replyTo: email,
        subject: `[Support] ${category || "General"} — ${name || email}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#7C3AED;margin-bottom:4px;">New Support Request</h2>
            <p style="color:#64748b;font-size:13px;margin-bottom:20px;">Via MedExcel in-app support form</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <tr><td style="padding:8px 0;font-size:13px;color:#94a3b8;font-weight:600;width:30%;">FROM</td><td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;">${name || "Unknown"} &lt;${email}&gt;</td></tr>
              <tr style="border-top:1px solid #f1f5f9;"><td style="padding:8px 0;font-size:13px;color:#94a3b8;font-weight:600;">UID</td><td style="padding:8px 0;font-size:14px;color:#0f172a;">${uid || "Not provided"}</td></tr>
              <tr style="border-top:1px solid #f1f5f9;"><td style="padding:8px 0;font-size:13px;color:#94a3b8;font-weight:600;">CATEGORY</td><td style="padding:8px 0;font-size:14px;color:#0f172a;">${category || "General"}</td></tr>
            </table>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
              <div style="font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:8px;">MESSAGE</div>
              <p style="font-size:14px;color:#1e293b;line-height:1.7;margin:0;">${message.replace(/\n/g, "<br>")}</p>
            </div>
            <p style="font-size:12px;color:#94a3b8;">Reply directly to this email to respond to the user.</p>
          </div>`,
      });

      // Confirmation email to user
      await transporter.sendMail({
        from: '"MedExcel" <medexcel.app@gmail.com>',
        to: email,
        subject: "We got your message — MedExcel Support",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background:linear-gradient(135deg,#7C3AED,#6D28D9);padding:28px 32px;text-align:center;">
              <img src="https://medxcel.web.app/logo.png" alt="MedExcel" style="width:48px;height:48px;border-radius:12px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">
              <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:0;">We got your message</h1>
            </div>
            <div style="padding:28px 32px;">
              <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;">Hi ${name || "there"}, thanks for reaching out. We've received your support request and will get back to you within 24–48 hours.</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
                <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:6px;">YOUR MESSAGE</div>
                <p style="font-size:13px;color:#1e293b;line-height:1.6;margin:0;">${message.replace(/\n/g, "<br>")}</p>
              </div>
              <p style="font-size:13px;color:#64748b;margin:0;">In the meantime, keep studying hard.</p>
            </div>
            <div style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="font-size:11px;color:#94a3b8;margin:0;">&copy; MedExcel. All rights reserved.</p>
            </div>
          </div>`,
      });

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error("SUPPORT EMAIL ERROR:", error);
      return res.status(500).json({ error: "Failed to send support email." });
    }
  }
);
