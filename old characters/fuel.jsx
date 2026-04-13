import { useState, useEffect, useRef } from "react";

const STATIONS = [
  { id: 1, name: "NNPC Mega Station", lat: 6.5244, lng: 3.3792, petrol: true, diesel: true, kerosene: false, queue: "short", lastUpdated: "10 mins ago", address: "Victoria Island, Lagos" },
  { id: 2, name: "Total Energies Lekki", lat: 6.4281, lng: 3.4219, petrol: false, diesel: true, kerosene: true, queue: "long", lastUpdated: "25 mins ago", address: "Lekki Phase 1, Lagos" },
  { id: 3, name: "Ardova Filling Station", lat: 6.5958, lng: 3.3432, petrol: true, diesel: true, kerosene: true, queue: "none", lastUpdated: "5 mins ago", address: "Ikeja, Lagos" },
  { id: 4, name: "Mobil Station Ajah", lat: 6.4698, lng: 3.5852, petrol: false, diesel: false, kerosene: false, queue: "N/A", lastUpdated: "1 hr ago", address: "Ajah, Lagos" },
  { id: 5, name: "Conoil Petro", lat: 6.548, lng: 3.366, petrol: true, diesel: false, kerosene: false, queue: "moderate", lastUpdated: "15 mins ago", address: "Surulere, Lagos" },
  { id: 6, name: "MRS Oil Station", lat: 6.512, lng: 3.395, petrol: true, diesel: true, kerosene: false, queue: "none", lastUpdated: "3 mins ago", address: "Yaba, Lagos" },
];

const getStatusColor = (s) => {
  if (!s.petrol && !s.diesel) return "#ef4444";
  if (s.queue === "none") return "#22c55e";
  if (s.queue === "short") return "#f59e0b";
  if (s.queue === "moderate") return "#f97316";
  return "#ef4444";
};

const getStatusText = (s) => {
  if (!s.petrol && !s.diesel) return "Out of Stock";
  if (s.queue === "none") return "Available – No Queue";
  if (s.queue === "short") return "Short Queue";
  if (s.queue === "moderate") return "Moderate Queue";
  return "Long Queue";
};

