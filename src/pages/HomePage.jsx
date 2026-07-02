import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { COLORS, COHORT_SIZE, TRIP_DATE } from "../constants.js";
import { COHORT_EVENTS } from "../data/cityData.js";
import { timeUntilDeparture, getCountryByName, countryIcon } from "../utils/voteUtils.js";
import useLockedDestinations from "../hooks/useLockedDestinations.js";
import useCastCount from "../hooks/useCastCount.js";
import SectionTitle from "../components/SectionTitle.jsx";
import EventMonthGrid from "../components/EventMonthGrid.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

function TripCountdownSection({ tripDate, anchorWinner, companionWinner }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    function calc() {
      const diff = new Date(tripDate) - new Date();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    }
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [tripDate]);

  if (!timeLeft) return null;
  const aw = getCountryByName(anchorWinner);
  const cw = getCountryByName(companionWinner);

  return (
    <section className="mx-5 mt-5">
      <div
        className="rounded-[2rem] overflow-hidden border"
        style={{
          borderColor: "rgba(196,150,42,0.24)",
          background:
            "linear-gradient(135deg, rgba(14,10,0,0.92), rgba(8,6,0,0.88)), radial-gradient(circle at 20% 0%, rgba(196,150,42,0.22), transparent 50%)",
        }}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E8B84B] shadow-[0_0_10px_rgba(232,184,75,0.8)] animate-pulse" />
            <div className="text-[9px] uppercase tracking-[0.28em] font-black" style={{ color: "#FFD880" }}>
              Destination locked · T-minus
            </div>
          </div>

          <div className="flex gap-5 items-end">
            {[["days", timeLeft.days], ["hrs", timeLeft.hours], ["min", timeLeft.minutes]].map(([label, val]) => (
              <div key={label}>
                <div className="text-5xl font-black tabular-nums leading-none" style={{ color: COLORS.champagneLight }}>
                  {String(val).padStart(2, "0")}
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/38 font-black mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            {aw && (
              <div
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black"
                style={{ borderColor: "rgba(243,213,138,0.22)", background: "rgba(196,150,42,0.08)", color: COLORS.champagneLight }}
              >
                {countryIcon(aw)} {aw.name}
              </div>
            )}
            {aw && cw && <span className="text-white/30 text-xs">+</span>}
            {cw && (
              <div
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black"
                style={{ borderColor: "rgba(243,213,138,0.22)", background: "rgba(196,150,42,0.08)", color: COLORS.champagneLight }}
              >
                {countryIcon(cw)} {cw.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage({ onAsk }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || "";
  const { anchorWinner, companionWinner } = useLockedDestinations();
  const routeLocked = Boolean(anchorWinner && companionWinner);
  const { castCount } = useCastCount();
  const [timeLeft, setTimeLeft] = useState(timeUntilDeparture);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const t = setTimeout(() => setTimeLeft(timeUntilDeparture()), midnight - new Date());
    return () => clearTimeout(t);
  }, [timeLeft]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextEvent = COHORT_EVENTS.find((e) => e.fullDate >= today);
  const daysToNext = nextEvent ? Math.ceil((nextEvent.fullDate - today) / 86400000) : null;
  const voteLabel = routeLocked ? "Route locked" : "Voting open";

  return (
    <main className="py-5">
      {routeLocked && TRIP_DATE && (
        <TripCountdownSection tripDate={TRIP_DATE} anchorWinner={anchorWinner} companionWinner={companionWinner} />
      )}

      {/* Greeting + countdown */}
      <div className="px-5 mb-1 flex items-end justify-between">
        <div>
          <div className="text-2xl font-black leading-tight" style={{ fontFamily: "Georgia, serif" }}>
            {displayName ? `Hey, ${displayName}.` : "Global 85"}
          </div>
          <div className="text-xs uppercase tracking-[0.20em] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Your trip is coming
          </div>
        </div>
        <div className="flex items-end gap-4">
          {[
            { value: timeLeft.months, label: timeLeft.months === 1 ? "month" : "months" },
            { value: timeLeft.days,   label: timeLeft.days   === 1 ? "day"   : "days"   },
          ].map(({ value, label }) => (
            <div key={label} className="text-right">
              <div style={{
                fontFamily: "Georgia, serif", fontSize: "40px", fontWeight: 700,
                lineHeight: 1, letterSpacing: "-1px",
                background: `linear-gradient(135deg, ${COLORS.goldLight} 0%, ${COLORS.champagne} 45%, ${COLORS.gold} 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{value}</div>
              <div style={{
                fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.40)", fontWeight: 600, marginTop: "2px",
              }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5">
        <section
          className="rounded-[2rem] p-5 overflow-hidden border border-white/10 shadow-2xl relative"
          style={{
            background: `linear-gradient(135deg, ${COLORS.roseSmoke} 0%, ${COLORS.wine} 58%, ${COLORS.midnight} 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                `radial-gradient(circle at 20% 15%, ${COLORS.champagne}80, transparent 20%), ` +
                `radial-gradient(circle at 88% 38%, ${COLORS.ember}55, transparent 22%)`,
            }}
          />

          <div className="relative z-10">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 border text-xs font-bold"
              style={{
                background: "rgba(0,0,0,0.25)",
                borderColor: "rgba(243,213,138,0.22)",
                color: COLORS.champagneLight,
              }}
            >
              🛎️ Porter · private cohort concierge
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              A smarter command center for Global 85.
            </h1>

            <p className="mt-3 text-white/75 text-sm leading-6">
              Porter, destination votes, trip planning, and everything the cohort needs on the road.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={onAsk}
                className="rounded-2xl px-4 py-4 font-black text-left shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
                  color: "#17060b",
                }}
              >
                <div className="text-xs uppercase tracking-[0.18em] opacity-70">Ask Porter</div>
                <div className="text-base">Get a recommendation</div>
              </button>

              <button
                onClick={() => navigate("/votes")}
                className="rounded-2xl px-4 py-4 font-black text-left shadow-xl relative overflow-hidden"
                style={
                  routeLocked
                    ? { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }
                    : { background: `linear-gradient(135deg, ${COLORS.crimson}, ${COLORS.roseSmoke}, ${COLORS.ember})`, color: "#fff" }
                }
              >
                {!routeLocked && (
                  <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                  </span>
                )}
                <div className="text-xs uppercase tracking-[0.18em] opacity-70">
                  {routeLocked ? "Route locked" : "Live Vote"}
                </div>
                <div className="text-base">{routeLocked ? "See results" : "Open chamber"}</div>
                {!routeLocked && castCount !== null && (
                  <div className="mt-1 text-[10px] font-bold opacity-65">{castCount} of {COHORT_SIZE} cast</div>
                )}
              </button>
            </div>

            <div className="mt-3.5 flex justify-center">
              <Link
                to="/porter?tab=brief"
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold text-white/45 transition-colors hover:text-white/75"
              >
                <span aria-hidden>📝</span>
                Submit your brief
                <span aria-hidden className="text-white/30">›</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <FeatureTile icon="🗳️" label="Destination Vote" value={voteLabel} onClick={() => navigate("/votes")} />
          <FeatureTile
            icon="📅"
            label="Next Key Date"
            value={daysToNext !== null ? (daysToNext === 0 ? "Today" : `${daysToNext}d`) : "—"}
            onClick={() => setShowCalendar(true)}
          />
        </section>

        <section className="mt-6 grid gap-3">
          <SectionTitle eyebrow="Upcoming" title="Key dates" />
          {COHORT_EVENTS.map((event) => (
            <SmallEventCard key={event.id} event={event} today={today} />
          ))}
        </section>
      </div>

      <KeyDatesCalendar open={showCalendar} onClose={() => setShowCalendar(false)} events={COHORT_EVENTS} />
    </main>
  );
}

function FeatureTile({ icon, label, value, onClick }) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className="text-2xl">{icon}</div>
        {onClick && <span aria-hidden className="text-lg leading-none text-white/30">›</span>}
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-white/38 font-bold">{label}</div>
      <div className="mt-1 font-black" style={{ color: COLORS.champagneLight }}>
        {value}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-left rounded-3xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/[0.10] hover:border-white/20 active:scale-[0.98]"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      {inner}
    </div>
  );
}


function KeyDatesCalendar({ open, onClose, events }) {
  const [selectedEvents, setSelectedEvents] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (selectedEvents) setSelectedEvents(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, selectedEvents]);

  if (!open) return null;

  const sorted = events.slice().sort((a, b) => a.fullDate - b.fullDate);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 p-5 sm:max-w-md sm:rounded-[2rem]"
        style={{ background: "rgba(12,10,16,0.98)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.32em] font-black" style={{ color: COLORS.champagne }}>
              Global 85 · Schedule
            </p>
            <h2 className="mt-1 text-2xl font-black" style={{ fontFamily: "Georgia, serif" }}>Key Dates</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        <EventMonthGrid events={events} onEventClick={setSelectedEvents} />

        {selectedEvents && (
          <div className="mt-5 grid gap-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] uppercase tracking-[0.28em] font-black" style={{ color: COLORS.champagne }}>
                {selectedEvents[0].date}
              </p>
              <button onClick={() => setSelectedEvents(null)} className="text-xs text-white/40 hover:text-white">
                ← All dates
              </button>
            </div>
            {selectedEvents.map((ev) => (
              <div key={ev.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 font-bold">{ev.source}</div>
                    <div className="mt-1 font-black text-white leading-snug">{ev.title}</div>
                  </div>
                  <span
                    className="text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0"
                    style={{ background: "rgba(198,90,46,0.14)", color: COLORS.champagneLight, borderColor: "rgba(243,213,138,0.18)" }}
                  >
                    {ev.badge}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/60 leading-6">{ev.detail}</p>
                {ev.source === "Assignment Due" && (
                  <Link
                    to="/porter?tab=brief"
                    onClick={onClose}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em] font-black transition-colors active:scale-[0.98]"
                    style={{ background: "rgba(243,213,138,0.12)", color: COLORS.champagneLight, borderColor: "rgba(243,213,138,0.22)" }}
                  >
                    Submit / see briefs
                    <span aria-hidden>›</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {!selectedEvents && (
          <div className="mt-6 grid gap-2">
            {sorted.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelectedEvents([ev])}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left w-full hover:bg-white/[0.08] transition-colors"
              >
                <div
                  className="min-w-[52px] rounded-xl px-2.5 py-1.5 text-center text-xs font-black leading-tight"
                  style={{ background: "rgba(243,213,138,0.12)", color: COLORS.champagneLight }}
                >
                  {ev.date}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 font-bold">{ev.source}</div>
                  <div className="text-sm font-bold leading-snug text-white">{ev.title}</div>
                </div>
                <span className="text-white/25 text-xs self-center">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SmallEventCard({ event, today }) {
  const base = today || (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const daysAway = event.fullDate ? Math.ceil((event.fullDate - base) / 86400000) : null;

  return (
    <div className="rounded-3xl p-4 border border-white/10 bg-white/[0.06] backdrop-blur">
      <div className="flex items-start gap-4">
        <div
          className="rounded-2xl px-3 py-2 font-black text-sm min-w-[60px] text-center leading-tight"
          style={{ background: "rgba(243,213,138,0.12)", color: COLORS.champagneLight }}
        >
          {event.date}
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35 font-bold">{event.source}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <h3 className="font-black text-white">{event.title}</h3>
            <span
              className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border shrink-0"
              style={{ background: "rgba(198,90,46,0.14)", color: COLORS.champagneLight, borderColor: "rgba(243,213,138,0.18)" }}
            >
              {event.badge}
            </span>
          </div>
          <p className="text-sm text-white/55 mt-1 leading-5">{event.detail}</p>
          {daysAway !== null && (
            <p className="text-xs mt-2 font-black" style={{ color: daysAway === 0 ? COLORS.champagneLight : "rgba(255,255,255,0.32)" }}>
              {daysAway === 0 ? "Today" : daysAway > 0 ? `In ${daysAway} day${daysAway !== 1 ? "s" : ""}` : "Past"}
            </p>
          )}
          {event.source === "Assignment Due" && (
            <Link
              to="/porter?tab=brief"
              className="mt-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.16em] font-black transition-colors active:scale-[0.98]"
              style={{ background: "rgba(243,213,138,0.12)", color: COLORS.champagneLight, borderColor: "rgba(243,213,138,0.22)" }}
            >
              Submit / see briefs
              <span aria-hidden>›</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
