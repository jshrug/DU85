import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../constants.js";
import { CITY_CHAMPIONS, ANCHOR_COUNTRIES } from "../data/cityData.js";
import { countryIcon, buildCombos, normalizeBriefKey, briefKeysForCombo } from "../utils/voteUtils.js";
import { fetchCountryBriefs } from "../lib/porterMemory.js";
import SectionTitle from "../components/SectionTitle.jsx";

export default function ChampionsPage() {
  // Each combo is one City A + City B pairing a team can champion.
  const combos = buildCombos(ANCHOR_COUNTRIES);
  const pending = combos.filter((c) => !CITY_CHAMPIONS[c.name]);

  // Normalized lookup of names that already have a submitted brief, so either
  // filing convention ("Nairobi + Cape Town" or 'Cape Town "B"') is recognized.
  const [briefedCities, setBriefedCities] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    fetchCountryBriefs()
      .then((rows) => {
        if (!active) return;
        const set = new Set(
          (rows || [])
            .map((r) => normalizeBriefKey(r?.country_name))
            .filter(Boolean)
        );
        setBriefedCities(set);
      })
      .catch(() => {
        if (active) setBriefedCities(new Set());
      });
    return () => {
      active = false;
    };
  }, []);

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
          City A is down to Nairobi and Istanbul. Each pairing below (City A + City B) needs a champion team responsible for research, the brief submitted to Porter, and the presentation ahead of the combo vote on July 18.
        </p>
      </section>

      {["Nairobi", "Istanbul"].map((anchorName) => (
        <section key={anchorName} className="mt-5 grid gap-3">
          <SectionTitle eyebrow={`${anchorName} pairings`} title="Combo champions" />
          {combos
            .filter((combo) => combo.cityA.name === anchorName)
            .map((combo) => {
              const team = CITY_CHAMPIONS[combo.name];
              const hasBrief = briefKeysForCombo(combo).some((k) => briefedCities.has(k));
              const encoded = encodeURIComponent(combo.name);

              return (
                <div
                  key={combo.name}
                  className="group rounded-[1.6rem] p-4 border transition-all duration-200 hover:border-white/20 hover:-translate-y-0.5"
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
                      {countryIcon(combo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-white">{combo.name}</h3>
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
                          Be the first to champion {combo.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <Link
                      to={`/porter?tab=brief&country=${encoded}`}
                      className="flex-1 text-center text-[10px] uppercase tracking-[0.16em] font-black px-3 py-2 rounded-2xl transition-all duration-150 active:scale-[0.97]"
                      style={{ background: "rgba(196,150,42,0.14)", color: COLORS.champagne, border: "1px solid rgba(196,150,42,0.28)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(196,150,42,0.24)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(196,150,42,0.14)"; }}
                    >
                      Submit brief
                    </Link>
                    {hasBrief ? (
                      <Link
                        to={`/porter?tab=brief&view=${encoded}`}
                        className="flex-1 text-center text-[10px] uppercase tracking-[0.16em] font-black px-3 py-2 rounded-2xl transition-all duration-150 active:scale-[0.97]"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.82)", border: "1px solid rgba(255,255,255,0.14)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                      >
                        See brief
                      </Link>
                    ) : (
                      <span
                        className="flex-1 text-center text-[10px] uppercase tracking-[0.16em] font-black px-3 py-2 rounded-2xl select-none"
                        style={{ background: "rgba(196,150,42,0.06)", color: "rgba(243,213,138,0.60)", border: "1px solid rgba(196,150,42,0.16)" }}
                      >
                        Brief coming soon ✨
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </section>
      ))}

      {pending.length > 0 && (
        <p className="mt-5 text-center text-xs text-white/25 uppercase tracking-[0.18em]">
          {pending.length} pairing{pending.length !== 1 ? "s" : ""} still open · new round started July 12
        </p>
      )}
    </main>
  );
}
