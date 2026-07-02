import { useState, useEffect, useRef, useCallback } from "react";
import { COLORS } from "../../constants.js";

/**
 * RankVoteBallot — the visual voting mechanism (self-contained, no backend).
 *
 * The cohort member ranks their top 3 cities: drag tiles to reorder, or tap to
 * add. First / Second / Third choice, then Lock in, then Confirm & Submit.
 *
 * Props:
 *   cities         [{ name, emoji, note? }]  the candidates to rank
 *   initialRanking string[]                  a previously-submitted ranking (names), optional
 *   alreadyVoted   boolean                   show the "your vote is in" banner
 *   votedCount     number                    anonymous "N votes in" tally, optional
 *   onSubmit       (ranking: string[]) => Promise|void   called with the ordered top-3 names
 *
 * The parent owns all data: read status, load the member's ballot, and persist
 * onSubmit. This component only produces the ranking.
 */
export default function RankVoteBallot({ cities = [], initialRanking = [], alreadyVoted = false, votedCount = 0, onSubmit }) {
  const RANK_LABELS = ["First choice", "Second choice", "Third choice"];
  const cityByName = (n) => cities.find((c) => c.name === n);

  const [ranked, setRanked] = useState(() => (initialRanking || []).slice(0, 3));
  const [review, setReview] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(alreadyVoted));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(null); // { from, over }
  const slotRefs = useRef([]);

  const add = (n) => setRanked((r) => (r.length >= 3 || r.includes(n) ? r : [...r, n]));
  const remove = (n) => setRanked((r) => r.filter((x) => x !== n));

  const onMove = useCallback((e) => {
    setDrag((d) => {
      if (!d) return d;
      let over = d.from;
      slotRefs.current.forEach((el, i) => {
        if (!el || ranked[i] === undefined) return;
        const r = el.getBoundingClientRect();
        if (e.clientY > r.top && e.clientY < r.bottom) over = i;
      });
      return { ...d, over };
    });
  }, [ranked]);

  const onUp = useCallback(() => {
    setDrag((d) => {
      if (d && d.over !== d.from && ranked[d.over] !== undefined) {
        setRanked((r) => { const c = [...r]; const [m] = c.splice(d.from, 1); c.splice(d.over, 0, m); return c; });
      }
      return null;
    });
  }, [ranked]);

  useEffect(() => {
    if (!drag) return;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [drag, onMove, onUp]);

  async function doSubmit() {
    setSaving(true); setErr("");
    try { await onSubmit?.(ranked); setReview(false); setSubmitted(true); }
    catch (e) { setErr(e?.message || "Could not submit. Try again."); }
    finally { setSaving(false); }
  }

  const need = 3 - ranked.length;

  return (
    <div>
      {submitted && !review && (
        <div className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3" style={{ background: "rgba(70,192,147,0.10)", border: "1px solid rgba(70,192,147,0.4)" }}>
          <span style={{ color: "#46c093" }}>✓</span>
          <p className="text-[12px] font-bold text-white/80">Your vote is in. You can change it until voting closes.</p>
        </div>
      )}

      <p className="text-sm text-white/55 leading-6 mb-4">
        Drag your favorites into order, or tap to add them. First choice at the top. The two cities the cohort ranks highest advance.
      </p>

      <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-2.5" style={{ color: "rgba(196,150,42,0.6)" }}>Your ballot</p>
      <div className="flex flex-col gap-2.5 mb-6">
        {[0, 1, 2].map((i) => {
          const c = ranked[i] ? cityByName(ranked[i]) : null;
          const isOver = drag && drag.over === i;
          const isDragging = drag && drag.from === i;
          return (
            <div key={i} ref={(el) => (slotRefs.current[i] = el)}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 min-h-[60px] transition-all"
              style={{
                border: `1px ${c ? "solid" : "dashed"} ${isOver ? COLORS.gold : c ? "rgba(243,213,138,0.16)" : "rgba(243,213,138,0.22)"}`,
                background: isOver ? "rgba(196,150,42,0.12)" : c ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
                opacity: isDragging ? 0.5 : 1,
              }}>
              <div className="w-9 h-9 rounded-xl grid place-items-center font-black shrink-0" style={{ fontFamily: "Georgia, serif",
                background: c ? `linear-gradient(150deg, ${COLORS.champagneLight}, ${COLORS.gold})` : "rgba(243,213,138,0.12)",
                color: c ? "#17060b" : "rgba(243,213,138,0.6)" }}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[8px] uppercase tracking-[0.16em] font-black" style={{ color: "rgba(255,255,255,0.35)" }}>{RANK_LABELS[i]}</div>
                {c ? (
                  <div className="truncate"><span className="text-lg mr-1">{c.emoji}</span><span className="font-bold text-white">{c.name}</span></div>
                ) : (
                  <div className="text-sm text-white/30">Empty, tap a city below</div>
                )}
              </div>
              {c && (
                <>
                  <span onPointerDown={(e) => { e.preventDefault(); setDrag({ from: i, over: i }); e.currentTarget.setPointerCapture?.(e.pointerId); }}
                    className="text-white/30 text-lg px-1 cursor-grab select-none" style={{ touchAction: "none" }} title="Drag to reorder">⋮⋮</span>
                  <button onClick={() => remove(c.name)} className="w-6 h-6 rounded-full text-white/50 hover:text-white text-xs shrink-0"
                    style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>✕</button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-2.5" style={{ color: "rgba(196,150,42,0.6)" }}>
        The candidates {need > 0 ? `· ${need} slot${need === 1 ? "" : "s"} open` : "· ballot full"}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {cities.map((c) => {
          const picked = ranked.includes(c.name);
          return (
            <button key={c.name} onClick={() => add(c.name)} disabled={picked || ranked.length >= 3}
              className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-left transition-all active:scale-[0.97]"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)",
                opacity: picked ? 0.32 : ranked.length >= 3 ? 0.5 : 1, cursor: picked || ranked.length >= 3 ? "default" : "pointer" }}>
              <span className="text-xl shrink-0">{c.emoji}</span>
              <span className="block text-[13px] font-bold text-white leading-tight truncate min-w-0">{c.name}</span>
            </button>
          );
        })}
      </div>

      {err && <p className="text-[12px] font-bold mt-4" style={{ color: "#fca5a5" }}>{err}</p>}

      <button onClick={() => setReview(true)} disabled={ranked.length === 0}
        className="w-full rounded-2xl py-4 mt-6 text-[11px] font-black uppercase tracking-[0.18em] transition-all disabled:opacity-40"
        style={{ background: ranked.length ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})` : "rgba(255,255,255,0.06)",
          color: ranked.length ? "#17060b" : "rgba(255,255,255,0.3)" }}>
        {submitted ? "Update my ranking" : ranked.length ? `Lock in my top ${ranked.length}` : "Pick at least one city"}
      </button>

      <p className="text-center text-[10px] text-white/25 mt-3 uppercase tracking-[0.14em]">
        {votedCount > 0 ? `${votedCount} vote${votedCount === 1 ? "" : "s"} in so far` : "Anonymous · one vote per person"}
      </p>

      {review && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setReview(false)} />
          <div className="relative z-10 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6" style={{ background: "rgba(12,10,16,0.99)", border: "1px solid rgba(243,213,138,0.16)" }}>
            <h2 className="text-2xl font-black mb-1" style={{ fontFamily: "Georgia, serif" }}>Confirm your vote</h2>
            <p className="text-sm text-white/55 mb-4">This is what gets recorded. You can still edit it.</p>
            <div className="mb-5">
              {ranked.map((n, i) => { const c = cityByName(n); return (
                <div key={n} className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0">
                  <span className="text-[9px] uppercase tracking-[0.14em] font-black w-24" style={{ color: "rgba(196,150,42,0.6)" }}>{RANK_LABELS[i]}</span>
                  <span className="text-lg">{c?.emoji}</span><span className="font-bold text-white">{n}</span>
                </div>); })}
            </div>
            {err && <p className="text-[12px] font-bold mb-3" style={{ color: "#fca5a5" }}>{err}</p>}
            <button onClick={doSubmit} disabled={saving}
              className="w-full rounded-2xl py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`, color: "#17060b" }}>
              {saving ? "Recording…" : "Submit my vote"}
            </button>
            <button onClick={() => setReview(false)} className="w-full rounded-2xl py-3 mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/70"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>Edit</button>
          </div>
        </div>
      )}
    </div>
  );
}
