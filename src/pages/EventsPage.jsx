import { useState, useEffect } from "react";
import { COLORS } from "../constants.js";
import { COHORT_EVENTS } from "../data/cityData.js";
import SectionTitle from "../components/SectionTitle.jsx";
import EventMonthGrid from "../components/EventMonthGrid.jsx";

export default function EventsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedEvents, setSelectedEvents] = useState(null);

  useEffect(() => {
    if (!selectedEvents) return;
    const onKey = (e) => { if (e.key === "Escape") setSelectedEvents(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEvents]);

  return (
    <main className="px-5 py-5">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] font-bold" style={{ color: COLORS.champagne }}>
          Plan + Schedule
        </p>
        <h1 className="text-3xl font-black mt-2" style={{ fontFamily: "Georgia, serif" }}>
          Cohort schedule
        </h1>
        <p className="text-sm text-white/60 mt-3 leading-6">
          Class sessions, assignments, and key dates for the Global 85 trip selection process.
        </p>
      </section>

      <section className="mt-6 rounded-[2rem] p-5 border border-white/10 bg-white/[0.04]">
        <SectionTitle eyebrow="At a glance" title="Calendar" />
        <p className="text-xs text-white/35 mt-1">Tap a highlighted date to see details.</p>
        <EventMonthGrid events={COHORT_EVENTS} onEventClick={setSelectedEvents} />
      </section>

      <section className="mt-6">
        <SectionTitle eyebrow="Details" title="Key dates" />
        <div className="grid gap-3 mt-3">
          {COHORT_EVENTS.map((event) => (
            <EventCard key={event.id} event={event} today={today} />
          ))}
        </div>
      </section>

      {selectedEvents && (
        <EventDetailSheet events={selectedEvents} onClose={() => setSelectedEvents(null)} />
      )}
    </main>
  );
}

function EventDetailSheet({ events, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-h-[80vh] overflow-y-auto rounded-t-[2rem] border border-white/10 p-5 sm:max-w-md sm:rounded-[2rem]"
        style={{ background: "rgba(12,10,16,0.98)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] uppercase tracking-[0.32em] font-black" style={{ color: COLORS.champagne }}>
            {events[0].date}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="grid gap-3">
          {events.map((ev) => (
            <div key={ev.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 font-bold">{ev.source}</div>
                  <h3 className="mt-1 font-black text-white leading-snug" style={{ fontFamily: "Georgia, serif" }}>{ev.title}</h3>
                </div>
                <span
                  className="text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0"
                  style={{ background: "rgba(198,90,46,0.14)", color: COLORS.champagneLight, borderColor: "rgba(243,213,138,0.18)" }}
                >
                  {ev.badge}
                </span>
              </div>
              <p className="mt-2 text-sm text-white/60 leading-6">{ev.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, today }) {
  const base = today || (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const daysAway = event.fullDate ? Math.ceil((event.fullDate - base) / 86400000) : null;

  return (
    <div className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-[0.18em] text-white/35 font-bold">{event.source}</div>
          <h3 className="text-xl font-black mt-1 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
            {event.title}
          </h3>
          <p className="text-sm text-white/55 mt-1">{event.date}</p>
        </div>
        <span
          className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border shrink-0"
          style={{ background: "rgba(198,90,46,0.14)", color: COLORS.champagneLight, borderColor: "rgba(243,213,138,0.18)" }}
        >
          {event.badge}
        </span>
      </div>

      <p className="text-sm text-white/60 mt-3 leading-6">{event.detail}</p>

      {daysAway !== null && (
        <p className="mt-3 text-xs font-black" style={{ color: daysAway === 0 ? COLORS.champagneLight : daysAway > 0 ? `${COLORS.champagne}80` : "rgba(255,255,255,0.28)" }}>
          {daysAway === 0 ? "Today" : daysAway > 0 ? `In ${daysAway} day${daysAway !== 1 ? "s" : ""}` : "Past"}
        </p>
      )}
    </div>
  );
}
