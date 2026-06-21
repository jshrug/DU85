import { useEffect, useRef, useState } from "react";

const COLORS = {
  midnight: "#05050A",
  wine: "#1A0710",
  deepWine: "#2A0B12",
  roseSmoke: "#8F3F4F",
  champagne: "#F3D58A",
  champagneLight: "#FFE8A3",
  ember: "#C65A2E",
};

const DESTINATIONS = [
  {
    label: "Destination One",
    eyebrow: "City One",
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  },
  {
    label: "Destination Two",
    eyebrow: "City Two",
    src: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=80",
  },
];

export default function SplashScreen({ onComplete }) {
  const [mounted, setMounted] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  function handleEnter() {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden text-white"
      style={{
        background:
          `radial-gradient(circle at 50% 18%, ${COLORS.champagne}24, transparent 26%), ` +
          `linear-gradient(180deg, ${COLORS.midnight} 0%, ${COLORS.wine} 52%, ${COLORS.midnight} 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            `radial-gradient(circle at 18% 25%, ${COLORS.roseSmoke}38, transparent 30%), ` +
            `radial-gradient(circle at 86% 35%, ${COLORS.ember}33, transparent 28%)`,
        }}
      />

      <div className="relative z-10 h-full flex flex-col">
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
            Two cities. One cohort. A smarter way to travel.
          </div>
        </div>

        <div className="flex-1 px-5 pb-5 flex items-center">
          <div className="w-full grid grid-cols-2 gap-3">
            {DESTINATIONS.map((destination, index) => (
              <div
                key={destination.label}
                className="relative overflow-hidden rounded-[1.75rem] border shadow-2xl"
                style={{
                  minHeight: "54vh",
                  borderColor: "rgba(243,213,138,0.20)",
                  boxShadow: `0 24px 80px rgba(0,0,0,0.45), 0 0 48px ${
                    index === 0 ? "rgba(143,63,79,0.20)" : "rgba(198,90,46,0.18)"
                  }`,
                  opacity: mounted ? 1 : 0,
                  transform: mounted
                    ? "translateY(0) scale(1)"
                    : `translateY(26px) scale(0.96)`,
                  transition: `opacity 900ms ease ${250 + index * 140}ms, transform 900ms ease ${
                    250 + index * 140
                  }ms`,
                }}
              >
                <img
                  src={destination.src}
                  alt={destination.label}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    objectFit: "cover",
                    objectPosition: "center",
                    transform: mounted ? "scale(1.03)" : "scale(1.12)",
                    transition: "transform 1800ms ease",
                  }}
                />

                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(5,5,10,0.10) 0%, rgba(5,5,10,0.48) 45%, rgba(5,5,10,0.88) 100%)",
                  }}
                />

                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      index === 0
                        ? `radial-gradient(circle at 30% 20%, ${COLORS.champagne}2b, transparent 30%)`
                        : `radial-gradient(circle at 70% 25%, ${COLORS.ember}33, transparent 30%)`,
                  }}
                />

                <div className="absolute top-4 left-4 right-4">
                  <div
                    className="inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-black border"
                    style={{
                      color: COLORS.champagneLight,
                      background: "rgba(0,0,0,0.32)",
                      borderColor: "rgba(243,213,138,0.22)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {destination.eyebrow}
                  </div>
                </div>

                <div className="absolute bottom-5 left-4 right-4">
                  <div
                    className="text-2xl font-black leading-tight"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {destination.label}
                  </div>

                  <div
                    className="mt-3 h-[1px] w-full"
                    style={{
                      background: `linear-gradient(to right, ${COLORS.champagne}, transparent)`,
                    }}
                  />

                  <p className="mt-3 text-xs leading-5 text-white/62">
                    Placeholder city preview. Swap this image and label once the destination is confirmed.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-7">
          <button
            onClick={handleEnter}
            className="w-full rounded-2xl px-5 py-4 font-black text-left shadow-2xl"
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