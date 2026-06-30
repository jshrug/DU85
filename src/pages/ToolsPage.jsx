import { useState, useEffect } from "react";
import { COLORS } from "../constants.js";

// ── Trip Tools ────────────────────────────────────────────────────────────────
const TRIP_CURRENCIES = [
  { code: "USD", name: "US Dollar",        flag: "🇺🇸" },
  { code: "EUR", name: "Euro",             flag: "🇪🇺" },
  { code: "GBP", name: "British Pound",    flag: "🇬🇧" },
  { code: "CLP", name: "Chilean Peso",     flag: "🇨🇱" },
  { code: "KRW", name: "S. Korean Won",    flag: "🇰🇷" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "TRY", name: "Turkish Lira",     flag: "🇹🇷" },
  { code: "ZAR", name: "S. African Rand",  flag: "🇿🇦" },
  { code: "KES", name: "Kenyan Shilling",  flag: "🇰🇪" },
  { code: "RWF", name: "Rwandan Franc",    flag: "🇷🇼" },
  { code: "ARS", name: "Argentine Peso",   flag: "🇦🇷" },
  { code: "VND", name: "Vietnamese Dong",  flag: "🇻🇳" },
  { code: "THB", name: "Thai Baht",        flag: "🇹🇭" },
  { code: "MYR", name: "Malaysian Ringgit",flag: "🇲🇾" },
  { code: "INR", name: "Indian Rupee",     flag: "🇮🇳" },
  { code: "MNT", name: "Mongolian Tugrik", flag: "🇲🇳" },
  { code: "COP", name: "Colombian Peso",   flag: "🇨🇴" },
  { code: "PEN", name: "Peruvian Sol",     flag: "🇵🇪" },
  { code: "MAD", name: "Moroccan Dirham",  flag: "🇲🇦" },
];

const TRIP_LANGS = [
  { code: "es", name: "Spanish",    flag: "🇪🇸" },
  { code: "ko", name: "Korean",     flag: "🇰🇷" },
  { code: "tr", name: "Turkish",    flag: "🇹🇷" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "sw", name: "Swahili",    flag: "🇰🇪" },
  { code: "th", name: "Thai",       flag: "🇹🇭" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "ms", name: "Malay",      flag: "🇲🇾" },
  { code: "hi", name: "Hindi",      flag: "🇮🇳" },
  { code: "mn", name: "Mongolian",  flag: "🇲🇳" },
  { code: "fr", name: "French",     flag: "🇫🇷" },
  { code: "ar", name: "Arabic",     flag: "🇲🇦" },
  { code: "zh", name: "Chinese",    flag: "🇨🇳" },
  { code: "de", name: "German",     flag: "🇩🇪" },
  { code: "hu", name: "Hungarian",  flag: "🇭🇺" },
  { code: "el", name: "Greek",      flag: "🇬🇷" },
  { code: "sr", name: "Serbian",    flag: "🇷🇸" },
];

