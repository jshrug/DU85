import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";

const COLORS = {
  midnight: "#05050A",
  wine: "#1A0710",
  champagne: "#F3D58A",
  champagneLight: "#FFE8A3",
  ember: "#C65A2E",
};

const DESTINATIONS = [
  {
    label: "Destination One",
    eyebrow: "City One",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    tint: "rgba(5,20,70,0.38)",
    accent: "#60a5fa",
    accentRgb: "96,165,250",
    chipBg: "rgba(96,165,250,0.15)",
    chipBorder: "rgba(96,165,250,0.32)",
    chipText: "#bfdbfe",
    ring: "rgba(96,165,250,0.18)",
  },
  {
    label: "Destination Two",
    eyebrow: "City Two",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80",
    tint: "rgba(80,20,5,0.32)",
    accent: "#fb923c",
    accentRgb: "251,146,60",
    chipBg: "rgba(251,146,60,0.15)",
    chipBorder: "rgba(251,146,60,0.32)",
    chipText: "#fed7aa",
    ring: "rgba(251,146,60,0.18)",
  },
];

const BG =
  `radial-gradient(circle at 15% 55%, rgba(0,100,200,0.08) 0%, transparent 40%), ` +
  `radial-gradient(circle at 85% 55%, rgba(180,50,10,0.08) 0%, transparent 40%), ` +
  `radial-gradient(circle at 50% 18%, ${COLORS.champagne}20, transparent 26%), ` +
  `linear-gradient(180deg, ${COLORS.midnight} 0%, ${COLORS.wine} 52%, ${COLORS.midnight} 100%)`;

// ── Shared panel wrapper (handles desktop centering) ──────────────────────────
function Panel({ children, centered = false }) {
  return (
    <div
      className="fixed inset-0 z-50 text-white overflow-hidden"
      style={{ background: BG }}
    >
      <div className="h-full flex flex-col md:items-center md:justify-center">
        <div
          className="flex flex-col h-full w-full md:h-auto md:max-h-[90vh] md:w-[390px] md:rounded-[2.5rem] md:overflow-hidden md:shadow-[0_40px_120px_rgba(0,0,0,0.70)] md:border md:border-white/10"
          style={{
            ...(centered ? { background: BG } : {}),
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Name screen ───────────────────────────────────────────────────────────────
function NameScreen({ onSave }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => { setMounted(true); inputRef.current?.focus(); }, 120);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const name = value.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      await supabase?.auth.updateUser({ data: { display_name: name } });
    } catch {}
    onSave(name);
  }

  return (
    <Panel centered>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div
          className="text-center w-full max-w-xs transition-all duration-700 ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
          }}
        >
          <div className="text-5xl mb-5">🛎️</div>

          <div
            className="text-[10px] uppercase tracking-[0.30em] font-black mb-4"
            style={{ color: "rgba(243,213,138,0.65)" }}
          >
            Porter · Global 85
          </div>

          <h1
            className="text-3xl font-black leading-tight mb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Before we begin
          </h1>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.50)" }}>
            What should Porter call you?
          </p>

          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="First name"
              autoComplete="given-name"
              maxLength={32}
              className="w-full rounded-2xl px-5 py-4 text-base outline-none text-center font-bold"
              style={{
                background: "rgba(255,255,255,0.09)",
                border: "1px solid rgba(255,255,255,0.16)",
                color: "#fff",
                caretColor: COLORS.champagne,
              }}
            />
            <button
              type="submit"
              disabled={!value.trim() || saving}
              className="mt-3 w-full rounded-2xl px-5 py-4 font-black text-base transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
                color: "#17060b",
              }}
            >
              {saving ? "Saving…" : "Continue →"}
            </button>
          </form>
        </div>
      </div>
    </Panel>
  );
}

