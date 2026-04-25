/**
 * initPush(userId)
 * ─────────────────────────────────────────────────────────────────
 * Initialises FCM via the Capacitor native bridge.
 * Called automatically from onAuthStateChanged once the user is
 * confirmed logged-in, so userId is always valid.
 *
 * Flow:
 *   1. Guard — native Capacitor device only
 *   2. Attach 'registration' + 'registrationError' listeners FIRST
 *      (must precede register() — cached tokens fire instantly on Android)
 *   3. Request OS permission
 *   4. Call register() → native FCM token arrives via 'registration' event
 *   5. Save full token to backend (POST /saveToken) + write directly to
 *      Firestore users/{uid}.tokens[] as a belt-and-suspenders backup
 */
window.initPush = async function(userId) {
    // ── Guard ──────────────────────────────────────────────────────
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
        console.log("[Push] Not a native platform — skipping.");
        return;
    }
    
    const { PushNotifications } = window.Capacitor.Plugins;
    if (!PushNotifications) {
        console.error("[Push] Plugin missing — run: npm i @capacitor/push-notifications && npx cap sync");
        return;
    }
    
    // ── Step 1: attach listeners BEFORE register() ─────────────────
    // On Android, a cached token fires the event almost immediately
    // after register() is called. Adding the listener after register()
    // creates a race condition where the event is missed entirely.
    PushNotifications.addListener("registration", async (token) => {
        // token.value is the raw FCM token string — never truncate it
        const fcmToken = (token.value || "").trim();
        console.log("[Push] ✅ FCM token received:", fcmToken);
        
        const uid = userId || window.currentUser?.uid || null;
        if (!uid) {
            console.error("[Push] No userId at token-save time — aborting.");
            return;
        }
        
        // ── Save via Cloud Function (primary) ─────────────────────
        try {
            let idToken = '';
            try { idToken = await window.currentUser.getIdToken(); } catch (_) {}
            const res = await fetch(
                "https://us-central1-medxcel.cloudfunctions.net/saveToken",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + idToken
                    },
                    body: JSON.stringify({ token: fcmToken, userId: uid })
                }
            );
            const data = await res.json();
            console.log("[Push] saveToken response:", res.status, data);
        } catch (err) {
            console.error("[Push] saveToken fetch failed:", err);
        }
        
        // ── Write directly to Firestore (backup) ──────────────────
        // Ensures token is stored even if the Cloud Function is cold.
        // arrayUnion deduplicates — safe to call on every app start.
        try {
            if (window.db) {
                const { doc, updateDoc, arrayUnion } =
                await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                await updateDoc(doc(window.db, "users", uid), {
                    tokens: arrayUnion(fcmToken),
                    fcmUpdatedAt: new Date().toISOString()
                });
                console.log("[Push] ✅ Token also written directly to Firestore.");
            }
        } catch (err) {
            console.error("[Push] Firestore direct write failed:", err);
        }
    });
    
    PushNotifications.addListener("registrationError", (err) => {
        console.error("[Push] ❌ Registration error:", JSON.stringify(err));
    });
    
    // ── Step 2: request OS permission ──────────────────────────────
    const permStatus = await PushNotifications.requestPermissions();
    console.log("[Push] Permission:", permStatus.receive);
    if (permStatus.receive !== "granted") {
        console.warn("[Push] Permission not granted — notifications disabled.");
        return;
    }
    
    // ── Step 3: register with FCM ───────────────────────────────────
    // This triggers the native FCM registration. Token arrives via the
    // 'registration' listener above (which is already attached).
    await PushNotifications.register();
    console.log("[Push] register() called — awaiting token event...");
};