export default function FuelWatch() {
  const [activeTab, setActiveTab] = useState("map");
  const [selectedStation, setSelectedStation] = useState(null);
  const [filter, setFilter] = useState("All");
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", content: "Hi! I'm FuelBot ⛽ I have live data on Lagos fuel stations. Ask me anything — nearest station with petrol, no-queue spots, diesel availability, etc." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeTab !== "map") return;
    const init = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(link);
      }
      if (!window.L) {
        await new Promise(res => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
          s.onload = res;
          document.head.appendChild(s);
        });
      }
      if (mapRef.current && !mapInstanceRef.current) {
        const L = window.L;
        const map = L.map(mapRef.current, { zoomControl: false }).setView([6.5244, 3.3792], 12);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "© CartoDB"
        }).addTo(map);
        STATIONS.forEach(station => {
          const color = getStatusColor(station);
          const icon = L.divIcon({
            html: `<div style="
              background:${color};
              width:16px;height:16px;border-radius:50%;
              border:2.5px solid #0c0c10;
              box-shadow:0 0 10px ${color}99,0 0 0 4px ${color}22;
              cursor:pointer;
            "></div>`,
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          const marker = L.marker([station.lat, station.lng], { icon }).addTo(map);
          marker.on("click", () => setSelectedStation(station));
          markersRef.current.push(marker);
        });
        mapInstanceRef.current = map;
      }
    };
    setTimeout(init, 100);
  }, [activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const sendAiMessage = async (text) => {
    const msg = text || aiInput.trim();
    if (!msg || aiLoading) return;
    setAiInput("");
    const updated = [...aiMessages, { role: "user", content: msg }];
    setAiMessages(updated);
    setAiLoading(true);
    try {
      const ctx = STATIONS.map(s =>
        `• ${s.name} (${s.address}): Petrol=${s.petrol ? "YES" : "NO"}, Diesel=${s.diesel ? "YES" : "NO"}, Kerosene=${s.kerosene ? "YES" : "NO"}, Queue=${s.queue}, Updated=${s.lastUpdated}`
      ).join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are FuelBot, an AI assistant inside a fuel availability tracking app for Lagos, Nigeria. Be concise, practical, and friendly. Use bullet points for listing stations. Reference station names and addresses specifically. Here is the current station data:\n\n${ctx}`,
          messages: updated.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't connect. Try again.";
      setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setAiLoading(false);
  };

  const filteredStations = STATIONS.filter(s => {
    if (filter === "Petrol") return s.petrol;
    if (filter === "Diesel") return s.diesel;
    if (filter === "Available") return s.petrol || s.diesel;
    return true;
  });

  const tabStyle = (id) => ({
    flex: 1, background: "transparent", border: "none", cursor: "pointer",
    padding: "6px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 3
  });

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#0b0b0f",
      color: "#f0f0f2",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      maxWidth: 430,
      margin: "0 auto",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "#0b0b0f",
        zIndex: 20
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, boxShadow: "0 4px 12px #f9731640"
          }}>⛽</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.5px" }}>FuelWatch</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
              <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>LIVE · Lagos</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setActiveTab("report")}
          style={{
            background: "rgba(249,115,22,0.12)",
            border: "1px solid rgba(249,115,22,0.3)",
            borderRadius: 22,
            padding: "6px 14px",
            color: "#f97316",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.2px"
          }}>+ Report</button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>

        {/* ── MAP TAB ── */}
        <div style={{ display: activeTab === "map" ? "block" : "none", height: "100%", position: "relative" }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

          {/* Legend pill */}
          <div style={{
            position: "absolute", top: 12, left: 12, right: 12, zIndex: 1000,
            background: "rgba(11,11,15,0.88)",
            backdropFilter: "blur(12px)",
            borderRadius: 14,
            padding: "10px 16px",
            border: "1px solid rgba(255,255,255,0.07)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>STATIONS</span>
            <div style={{ display: "flex", gap: 14 }}>
              {[["#22c55e","Available"],["#f59e0b","Queue"],["#ef4444","Out"]].map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}` }} />
                  <span style={{ fontSize: 11, color: "#bbb", fontWeight: 500 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Station bottom sheet */}
          {selectedStation && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "#14141a",
              borderRadius: "22px 22px 0 0",
              padding: "20px 18px 24px",
              border: "1px solid rgba(255,255,255,0.07)",
              borderBottom: "none",
              zIndex: 1000,
              animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{selectedStation.name}</div>
                  <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>📍 {selectedStation.address}</div>
                </div>
                <button onClick={() => setSelectedStation(null)} style={{
                  background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "50%",
                  width: 30, height: 30, color: "#999", cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>×</button>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[
                  { key: "petrol", label: "PMS", emoji: "🟠" },
                  { key: "diesel", label: "AGO", emoji: "🔵" },
                  { key: "kerosene", label: "DPK", emoji: "🟡" }
                ].map(({ key, label, emoji }) => (
                  <div key={key} style={{
                    flex: 1,
                    background: selectedStation[key] ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.07)",
                    border: `1px solid ${selectedStation[key] ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.18)"}`,
                    borderRadius: 12, padding: "10px 4px", textAlign: "center"
                  }}>
                    <div style={{ fontSize: 18 }}>{selectedStation[key] ? "✅" : "❌"}</div>
                    <div style={{ fontSize: 10, color: "#888", marginTop: 4, fontWeight: 700 }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: `${getStatusColor(selectedStation)}15`,
                  border: `1px solid ${getStatusColor(selectedStation)}35`,
                  borderRadius: 22, padding: "5px 12px",
                  fontSize: 12, color: getStatusColor(selectedStation), fontWeight: 700
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: getStatusColor(selectedStation) }} />
                  {getStatusText(selectedStation)}
                </div>
                <div style={{ fontSize: 11, color: "#444" }}>Updated {selectedStation.lastUpdated}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── STATIONS TAB ── */}
        {activeTab === "stations" && (
          <div style={{ height: "100%", overflowY: "auto", padding: "14px 16px" }}>
            {/* Filter chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
              {["All","Petrol","Diesel","Available"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "6px 14px", borderRadius: 22, flexShrink: 0,
                  border: filter === f ? "1px solid #f97316" : "1px solid rgba(255,255,255,0.08)",
                  background: filter === f ? "rgba(249,115,22,0.15)" : "transparent",
                  color: filter === f ? "#f97316" : "#777",
                  fontSize: 12, fontWeight: 700, cursor: "pointer"
                }}>{f}</button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: "#444", marginBottom: 10, fontWeight: 600 }}>{filteredStations.length} STATIONS</div>

            {filteredStations.map(station => (
              <div key={station.id}
                onClick={() => { setSelectedStation(station); setActiveTab("map"); }}
                style={{
                  background: "#13131a",
                  borderRadius: 16, padding: "14px", marginBottom: 10,
                  border: "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                  transition: "border-color 0.2s"
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${getStatusColor(station)}12`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                }}>⛽</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{station.name}</div>
                  <div style={{ color: "#555", fontSize: 11, marginBottom: 6 }}>{station.address}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {station.petrol && <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(249,115,22,0.15)", color: "#f97316", padding: "2px 8px", borderRadius: 10 }}>PMS</span>}
                    {station.diesel && <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(96,165,250,0.15)", color: "#60a5fa", padding: "2px 8px", borderRadius: 10 }}>AGO</span>}
                    {station.kerosene && <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(250,204,21,0.15)", color: "#facc15", padding: "2px 8px", borderRadius: 10 }}>DPK</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: getStatusColor(station), boxShadow: `0 0 8px ${getStatusColor(station)}` }} />
                  <div style={{ fontSize: 9, color: "#444", fontWeight: 600 }}>{station.lastUpdated}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── AI TAB ── */}
        {activeTab === "ai" && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {aiMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #f97316, #dc2626)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                      boxShadow: "0 4px 12px #f9731640"
                    }}>⛽</div>
                  )}
                  <div style={{
                    maxWidth: "76%",
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, #f97316, #dc2626)"
                      : "#1a1a22",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: "11px 15px",
                    fontSize: 13,
                    lineHeight: 1.55,
                    border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.05)" : "none",
                    whiteSpace: "pre-wrap"
                  }}>{msg.content}</div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "linear-gradient(135deg, #f97316, #dc2626)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15
                  }}>⛽</div>
                  <div style={{
                    background: "#1a1a22", borderRadius: "18px 18px 18px 4px",
                    padding: "13px 18px", border: "1px solid rgba(255,255,255,0.05)",
                    display: "flex", gap: 5
                  }}>
                    {[0,1,2].map(j => (
                      <div key={j} style={{
                        width: 6, height: 6, borderRadius: "50%", background: "#f97316",
                        animation: `bounce 1.2s ease ${j * 0.2}s infinite`
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            <div style={{ padding: "0 16px 10px", display: "flex", gap: 8, overflowX: "auto" }}>
              {["Nearest with petrol?", "Any no-queue station?", "Where's diesel?", "Best option now?"].map(q => (
                <button key={q} onClick={() => sendAiMessage(q)} style={{
                  background: "rgba(249,115,22,0.08)",
                  border: "1px solid rgba(249,115,22,0.22)",
                  borderRadius: 20, padding: "6px 13px",
                  color: "#f97316", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0
                }}>{q}</button>
              ))}
            </div>

            <div style={{
              padding: "10px 14px 12px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex", gap: 10, alignItems: "center"
            }}>
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendAiMessage()}
                placeholder="Ask about fuel availability..."
                style={{
                  flex: 1, background: "#1a1a22",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 26, padding: "11px