// ── Main splash ───────────────────────────────────────────────────────────────
function MainSplash({ displayName, isFirstTime, onComplete }) {
  const [mounted, setMounted] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  function handleEnter() {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete?.();
  }

  const greeting = displayName
    ? isFirstTime
      ? `Good to meet you, ${displayName}.`
      : `Welcome back, ${displayName}.`
    : "Two cities. One cohort. A smarter way to travel.";

  return (
    <Panel centered>
      {/* Header */}
      <div className="px-6 pt-8 pb-3 text-center shrink-0">
        <div
          className="text-[11px] uppercase tracking-[0.28em] font-black"
          style={{
            color: "rgba(243,213,138,0.76)",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-10px)",
            transition: "opacity 700ms ease, transform 700ms ease",
          }}
        >
          Daniels College of Business · EMBA
        </div>

        <div
          className="mt-3 text-5xl font-black leading-none"
          style={{
            fontFamily: "Georgia, serif",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-10px)",
            transition: "opacity 800ms ease 100ms, transform 800ms ease 100ms",
          }}
        >
          Global{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.champagneLight}, ${COLORS.ember})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            85
          </span>
        </div>

        <div
          className="mt-2 text-sm italic"
          style={{
            color: "rgba(255,248,232,0.72)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 800ms ease 250ms",
          }}
        >
          {greeting}
        </div>
      </div>

      {/* Cards — flex-1 so they fill available space on any screen size */}
      <div className="flex-1 min-h-0 px-4 pb-3">
        <div className="h-full grid grid-cols-2 gap-3">
          {DESTINATIONS.map((dest, index) => (
            <div
              key={dest.label}
              className="relative overflow-hidden rounded-[1.5rem] border"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0) scale(1)" : `translateY(26px) scale(0.96)`,
                transition: `opacity 900ms ease ${250 + index * 140}ms, transform 900ms ease ${250 + index * 140}ms`,
              }}
            >
              {/* Photo */}
              <img
                src={dest.image}
                alt={dest.label}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: mounted ? "scale(1.03)" : "scale(1.10)",
                  transition: "transform 1800ms ease",
                }}
              />

              {/* Dark gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(5,5,10,0.12) 0%, rgba(5,5,10,0.50) 50%, rgba(5,5,10,0.92) 100%)",
                }}
              />

              {/* Color tint */}
              <div className="absolute inset-0" style={{ background: dest.tint }} />

              {/* Decorative rings */}
              {[150, 100, 58].map((size, ri) => (
                <div
                  key={size}
                  className="absolute rounded-full"
                  style={{
                    width: size, height: size,
                    top: -size / 2.8, right: -size / 2.8,
                    border: `1px solid ${dest.ring}`,
                    opacity: 1 - ri * 0.25,
                  }}
                />
              ))}

              {/* Eyebrow chip */}
              <div className="absolute top-3 left-3 right-3">
                <div
                  className="inline-flex rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-black border"
                  style={{
                    color: dest.chipText,
                    background: dest.chipBg,
                    borderColor: dest.chipBorder,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {dest.eyebrow}
                </div>
              </div>

              {/* Bottom label */}
              <div className="absolute bottom-4 left-3 right-3">
                <div
                  className="text-base font-black leading-tight"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {dest.label}
                </div>
                <div
                  className="mt-2 h-px w-full"
                  style={{
                    background: `linear-gradient(to right, rgba(${dest.accentRgb},0.65), transparent)`,
                  }}
                />
                <p
                  className="mt-2 text-[10px] leading-4"
                  style={{ color: "rgba(255,255,255,0.48)" }}
                >
                  To be announced
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-6 pt-1 shrink-0">
        <button
          onClick={handleEnter}
          className="w-full rounded-2xl px-5 py-4 font-black text-left shadow-2xl transition-all active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
            color: "#17060b",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 800ms ease 650ms, transform 800ms ease 650ms",
          }}
        >
          <div className="text-xs uppercase tracking-[0.18em] opacity-70">
            Enter the cohort app
          </div>
          <div className="text-lg">Open Porter</div>
        </button>

        <div
          className="mt-3 text-center text-xs"
          style={{
            color: "rgba(255,248,232,0.38)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 800ms ease 800ms",
          }}
        >
          Destinations to be announced
        </div>
      </div>
    </Panel>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function SplashScreen({ onComplete, user }) {
  const savedName = user?.user_metadata?.display_name || "";
  const isFirstTimeRef = useRef(!savedName);
  const [stage, setStage] = useState(savedName ? "splash" : "name");
  const [displayName, setDisplayName] = useState(savedName);

  function handleNameSave(name) {
    setDisplayName(name);
    setStage("splash");
  }

  if (stage === "name") return <NameScreen onSave={handleNameSave} />;

  return (
    <MainSplash
      displayName={displayName}
      isFirstTime={isFirstTimeRef.current}
      onComplete={onComplete}
    />
  );
}
