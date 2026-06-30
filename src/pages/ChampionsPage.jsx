import { COLORS } from "../constants.js";
import { CITY_CHAMPIONS, ANCHOR_COUNTRIES, CITY_B_MAP } from "../data/cityData.js";
import { countryIcon } from "../utils/voteUtils.js";
import SectionTitle from "../components/SectionTitle.jsx";

export default function ChampionsPage() {
  const cities = Object.keys(CITY_CHAMPIONS);
  const assigned = cities.filter((c) => CITY_CHAMPIONS[c]);
  const pending = cities.filter((c) => !CITY_CHAMPIONS[c]);

  return (
    <main className="px-5 py-5 pb-24">
      <section
        className="rounded-[2rem] p-5 border border-white/10"
        style={{ background: `linear-gradient(135deg, rgba(196,150,42,0.08), rgba(0,0,0,0.3))`, borderColor: "rgba(196,150,42,0.18)" }}
      >
        <p className="text-[9px] uppercase tracking-[0.32em] font-black" style={{ color: COLORS.champagne }}>
          Global 85 · Destination Research
        </p>
        <h1 className="mt-2 text-2xl font-black leading-tight" style={{ fontFamily: "Georgia, serif" }}>
          City Champions
        </h1>
        <p className="mt-2 text-sm text-white/55 leading-5">
          Each city has a champion team responsible for research, the brief submitted to Porter, and the 5-minute presentation on July 10.
        </p>
      </section>

      <section className="mt-5 grid gap-3">
        <SectionTitle eyebrow="City A options" title="Research teams" />
        {cities.map((cityName) => {
          const team = CITY_CHAMPIONS[cityName];
          const country = ANCHOR_COUNTRIES.find((c) => c.name === cityName);
          const cityBOptions = CITY_B_MAP[cityName] || [];

          return (
            <div
              key={cityName}
              className="rounded-[1.6rem] p-4 border"
              style={{
                background: team ? "rgba(196,150,42,0.06)" : "rgba(255,255,255,0.04)",
                borderColor: team ? "rgba(196,150,42,0.22)" : "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {country ? countryIcon(country) : "🌐"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-white">{cityName}</h3>
                    {team ? (
                      <span
                        className="text-[9px] uppercase tracking-[0.14em] font-black px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(196,150,42,0.18)", color: COLORS.champagne }}
                      >
                        Assigned
                      </span>
                    ) : (
                      <span
                        className="text-[9px] uppercase tracking-[0.14em] font-black px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(186,12,47,0.15)", color: COLORS.crimsonBright }}
                      >
                        Open
                      </span>
                    )}
                  </div>
                  {team ? (
                    <p className="text-sm text-white/65 mt-0.5">{team}</p>
                  ) : (
                    <p className="text-xs mt-0.5 font-semibold" style={{ color: COLORS.crimsonBright }}>
                      Be the first to champion {cityName}
                    </p>
                  )}
                  {cityBOptions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cityBOptions.map((b) => (
                        <span
                          key={b}
                          className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                          style={{ borderColor: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.40)" }}
                        >
                          + {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {pending.length > 0 && (
        <p className="mt-5 text-center text-xs text-white/25 uppercase tracking-[0.18em]">
          {pending.length} assignment{pending.length !== 1 ? "s" : ""} pending · teams announced June 26
        </p>
      )}
    </main>
  );
}
