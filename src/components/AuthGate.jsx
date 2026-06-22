import { useAuth } from "../lib/AuthContext.jsx";

const C = {
  midnight: "#05050A",
  wine: "#1A0710",
  champagne: "#F3D58A",
  ember: "#C65A2E",
  crimson: "#BA0C2F",
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

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

function LoginScreen({ wrongDomain }) {
  const { signIn } = useAuth();
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

        <div
          className="relative rounded-3xl p-8 border"
          style={{
            background: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />

          {wrongDomain && (
            <div
              className="mb-5 rounded-2xl px-4 py-3 text-sm text-center"
              style={{
                background: `${C.crimson}33`,
                border: `1px solid ${C.crimson}66`,
                color: "#fca5a5",
              }}
            >
              That account isn't on the cohort list.
              <br />
              Sign in with your <strong>@du.edu</strong> Google account.
            </div>
          )}

          <p className="text-sm mb-6 text-center" style={{ color: "rgba(255,255,255,0.65)" }}>
            Sign in with your University of Denver Google account to access the portal.
          </p>

          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 rounded-2xl px-5 py-4 font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "#fff",
              color: "#111",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-5 text-center text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
            @du.edu accounts only
          </p>
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
  const { user, wrongDomain } = useAuth();
  if (user === undefined) return <LoadingScreen />;
  if (!user) return <LoginScreen wrongDomain={wrongDomain} />;
  return children;
}
