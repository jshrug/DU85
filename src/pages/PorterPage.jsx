import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mammoth from "mammoth";
import { COLORS, COHORT_SIZE } from "../constants.js";
import { ANCHOR_COUNTRIES, CITY_CHAMPIONS, COHORT_EVENTS } from "../data/cityData.js";
import { getCountryByName, briefKeysForComboName, normalizeBriefKey } from "../utils/voteUtils.js";
import SectionTitle from "../components/SectionTitle.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { fetchCountryBriefs, submitCountryBrief, loadConversation, saveConversation } from "../lib/porterMemory.js";
import { supabase, COHORT_ID, getOrCreateUserId } from "../lib/supabase.js";
import { DEEP_DIVE } from "../data/countryDeepDive.js";
import { HEALTH_BRIEF_META, HEALTH_ROWS } from "../data/healthBrief.js";
import {
  getFreshnessLabel,
  getCohortsForCity,
  getPreviousVisitOrgsForCity,
  getCohortBuiltConnectionRead,
  getPrecedentScore,
  getMostRepeatedDestinations,
  getRecentCohortDestinations,
} from "../utils/destinationIntel.js";
import { previousCohortTrips } from "../data/previousCohortIntel.js";

const PdfViewerModal = lazy(() => import("../components/features/PdfViewerModal.jsx"));

// FileReader's own base64 encoding has no JS-level argument/stack limit,
// unlike building the string manually via String.fromCharCode.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(",") + 1));
    reader.onerror = () => reject(reader.error || new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function PorterCSS() {
  return (
    <style>{`
      @keyframes porterRingIdle {
        0%   { transform: scale(0.74); opacity: 0.70; }
        100% { transform: scale(2.60); opacity: 0; }
      }
      @keyframes porterRingActive {
        0%   { transform: scale(0.68); opacity: 0.88; }
        100% { transform: scale(1.85); opacity: 0; }
      }
      @keyframes porterBellIdle {
        0%, 100% {
          box-shadow: 0 0 22px rgba(196,150,42,0.18), 0 0 0 1px rgba(196,150,42,0.16);
        }
        50% {
          box-shadow: 0 0 44px rgba(232,184,75,0.36), 0 0 80px rgba(196,150,42,0.14), 0 0 0 1px rgba(243,213,138,0.28);
        }
      }
      @keyframes porterBellActive {
        0%, 100% {
          box-shadow: 0 0 28px rgba(198,90,46,0.30), 0 0 0 1px rgba(198,90,46,0.28);
        }
        50% {
          box-shadow: 0 0 58px rgba(232,120,60,0.52), 0 0 110px rgba(196,90,46,0.22), 0 0 0 1px rgba(230,110,50,0.44);
        }
      }
      @keyframes porterMsgIn {
        0%   { opacity: 0; transform: translateY(10px) scale(0.98); }
        100% { opacity: 1; transform: translateY(0)   scale(1); }
      }
      @keyframes porterDot {
        0%, 60%, 100% { transform: translateY(0);    opacity: 0.25; }
        30%            { transform: translateY(-6px); opacity: 1; }
      }
      @keyframes porterCursor {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
      @keyframes porterStatusPulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.28; }
      }
      @keyframes porterGridDrift {
        0%   { background-position: 0 0; }
        100% { background-position: 40px 40px; }
      }
      .porter-msg        { animation: porterMsgIn 380ms cubic-bezier(.18,.9,.22,1) both; }
      .porter-dot-1      { animation: porterDot 1.15s ease-in-out infinite 0s; }
      .porter-dot-2      { animation: porterDot 1.15s ease-in-out infinite 0.19s; }
      .porter-dot-3      { animation: porterDot 1.15s ease-in-out infinite 0.38s; }
      .porter-cursor     { animation: porterCursor 0.85s step-end infinite; }
      .porter-status-active { animation: porterStatusPulse 1.4s ease-in-out infinite; }
      .porter-grid       {
        animation: porterGridDrift 8s linear infinite;
        background-image:
          linear-gradient(rgba(196,150,42,0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(196,150,42,0.055) 1px, transparent 1px);
        background-size: 40px 40px;
      }
    `}</style>
  );
}

function PorterBellRings({ streaming }) {
  const rings = [0, 1, 2];
  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
      {rings.map((i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 76, height: 76,
            border: `1px solid ${streaming ? "rgba(198,90,46,0.75)" : "rgba(196,150,42,0.68)"}`,
            animation: streaming
              ? `porterRingActive 1.05s ease-out infinite ${i * 0.35}s`
              : `porterRingIdle  3.60s ease-out infinite ${i * 1.18}s`,
          }}
        />
      ))}
      <div
        className="relative z-10 flex items-center justify-center rounded-[22px]"
        style={{
          width: 76, height: 76,
          fontSize: "2.1rem",
          background: streaming
            ? `linear-gradient(145deg, ${COLORS.ember}cc, ${COLORS.roseSmoke}aa)`
            : `linear-gradient(145deg, rgba(196,150,42,0.16), rgba(243,213,138,0.07))`,
          border: `1px solid ${streaming ? "rgba(198,90,46,0.48)" : "rgba(196,150,42,0.32)"}`,
          animation: streaming ? "porterBellActive 1.6s ease-in-out infinite" : "porterBellIdle 3.4s ease-in-out infinite",
        }}
      >
        🛎️
      </div>
    </div>
  );
}