function CurrencyTool() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [rateError, setRateError] = useState(false);

  async function fetchRates() {
    setLoading(true);
    setRateError(false);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();
      if (data.result === "success" && data.rates) {
        setRates(data.rates);
        setLastUpdated(new Date());
      } else throw new Error();
    } catch {
      setRates({
        USD: 1, EUR: 0.92, GBP: 0.79, CLP: 950, KRW: 1370, SGD: 1.35,
        TRY: 38, ZAR: 18.5, KES: 130, RWF: 1320, ARS: 1000, VND: 25400,
        THB: 35, MYR: 4.70, INR: 83, MNT: 3450, COP: 4100, PEN: 3.75, MAD: 10.0,
      });
      setRateError(true);
    }
    setLoading(false);
  }

  useEffect(() => { fetchRates(); }, []);

  function convert(toCode) {
    if (!rates) return "--";
    const amt = parseFloat(amount) || 0;
    const inUSD = amt / (rates[from] ?? 1);
    const result = inUSD * (rates[toCode] ?? 1);
    if (result === 0) return "0";
    if (result >= 100000) return result.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (result >= 1000)   return result.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (result >= 10)     return result.toFixed(2);
    if (result >= 0.01)   return result.toFixed(4);
    return result.toFixed(6);
  }

  const fromCurrency = TRIP_CURRENCIES.find((c) => c.code === from);

  return (
    <div>
      <div className="rounded-3xl p-4 border border-white/10 bg-white/[0.06] mb-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-black mb-2">Convert from</div>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            className="flex-1 rounded-2xl px-4 py-3 text-2xl font-black outline-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: COLORS.champagneLight,
              caretColor: COLORS.champagne,
            }}
          />
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-2xl px-3 py-3 font-black text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
          >
            {TRIP_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} style={{ background: COLORS.midnight }}>
                {c.flag} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        {fromCurrency && (
          <div className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            {fromCurrency.flag} {fromCurrency.name}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Loading rates…</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {TRIP_CURRENCIES.filter((c) => c.code !== from).map((c) => (
            <button
              key={c.code}
              onClick={() => setFrom(c.code)}
              className="rounded-3xl p-3 border border-white/10 bg-white/[0.04] text-left transition-all hover:bg-white/[0.10] active:scale-[0.97]"
            >
              <div className="text-xs font-black" style={{ color: "rgba(255,255,255,0.45)" }}>{c.flag} {c.code}</div>
              <div className="mt-1 text-xl font-black tabular-nums leading-tight" style={{ color: COLORS.champagneLight }}>
                {convert(c.code)}
              </div>
              <div className="mt-1 text-[10px] truncate" style={{ color: "rgba(255,255,255,0.28)" }}>{c.name}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        {rateError ? (
          <p className="text-[10px] text-amber-400/70">Live rates unavailable — showing approximates</p>
        ) : lastUpdated ? (
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            Rates {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        ) : <div />}
        <button
          onClick={fetchRates}
          className="text-[10px] uppercase tracking-[0.18em] font-black"
          style={{ color: `${COLORS.champagne}80` }}
        >
          Refresh →
        </button>
      </div>
    </div>
  );
}

function TranslateTool() {
  const [text, setText] = useState("");
  const [targetLang, setTargetLang] = useState("es");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [translateErr, setTranslateErr] = useState("");
  const [copied, setCopied] = useState(false);

  const activeLang = TRIP_LANGS.find((l) => l.code === targetLang);

  async function translate() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setTranslateErr("");
    setResult("");
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=en|${targetLang}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        setResult(data.responseData.translatedText);
      } else {
        setTranslateErr("Translation failed. Try a shorter phrase.");
      }
    } catch {
      setTranslateErr("Could not reach translation service.");
    }
    setLoading(false);
  }

  function copy() {
    if (!result) return;
    navigator.clipboard?.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div>
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-3"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {TRIP_LANGS.map((lang) => (
          <button
            key={lang.code}
            onClick={() => { setTargetLang(lang.code); setResult(""); setTranslateErr(""); }}
            className="shrink-0 rounded-2xl px-3 py-2 text-sm font-black border transition-all"
            style={{
              background: targetLang === lang.code
                ? `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.ember})`
                : "rgba(255,255,255,0.06)",
              color: targetLang === lang.code ? "#17060b" : "rgba(255,255,255,0.60)",
              borderColor: targetLang === lang.code ? "transparent" : "rgba(255,255,255,0.10)",
            }}
          >
            {lang.flag} {lang.name}
          </button>
        ))}
      </div>

      <div className="rounded-3xl p-4 border border-white/10 bg-white/[0.06] mb-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-black mb-2">
          English → {activeLang?.flag} {activeLang?.name}
        </div>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(""); setTranslateErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && text.trim()) { e.preventDefault(); translate(); } }}
          placeholder="Type something to translate…"
          rows={3}
          className="w-full bg-transparent text-white placeholder:text-white/30 outline-none resize-none text-sm leading-6"
          style={{ caretColor: COLORS.champagne }}
        />
        <button
          onClick={translate}
          disabled={loading || !text.trim()}
          className="mt-3 w-full rounded-2xl px-4 py-3 font-black text-sm transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.ember})`, color: "#17060b" }}
        >
          {loading ? "Translating…" : `Translate to ${activeLang?.name} →`}
        </button>
      </div>

      {result && (
        <div className="rounded-3xl p-4 border border-white/10 bg-white/[0.06]">
          <div className="text-[10px] uppercase tracking-[0.22em] font-black mb-2" style={{ color: "rgba(243,213,138,0.65)" }}>
            {activeLang?.flag} {activeLang?.name}
          </div>
          <div className="text-white text-base leading-7">{result}</div>
          <button
            onClick={copy}
            className="mt-3 text-[10px] uppercase tracking-[0.18em] font-black"
            style={{ color: copied ? COLORS.champagneLight : `${COLORS.champagne}80` }}
          >
            {copied ? "Copied ✓" : "Copy →"}
          </button>
        </div>
      )}

      {translateErr && <p className="mt-2 text-sm" style={{ color: "#fca5a5" }}>{translateErr}</p>}

      <p className="mt-3 text-[10px] text-center" style={{ color: "rgba(255,255,255,0.22)" }}>
        Powered by MyMemory · free up to 5,000 characters/day
      </p>
    </div>
  );
}

export default function ToolsPage() {
  const [tab, setTab] = useState("currency");

  return (
    <main className="px-5 py-5">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06] backdrop-blur mb-4">
        <p className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: "rgba(243,213,138,0.72)" }}>
          Trip Utilities
        </p>
        <h1 className="text-3xl font-black mt-1" style={{ fontFamily: "Georgia, serif" }}>Quick tools</h1>
        <p className="text-sm text-white/55 mt-2 leading-6">
          Currency exchange and translation for every destination on the list.
        </p>
      </section>

      <div
        className="flex rounded-2xl p-1 mb-4"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        {[["currency", "💱 Currency"], ["translate", "🌐 Translate"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 rounded-xl py-2.5 text-sm font-black transition-all"
            style={{
              background: tab === key ? `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.ember})` : "transparent",
              color: tab === key ? "#16060a" : "rgba(255,255,255,0.45)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "currency" && <CurrencyTool />}
      {tab === "translate" && <TranslateTool />}
    </main>
  );
}
