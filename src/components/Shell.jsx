import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { COLORS, DRAWER_NAV, COHORT_SIZE } from "../constants.js";
import useLockedDestinations from "../hooks/useLockedDestinations.js";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Shell({ children, drawerOpen, setDrawerOpen }) {
  const location = useLocation();
  const chamberMode = location.pathname === "/votes";

  return (
    <>
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="min-h-screen text-white" style={{ background: COLORS.midnight }}>
        {!chamberMode && (
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              background:
                `radial-gradient(circle at top left, ${COLORS.champagne}26, transparent 34%), ` +
                `radial-gradient(circle at top right, ${COLORS.roseSmoke}44, transparent 34%), ` +
                `radial-gradient(circle at 50% 85%, ${COLORS.ember}1f, transparent 35%), ` +
                `linear-gradient(180deg, ${COLORS.wine} 0%, ${COLORS.midnight} 48%, #030306 100%)`,
            }}
          />
        )}

        <div className={chamberMode ? "relative z-10 min-h-screen" : "relative z-10 max-w-7xl mx-auto min-h-screen pb-24"}>
          {!chamberMode && <TopBar onOpenDrawer={() => setDrawerOpen(true)} />}
          {children}
        </div>

        {!chamberMode && <BottomNav />}
      </div>
    </>
  );
}

export function TopBar({ onOpenDrawer }) {
  return (
    <div
      className="sticky top-0 z-30 px-5 pt-4 pb-3 backdrop-blur-xl"
      style={{ background: "rgba(5,5,10,0.72)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] font-bold" style={{ color: "rgba(243,213,138,0.72)" }}>
            Global 85
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
            Porter
          </div>
        </div>

        <button
          onClick={onOpenDrawer}
          className="rounded-2xl px-4 py-2 font-bold border flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.08)",
            borderColor: "rgba(255,255,255,0.14)",
          }}
        >
          <span>Menu</span>
          <span style={{ color: COLORS.champagne }}>☰</span>
        </button>
      </div>
    </div>
  );
}

export function SideDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const { user, signOut } = useAuth();

  function handleNav(to) {
    navigate(to);
    onClose();
  }

  useEffect(() => {
    if (!open) return;

    function handleClick(event) {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) onClose();
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.62)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          backdropFilter: open ? "blur(5px)" : "none",
        }}
      />

      <div
        ref={drawerRef}
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "86vw",
          maxWidth: "390px",
          background:
            `radial-gradient(circle at 20% 12%, ${COLORS.champagne}1e, transparent 24%), ` +
            `radial-gradient(circle at 85% 28%, ${COLORS.ember}24, transparent 28%), ` +
            `linear-gradient(160deg, ${COLORS.midnight} 0%, ${COLORS.wine} 50%, #080407 100%)`,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? "-18px 0 70px rgba(0,0,0,0.62)" : "none",
          borderLeft: "1px solid rgba(243,213,138,0.12)",
        }}
      >
        <div className="px-5 pt-10 pb-5 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] font-bold" style={{ color: "rgba(243,213,138,0.72)" }}>
                Private Cohort App
              </div>
              <div className="text-4xl font-black mt-1" style={{ fontFamily: "Georgia, serif" }}>
                Global <span style={{ color: COLORS.champagne }}>85</span>
              </div>
              <p className="text-sm text-white/55 mt-2">Your trip command center.</p>
            </div>

            <button
              onClick={onClose}
              className="rounded-full w-10 h-10 border border-white/10 bg-white/5 text-white/70 text-xl"
            >
              ×
            </button>
          </div>

          <div className="mt-5 rounded-[1.5rem] p-4 border border-white/10 bg-white/[0.06]">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.ember})`,
                  color: COLORS.midnight,
                }}
              >
                🛎️
              </div>
              <div>
                <div className="font-black">Porter is standing by</div>
                <div className="text-xs text-white/50">City guide · itinerary · cohort context</div>
              </div>
            </div>

            <button
              onClick={() => handleNav("/porter")}
              className="mt-4 w-full rounded-2xl px-4 py-3 font-black text-left"
              style={{
                background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
                color: "#17060b",
              }}
            >
              Ask Porter →
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {DRAWER_NAV.map((item) => (
            <button
              key={item.to}
              onClick={() => handleNav(item.to)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left text-white/85 hover:bg-white/10"
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="font-black">{item.label}</div>
                <div className="text-xs text-white/42 truncate">{item.desc}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="px-5 py-5 border-t border-white/10">
          {user && (
            <div className="mb-4 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                style={{ background: `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.ember})`, color: COLORS.midnight }}
              >
                {(user.user_metadata?.display_name?.[0] || user.email?.[0] || "?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                {user.user_metadata?.display_name && (
                  <div className="text-sm font-black text-white truncate">{user.user_metadata.display_name}</div>
                )}
                <div className="text-xs truncate text-white/45">{user.email}</div>
                <button
                  onClick={() => { signOut(); onClose(); }}
                  className="text-[10px] uppercase tracking-widest mt-0.5"
                  style={{ color: `${COLORS.champagne}80` }}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">
            Cohort OS · Private Portal
          </p>
        </div>
      </div>
    </>
  );
}

export function BottomNav() {
  const { anchorWinner, companionWinner } = useLockedDestinations();
  const votingOpen = !(anchorWinner && companionWinner);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 backdrop-blur-xl"
      style={{ background: "rgba(5,5,10,0.88)" }}
    >
      <div className="max-w-7xl mx-auto flex">
        <TabLink to="/" label="Home" icon="✦" />
        <TabLink to="/porter" label="Porter" icon="🛎️" />
        <TabLink to="/porter?tab=brief" label="Briefs" icon="📋" />
        <TabLink to="/champions" label="Champions" icon="🏙️" />
        <TabLink to="/events" label="Plan" icon="📅" />
        <TabLink to="/votes" label="Votes" icon="🗳️" pulse={votingOpen} />
        <TabLink to="/chat" label="Chat" icon="💬" />
      </div>
    </div>
  );
}

export function TabLink({ to, label, icon, pulse }) {
  const location = useLocation();
  const [toPath, toQuery = ""] = to.split("?");
  const onBriefTab =
    location.pathname === "/porter" &&
    new URLSearchParams(location.search).get("tab") === "brief";

  // NavLink ignores the query string, so /porter and /porter?tab=brief both match
  // the same path. Resolve Porter vs Briefs off the ?tab= param, and match Home exactly.
  let isActive;
  if (toPath === "/porter") {
    isActive =
      location.pathname === "/porter" &&
      (toQuery.includes("tab=brief") ? onBriefTab : !onBriefTab);
  } else if (toPath === "/") {
    isActive = location.pathname === "/";
  } else {
    isActive = location.pathname === toPath;
  }

  return (
    <NavLink
      to={to}
      className={
        "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition " +
        (isActive ? "text-amber-200" : "text-white/45 hover:text-white/80")
      }
    >
      <span className="text-xl leading-none relative">
        {icon}
        {pulse && (
          <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
        )}
      </span>
      <span className="text-[11px] font-bold">{label}</span>
    </NavLink>
  );
}