const PORTER_INITIAL_MESSAGE = {
  role: "assistant",
  text: "I'm Porter — Global 85's private concierge. Before I start throwing city picks at you, tell me: what do you actually want out of this trip? What's your track, what industries excite you, and what would make this feel like a once-in-a-career experience for you specifically? The more you share, the sharper I can make the picks.",
};

export default function PorterPage() {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const userId = useMemo(() => getOrCreateUserId(), []);
  const [searchParams] = useSearchParams();
  const countryParam = searchParams.get("country") || "";
  const viewParam = searchParams.get("view") || "";
  // Deep-link: ?tab=brief (or any brief-scoped param) opens directly on the Briefs tab.
  const wantsBrief =
    searchParams.get("tab") === "brief" || Boolean(countryParam) || Boolean(viewParam);
  const [tab, setTab] = useState(wantsBrief ? "brief" : "chat");
  const [messages, setMessages] = useState([PORTER_INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [briefs, setBriefs] = useState([]);
  const [attachment, setAttachment] = useState(null); // { filename, type: "text"|"pdf", content }
  const [conversationLoaded, setConversationLoaded] = useState(false);

  // Load persistent conversation and briefs on mount
  useEffect(() => {
    fetchCountryBriefs().then(setBriefs).catch(() => {});
    loadConversation(userId).then((saved) => {
      if (saved && saved.length > 0) setMessages(saved);
      setConversationLoaded(true);
    }).catch(() => setConversationLoaded(true));
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const filename = file.name;

    if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      setAttachment({ filename, type: "text", content: result.value });
    } else if (filename.endsWith(".pdf")) {
      const b64 = await fileToBase64(file);
      setAttachment({ filename, type: "pdf", content: b64 });
    }
  }

  async function sendMessage(text = input) {
    const clean = (typeof text === "string" ? text : input).trim();
    if (!clean || streaming) return;

    const pendingAttachment = attachment;
    setAttachment(null);

    const displayText = pendingAttachment ? `[${pendingAttachment.filename}]\n\n${clean}` : clean;
    const next = [...messages, { role: "user", text: displayText }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/porter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, text: m.text })),
          briefs,
          ...(pendingAttachment && { attachment: pendingAttachment }),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Porter unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) { accumulated += parsed.text; setStreamingText(accumulated); }
            if (parsed.error) throw new Error(parsed.error);
          } catch {}
        }
      }

      const reply = { role: "assistant", text: accumulated || "No response — try again." };
      const finalMessages = [...next, reply];
      setMessages(finalMessages);
      saveConversation(userId, finalMessages).catch(() => {});
    } catch {
      const errMsg = { role: "assistant", text: "Porter hit a snag. Try again." };
      setMessages((prev) => { const m = [...prev, errMsg]; saveConversation(userId, m).catch(() => {}); return m; });
    } finally {
      setStreaming(false);
      setStreamingText("");
      inputRef.current?.focus();
    }
  }

  const allDisplayMessages = streaming
    ? [...messages, { role: "assistant", text: streamingText, streaming: true }]
    : messages;

  const statusLabel = streaming
    ? "Processing intel"
    : briefs.length > 0
    ? `${briefs.length} brief${briefs.length !== 1 ? "s" : ""} loaded`
    : "Standing by";

  return (
    <main className="pb-6">
      <PorterCSS />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden pt-7 pb-8 px-5">
        {/* Ambient radials */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(196,150,42,0.13), transparent)",
              "radial-gradient(circle at 18% 85%, rgba(198,90,46,0.09), transparent 42%)",
              "radial-gradient(circle at 88% 20%, rgba(243,213,138,0.06), transparent 36%)",
            ].join(", "),
          }}
        />
        {/* Drifting grid */}
        <div className="porter-grid pointer-events-none absolute inset-0 opacity-100" />

        {/* Horizontal accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(196,150,42,0.48) 35%, rgba(243,213,138,0.72) 50%, rgba(196,150,42,0.48) 65%, transparent 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <PorterBellRings streaming={streaming} />

          {/* Wordmark */}
          <div className="mt-4">
            <p
              className="text-[9px] uppercase font-black tracking-[0.52em] mb-2"
              style={{ color: "rgba(243,213,138,0.44)" }}
            >
              Global 85
            </p>
            <h1
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(3.4rem, 13vw, 5.8rem)",
                fontWeight: 900,
                letterSpacing: "0.20em",
                lineHeight: 1,
                background: `linear-gradient(155deg, ${COLORS.champagneLight} 0%, ${COLORS.champagne} 35%, ${COLORS.gold} 68%, ${COLORS.ember} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              PORTER
            </h1>
          </div>

          {/* Divider */}
          <div
            className="mt-4 h-px"
            style={{
              width: "min(280px,74vw)",
              background: "linear-gradient(90deg, transparent, rgba(196,150,42,0.52), rgba(243,213,138,0.76), rgba(196,150,42,0.52), transparent)",
            }}
          />

          {/* Tagline */}
          <p
            className="mt-3 text-[10px] uppercase tracking-[0.30em] font-bold"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            Private Cohort Concierge
          </p>

          {/* Status indicator */}
          <div className="mt-3 flex items-center gap-2.5">
            <span
              className={`rounded-full ${streaming ? "porter-status-active" : ""}`}
              style={{
                display: "inline-block",
                width: 6, height: 6,
                background: streaming ? COLORS.ember : COLORS.goldLight,
                boxShadow: streaming
                  ? `0 0 10px ${COLORS.ember}, 0 0 20px rgba(198,90,46,0.44)`
                  : `0 0 8px ${COLORS.goldLight}`,
              }}
            />
            <span
              className="text-[9px] uppercase tracking-[0.28em] font-black"
              style={{ color: streaming ? "rgba(232,120,60,0.72)" : "rgba(243,213,138,0.52)" }}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── TAB STRIP ────────────────────────────────────────── */}
      <div className="px-5 mb-5">
        <div
          className="flex rounded-2xl p-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {[["chat", "Ask Porter"], ["brief", "Briefs"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all"
              style={{
                background: tab === key
                  ? `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.ember})`
                  : "transparent",
                color: tab === key ? "#16060a" : "rgba(255,255,255,0.34)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CHAT TAB ─────────────────────────────────────────── */}
      {tab === "chat" && (
        <div className="px-5 flex flex-col gap-4">
          {/* Conversation panel */}
          <div
            className="relative rounded-[1.8rem] overflow-hidden flex flex-col"
            style={{
              background: "rgba(4,3,1,0.68)",
              border: "1px solid rgba(196,150,42,0.14)",
              minHeight: 340,
            }}
          >
            {/* Top accent line */}
            <div
              className="h-px shrink-0"
              style={{
                background: streaming
                  ? `linear-gradient(90deg, transparent, rgba(198,90,46,0.52), rgba(230,110,50,0.72), rgba(198,90,46,0.52), transparent)`
                  : `linear-gradient(90deg, transparent, rgba(196,150,42,0.36), rgba(243,213,138,0.52), rgba(196,150,42,0.36), transparent)`,
                transition: "background 0.6s ease",
              }}
            />

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-5 max-h-[500px] chamber-scrollbar">
              {allDisplayMessages.map((msg, i) => (
                <div key={i} className="porter-msg">
                  {msg.role === "assistant" ? (
                    <div>
                      {/* Porter briefing panel */}
                      <div
                        className="relative py-3.5 px-4 pl-[18px] rounded-r-2xl rounded-bl-2xl max-w-[94%]"
                        style={{
                          background: "rgba(255,255,255,0.038)",
                          borderLeft: `2.5px solid ${msg.streaming && !msg.text ? COLORS.ember : COLORS.gold}`,
                        }}
                      >
                        {msg.streaming && !msg.text ? (
                          <div className="flex items-center gap-2.5 py-0.5">
                            {[1, 2, 3].map((j) => (
                              <span
                                key={j}
                                className={`porter-dot-${j} inline-block rounded-full`}
                                style={{
                                  width: 7, height: 7,
                                  background: COLORS.goldLight,
                                  boxShadow: `0 0 7px ${COLORS.gold}`,
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="porter-prose text-sm leading-[1.75] text-white/80">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.text}
                            </ReactMarkdown>
                            {msg.streaming && (
                              <span
                                className="porter-cursor inline-block ml-0.5 align-middle"
                                style={{
                                  width: 2, height: "1em",
                                  background: COLORS.goldLight,
                                  borderRadius: 1,
                                  verticalAlign: "middle",
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className="text-[8px] uppercase tracking-[0.22em] font-black mt-1.5 ml-[20px]"
                        style={{ color: "rgba(196,150,42,0.38)" }}
                      >
                        Porter
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div
                        className="rounded-l-2xl rounded-br-2xl px-4 py-3 max-w-[88%] text-sm leading-[1.7] font-semibold"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne} 60%, ${COLORS.ember}88)`,
                          color: "#17060b",
                        }}
                      >
                        {msg.text}
                      </div>
                      <div
                        className="text-[8px] uppercase tracking-[0.22em] font-black mt-1.5 mr-1"
                        style={{ color: "rgba(255,255,255,0.20)" }}
                      >
                        You
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="p-3 shrink-0"
              style={{ borderTop: "1px solid rgba(196,150,42,0.10)" }}
            >
              {/* Attachment indicator */}
              {attachment && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-black" style={{ color: COLORS.champagne }}>
                    {attachment.filename}
                  </span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="text-[9px] opacity-50 hover:opacity-100 transition-opacity"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.pdf"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex gap-2 items-end">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={streaming}
                  title="Attach file (.docx or .pdf)"
                  className="shrink-0 rounded-2xl px-3 py-3 transition-all disabled:opacity-30"
                  style={{
                    background: attachment ? "rgba(196,150,42,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${attachment ? "rgba(196,150,42,0.42)" : "rgba(196,150,42,0.18)"}`,
                    color: attachment ? COLORS.champagne : "rgba(255,255,255,0.38)",
                    fontSize: "1rem",
                  }}
                >
                  📎
                </button>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder={streaming ? "Porter is processing…" : "Enter query…"}
                  disabled={streaming}
                  className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none disabled:opacity-40 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${input.trim() ? "rgba(196,150,42,0.38)" : "rgba(196,150,42,0.18)"}`,
                    color: "rgba(255,255,255,0.88)",
                    caretColor: COLORS.champagne,
                    maxHeight: 120,
                    lineHeight: 1.6,
                    fontFamily: "inherit",
                    transition: "border-color 0.2s",
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={streaming || !input.trim()}
                  className="shrink-0 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:opacity-30"
                  style={{
                    background: input.trim() && !streaming
                      ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`
                      : "rgba(255,255,255,0.05)",
                    color: input.trim() && !streaming ? "#16060a" : "rgba(255,255,255,0.28)",
                    border: "1px solid rgba(196,150,42,0.18)",
                  }}
                >
                  {streaming ? "···" : "Send"}
                </button>
              </div>
              <p
                className="text-[8px] uppercase tracking-[0.18em] mt-1.5 ml-1"
                style={{ color: "rgba(255,255,255,0.16)" }}
              >
                Enter to send · Shift+Enter for new line · Attach .docx or .pdf
              </p>
            </div>
          </div>

          {/* Brief memory indicator */}
          {briefs.length > 0 && (
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{
                background: "rgba(196,150,42,0.06)",
                border: "1px solid rgba(196,150,42,0.16)",
              }}
            >
              <span style={{ color: COLORS.gold, fontSize: "0.7rem" }}>◆</span>
              <p className="text-[10px] uppercase tracking-[0.18em] font-black" style={{ color: "rgba(243,213,138,0.54)" }}>
                Porter has {briefs.length} brief{briefs.length !== 1 ? "s" : ""} in memory —
              </p>
              <div className="flex flex-wrap gap-1.5">
                {briefs.map((b) => (
                  <span
                    key={b.id}
                    className="rounded-full px-2.5 py-0.5 text-[9px] font-bold border"
                    style={{
                      background: "rgba(196,150,42,0.08)",
                      borderColor: "rgba(196,150,42,0.22)",
                      color: "#FFD880",
                    }}
                  >
                    {b.country_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOSSIER TAB ──────────────────────────────────────── */}
      {tab === "brief" && (
        <CountryBriefTab
          briefs={briefs}
          onBriefSubmitted={(updated) => setBriefs(updated)}
          prefillCountry={countryParam}
          prefillTeam={countryParam ? (CITY_CHAMPIONS[countryParam] || "") : ""}
          viewCountry={viewParam}
        />
      )}
    </main>
  );
}

function BriefField({ label, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span
          className="text-[8px] uppercase tracking-[0.32em] font-black shrink-0"
          style={{ color: "rgba(196,150,42,0.50)" }}
        >
          {label}
        </span>
        <div className="flex-1 h-px" style={{ background: "rgba(196,150,42,0.14)" }} />
      </div>
      {children}
    </div>
  );
}

// Cohort-wide health & vaccination reference — pinned, not tied to any one country.
function HealthBrief() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative rounded-[1.8rem] overflow-hidden"
      style={{ background: "rgba(4,3,1,0.68)", border: "1px solid rgba(196,150,42,0.16)" }}
    >
      <div
        className="h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(196,150,42,0.52), rgba(243,213,138,0.72), rgba(196,150,42,0.52), transparent)" }}
      />

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-5 pt-5 pb-4 flex items-start justify-between gap-4"
      >
        <div className="min-w-0">
          <p
            className="text-[8px] uppercase tracking-[0.38em] font-black mb-1"
            style={{ color: "rgba(196,150,42,0.44)" }}
          >
            Global 85 · Cohort-wide · Everyone
          </p>
          <h2
            className="text-xl font-black"
            style={{ fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.88)" }}
          >
            {HEALTH_BRIEF_META.title}
          </h2>
          <p className="text-[11px] text-white/38 mt-1 leading-4">
            {HEALTH_BRIEF_META.scope} · Porter has this for every city
          </p>
        </div>
        <div
          className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center mt-0.5"
          style={{ border: "2px solid rgba(196,150,42,0.28)", background: "rgba(196,150,42,0.06)" }}
        >
          <span
            className="text-[10px] font-black transition-transform"
            style={{ color: COLORS.champagne, transform: open ? "rotate(180deg)" : "none" }}
          >
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5">
          <p className="text-[11px] text-white/44 leading-[1.6] mb-3">
            {HEALTH_BRIEF_META.intro}
          </p>
          <div
            className="overflow-x-auto rounded-xl chamber-scrollbar"
            style={{ border: "1px solid rgba(196,150,42,0.14)" }}
          >
            <table className="w-full text-left" style={{ borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr>
                  {["City", "Yellow Fever", "Malaria", "Vaccines / Health", "Special Notes"].map((h) => (
                    <th
                      key={h}
                      className="text-[8px] uppercase tracking-[0.14em] font-black px-3 py-2.5 whitespace-nowrap"
                      style={{
                        color: "rgba(243,213,138,0.62)",
                        background: "rgba(196,150,42,0.08)",
                        borderBottom: "1px solid rgba(196,150,42,0.22)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HEALTH_ROWS.map((r, i) => (
                  <tr
                    key={r.city}
                    style={{ background: i % 2 ? "rgba(255,255,255,0.018)" : "transparent" }}
                  >
                    <td
                      className="text-[11px] font-black px-3 py-2.5 align-top"
                      style={{ color: "rgba(255,255,255,0.86)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      {r.city}
                    </td>
                    <td className="text-[10px] px-3 py-2.5 align-top text-white/56" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{r.yellowFever}</td>
                    <td className="text-[10px] px-3 py-2.5 align-top text-white/56" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{r.malaria}</td>
                    <td className="text-[10px] px-3 py-2.5 align-top text-white/56" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{r.vaccines}</td>
                    <td className="text-[10px] px-3 py-2.5 align-top text-white/56" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[8px] uppercase tracking-[0.18em] mt-2.5 ml-0.5" style={{ color: "rgba(255,255,255,0.24)" }}>
            Source: {HEALTH_BRIEF_META.source} · Not medical advice — verify closer to travel
          </p>
        </div>
      )}
    </div>
  );
}

function CountryBriefTab({ briefs, onBriefSubmitted, prefillCountry = "", prefillTeam = "", viewCountry = "" }) {
  const [countryName, setCountryName] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedFileName, setParsedFileName] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [viewingBrief, setViewingBrief] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const cardRefs = useRef({});
  const prefilledRef = useRef(false);
  const viewedRef = useRef(false);

  // Prefill the submit form from ?country=NAME, once, so we never clobber typing.
  useEffect(() => {
    if (prefilledRef.current || !prefillCountry) return;
    prefilledRef.current = true;
    setCountryName(prefillCountry);
    if (prefillTeam) setTeamMembers(prefillTeam);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [prefillCountry, prefillTeam]);

  // View an existing brief from ?view=NAME: scroll to it and briefly highlight, once.
  useEffect(() => {
    if (viewedRef.current || !viewCountry || briefs.length === 0) return;
    const keys = briefKeysForComboName(viewCountry);
    const target = briefs.find((b) => keys.includes(normalizeBriefKey(b.country_name)));
    if (!target) return;
    viewedRef.current = true;
    const el = cardRefs.current[target.id];
    if (!el) return;
    requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    setHighlightId(target.id);
    const t = setTimeout(() => setHighlightId(null), 2000);
    return () => clearTimeout(t);
  }, [viewCountry, briefs]);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.name.endsWith(".pdf");
    const isDocx = file.name.endsWith(".docx") || file.name.endsWith(".doc");
    if (!isPdf && !isDocx) {
      setSubmitError("Only .docx or .pdf files are supported.");
      return;
    }
    setParsing(true);
    setSubmitError("");
    try {
      let extracted = "";
      if (isDocx) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extracted = result.value.trim();
        if (!extracted) throw new Error("No text found in the document.");
      } else {
        // PDF: send to extraction endpoint
        const b64 = await fileToBase64(file);
        const res = await fetch("/api/extract-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: b64 }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "PDF extraction failed.");
        extracted = data.text.trim();
        if (!extracted) throw new Error("No text found in the PDF.");
      }
      setContent(extracted);
      setParsedFileName(file.name);
      setAttachedFile(file);
    } catch (err) {
      setSubmitError(err.message || "Could not read the file.");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  async function handleSubmit() {
    if (!countryName.trim() || !content.trim()) {
      setSubmitError("Country name and brief content are required.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      await submitCountryBrief({ countryName, teamMembers, content, file: attachedFile });
      const updated = await fetchCountryBriefs();
      onBriefSubmitted(updated);
      setSubmitSuccess(true);
      setCountryName("");
      setTeamMembers("");
      setContent("");
      setParsedFileName("");
      setAttachedFile(null);
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function fieldStyle(name) {
    return {
      background: "rgba(255,255,255,0.042)",
      border: `1px solid ${focusedField === name ? "rgba(196,150,42,0.52)" : "rgba(196,150,42,0.16)"}`,
      boxShadow: focusedField === name ? "0 0 18px rgba(196,150,42,0.10)" : "none",
      color: "rgba(255,255,255,0.88)",
      caretColor: COLORS.champagne,
      transition: "border-color 0.2s, box-shadow 0.2s",
      outline: "none",
      fontFamily: "inherit",
    };
  }

  const canSubmit = countryName.trim() && content.trim() && !submitting;

  return (
    <div className="px-5 flex flex-col gap-4">
      {/* Cohort-wide health reference — always available to everyone */}
      <HealthBrief />

      {/* Brief form */}
      <div
        ref={formRef}
        className="relative rounded-[1.8rem] overflow-hidden"
        style={{ background: "rgba(4,3,1,0.68)", border: "1px solid rgba(196,150,42,0.16)" }}
      >
        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(196,150,42,0.52), rgba(243,213,138,0.72), rgba(196,150,42,0.52), transparent)" }}
        />

        <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[8px] uppercase tracking-[0.38em] font-black mb-1"
              style={{ color: "rgba(196,150,42,0.44)" }}
            >
              Global 85 · Intelligence Brief
            </p>
            <h2
              className="text-xl font-black"
              style={{ fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.88)" }}
            >
              Submit Brief
            </h2>
            <p className="text-[11px] text-white/38 mt-1 leading-4">
              Briefs due July 15 · Porter loads them automatically
            </p>
          </div>
          <div
            className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center mt-0.5"
            style={{ border: "2px solid rgba(196,150,42,0.28)", background: "rgba(196,150,42,0.06)" }}
          >
            <span style={{ fontSize: "1.3rem" }}>🛎️</span>
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-4">
          <BriefField label="Destination">
            <input
              value={countryName}
              onChange={(e) => setCountryName(e.target.value)}
              onFocus={() => setFocusedField("country")}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. Singapore"
              className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-white/28"
              style={fieldStyle("country")}
            />
          </BriefField>

          <BriefField label="Team">
            <input
              value={teamMembers}
              onChange={(e) => setTeamMembers(e.target.value)}
              onFocus={() => setFocusedField("team")}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. Sarah, Marcus, Priya, Devon"
              className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-white/28"
              style={fieldStyle("team")}
            />
          </BriefField>

          <BriefField label="Intelligence Brief">
            {/* File upload strip */}
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:opacity-40"
                style={{
                  background: "rgba(196,150,42,0.09)",
                  border: "1px solid rgba(196,150,42,0.28)",
                  color: COLORS.champagne,
                }}
              >
                {parsing ? "Reading…" : "Upload .docx or .pdf"}
              </button>
              {parsedFileName && !parsing && (
                <span className="text-[10px] text-white/38 truncate">{parsedFileName}</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocusedField("content")}
              onBlur={() => setFocusedField(null)}
              placeholder="Paste your brief here, or upload a .docx or .pdf above."
              rows={8}
              className="w-full rounded-xl px-4 py-3 text-sm leading-[1.7] resize-none placeholder:text-white/28"
              style={fieldStyle("content")}
            />
            <p
              className="text-[8px] uppercase tracking-[0.18em] mt-1.5 ml-0.5"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              No limit — feeds directly into Porter's context
            </p>
          </BriefField>

          {submitError && (
            <p className="text-[11px] font-black" style={{ color: "#fca5a5" }}>{submitError}</p>
          )}

          {submitSuccess && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: "rgba(196,150,42,0.08)", border: "1px solid rgba(196,150,42,0.28)" }}
            >
              <span style={{ color: COLORS.gold }}>◆</span>
              <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: COLORS.champagneLight }}>
                Brief submitted. Porter has it.
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.20em] transition-all disabled:opacity-35"
            style={{
              background: canSubmit
                ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne} 55%, ${COLORS.ember})`
                : "rgba(255,255,255,0.06)",
              color: canSubmit ? "#16060a" : "rgba(255,255,255,0.25)",
              border: "1px solid rgba(196,150,42,0.20)",
            }}
          >
            {submitting ? "Transmitting…" : "Transmit to Porter →"}
          </button>
        </div>
      </div>

      {/* Existing briefs */}
      {briefs.length > 0 && (
        <div>
          <p
            className="text-[8px] uppercase tracking-[0.32em] font-black mb-3 ml-1"
            style={{ color: "rgba(196,150,42,0.44)" }}
          >
            Submitted Briefs ({briefs.length}) · Porter's Memory
          </p>
          <div className="flex flex-col gap-2">
            {briefs.map((b, i) => (
              <div
                key={b.id}
                ref={(el) => { if (el) cardRefs.current[b.id] = el; }}
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.024)",
                  border: "1px solid rgba(196,150,42,0.12)",
                  borderLeft: "3px solid rgba(196,150,42,0.44)",
                  boxShadow: highlightId === b.id
                    ? `0 0 0 2px ${COLORS.gold}, 0 0 24px rgba(196,150,42,0.45)`
                    : "none",
                  transition: "box-shadow 0.6s ease",
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[8px] font-black uppercase tracking-[0.20em]"
                      style={{ color: "rgba(196,150,42,0.44)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-black text-white/90">{b.country_name}</span>
                  </div>
                  <span className="text-[9px] text-white/28 shrink-0">
                    {new Date(b.submitted_at).toLocaleDateString()}
                  </span>
                </div>
                {b.team_members && (
                  <p className="text-[10px] uppercase tracking-[0.16em] font-black mb-2" style={{ color: "rgba(255,255,255,0.30)" }}>
                    {b.team_members}
                  </p>
                )}
                <p className="text-[12px] text-white/48 leading-[1.6] line-clamp-3">{b.content}</p>
                {b.download_url && (
                  <div className="mt-2.5">
                    {b.file_type === "application/pdf" ? (
                      <button
                        onClick={() => setViewingBrief(b)}
                        className="text-[9px] font-black uppercase tracking-[0.18em]"
                        style={{ color: COLORS.champagne }}
                      >
                        View original PDF ↗
                      </button>
                    ) : (
                      <a
                        href={b.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] font-black uppercase tracking-[0.18em]"
                        style={{ color: COLORS.champagne }}
                      >
                        Download original file ({b.file_name}) ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewingBrief && (
        <Suspense fallback={null}>
          <PdfViewerModal
            url={viewingBrief.download_url}
            filename={viewingBrief.file_name}
            onClose={() => setViewingBrief(null)}
          />
        </Suspense>
      )}

      {briefs.length === 0 && (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p
            className="text-[9px] uppercase tracking-[0.32em] font-black mb-1.5"
            style={{ color: "rgba(196,150,42,0.44)" }}
          >
            Submitted Briefs (0)
          </p>
          <p className="text-[12px] text-white/44 leading-[1.6]">
            No briefs yet. Yours could be the first. Fill out the form above to send Porter your city intel.
          </p>
          <p className="text-[10px] text-white/28 uppercase tracking-[0.18em] mt-2">
            Teams have until July 15.
          </p>
        </div>
      )}
    </div>
  );
}
