import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isTripReady, subscribeCohortMembers } from "../lib/members";
import { COLORS } from "../constants.js";

const LABELS = {
  passportValid: "Passport valid past June 4",
  visaTurkey: "Turkey visa",
  visaKenya: "Kenya visa",
  vaccinesStarted: "Vaccines started",
};

function statusLabel(value) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Not yet";
}

export default function Roster() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeCohortMembers((rows) => {
      setMembers(rows);
      setLoading(false);
    });
    return unsub;
  }, []);

  const readyCount = useMemo(() => members.filter(isTripReady).length, [members]);

  return (
    <main className="px-5 py-5 pb-28">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06]">
        <p className="text-xs uppercase tracking-[0.22em] font-bold" style={{ color: COLORS.champagne }}>
          Command center
        </p>
        <h1 className="text-3xl font-black mt-2" style={{ fontFamily: "Georgia, serif" }}>
          Roster
        </h1>
        <p className="text-sm text-white/60 mt-3 leading-6">
          Trip-readiness only. No passport numbers. No medical details. Update yours on Profile.
        </p>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-white/45">
          {loading ? "..." : `${readyCount} of ${members.length} trip-ready`}
        </p>
      </section>

      <Link
        to="/me"
        className="mt-4 flex w-full items-center justify-center rounded-2xl px-4 py-3.5 font-black"
        style={{
          background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
          color: "#17060b",
        }}
      >
        Update my status
      </Link>

      <div className="mt-5 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 h-24 animate-pulse" />
          ))
        ) : (
          members.map((member) => {
            const ready = isTripReady(member);
            return (
              <article key={member.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black" style={{ fontFamily: "Georgia, serif" }}>
                      {member.displayName || "Member"}
                    </h2>
                    <p className="mt-1 text-xs text-white/40">{member.email}</p>
                  </div>
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.14em] rounded-full px-2 py-0.5"
                    style={
                      ready
                        ? { background: "rgba(243,213,138,0.16)", color: COLORS.champagneLight }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }
                    }
                  >
                    {ready ? "Ready" : "Open"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/55">
                  {Object.entries(LABELS).map(([key, label]) => (
                    <div key={key}>
                      <div className="uppercase tracking-[0.12em] text-white/35">{label}</div>
                      <div className="mt-0.5 font-bold text-white/80">{statusLabel(member[key])}</div>
                    </div>
                  ))}
                </div>
                {member.roomPreference && member.roomPreference !== "unknown" && (
                  <p className="mt-3 text-xs text-white/40">
                    Room: {member.roomPreference === "single" ? "Single (upgrade)" : "Double"}
                  </p>
                )}
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}
