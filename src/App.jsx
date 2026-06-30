import { lazy, Suspense, useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import { useAuth } from "./lib/AuthContext.jsx";
import { supabase } from "./lib/supabase.js";
import { COLORS } from "./constants.js";

// Core pages
const HomePage      = lazy(() => import("./pages/HomePage.jsx"));
const PorterPage    = lazy(() => import("./pages/PorterPage.jsx"));
const VotesPage     = lazy(() => import("./pages/VotesPage.jsx"));
const EventsPage    = lazy(() => import("./pages/EventsPage.jsx"));
const ChampionsPage = lazy(() => import("./pages/ChampionsPage.jsx"));
const ToolsPage     = lazy(() => import("./pages/ToolsPage.jsx"));

// Live Firebase pages
const Chat          = lazy(() => import("./pages/Chat.jsx"));
const Gallery       = lazy(() => import("./pages/Gallery.jsx"));
const Team          = lazy(() => import("./pages/Team.jsx"));
const Explore       = lazy(() => import("./pages/Explore.jsx"));
const Me            = lazy(() => import("./pages/Me.jsx"));
const Events        = lazy(() => import("./pages/Events.jsx"));
const Media         = lazy(() => import("./pages/Media.jsx"));
const Currency      = lazy(() => import("./pages/Currency.jsx"));
const Translate     = lazy(() => import("./pages/Translate.jsx"));
const ExploreImport = lazy(() => import("./pages/ExploreImport.jsx"));

function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) { setIsAdmin(false); return; }
    supabase.from("admins").select("enabled").eq("id", user.id).single()
      .then(({ data }) => setIsAdmin(!!data?.enabled));

    const channel = supabase
      .channel(`admin-status-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admins", filter: `id=eq.${user.id}` },
        ({ new: row }) => setIsAdmin(!!row?.enabled))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  return isAdmin;
}

function SurveyReminderModal() {
  const { user } = useAuth();
  const metaDone = user?.user_metadata?.thunderbird_survey_done === true;
  const storageKey = user ? `g85_thunderbird_survey_done:${user.id}` : null;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user || !storageKey) { setDismissed(true); return; }
    if (metaDone) { setDismissed(true); return; }
    let done = false;
    try { done = localStorage.getItem(storageKey) === "1"; } catch { done = false; }
    setDismissed(done);
  }, [user, storageKey, metaDone]);

  if (!user || dismissed) return null;

  async function markComplete() {
    setDismissed(true);
    try { if (storageKey) localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    try { await supabase?.auth.updateUser({ data: { thunderbird_survey_done: true } }); } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-white/10 p-6 sm:rounded-[2rem]"
        style={{ background: "rgba(12,10,16,0.98)" }}
      >
        <div className="text-2xl">📋</div>
        <p className="mt-3 text-[9px] uppercase tracking-[0.32em] font-black" style={{ color: COLORS.champagne }}>
          Action requested
        </p>
        <h2 className="mt-1 text-2xl font-black" style={{ fontFamily: "Georgia, serif" }}>Thunderbird survey</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          The Thunderbird School of Global Management has asked the cohort to complete a short survey. Please take a few minutes to fill it out.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/70">
          <div>
            The email comes from <span className="font-bold text-white">surveys@perfprog.com</span>. If you do not see it, check your spam or promotions folder.
          </div>
          <div className="mt-2">
            Did not receive it? Contact <span className="font-bold text-white">ngmisupport@thunderbird.edu</span>.
          </div>
        </div>
        <a
          href="http://thunderbird.perfprog.com/survey/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-black"
          style={{ background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`, color: "#17060b" }}
        >
          Open survey ↗
        </a>
        <button
          onClick={markComplete}
          className="mt-2 w-full rounded-2xl px-4 py-3.5 font-black border border-white/10 bg-white/[0.06] text-white"
        >
          I&apos;ve already completed it
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="mt-2 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white/55 hover:text-white"
        >
          Remind me later
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [showSplash, setShowSplash] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {showSplash && <SplashScreen user={user} onComplete={() => setShowSplash(false)} />}

      <Shell drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen}>
        <Suspense fallback={null}>
          <Routes>
            {/* Core planning routes */}
            <Route path="/" element={<HomePage onAsk={() => navigate("/porter")} />} />
            <Route path="/porter" element={<PorterPage />} />
            <Route path="/votes" element={<VotesPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/champions" element={<ChampionsPage />} />

            {/* Live pages */}
            <Route path="/chat" element={<Chat isAdmin={isAdmin} />} />
            <Route path="/gallery" element={<Gallery isAdmin={isAdmin} />} />
            <Route path="/team" element={<Team isAdmin={isAdmin} />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/me" element={<Me />} />
            <Route path="/city-events" element={<Events />} />
            <Route path="/media" element={<Media />} />
            <Route path="/currency" element={<Currency />} />
            <Route path="/translate" element={<Translate />} />
            <Route path="/explore-import" element={<ExploreImport />} />

            {/* Redirects */}
            <Route path="/ask" element={<Navigate to="/porter" replace />} />
            <Route path="/plan" element={<Navigate to="/events" replace />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Shell>

      <SurveyReminderModal />
    </>
  );
}
