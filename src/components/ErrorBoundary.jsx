import { Component } from "react";

const C = {
  midnight: "#05050A",
  wine: "#1A0710",
  champagne: "#F3D58A",
  ember: "#C65A2E",
};

const RELOAD_GUARD_KEY = "g85_error_boundary_reloaded";

function isChunkLoadError(error) {
  const msg = String(error?.message || "");
  return (
    /dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk .* failed/i.test(msg)
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // Stale deploy: the loaded page references a chunk that no longer exists
    // on the server. One automatic reload usually recovers cleanly.
    if (isChunkLoadError(error)) {
      try {
        if (sessionStorage.getItem(RELOAD_GUARD_KEY) !== "1") {
          sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{
          background: `linear-gradient(160deg, ${C.wine} 0%, ${C.midnight} 55%, #030306 100%)`,
          color: "#fff",
        }}
      >
        <div
          className="text-xs uppercase tracking-[0.32em] font-bold mb-3"
          style={{ color: `${C.champagne}99` }}
        >
          Global 85
        </div>
        <h1 className="text-xl font-black mb-2" style={{ fontFamily: "Georgia, serif" }}>
          Something went wrong.
        </h1>
        <p className="text-sm text-white/55 mb-6 max-w-sm">
          {isChunkLoadError(this.state.error)
            ? "A new version was just deployed. Reload to get the latest."
            : "This page hit an unexpected error. Reloading usually fixes it."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-2xl px-6 py-3 font-black text-sm"
          style={{
            background: `linear-gradient(135deg, ${C.champagne}, ${C.ember})`,
            color: "#16060a",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
