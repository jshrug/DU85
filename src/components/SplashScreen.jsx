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
    gradient: "linear-gradient(155deg, #000d26 0%, #0a2c6e 40%, #0c5aac 75%, #0a8fbf 100%)",
    glows: [
      "radial-gradient(circle at 35% 22%, rgba(0,180,240,0.38) 0%, transparent 52%)",
      "radial-gradient(circle at 70% 75%, rgba(10,65,155,0.45) 0%, transparent 48%)",
    ],
    ring: "rgba(0,194,255,0.18)",
    accent: "#00c2ff",
    accentRgb: "0,194,255",
    chipBg: "rgba(0,180,240,0.16)",
    chipBorder: "rgba(0,194,255,0.32)",
    chipText: "#7dd8f5",
    numeral: "1",
    shadow: "0 24px 80px rgba(0,0,0,0.55), 0 0 60px rgba(0,160,220,0.28)",
  },
  {
    label: "Destination Two",
    eyebrow: "City Two",
    gradient: "linear-gradient(155deg, #160103 0%, #7a0e10 42%, #c41c1c 76%, #e55c16 100%)",
    glows: [
      "radial-gradient(circle at 35% 22%, rgba(255,120,40,0.30) 0%, transparent 52%)",
      "radial-gradient(circle at 70% 75%, rgba(180,15,15,0.45) 0%, transparent 48%)",
    ],
    ring: "rgba(255,140,60,0.18)",
    accent: "#ff8533",
    accentRgb: "255,133,51",
    chipBg: "rgba(255,120,40,0.16)",
    chipBorder: "rgba(255,140,60,0.32)",
    chipText: "#f5b87d",
    numeral: "2",
    shadow: "0 24px 80px rgba(0,0,0,0.55), 0 0 60px rgba(200,60,10,0.28)",
  },
];

const BG = (
  `radial-gradient(circle at 15% 58%, rgba(0,140,210,0.10) 0%, transparent 40%), ` +
  `radial-gradient(circle at 85% 58%, rgba(200,50,15,0.10) 0%, transparent 40%), ` +
  `radial-gradient(circle at 50% 18%, ${COLORS.champagne}24, transparent 26%), ` +
  `linear-gradient(180deg, ${COLORS.midnight} 0%, ${COLORS.wine} 52%, ${COLORS.midnight} 100%)`
);

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
    <div
      className="fixed inset-0 z-50 overflow-hidden text-white flex flex-col items-center justify-center px-8"
      style={{ background: BG }}
    >
      <div
        className="text-center w-full max-w-xs transition-all duration-700 ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <div style={{
          fontSize: "44px", lineHeight: 1, marginBottom: "20px",
        }}>🛎️</div>

        <div className="text-[10px] uppercase tracking-[0.30em] font-black mb-4"
          style={{ color: "rgba(243,213,138,0.65)" }}>
          Porter · Global 85
        </div>

        <h1 className="text-3xl font-black leading-tight mb-2" style={{ fontFamily: "Georgia, serif" }}>
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
    <div
      className="fixed inset-0 z-50 overflow-hidden text-white"
      style={{ background: BG }}
    >
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
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
            <span style={{
              background: `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.champagneLight}, ${COLORS.ember})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
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

        {/* Cards */}
        <div className="flex-1 px-5 pb-5 flex items-center">
          <div className="w-full grid grid-cols-2 gap-3">
            {DESTINATIONS.map((dest, index) => (
              <div
                key={dest.label}
                className="relative overflow-hidden rounded-[1.75rem] border"
                style={{
                  minHeight: "54vh",
                  background: dest.gradient,
                  borderColor: "rgba(255,255,255,0.10)",
                  boxShadow: dest.shadow,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0) scale(1)" : `translateY(26px) scale(0.96)`,
                  transition: `opacity 900ms ease ${250 + index * 140}ms, transform 900ms ease ${250 + index * 140}ms`,
                }}
              >
                {dest.glows.map((g, gi) => (
                  <div key={gi} className="absolute inset-0" style={{ background: g }} />
                ))}

                {[170, 115, 66].map((size, ri) => (
                  <div
                    key={size}
                    className="absolute rounded-full"
                    style={{
                      width: size, height: size,
                      top: -size / 2.8, right: -size / 2.8,
                      border: `1px solid ${dest.ring}`,
                      opacity: 1 - ri * 0.22,
                    }}
                  />
                ))}

                <div
                  className="absolute"
                  style={{
                    width: "1px", height: "50%",
                    background: `linear-gradient(to bottom, transparent, rgba(${dest.accentRgb},0.45), transparent)`,
                    right: "36%", top: "20%",
                    transform: "rotate(16deg)",
                  }}
                />

                <div
                  className="absolute select-none pointer-events-none"
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: "150px",
                    fontWeight: 900,
                    color: `rgba(${dest.accentRgb},0.06)`,
                    bottom: "20px",
                    right: "-6px",
                    lineHeight: 1,
                  }}
                >
                  {dest.numeral}
                </div>

                <div className="absolute top-4 left-4 right-4">
                  <div
                    className="inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-black border"
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

                <div className="absolute bottom-5 left-4 right-4">
                  <div className="text-2xl font-black leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                    {dest.label}
                  </div>
                  <div
                    className="mt-3 h-[1px] w-full"
                    style={{ background: `linear-gradient(to right, rgba(${dest.accentRgb},0.70), transparent)` }}
                  />
                  <p className="mt-3 text-xs leading-5" style={{ color: "rgba(255,255,255,0.50)" }}>
                    Placeholder city preview. Swap this image and label once the destination is confirmed.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-7">
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
              color: "rgba(255,248,232,0.42)",
              opacity: mounted ? 1 : 0,
              transition: "opacity 800ms ease 800ms",
            }}
          >
            Destinations to be announced
          </div>
        </div>
      </div>
    </div>
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

  if (stage === "name") {
    return <NameScreen onSave={handleNameSave} />;
  }

  return (
    <MainSplash
      displayName={displayName}
      isFirstTime={isFirstTimeRef.current}
      onComplete={onComplete}
    />
  );
}
