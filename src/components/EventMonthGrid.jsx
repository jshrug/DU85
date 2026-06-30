import { COLORS } from "../constants.js";

const CAL_WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const CAL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function EventMonthGrid({ events, onEventClick }) {
  const byDay = {};
  events.forEach((ev) => {
    const d = ev.fullDate;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    (byDay[key] = byDay[key] || []).push(ev);
  });

  const times = events.map((e) => e.fullDate.getTime());
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));
  const months = [];
  let y = min.getUTCFullYear(), m = min.getUTCMonth();
  const endY = max.getUTCFullYear(), endM = max.getUTCMonth();
  while (y < endY || (y === endY && m <= endM)) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  return (
    <>
      {months.map(({ year, month }) => {
        const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const cells = [];
        for (let i = 0; i < startWeekday; i += 1) cells.push(null);
        for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

        return (
          <div key={`${year}-${month}`} className="mt-5">
            <div className="text-sm font-black text-white/80">{CAL_MONTHS[month]} {year}</div>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center">
              {CAL_WEEKDAYS.map((w, i) => (
                <div key={i} className="py-1 text-[10px] font-bold text-white/30">{w}</div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const key = `${year}-${month}-${d}`;
                const dayEvents = byDay[key];
                const isToday = key === todayKey;
                return (
                  <div
                    key={i}
                    onClick={() => dayEvents && onEventClick?.(dayEvents)}
                    className={[
                      "relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition-transform",
                      dayEvents && onEventClick ? "cursor-pointer hover:scale-110 active:scale-95" : "",
                    ].join(" ")}
                    style={dayEvents
                      ? { background: "rgba(243,213,138,0.16)", border: `1px solid ${COLORS.champagne}`, color: COLORS.champagneLight, fontWeight: 800 }
                      : { color: "rgba(255,255,255,0.45)" }}
                  >
                    <span className={isToday ? "underline underline-offset-2" : ""}>{d}</span>
                    {dayEvents && (
                      <span className="mt-0.5 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((_, j) => (
                          <span key={j} className="h-1 w-1 rounded-full" style={{ background: COLORS.ember }} />
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
