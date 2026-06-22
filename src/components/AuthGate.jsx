import { useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";

const C = {
  midnight: "#05050A",
  wine: "#1A0710",
  champagne: "#F3D58A",
  ember: "#C65A2E",
  crimson: "#BA0C2F",
};

function Corner({ pos }) {
  const s = {
    tl: { top: 0, left: 0, borderTop: "1px solid", borderLeft: "1px solid" },
    tr: { top: 0, right: 0, borderTop: "1px solid", borderRight: "1px solid" },
    bl: { bottom: 0, left: 0, borderBottom: "1px solid", borderLeft: "1px solid" },
    br: { bottom: 0, right: 0, borderBottom: "1px solid", borderRight: "1px solid" },
  }[pos];
  return (
    <div className="absolute w-4 h-4" style={{ ...s, borderColor: `${C.champagne}55` }} />
  );
}

function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  function reset() {
    setStatus("idle");
    setErrorMsg("");
  }

  function switchMode(next) {
    setMode(next);
    setPassword("");
    setConfirmPassword("");
    reset();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    reset();

    if (mode === "signup" && password !== confirmPassword) {
      setErrorMsg("Passwords don't match.");
      setStatus("error");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const { error } = mode === "signup"
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) throw error;
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background:
          `radial-gradient(circle at 18% 18%, ${C.champagne}18, transparent 38%), ` +
          `radial-gradient(circle at 82% 78%, ${C.ember}1e, transparent 34%), ` +
          `linear-gradient(160deg, ${C.wine} 0%, ${C.midnight} 55%, #030306 100%)`,
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div
            className="text-[10px] uppercase tracking-[0.36em] font-bold mb-2"
            style={{ color: `${C.champagne}99` }}
          >
            DU MBA · Cohort 85
          </div>
          <div
            className="text-5xl font-black tracking-tight"
            style={{ fontFamily: "Georgia, serif", color: "#fff" }}
          >
            Global <span style={{ color: C.champagne }}>85</span>
          </div>
          <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Private trip portal — cohort access only
          </p>
        </div>

        {/* Mode toggle */}
        <div
          className="flex rounded-2xl p-1 mb-4"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          {[["signin", "Sign In"], ["signup", "Create Account"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className="flex-1 rounded-xl py-2.5 text-sm font-black transition-all"
              style={{
                background: mode === key
                  ? `linear-gradient(135deg, ${C.champagne}, ${C.ember})`
                  : "transparent",
                color: mode === key ? "#16060a" : "rgba(255,255,255,0.45)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="relative rounded-3xl p-8 border"
          style={{
            background: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />

          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); reset(); }}
                placeholder="Email"
                autoComplete="email"
                autoFocus
                required
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: `1px solid ${status === "error" ? `${C.crimson}88` : "rgba(255,255,255,0.14)"}`,
                  color: "#fff",
                }}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); reset(); }}
                placeholder="Password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: `1px solid ${status === "error" ? `${C.crimson}88` : "rgba(255,255,255,0.14)"}`,
                  color: "#fff",
                }}
              />

              {mode === "signup" && (
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); reset(); }}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: `1px solid ${status === "error" ? `${C.crimson}88` : "rgba(255,255,255,0.14)"}`,
                    color: "#fff",
                  }}
                />
              )}
            </div>

            {status === "error" && (
              <p className="text-xs mt-3 px-1" style={{ color: "#fca5a5" }}>{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email.trim() || !password}
              className="mt-4 w-full rounded-2xl px-5 py-4 font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
              style={{
                background: `linear-gradient(135deg, ${C.champagne}, ${C.ember})`,
                color: "#16060a",
              }}
            >
              {status === "loading"
                ? "Please wait…"
                : mode === "signup"
                ? "Create account →"
                : "Sign in →"}
            </button>

            <p className="mt-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
              Cohort 85 · Private access
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: `linear-gradient(160deg, ${C.wine} 0%, ${C.midnight} 60%, #030306 100%)`,
      }}
    >
      <div className="text-center">
        <div
          className="text-3xl font-black"
          style={{ fontFamily: "Georgia, serif", color: C.champagne }}
        >
          G<span style={{ color: "#fff" }}>85</span>
        </div>
        <div className="mt-3 flex gap-1.5 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: C.champagne,
                opacity: 0.6,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuthGate({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  return children;
}
