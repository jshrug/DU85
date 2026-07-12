import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import Globe from "react-globe.gl";
import * as THREE from "three";
import { COLORS, COHORT_SIZE, TRIP_DATE } from "../constants.js";
import { ANCHOR_COUNTRIES, CITY_B_MAP } from "../data/cityData.js";
import { getCountryByName, countryIcon, getInitialGlobeSize, findBriefForCountry } from "../utils/voteUtils.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { fetchCountryBriefs } from "../lib/porterMemory.js";
import { supabase } from "../lib/supabase.js";
import { DEEP_DIVE } from "../data/countryDeepDive.js";
import {
  getFreshnessLabel,
  getCohortsForCity,
  getPreviousVisitOrgsForCity,
  getCohortBuiltConnectionRead,
  getMostRepeatedDestinations,
  getRecentCohortDestinations,
} from "../utils/destinationIntel.js";
import {
  fetchVoteStatus,
  subscribeVoteStatus,
  fetchMyBallot,
  submitBallot,
  fetchVotedCount,
  setVoteStatus,
  closeAndTally,
} from "../lib/vote.js";

const PdfViewerModal = lazy(() => import("../components/features/PdfViewerModal.jsx"));

// City A candidates come from ANCHOR_COUNTRIES — the same source the globe
// uses to place its points, so the chamber keeps showing every candidate.
// Post-vote, this holds just the 2 finalists (Nairobi, Istanbul) moving into City B.
const RANK_LABELS = ["First choice", "Second choice", "Third choice"];
const CITIES = ANCHOR_COUNTRIES.map((c) => ({
  name: c.name,
  emoji: c.emoji || "🌐",
  note: c.note || c.region || "",
}));
const cityByName = (n) => CITIES.find((c) => c.name === n);

function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user?.id || !supabase) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("admins")
      .select("enabled")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setIsAdmin(!!data?.enabled))
      .catch(() => setIsAdmin(false));
  }, [user?.id]);
  return isAdmin;
}

export default function VotesPage() {
  const { user } = useAuth();
  const voterId = user?.id || null;
  const isAdmin = useIsAdmin();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("closed"); // closed | open | final
  const [results, setResults] = useState(null);
  const [myBallot, setMyBallot] = useState(null);
  const [votedCount, setVotedCount] = useState(0);
  const [adminBusy, setAdminBusy] = useState(false);
  const [briefs, setBriefs] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevStatus = useRef(null);

  // Briefs get submitted via Porter while this page may already be open, so
  // poll instead of fetching once — porter_memory isn't on realtime replication.
  useEffect(() => {
    let active = true;
    const tick = () => fetchCountryBriefs().then((b) => active && setBriefs(b)).catch(() => {});
    tick();
    const id = setInterval(tick, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchVoteStatus(),
      voterId ? fetchMyBallot(voterId) : Promise.resolve(null),
    ])
      .then(([s, b]) => {
        if (!active) return;
        prevStatus.current = s.status || "closed";
        setStatus(s.status || "closed");
        setResults(s.results || null);
        setMyBallot(b);
        setLoading(false);
      })
      .catch(() => active && setLoading(false));

    const unsub = subscribeVoteStatus((row) => {
      if (!row) return;
      const next = row.status || "closed";
      // Fire the celebration only on a live transition into "final", never on load.
      if (next === "final" && prevStatus.current && prevStatus.current !== "final") {
        setShowCelebration(true);
      }
      prevStatus.current = next;
      setStatus(next);
      setResults(row.results || null);
    });
    return () => {
      active = false;
      unsub();
    };
  }, [voterId]);

  // Anonymous live progress while open.
  useEffect(() => {
    if (status !== "open") return;
    let active = true;
    const tick = () => fetchVotedCount().then((n) => active && setVotedCount(n)).catch(() => {});
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [status]);

  const handleSubmit = useCallback(
    async (ranking) => {
      await submitBallot(voterId, ranking);
      setMyBallot(ranking);
      fetchVotedCount().then(setVotedCount).catch(() => {});
    },
    [voterId]
  );

  const adminAction = useCallback(async (fn) => {
    setAdminBusy(true);
    try {
      await fn();
    } catch (e) {
      alert(e.message || "Something went wrong.");
    } finally {
      setAdminBusy(false);
    }
  }, []);

  const finalists = useMemo(() => {
    if (status !== "final" || !results?.top2) return [];
    return results.top2.map(getCountryByName).filter(Boolean);
  }, [status, results]);

  return (
    <main className="fixed inset-0 z-[999] overflow-hidden">
      <DestinationChamber
        loading={loading}
        status={status}
        results={results}
        myBallot={myBallot}
        votedCount={votedCount}
        onSubmit={handleSubmit}
        isAdmin={isAdmin}
        adminBusy={adminBusy}
        onOpen={() => adminAction(() => setVoteStatus("open"))}
        onClose={() => adminAction(closeAndTally)}
        onReopen={() => adminAction(() => setVoteStatus("open"))}
        onNotOpen={() => adminAction(() => setVoteStatus("closed"))}
        briefs={briefs}
        finalists={finalists}
        showCelebration={showCelebration}
        onDismissCelebration={() => setShowCelebration(false)}
      />
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   THE GLOBE CHAMBER — preserved wholesale from the original visual experience.
   Only the interaction underneath (the toggling panel + globe data) is ranked now.
   ══════════════════════════════════════════════════════════════════════════════ */
function DestinationChamber({
  loading,
  status,
  results,
  myBallot,
  votedCount,
  onSubmit,
  isAdmin,
  adminBusy,
  onOpen,
  onClose,
  onReopen,
  onNotOpen,
  briefs = [],
  finalists = [],
  showCelebration,
  onDismissCelebration,
}) {
  const navigate = useNavigate();
  const globeRef = useRef(null);
  const firstPovRef = useRef(true);
  const globeRotRafRef = useRef(null);
  const [globeSize, setGlobeSize] = useState(() => getInitialGlobeSize());
  const [activeCountry, setActiveCountry] = useState(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [worldGeoData, setWorldGeoData] = useState({ features: [] });
  const [deepDiveCountry, setDeepDiveCountry] = useState(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  // City A candidates — always shown on the globe.
  const countries = ANCHOR_COUNTRIES;
  const votingOpen = status === "open";
  const winnerNames = useMemo(
    () => (status === "final" && results?.top2 ? results.top2 : []),
    [status, results]
  );

  // Lifted ballot state so both the ranked panel and the intel panel can add cities.
  const [ranked, setRanked] = useState([]);
  useEffect(() => {
    if (myBallot && myBallot.length) setRanked(myBallot.slice(0, 3));
  }, [myBallot]);
  const addToBallot = useCallback(
    (name) => setRanked((r) => (r.length >= 3 || r.includes(name) ? r : [...r, name])),
    []
  );

  useEffect(() => {
    let raf = null;
    function handleResize() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = getInitialGlobeSize();
        setGlobeSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next
        );
        setIsMobile(window.innerWidth < 768);
      });
    }
    window.addEventListener("resize", handleResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Rotate the globe Group on its own Y axis so the floor stays stationary.
  useEffect(() => {
    const startId = setTimeout(() => {
      const globe = globeRef.current;
      if (!globe) return;
      const scene = typeof globe.scene === "function" ? globe.scene() : null;
      if (!scene) return;
      const tick = () => {
        const grp = scene.children.find((c) => c.isGroup);
        if (grp) grp.rotation.y += 0.00028;
        globeRotRafRef.current = requestAnimationFrame(tick);
      };
      globeRotRafRef.current = requestAnimationFrame(tick);
    }, 500);
    return () => {
      clearTimeout(startId);
      if (globeRotRafRef.current) cancelAnimationFrame(globeRotRafRef.current);
    };
  }, []);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson"
    )
      .then((r) => r.json())
      .then((data) => setWorldGeoData(data));
  }, []);

  // Fly the camera to the country being explored.
  useEffect(() => {
    if (!globeRef.current || !activeCountry) return;
    const globe = globeRef.current;
    const duration = firstPovRef.current ? 0 : 520;
    firstPovRef.current = false;
    if (typeof globe.pointOfView === "function") {
      const scene = typeof globe.scene === "function" ? globe.scene() : null;
      const grp = scene?.children.find((c) => c.isGroup);
      const rotOffsetDeg = grp ? (grp.rotation.y * 180) / Math.PI : 0;
      globe.pointOfView(
        {
          lat: activeCountry.lat,
          lng: activeCountry.lng + rotOffsetDeg,
          altitude: isMobile ? 1.8 : 1.4,
        },
        duration
      );
    }
  }, [activeCountry, isMobile]);

  // Globe material, chamber lights, and holographic floor — preserved as-is.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const frame = requestAnimationFrame(() => {
      const controls = typeof globe.controls === "function" ? globe.controls() : null;
      if (controls) {
        controls.autoRotate = false;
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.minDistance = 155;
        controls.maxDistance = 560;
      }

      const material = typeof globe.globeMaterial === "function" ? globe.globeMaterial() : null;
      if (material) {
        material.color = new THREE.Color("#E8B84B");
        material.emissive = new THREE.Color("#C4962A");
        material.emissiveIntensity = 0.55;
        material.transparent = true;
        material.opacity = 0.28;
        material.wireframe = true;
        material.depthWrite = false;
        material.depthTest = true;
        material.side = THREE.DoubleSide;
        material.needsUpdate = true;
      }

      const scene = typeof globe.scene === "function" ? globe.scene() : null;
      if (scene) {
        scene.fog = new THREE.FogExp2("#080700", 0.0011);

        if (!scene.userData.porterHoloLightsAdded) {
          const crimsonKey = new THREE.PointLight("#D4A030", 3.2, 900);
          crimsonKey.position.set(0, 80, 240);
          scene.add(crimsonKey);
          const goldSide = new THREE.PointLight("#C4962A", 2.6, 900);
          goldSide.position.set(190, 70, 110);
          scene.add(goldSide);
          const champagneFill = new THREE.PointLight("#FFE8A3", 1.1, 700);
          champagneFill.position.set(-160, 40, 120);
          scene.add(champagneFill);
          scene.userData.porterHoloLightsAdded = true;
        }

        if (!scene.userData.holoFloorAdded) {
          const grid = new THREE.GridHelper(600, 30, 0xe8b84b, 0xa07020);
          grid.position.y = -140;
          const applyGridOpacity = (m) => {
            m.transparent = true;
            m.opacity = 0.45;
            m.depthWrite = false;
          };
          if (Array.isArray(grid.material)) grid.material.forEach(applyGridOpacity);
          else applyGridOpacity(grid.material);
          scene.add(grid);

          const disc = new THREE.Mesh(
            new THREE.CircleGeometry(90, 48),
            new THREE.MeshBasicMaterial({
              color: 0xc4962a,
              transparent: true,
              opacity: 0.1,
              depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          disc.rotation.x = -Math.PI / 2;
          disc.position.y = -139;
          scene.add(disc);

          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 55, 140, 24, 1, true),
            new THREE.MeshBasicMaterial({
              color: 0xc8901a,
              transparent: true,
              opacity: 0.09,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          beam.position.y = -70;
          scene.add(beam);

          const ringDefs = [
            { r: 28, color: 0xe8b84b, opacity: 0.7 },
            { r: 52, color: 0xba0c2f, opacity: 0.38 },
            { r: 78, color: 0xc4962a, opacity: 0.3 },
            { r: 106, color: 0xe8b84b, opacity: 0.22 },
            { r: 136, color: 0xba0c2f, opacity: 0.14 },
          ];
          ringDefs.forEach(({ r, color, opacity }) => {
            const ring = new THREE.Mesh(
              new THREE.RingGeometry(r - 0.7, r + 0.7, 80),
              new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity,
                depthWrite: false,
                side: THREE.DoubleSide,
              })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = -139;
            scene.add(ring);
          });

          scene.userData.holoFloorAdded = true;
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const points = useMemo(() => {
    return countries.map((country) => {
      const isWinner = winnerNames.includes(country.name);
      const isActive = country.name === activeCountry?.name;
      const inBallot = ranked.includes(country.name);
      return {
        ...country,
        size: isWinner ? 0.92 : isActive ? 0.82 : inBallot ? 0.5 : 0.3,
        color: isWinner
          ? COLORS.champagneLight
          : isActive
            ? COLORS.goldLight
            : inBallot
              ? COLORS.champagne
              : "rgba(255,200,175,0.80)",
      };
    });
  }, [activeCountry, countries, winnerNames, ranked]);

  const rings = useMemo(() => {
    // Light the winning cities when the vote is final.
    if (winnerNames.length) {
      return winnerNames
        .map(getCountryByName)
        .filter(Boolean)
        .map((c) => ({ ...c, maxR: 6.5, propagationSpeed: 1.3, repeatPeriod: 900 }));
    }
    if (!activeCountry) {
      return countries.slice(0, 5).map((country) => ({
        ...country,
        maxR: 2.7,
        propagationSpeed: 0.62,
        repeatPeriod: 2450,
      }));
    }
    return [
      { ...activeCountry, maxR: 7.4, propagationSpeed: 1.5, repeatPeriod: 820 },
      ...countries
        .filter((country) => country.name !== activeCountry.name)
        .slice(0, 4)
        .map((country) => ({
          ...country,
          maxR: 2.3,
          propagationSpeed: 0.6,
          repeatPeriod: 2500,
        })),
    ];
  }, [activeCountry, countries, winnerNames]);

  const arcs = useMemo(() => {
    // Final: arc between the two winning cities.
    if (winnerNames.length === 2) {
      const [a, b] = winnerNames.map(getCountryByName);
      if (a && b)
        return [
          {
            startLat: a.lat,
            startLng: a.lng,
            endLat: b.lat,
            endLng: b.lng,
            label: `${a.name} + ${b.name}`,
          },
        ];
    }
    // Exploring: arc the active city to its City B options.
    const source = activeCountry;
    if (!source) return [];
    const bNames = CITY_B_MAP[source.name] || [];
    return bNames
      .map((name) => getCountryByName(name))
      .filter(Boolean)
      .map((bCity) => ({
        startLat: source.lat,
        startLng: source.lng,
        endLat: bCity.lat,
        endLng: bCity.lng,
        label: bCity.name,
      }));
  }, [activeCountry, winnerNames]);

  const activeContinent = useMemo(() => {
    if (!activeCountry || !worldGeoData.features.length) return null;
    const match = worldGeoData.features.find((f) => {
      const p = f.properties;
      return p.NAME === activeCountry.name || p.ADMIN === activeCountry.name || p.NAME_EN === activeCountry.name;
    });
    return match?.properties?.CONTINENT ?? null;
  }, [activeCountry, worldGeoData.features]);

  const polygonCapColor = useCallback(
    (d) =>
      activeContinent && d.properties.CONTINENT === activeContinent
        ? "rgba(196,150,42,0.07)"
        : "rgba(0,0,0,0)",
    [activeContinent]
  );
  const polygonSideColor = useCallback(() => "rgba(0,0,0,0)", []);
  const polygonStrokeColor = useCallback(
    (d) => {
      if (!activeContinent) return "rgba(243,213,138,0.40)";
      return d.properties.CONTINENT === activeContinent
        ? "rgba(255,220,90,0.95)"
        : "rgba(243,213,138,0.14)";
    },
    [activeContinent]
  );

  const handlePointClick = useCallback((country) => {
    setActiveCountry(country);
    setPulseKey((v) => v + 1);
  }, []);

  function openDeepDive(country) {
    setDeepDiveCountry(country);
    if (globeRef.current && typeof globeRef.current.pointOfView === "function") {
      const scene = typeof globeRef.current.scene === "function" ? globeRef.current.scene() : null;
      const grp = scene?.children.find((c) => c.isGroup);
      const rotOffsetDeg = grp ? (grp.rotation.y * 180) / Math.PI : 0;
      globeRef.current.pointOfView({ lat: country.lat, lng: country.lng + rotOffsetDeg, altitude: 0.65 }, 900);
    }
  }

  function closeDeepDive() {
    const country = deepDiveCountry;
    setDeepDiveCountry(null);
    if (globeRef.current && country && typeof globeRef.current.pointOfView === "function") {
      const scene = typeof globeRef.current.scene === "function" ? globeRef.current.scene() : null;
      const grp = scene?.children.find((c) => c.isGroup);
      const rotOffsetDeg = grp ? (grp.rotation.y * 180) / Math.PI : 0;
      globeRef.current.pointOfView(
        { lat: country.lat, lng: country.lng + rotOffsetDeg, altitude: isMobile ? 2.3 : 1.9 },
        700
      );
    }
  }

  const votePanelProps = {
    loading,
    status,
    results,
    cities: CITIES,
    ranked,
    setRanked,
    onSubmit,
    votedCount,
    submittedInitial: Boolean(myBallot && myBallot.length),
    isAdmin,
    adminBusy,
    onOpen,
    onClose,
    onReopen,
    onNotOpen,
  };

  const intelPanelProps = {
    country: activeCountry,
    ranked,
    votingOpen,
    onAddToBallot: addToBallot,
    onBack: () => setActiveCountry(null),
    onDeepDive: openDeepDive,
    briefs,
  };

  return (
    <section className="relative w-screen overflow-hidden text-white bg-[#080700]" style={{ height: "100dvh" }}>
      <ChamberCss />
      <RoomBackground active={Boolean(activeCountry)} />

      <div className="absolute left-4 top-4 z-50 flex gap-2 sm:left-5 sm:top-5">
        <button
          onClick={() => navigate("/")}
          className="rounded-full px-4 py-2 text-[10px] sm:text-xs font-black border backdrop-blur-xl"
          style={{
            background: "rgba(8,4,14,0.54)",
            borderColor: "rgba(255,232,163,0.18)",
            color: "rgba(255,255,255,0.72)",
            boxShadow: "0 0 24px rgba(0,0,0,0.46)",
          }}
        >
          Exit chamber
        </button>
      </div>

      <div className="absolute left-1/2 top-4 z-40 w-[min(88vw,600px)] -translate-x-1/2 sm:top-5">
        <ChamberHud status={status} votedCount={votedCount} results={results} />
      </div>

      <div className="absolute inset-0 z-20">
        <HoloGlobeGlow active={Boolean(activeCountry)} />

        <div className="relative holo-globe-shell">
          <Globe
            ref={globeRef}
            width={globeSize.width}
            height={globeSize.height}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere
            showGraticules
            polygonsData={worldGeoData.features}
            polygonCapColor={polygonCapColor}
            polygonSideColor={polygonSideColor}
            polygonStrokeColor={polygonStrokeColor}
            polygonAltitude={0.005}
            pointsData={points}
            pointLat={(d) => d.lat}
            pointLng={(d) => d.lng}
            pointAltitude={(d) => d.size}
            pointRadius={0.18}
            pointColor={(d) => d.color}
            pointLabel={(d) => `${countryIcon(d)} ${d.name}<br/>${d.note}`}
            onPointClick={handlePointClick}
            ringsData={rings}
            ringLat={(d) => d.lat}
            ringLng={(d) => d.lng}
            ringColor={(d) => (winnerNames.includes(d.name) ? COLORS.champagneLight : COLORS.gold)}
            ringMaxRadius={(d) => d.maxR}
            ringPropagationSpeed={(d) => d.propagationSpeed}
            ringRepeatPeriod={(d) => d.repeatPeriod}
            labelsData={activeCountry && !isMobile ? [activeCountry] : []}
            labelLat={(d) => d.lat}
            labelLng={(d) => d.lng}
            labelText={(d) => d.name}
            labelSize={1.25}
            labelDotRadius={0.28}
            labelColor={() => COLORS.champagneLight}
            labelResolution={2}
            arcsData={arcs}
            arcStartLat={(d) => d.startLat}
            arcStartLng={(d) => d.startLng}
            arcEndLat={(d) => d.endLat}
            arcEndLng={(d) => d.endLng}
            arcColor={() => `${COLORS.champagne}99`}
            arcAltitude={0.25}
            arcStroke={0.35}
            arcDashLength={0.45}
            arcDashGap={0.2}
            arcDashAnimateTime={2200}
            atmosphereColor="#C4962A"
            atmosphereAltitude={0.4}
          />
        </div>

        <ChamberReticle activeCountry={activeCountry} pulseKey={pulseKey} />
      </div>

      {activeCountry && !isMobile && !deepDiveCountry && <ConnectorBeam />}

      {/* ── DESKTOP (xl+): right-side panel toggles between country intel and the ballot ── */}
      {!deepDiveCountry && (
        <div className="absolute right-5 top-1/2 z-40 hidden w-[min(35vw,500px)] -translate-y-1/2 xl:block">
          {activeCountry ? (
            <FloatingIntelPanel {...intelPanelProps} />
          ) : (
            <VotePanel {...votePanelProps} />
          )}
        </div>
      )}

      {/* ── DESKTOP (xl+): bottom-left route archive ── */}
      {!deepDiveCountry && !activeCountry && (
        <div className="absolute left-5 z-40 hidden xl:block w-[min(22vw,260px)]" style={{ bottom: "min(14vh,140px)" }}>
          <RouteArchive />
        </div>
      )}

      {/* ── DESKTOP (xl+): bottom console for exploring candidates on the globe ── */}
      {!deepDiveCountry && (
        <div className="absolute bottom-2 left-1/2 z-50 hidden w-[min(94vw,900px)] -translate-x-1/2 sm:bottom-3 xl:block">
          <DestinationConsole
            countries={countries}
            activeCountry={activeCountry}
            winnerNames={winnerNames}
            ranked={ranked}
            onSelectCountry={handlePointClick}
            briefs={briefs}
          />
        </div>
      )}

      {/* ── MOBILE / TABLET (<xl): stacked bottom section ── */}
      {!deepDiveCountry && (
        <div
          className="absolute inset-x-0 bottom-0 z-40 flex flex-col gap-2 p-2.5 pb-3 xl:hidden"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {activeCountry ? (
            <FloatingIntelPanel {...intelPanelProps} mobile />
          ) : (
            <VotePanel {...votePanelProps} mobile />
          )}
          <DestinationConsole
            countries={countries}
            activeCountry={activeCountry}
            winnerNames={winnerNames}
            ranked={ranked}
            onSelectCountry={handlePointClick}
            briefs={briefs}
          />
        </div>
      )}

      {deepDiveCountry && <DeepDivePanel country={deepDiveCountry} onClose={closeDeepDive} />}

      {showCelebration && finalists.length === 2 && (
        <FinalistsLockedOverlay finalists={finalists} onDismiss={onDismissCelebration} />
      )}
    </section>
  );
}

/* ── Chamber header: round title + live vote status ─────────────────────────── */
function ChamberHud({ status, votedCount, results }) {
  const pill =
    status === "open"
      ? { text: votedCount > 0 ? `Voting open · ${votedCount} in` : "Voting open", tone: "#E8B84B" }
      : status === "final"
        ? { text: `Closed · ${results?.ballotCount || 0} ballots`, tone: COLORS.champagneLight }
        : { text: "Opens July 10", tone: "rgba(255,255,255,0.6)" };

  return (
    <div
      className="rounded-[1.35rem] border px-3 py-2 backdrop-blur-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(14,3,4,0.62), rgba(10,2,3,0.40)), radial-gradient(circle at 16% 12%, rgba(196,150,42,0.12), transparent 34%)",
        borderColor: "rgba(196,150,42,0.22)",
        boxShadow: "0 0 35px rgba(196,150,42,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: pill.tone, boxShadow: `0 0 12px ${pill.tone}` }}
            />
            <p className="text-[9px] uppercase tracking-[0.28em] font-black" style={{ color: "#FFD880" }}>
              Global 85 · City A
            </p>
          </div>
          <h1 className="mt-1 truncate text-base font-black sm:text-xl" style={{ fontFamily: "Georgia, serif" }}>
            Destination Vote
          </h1>
        </div>

        <div
          className="shrink-0 rounded-xl border px-3 py-1.5 text-center"
          style={{ background: "rgba(0,0,0,0.22)", borderColor: `${pill.tone}55` }}
        >
          <p className="text-[8px] uppercase tracking-[0.18em] text-white/35 font-black">Status</p>
          <p className="mt-0.5 text-[11px] font-black tabular-nums" style={{ color: pill.tone }}>
            {pill.text}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── The ranked-vote interaction panel (the chamber's primary control surface) ── */
function VotePanel({
  loading,
  status,
  results,
  cities,
  ranked,
  setRanked,
  onSubmit,
  votedCount,
  submittedInitial,
  isAdmin,
  adminBusy,
  onOpen,
  onClose,
  onReopen,
  onNotOpen,
  mobile = false,
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[1.7rem] sm:rounded-[2.1rem] border backdrop-blur-2xl chamber-scrollbar",
        mobile
          ? "mobile-panel-materialize max-h-[52vh] overflow-y-auto"
          : "panel-materialize max-h-[min(calc(100vh-180px),720px)] overflow-y-auto",
      ].join(" ")}
      style={{
        background:
          "linear-gradient(135deg, rgba(14,3,4,0.80), rgba(10,2,3,0.68)), radial-gradient(circle at 10% 0%, rgba(196,150,42,0.18), transparent 34%)",
        borderColor: "rgba(196,150,42,0.26)",
        WebkitOverflowScrolling: "touch",
        boxShadow:
          "0 0 48px rgba(196,150,42,0.10), 0 30px 120px rgba(0,0,0,0.64), inset 0 0 42px rgba(196,150,42,0.04)",
      }}
    >
      <CornerBrackets />
      <div className="relative z-10 p-4 sm:p-5">
        {loading ? (
          <div className="py-14 text-center text-sm text-white/40">Loading the chamber…</div>
        ) : status === "open" ? (
          <RankBallot
            cities={cities}
            ranked={ranked}
            setRanked={setRanked}
            onSubmit={onSubmit}
            votedCount={votedCount}
            submittedInitial={submittedInitial}
          />
        ) : status === "final" && results ? (
          <Results results={results} />
        ) : (
          <NotOpenYet />
        )}

        {isAdmin && (
          <AdminBar
            status={status}
            busy={adminBusy}
            onOpen={onOpen}
            onClose={onClose}
            onReopen={onReopen}
            onNotOpen={onNotOpen}
          />
        )}
      </div>
    </div>
  );
}

/* ── Ballot: rank your top 3 (tap to add, drag to reorder). Controlled ballot ── */
function RankBallot({ cities, ranked, setRanked, onSubmit, votedCount, submittedInitial }) {
  const [review, setReview] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(submittedInitial));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(null); // { from, over }
  const slotRefs = useRef([]);

  useEffect(() => {
    if (submittedInitial) setSubmitted(true);
  }, [submittedInitial]);

  const inRanked = (n) => ranked.includes(n);
  const add = (n) => setRanked((r) => (r.length >= 3 || r.includes(n) ? r : [...r, n]));
  const remove = (n) => setRanked((r) => r.filter((x) => x !== n));

  const onMove = useCallback(
    (e) => {
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
    },
    [ranked]
  );

  const onUp = useCallback(() => {
    setDrag((d) => {
      if (d && d.over !== d.from && ranked[d.over] !== undefined) {
        setRanked((r) => {
          const c = [...r];
          const [m] = c.splice(d.from, 1);
          c.splice(d.over, 0, m);
          return c;
        });
      }
      return null;
    });
  }, [ranked, setRanked]);

  useEffect(() => {
    if (!drag) return;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, onMove, onUp]);

  async function doSubmit() {
    setSaving(true);
    setErr("");
    try {
      await onSubmit(ranked);
      setReview(false);
      setSubmitted(true);
    } catch (e) {
      setErr(e.message || "Could not submit. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const need = 3 - ranked.length;

  return (
    <div>
      {submitted && !review && (
        <div
          className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3"
          style={{ background: "rgba(70,192,147,0.10)", border: "1px solid rgba(70,192,147,0.4)" }}
        >
          <span style={{ color: "#46c093" }}>✓</span>
          <p className="text-[12px] font-bold text-white/80">Your vote is in. You can change it until voting closes.</p>
        </div>
      )}

      <p className="text-sm text-white/55 leading-6 mb-4">
        Drag your favorites into order, or tap to add them. First choice at the top. The two cities the cohort ranks highest advance.
      </p>

      <p className="text-[10px] uppercase tracking-[0.2em] font-black mb-2.5" style={{ color: "rgba(196,150,42,0.6)" }}>
        Your ballot
      </p>
      <div className="flex flex-col gap-2.5 mb-6">
        {[0, 1, 2].map((i) => {
          const name = ranked[i];
          const c = name ? cityByName(name) : null;
          const isOver = drag && drag.over === i;
          const isDragging = drag && drag.from === i;
          return (
            <div
              key={i}
              ref={(el) => (slotRefs.current[i] = el)}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 min-h-[60px] transition-all"
              style={{
                border: `1px ${c ? "solid" : "dashed"} ${isOver ? COLORS.gold : c ? "rgba(243,213,138,0.16)" : "rgba(243,213,138,0.22)"}`,
                background: isOver ? "rgba(196,150,42,0.12)" : c ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
                opacity: isDragging ? 0.5 : 1,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl grid place-items-center font-black shrink-0"
                style={{
                  fontFamily: "Georgia, serif",
                  background: c ? `linear-gradient(150deg, ${COLORS.champagneLight}, ${COLORS.gold})` : "rgba(243,213,138,0.12)",
                  color: c ? "#17060b" : "rgba(243,213,138,0.6)",
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[8px] uppercase tracking-[0.16em] font-black" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {RANK_LABELS[i]}
                </div>
                {c ? (
                  <div className="truncate">
                    <span className="text-lg mr-1">{c.emoji}</span>
                    <span className="font-bold text-white">{c.name}</span>
                  </div>
                ) : (
                  <div className="text-sm text-white/30">Empty — tap a city below</div>
                )}
              </div>
              {c && (
                <>
                  <span
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDrag({ from: i, over: i });
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                    }}
                    className="text-white/30 text-lg px-1 cursor-grab select-none"
                    style={{ touchAction: "none" }}
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </span>
                  <button
                    onClick={() => remove(c.name)}
                    className="w-6 h-6 rounded-full text-white/50 hover:text-white text-xs shrink-0"
                    style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
                  >
                    ✕
                  </button>
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
          const picked = inRanked(c.name);
          return (
            <button
              key={c.name}
              onClick={() => add(c.name)}
              disabled={picked || ranked.length >= 3}
              className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-left transition-all active:scale-[0.97]"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                opacity: picked ? 0.32 : ranked.length >= 3 ? 0.5 : 1,
                cursor: picked || ranked.length >= 3 ? "default" : "pointer",
              }}
            >
              <span className="text-xl shrink-0">{c.emoji}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-white leading-tight truncate">{c.name}</span>
              </span>
            </button>
          );
        })}
      </div>

      {err && (
        <p className="text-[12px] font-bold mt-4" style={{ color: "#fca5a5" }}>
          {err}
        </p>
      )}

      <button
        onClick={() => setReview(true)}
        disabled={ranked.length === 0}
        className="w-full rounded-2xl py-4 mt-6 text-[11px] font-black uppercase tracking-[0.18em] transition-all disabled:opacity-40"
        style={{
          background: ranked.length
            ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`
            : "rgba(255,255,255,0.06)",
          color: ranked.length ? "#17060b" : "rgba(255,255,255,0.3)",
        }}
      >
        {submitted ? "Update my ranking" : ranked.length ? `Lock in my top ${ranked.length}` : "Pick at least one city"}
      </button>

      <p className="text-center text-[10px] text-white/25 mt-3 uppercase tracking-[0.14em]">
        {votedCount > 0 ? `${votedCount} vote${votedCount === 1 ? "" : "s"} in so far` : "Anonymous · one vote per person"}
      </p>

      {review && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setReview(false)} />
          <div
            className="relative z-10 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6"
            style={{ background: "rgba(12,10,16,0.99)", border: "1px solid rgba(243,213,138,0.16)" }}
          >
            <h2 className="text-2xl font-black mb-1" style={{ fontFamily: "Georgia, serif" }}>
              Confirm your vote
            </h2>
            <p className="text-sm text-white/55 mb-4">This is what gets recorded. You can still edit it.</p>
            <div className="mb-5">
              {ranked.map((n, i) => {
                const c = cityByName(n);
                return (
                  <div key={n} className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0">
                    <span className="text-[9px] uppercase tracking-[0.14em] font-black w-24" style={{ color: "rgba(196,150,42,0.6)" }}>
                      {RANK_LABELS[i]}
                    </span>
                    <span className="text-lg">{c?.emoji}</span>
                    <span className="font-bold text-white">{n}</span>
                  </div>
                );
              })}
            </div>
            {err && (
              <p className="text-[12px] font-bold mb-3" style={{ color: "#fca5a5" }}>
                {err}
              </p>
            )}
            <button
              onClick={doSubmit}
              disabled={saving}
              className="w-full rounded-2xl py-4 text-[11px] font-black uppercase tracking-[0.18em] disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`, color: "#17060b" }}
            >
              {saving ? "Recording…" : "Submit my vote"}
            </button>
            <button
              onClick={() => setReview(false)}
              className="w-full rounded-2xl py-3 mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/70"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Not-open state (voting closed, no results yet) ──────────────────────────── */
function NotOpenYet() {
  return (
    <div className="text-center py-4">
      <div className="text-4xl mb-3">🗳️</div>
      <h2 className="text-xl font-black mb-2" style={{ fontFamily: "Georgia, serif" }}>
        Voting opens July 10
      </h2>
      <p className="text-sm text-white/55 leading-6">
        The City A vote happens live in class. When it opens, you'll rank your top 3 cities right here. The two cities the cohort ranks highest advance. Explore the candidates on the globe while you wait.
      </p>
    </div>
  );
}

/* ── Results: top 2 finalists + expandable 3/2/1 scoreboard ──────────────────── */
function Results({ results }) {
  const [showTally, setShowTally] = useState(false);
  const top2 = results.top2 || [];
  const ranked = results.ranked || [];
  return (
    <div>
      <p className="text-center text-[10px] uppercase tracking-[0.3em] font-black mb-4" style={{ color: "rgba(70,192,147,0.7)" }}>
        Voting closed · {results.ballotCount || 0} ballots
      </p>
      <p className="text-center text-sm text-white/55 mb-4">The two cities advancing to the next round:</p>
      <div className="grid gap-3 mb-6">
        {top2.map((name, i) => {
          const c = cityByName(name);
          const row = ranked.find((r) => r.city === name);
          return (
            <div
              key={name}
              className="flex items-center gap-4 rounded-2xl p-4"
              style={{ background: "linear-gradient(150deg, rgba(196,150,42,0.14), rgba(0,0,0,0.2))", border: "1px solid rgba(243,213,138,0.3)" }}
            >
              <div className="text-3xl">{c?.emoji}</div>
              <div className="flex-1">
                <div className="text-[9px] uppercase tracking-[0.2em] font-black" style={{ color: "rgba(243,213,138,0.6)" }}>
                  Finalist {i + 1}
                </div>
                <div className="text-lg font-black text-white">{name}</div>
              </div>
              {row && (
                <div className="text-right">
                  <div className="text-2xl font-black tabular-nums" style={{ color: COLORS.champagneLight }}>
                    {row.points}
                  </div>
                  <div className="text-[8px] uppercase tracking-wide text-white/35">points</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {results.tieForSecond && (
        <p className="text-[11px] text-center mb-4 font-bold" style={{ color: COLORS.ember }}>
          Note: the 2nd finalist was a tie on points and first-choice votes. The host will confirm the result.
        </p>
      )}

      <button
        onClick={() => setShowTally((s) => !s)}
        className="w-full text-[10px] uppercase tracking-[0.18em] font-black text-white/45 py-2"
      >
        {showTally ? "Hide the full tally ▲" : "Show the full tally ▼"}
      </button>
      {showTally && (
        <div className="rounded-2xl overflow-hidden mt-2" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          {ranked.map((r, i) => {
            const c = cityByName(r.city);
            return (
              <div
                key={r.city}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ background: i % 2 ? "rgba(255,255,255,0.02)" : "transparent", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none" }}
              >
                <span className="text-[10px] tabular-nums text-white/35 w-4">{i + 1}</span>
                <span className="text-base">{c?.emoji}</span>
                <span className="flex-1 text-sm font-bold text-white/85">{r.city}</span>
                <span className="text-sm font-black tabular-nums" style={{ color: COLORS.champagneLight }}>
                  {r.points} pts
                </span>
              </div>
            );
          })}
          <p className="text-[9px] text-white/30 px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            Scoring: 1st choice = 3 pts, 2nd = 2, 3rd = 1. Ties broken by most first-choice votes.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Admin controls (jshrug only) ────────────────────────────────────────────── */
function AdminBar({ status, busy, onOpen, onClose, onReopen, onNotOpen }) {
  const [confirm, setConfirm] = useState(null); // 'open' | 'close' | 'reopen' | 'notopen'
  const act = { open: onOpen, close: onClose, reopen: onReopen, notopen: onNotOpen }[confirm];
  const copy = {
    open: `Open voting for all ${COHORT_SIZE} members?`,
    close: "Close voting and reveal the top 2? This tallies every ballot.",
    reopen: "Reopen voting? This lets members change their ballots again.",
    notopen: "Set voting back to not open yet? Members can't vote and no results are revealed. Any ballots already cast are kept.",
  }[confirm];

  return (
    <div className="mt-8 rounded-2xl p-4" style={{ background: "rgba(198,90,46,0.06)", border: "1px solid rgba(198,90,46,0.24)" }}>
      <p className="text-[9px] uppercase tracking-[0.24em] font-black mb-3" style={{ color: "rgba(232,120,60,0.7)" }}>
        Host controls · admin only
      </p>
      <div className="flex gap-2 flex-wrap">
        {status !== "open" && <AdminBtn label="Open voting" onClick={() => setConfirm("open")} disabled={busy} />}
        {status === "open" && <AdminBtn label="Close & reveal top 2" onClick={() => setConfirm("close")} disabled={busy} primary />}
        {status === "open" && onNotOpen && <AdminBtn label="Revert to not open yet" onClick={() => setConfirm("notopen")} disabled={busy} />}
        {status === "final" && <AdminBtn label="Reopen voting" onClick={() => setConfirm("reopen")} disabled={busy} />}
      </div>
      {confirm && (
        <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-[12px] text-white/80 mb-2.5">{copy}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                act();
                setConfirm(null);
              }}
              disabled={busy}
              className="flex-1 rounded-lg py-2 text-[10px] font-black uppercase tracking-[0.14em]"
              style={{ background: COLORS.ember, color: "#fff" }}
            >
              {busy ? "Working…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirm(null)}
              className="flex-1 rounded-lg py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/70"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function AdminBtn({ label, onClick, disabled, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-40"
      style={
        primary
          ? { background: `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.ember})`, color: "#16060a" }
          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.12)" }
      }
    >
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Preserved chamber pieces below — room, glow, intel, deep dive, reticle, etc.
   ══════════════════════════════════════════════════════════════════════════════ */
function RouteArchive() {
  const [open, setOpen] = useState(false);
  const recentRoutes = getRecentCohortDestinations(5);
  const topCities = getMostRepeatedDestinations().slice(0, 5);

  return (
    <div
      className="rounded-2xl border backdrop-blur-xl overflow-hidden"
      style={{ background: "rgba(8,4,0,0.68)", borderColor: "rgba(196,150,42,0.20)", boxShadow: "0 0 24px rgba(0,0,0,0.48)" }}
    >
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-left">
        <span className="text-[9px] uppercase tracking-[0.26em] font-black" style={{ color: "rgba(243,213,138,0.62)" }}>
          Route archive
        </span>
        <span className="text-[9px]" style={{ color: "rgba(243,213,138,0.45)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {!open && (
        <div className="px-4 pb-2.5">
          <p className="text-[9px] text-white/32 leading-4">Prior cohorts left a route history. Use it as signal.</p>
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 space-y-3 max-h-[180px] overflow-y-auto chamber-scrollbar">
          <div>
            <div className="text-[8px] uppercase tracking-[0.22em] font-black mb-1.5" style={{ color: "rgba(243,213,138,0.40)" }}>
              Recent routes
            </div>
            <div className="space-y-1">
              {recentRoutes.map((trip) => (
                <div key={trip.cohort} className="flex items-center gap-2">
                  <span className="text-[8px] font-black w-6 shrink-0" style={{ color: "rgba(196,150,42,0.55)" }}>
                    {trip.cohort}
                  </span>
                  <span className="text-[9px] text-white/45 truncate">{trip.destinations.join(" + ")}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-[0.22em] font-black mb-1.5" style={{ color: "rgba(243,213,138,0.40)" }}>
              Most repeated
            </div>
            <div className="flex flex-wrap gap-1">
              {topCities.map(({ city, count }) => (
                <span
                  key={city}
                  className="rounded-full px-2 py-0.5 text-[8px] font-bold"
                  style={{ background: "rgba(196,150,42,0.08)", border: "1px solid rgba(196,150,42,0.16)", color: "rgba(255,216,128,0.55)" }}
                >
                  {city} ({count})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChamberCss() {
  return (
    <style>{`
      @keyframes panelMaterialize {
        0% { opacity: 0; transform: translateY(22px) translateX(16px) scale(.96); filter: blur(14px); }
        60% { opacity: .82; filter: blur(2px); }
        100% { opacity: 1; transform: translateY(0) translateX(0) scale(1); filter: blur(0); }
      }
      @keyframes mobilePanelMaterialize {
        0% { opacity: 0; transform: translateY(22px) scale(.98); filter: blur(12px); }
        100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      }
      @keyframes targetPing {
        0% { opacity: .9; transform: scale(.84); }
        70% { opacity: .18; transform: scale(1.2); }
        100% { opacity: 0; transform: scale(1.3); }
      }
      @keyframes holoFlicker {
        0%, 100% { opacity: .96; }
        7% { opacity: .78; }
        9% { opacity: 1; }
        52% { opacity: .83; }
        54% { opacity: .98; }
      }
      @keyframes beamBreathe {
        0%, 100% { opacity: .48; transform: scaleX(.94); }
        50% { opacity: .92; transform: scaleX(1); }
      }
      @keyframes reflectionBreathe {
        0%, 100% { opacity: .48; transform: translateX(-50%) scaleY(-.38) scaleX(.96); }
        50% { opacity: .72; transform: translateX(-50%) scaleY(-.43) scaleX(1.02); }
      }
      @keyframes holoShell {
        0%, 100% { opacity: .34; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: .54; transform: translate(-50%, -50%) scale(1.018); }
      }
      .holo-globe-shell::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: min(64vw, 620px);
        height: min(64vw, 620px);
        transform: translate(-50%, -50%);
        border-radius: 9999px;
        pointer-events: none;
        z-index: 5;
        will-change: transform, opacity;
        background:
          repeating-linear-gradient(0deg, rgba(196,150,42,0.14) 0px, rgba(196,150,42,0.14) 1px, transparent 2px, transparent 7px),
          radial-gradient(circle at 38% 32%, rgba(255,255,255,0.22), transparent 16%),
          radial-gradient(circle, transparent 45%, rgba(196,150,42,0.16) 57%, rgba(196,150,42,0.18) 70%, transparent 74%);
        mix-blend-mode: screen;
        animation: holoShell 3.6s ease-in-out infinite;
      }
      .holo-globe-shell::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: min(66vw, 650px);
        height: min(66vw, 650px);
        transform: translate(-50%, -50%);
        border-radius: 9999px;
        pointer-events: none;
        z-index: 6;
        border: 1px solid rgba(196,150,42,0.22);
        box-shadow:
          inset 0 0 38px rgba(196,150,42,0.10),
          inset 0 0 70px rgba(196,150,42,0.08),
          0 0 42px rgba(196,150,42,0.14),
          0 0 82px rgba(196,150,42,0.10);
      }
      .panel-materialize {
        animation: panelMaterialize 520ms cubic-bezier(.2,.9,.2,1) both, holoFlicker 7s ease-in-out infinite;
      }
      .mobile-panel-materialize {
        animation: mobilePanelMaterialize 420ms cubic-bezier(.2,.9,.2,1) both, holoFlicker 7s ease-in-out infinite;
      }
      .chamber-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
      .chamber-scrollbar::-webkit-scrollbar-thumb { background: rgba(196,150,42,.48); border-radius: 999px; }
      @keyframes confettiFall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        80% { opacity: 0.7; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
      @keyframes deepDiveEnter {
        0% { opacity: 0; transform: translateY(32px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes celebrationEnter {
        0% { opacity: 0; transform: scale(0.94); }
        100% { opacity: 1; transform: scale(1); }
      }
      .deep-dive-enter { animation: deepDiveEnter 420ms cubic-bezier(.2,.9,.2,1) both; }
      .celebration-enter { animation: celebrationEnter 500ms cubic-bezier(.2,.9,.2,1) both; }
    `}</style>
  );
}

function RoomBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#080700]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 17%, rgba(196,150,42,0.22), transparent 22%), " +
            "radial-gradient(circle at 24% 17%, rgba(243,213,138,0.16), transparent 22%), " +
            "radial-gradient(circle at 82% 25%, rgba(196,150,42,0.09), transparent 24%), " +
            "linear-gradient(180deg, #100e01 0%, #080700 42%, #040400 100%)",
        }}
      />
      <div
        className="absolute left-1/2 top-[6vh] h-[60vh] w-[88vw] max-w-[1380px] -translate-x-1/2 rounded-t-[4rem] border"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,18,2,0.52), rgba(12,10,1,0.26) 58%, rgba(0,0,0,0.08)), " +
            "repeating-linear-gradient(90deg, rgba(196,150,42,0.09) 0px, rgba(196,150,42,0.09) 1px, transparent 1px, transparent 124px), " +
            "repeating-linear-gradient(0deg, rgba(196,150,42,0.07) 0px, rgba(196,150,42,0.07) 1px, transparent 1px, transparent 92px)",
          borderColor: "rgba(196,150,42,0.26)",
          boxShadow: "inset 0 0 120px rgba(196,150,42,0.06), inset 0 -80px 110px rgba(0,0,0,0.56), 0 0 130px rgba(0,0,0,0.86)",
        }}
      />
      <div
        className="absolute left-1/2 top-[7.5vh] h-[2px] w-[66vw] max-w-[960px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(196,150,42,0.52), rgba(196,150,42,0.78), rgba(243,213,138,0.62), rgba(196,150,42,0.52), transparent)",
          boxShadow: "0 0 18px rgba(196,150,42,0.42), 0 0 55px rgba(196,150,42,0.28)",
        }}
      />
      <div className="absolute left-1/2 top-[9vh] h-[26vh] w-[74vw] -translate-x-1/2 rounded-full bg-[#C4962A]/22 blur-[100px]" />
      <div className="absolute left-[25%] top-[22vh] h-[24vh] w-[38vw] rounded-full bg-[#F3D58A]/18 blur-[110px]" />
      <div className="absolute right-[15%] top-[24vh] h-[18vh] w-[34vw] rounded-full bg-[#C4962A]/12 blur-[110px]" />
      <div
        className="absolute left-[-7vw] top-[6vh] h-[76vh] w-[36vw] origin-right -skew-y-6 border-r"
        style={{
          background:
            "linear-gradient(90deg, #000 0%, rgba(0,0,0,0.9) 36%, rgba(18,15,2,0.42) 72%, transparent 100%), " +
            "repeating-linear-gradient(0deg, transparent 0px, transparent 76px, rgba(255,232,163,0.08) 77px, transparent 78px)",
          borderColor: "rgba(196,150,42,0.22)",
          boxShadow: "inset -50px 0 90px rgba(196,150,42,0.04)",
        }}
      />
      <div
        className="absolute right-[-7vw] top-[6vh] h-[76vh] w-[36vw] origin-left skew-y-6 border-l"
        style={{
          background:
            "linear-gradient(270deg, #000 0%, rgba(0,0,0,0.9) 36%, rgba(18,15,2,0.42) 72%, transparent 100%), " +
            "repeating-linear-gradient(0deg, transparent 0px, transparent 76px, rgba(255,232,163,0.08) 77px, transparent 78px)",
          borderColor: "rgba(196,150,42,0.20)",
          boxShadow: "inset 50px 0 90px rgba(196,150,42,0.04)",
        }}
      />
      <div
        className="absolute left-[8vw] top-[18vh] h-[44vh] w-px"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(255,210,160,0.55), transparent)",
          boxShadow: "0 0 18px rgba(196,150,42,0.48), 0 0 40px rgba(196,150,42,0.20)",
        }}
      />
      <div
        className="absolute right-[8vw] top-[18vh] h-[44vh] w-px"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(255,210,160,0.55), transparent)",
          boxShadow: "0 0 18px rgba(196,150,42,0.52), 0 0 40px rgba(196,150,42,0.18)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,transparent_0%,transparent_41%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.88)_100%)]" />
    </div>
  );
}

function HoloGlobeGlow({ active }) {
  return (
    <>
      <div
        className="absolute left-1/2 top-1/2 h-[min(86vw,820px)] w-[min(86vw,820px)] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(196,150,42,0.30), rgba(196,150,42,0.12) 27%, rgba(196,150,42,0.14) 46%, transparent 72%)",
          filter: "blur(18px)",
          opacity: active ? 1 : 0.86,
          willChange: "opacity",
        }}
      />
      <div
        className="absolute left-1/2 top-[61%] z-[-1] h-[330px] w-[min(80vw,640px)] rounded-[100%] pointer-events-none"
        style={{
          transform: "translateX(-50%) scaleY(-0.42)",
          background:
            "radial-gradient(ellipse at center, rgba(196,150,42,0.26), rgba(243,213,138,0.16) 32%, rgba(196,150,42,0.08) 54%, transparent 73%)",
          filter: "blur(12px)",
          animation: "reflectionBreathe 4s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />
      <div
        className="absolute left-1/2 top-[53%] h-[470px] w-[330px] -translate-x-1/2 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(196,150,42,0.00), rgba(243,213,138,0.22), rgba(196,150,42,0.20), rgba(196,150,42,0.08), transparent)",
          clipPath: "polygon(44% 0%, 56% 0%, 100% 100%, 0% 100%)",
          filter: "blur(12px)",
          opacity: 0.92,
          willChange: "transform",
        }}
      />
    </>
  );
}

function ConnectorBeam() {
  return (
    <div className="pointer-events-none absolute left-[49%] right-[37%] top-1/2 z-30 hidden h-px origin-left xl:block">
      <div
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, rgba(243,213,138,0), rgba(196,150,42,0.82), rgba(196,150,42,0.64), rgba(196,150,42,0))",
          boxShadow: "0 0 18px rgba(196,150,42,0.44), 0 0 34px rgba(196,150,42,0.30)",
          animation: "beamBreathe 2.4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
        style={{ background: COLORS.champagneLight, boxShadow: "0 0 18px rgba(243,213,138,0.8)" }}
      />
    </div>
  );
}

function FloatingIntelPanel({ country, ranked = [], votingOpen, onAddToBallot, onBack, onDeepDive, briefs = [], mobile = false }) {
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [viewingBrief, setViewingBrief] = useState(null);
  useEffect(() => {
    setBriefExpanded(false);
    setViewingBrief(null);
  }, [country?.name]);

  if (!country) return null;
  const brief = findBriefForCountry(briefs, country);
  const inBallot = ranked.includes(country.name);
  const ballotFull = ranked.length >= 3;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-[1.7rem] sm:rounded-[2.1rem] border backdrop-blur-2xl chamber-scrollbar",
        mobile ? "mobile-panel-materialize max-h-[36vh] overflow-y-auto" : "panel-materialize max-h-[min(calc(100vh-180px),680px)] overflow-y-auto",
      ].join(" ")}
      style={{
        background:
          "linear-gradient(135deg, rgba(14,3,4,0.80), rgba(10,2,3,0.68)), radial-gradient(circle at 10% 0%, rgba(196,150,42,0.18), transparent 34%)",
        borderColor: "rgba(196,150,42,0.26)",
        WebkitOverflowScrolling: "touch",
        boxShadow: "0 0 48px rgba(196,150,42,0.10), 0 30px 120px rgba(0,0,0,0.64), inset 0 0 42px rgba(196,150,42,0.04)",
      }}
    >
      <div
        className="absolute inset-0 opacity-18 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(196,150,42,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(196,150,42,0.08) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      <CornerBrackets />

      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl sm:h-16 sm:w-16"
            style={{
              background: inBallot ? "rgba(243,213,138,0.12)" : "rgba(196,150,42,0.08)",
              borderColor: inBallot ? "rgba(243,213,138,0.28)" : "rgba(196,150,42,0.22)",
            }}
          >
            {countryIcon(country)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.26em] font-black" style={{ color: "#FFD880" }}>
              Target acquired · City A
            </p>
            <h2 className="mt-1 truncate text-3xl font-black leading-none sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
              {country.name}
            </h2>
            <p className="mt-2 truncate text-sm text-white/48">
              {country.region} · {country.note}
            </p>
          </div>
        </div>

        <div className={mobile ? "hidden" : "relative mt-5 h-44 overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/35"}>
          <img
            src={country.image}
            alt={`${country.name} preview`}
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: "cover" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,2,3,0.04), rgba(10,2,3,0.76)), radial-gradient(circle at 18% 12%, rgba(196,150,42,0.20), transparent 32%)",
            }}
          />
          <div className="absolute left-4 bottom-4 rounded-full border border-white/10 bg-black/42 px-3 py-1 text-xs font-black text-white/70 backdrop-blur">
            Live country intel
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniInfo label="Fit" value={country.fit} />
          <MiniInfo label="Cost" value={country.cost} />
          <MiniInfo label="Travel" value={country.travel} />
        </div>

        <div className={mobile ? "hidden" : "mt-4 rounded-3xl border border-white/10 bg-black/30 p-4"}>
          <p className="text-xs uppercase tracking-[0.18em] font-black" style={{ color: COLORS.champagne }}>
            Porter read
          </p>
          <p className="mt-2 text-sm leading-6 text-white/65">{country.porter}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {country.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-full border px-3 py-1 text-xs font-bold"
                style={{ background: "rgba(196,150,42,0.08)", borderColor: "rgba(196,150,42,0.18)", color: "#FFD880" }}
              >
                {reason}
              </span>
            ))}
          </div>
        </div>

        {brief && (
          <div className="mt-4 rounded-3xl border p-4" style={{ background: "rgba(196,150,42,0.06)", borderColor: "rgba(196,150,42,0.22)" }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.18em] font-black" style={{ color: COLORS.champagne }}>
                Cohort brief submitted
              </p>
              <span className="text-[9px] uppercase tracking-[0.14em] font-black opacity-60">◆</span>
            </div>
            {brief.team_members && <p className="mt-1 text-[10px] text-white/45 uppercase tracking-[0.12em]">Team — {brief.team_members}</p>}
            <p className={`mt-2 text-sm leading-6 text-white/70 ${briefExpanded ? "" : "line-clamp-4"}`}>{brief.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {brief.content.length > 220 && (
                <button
                  onClick={() => setBriefExpanded((v) => !v)}
                  className="text-[9px] font-black uppercase tracking-[0.18em]"
                  style={{ color: COLORS.champagne }}
                >
                  {briefExpanded ? "Show less" : "Read full brief ↓"}
                </button>
              )}
              {brief.download_url && (
                brief.file_type === "application/pdf" ? (
                  <button
                    onClick={() => setViewingBrief(brief)}
                    className="text-[9px] font-black uppercase tracking-[0.18em]"
                    style={{ color: COLORS.champagne }}
                  >
                    View original PDF ↗
                  </button>
                ) : (
                  <a
                    href={brief.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9px] font-black uppercase tracking-[0.18em]"
                    style={{ color: COLORS.champagne }}
                  >
                    Download original file ↗
                  </a>
                )
              )}
            </div>
          </div>
        )}

        {viewingBrief && (
          <Suspense fallback={null}>
            <PdfViewerModal
              url={viewingBrief.download_url}
              filename={viewingBrief.file_name}
              onClose={() => setViewingBrief(null)}
            />
          </Suspense>
        )}

        {!mobile &&
          (() => {
            const cohorts = getCohortsForCity(country.name);
            const orgs = getPreviousVisitOrgsForCity(country.name);
            const freshness = getFreshnessLabel(country.name);
            const operatorRead = getCohortBuiltConnectionRead(country.name);
            const displayOrgs = orgs.slice(0, 6);
            const extraOrgs = orgs.length - displayOrgs.length;
            const freshnessColor =
              freshness === "Fresh pick"
                ? "#7DD3C0"
                : freshness === "Some precedent"
                  ? "#A8C5E8"
                  : freshness === "Strong precedent"
                    ? "#E8B84B"
                    : "#E07060";
            return (
              <div className="mt-4 rounded-3xl border p-4" style={{ background: "rgba(0,0,0,0.28)", borderColor: "rgba(196,150,42,0.16)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs uppercase tracking-[0.18em] font-black" style={{ color: COLORS.champagne }}>
                    DU signal
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                    style={{ background: "rgba(0,0,0,0.30)", border: `1px solid ${freshnessColor}44`, color: freshnessColor }}
                  >
                    {freshness}
                  </span>
                </div>
                {cohorts.length > 0 && <p className="text-[10px] text-white/48 mb-2 font-bold">Cohorts {cohorts.join(", ")}</p>}
                {orgs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {displayOrgs.map((org) => (
                      <span
                        key={org}
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.52)" }}
                      >
                        {org}
                      </span>
                    ))}
                    {extraOrgs > 0 && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{ background: "rgba(196,150,42,0.08)", border: "1px solid rgba(196,150,42,0.18)", color: "#FFD88066" }}
                      >
                        +{extraOrgs} more
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[10px] leading-4 text-white/40 italic">{operatorRead}</p>
              </div>
            );
          })()}

        {CITY_B_MAP[country.name]?.length > 0 && (
          <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.18em] font-black" style={{ color: COLORS.champagne }}>
              City B options
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CITY_B_MAP[country.name].map((name) => (
                <span
                  key={name}
                  className="rounded-full border px-3 py-1 text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.62)" }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-2">
          {votingOpen && (
            <button
              onClick={() => onAddToBallot?.(country.name)}
              disabled={inBallot || ballotFull}
              className="rounded-2xl px-4 py-3 text-center font-black uppercase tracking-[0.08em] disabled:opacity-60"
              style={{
                background: inBallot ? "rgba(243,213,138,0.12)" : `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
                color: inBallot ? COLORS.champagneLight : COLORS.midnight,
                border: inBallot ? "1px solid rgba(243,213,138,0.28)" : "none",
              }}
            >
              {inBallot ? "✓ On your ballot" : ballotFull ? "Ballot full · top 3 picked" : "Add to my ballot"}
            </button>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={onBack}
              className="rounded-2xl px-4 py-2.5 text-center font-black uppercase tracking-[0.1em] text-xs border"
              style={{ background: "rgba(196,150,42,0.08)", border: "1px solid rgba(196,150,42,0.22)", color: "#FFD880" }}
            >
              ← Back to ballot
            </button>
            <button
              onClick={() => onDeepDive?.(country)}
              className="rounded-2xl px-4 py-2.5 text-center font-black uppercase tracking-[0.1em] text-xs border transition-all hover:border-[rgba(243,213,138,0.4)]"
              style={{ background: "rgba(196,150,42,0.05)", border: "1px solid rgba(196,150,42,0.18)", color: "rgba(243,213,138,0.72)" }}
            >
              Deep dive → full intel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CornerBrackets() {
  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 h-8 w-8 border-l border-t border-[#E8B84B]/40" />
      <div className="pointer-events-none absolute right-3 top-3 h-8 w-8 border-r border-t border-[#C4962A]/50" />
      <div className="pointer-events-none absolute bottom-3 left-3 h-8 w-8 border-b border-l border-[#C4962A]/50" />
      <div className="pointer-events-none absolute bottom-3 right-3 h-8 w-8 border-b border-r border-[#E8B84B]/40" />
    </>
  );
}

function DeepDivePanel({ country, onClose }) {
  const data = DEEP_DIVE[country.name] || {};

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden deep-dive-enter">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(4,3,0,0.96) 0%, rgba(8,7,0,0.94) 100%)", backdropFilter: "blur(24px)" }}
      />

      <div className="relative z-10 flex flex-col h-full overflow-y-auto chamber-scrollbar">
        <div
          className="sticky top-0 z-20 flex items-center gap-3 px-5 py-3 border-b"
          style={{ background: "rgba(4,3,0,0.88)", borderColor: "rgba(196,150,42,0.18)", backdropFilter: "blur(12px)" }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black border"
            style={{ background: "rgba(196,150,42,0.08)", borderColor: "rgba(196,150,42,0.22)", color: "#FFD880" }}
          >
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-black" style={{ color: "rgba(243,213,138,0.55)" }}>
              Deep Dive · City A
            </div>
            <div className="text-lg font-black truncate" style={{ fontFamily: "Georgia, serif" }}>
              {countryIcon(country)} {country.name}
            </div>
          </div>
        </div>

        <div className="relative h-56 sm:h-72 shrink-0 overflow-hidden">
          <img src={country.image} alt={country.name} className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(4,3,0,0.14) 0%, transparent 40%, rgba(4,3,0,0.82) 100%), " +
                "radial-gradient(circle at 18% 12%, rgba(196,150,42,0.22), transparent 32%)",
            }}
          />
          <div className="absolute bottom-4 left-5 right-5">
            <div className="text-[10px] uppercase tracking-[0.24em] font-black" style={{ color: "rgba(243,213,138,0.8)" }}>
              {country.region} · {country.note}
            </div>
            <div className="flex gap-3 mt-2">
              <span className="rounded-full px-3 py-1 text-xs font-bold bg-black/40 border border-white/10" style={{ color: COLORS.champagneLight }}>
                {country.cost} cost
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-bold bg-black/40 border border-white/10" style={{ color: COLORS.champagneLight }}>
                {country.travel} flight
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-bold bg-black/40 border border-white/10" style={{ color: COLORS.champagneLight }}>
                Fit: {country.fit}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 space-y-6 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DeepDiveStat icon="✈️" label="Flight from Denver" value={data.flightFromDenver || "—"} />
            <DeepDiveStat icon="💰" label="Estimated cost" value={data.costRange || "—"} />
            <DeepDiveStat icon="🌤️" label="Best window" value={data.bestWindow || "—"} />
            <DeepDiveStat icon="🛂" label="Visa (US passport)" value={data.visa || "Check travel.state.gov"} />
          </div>

          {data.videoId && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] font-black mb-3" style={{ color: "#FFD880" }}>
                Destination video
              </div>
              <div className="relative w-full rounded-2xl overflow-hidden border border-white/10" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${data.videoId}`}
                  title={`${country.name} destination video`}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  style={{ border: "none" }}
                />
              </div>
            </div>
          )}

          {data.currency && (
            <div className="rounded-2xl px-4 py-3 border flex items-start gap-3" style={{ background: "rgba(0,0,0,0.22)", borderColor: "rgba(196,150,42,0.14)" }}>
              <span className="text-lg shrink-0">💵</span>
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] font-black mb-1" style={{ color: "rgba(243,213,138,0.55)" }}>
                  Currency & payments
                </div>
                <p className="text-xs text-white/70 leading-5">{data.currency}</p>
              </div>
            </div>
          )}

          {CITY_B_MAP[country.name]?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] font-black mb-3" style={{ color: "#FFD880" }}>
                City B add-on options
              </div>
              <div className="flex flex-wrap gap-2">
                {CITY_B_MAP[country.name].map((name) => (
                  <span
                    key={name}
                    className="rounded-full border px-3 py-1.5 text-xs font-bold"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)" }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.experiences?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] font-black mb-3" style={{ color: "#FFD880" }}>
                Signature experiences
              </div>
              <div className="space-y-2">
                {data.experiences.map((exp, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl px-4 py-3 border" style={{ background: "rgba(196,150,42,0.05)", borderColor: "rgba(196,150,42,0.14)" }}>
                    <span className="shrink-0 text-sm" style={{ color: COLORS.gold }}>
                      ◆
                    </span>
                    <span className="text-sm text-white/78 leading-5">{exp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.hotels?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] font-black mb-3" style={{ color: "#FFD880" }}>
                Where to stay
              </div>
              <div className="space-y-2">
                {data.hotels.map((h, i) => (
                  <div key={i} className="rounded-2xl px-4 py-3 border" style={{ background: "rgba(0,0,0,0.22)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-white/90">{h.name}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                        style={{
                          background: h.tier === "Luxury" ? "rgba(196,150,42,0.18)" : h.tier === "Mid" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
                          color: h.tier === "Luxury" ? COLORS.champagne : "rgba(255,255,255,0.5)",
                          border: `1px solid ${h.tier === "Luxury" ? "rgba(196,150,42,0.28)" : "rgba(255,255,255,0.10)"}`,
                        }}
                      >
                        {h.tier}
                      </span>
                    </div>
                    <p className="text-xs text-white/55 leading-5">{h.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.restaurants?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] font-black mb-3" style={{ color: "#FFD880" }}>
                Where to eat
              </div>
              <div className="space-y-2">
                {data.restaurants.map((r, i) => (
                  <div key={i} className="rounded-2xl px-4 py-3 border" style={{ background: "rgba(0,0,0,0.22)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <div className="text-sm font-black text-white/90 mb-0.5">{r.name}</div>
                    <div className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: `${COLORS.champagne}88` }}>
                      {r.dish}
                    </div>
                    <p className="text-xs text-white/55 leading-5">{r.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.culturalNotes && (
            <div className="rounded-2xl px-4 py-4 border" style={{ background: "rgba(255,232,163,0.04)", borderColor: "rgba(243,213,138,0.16)" }}>
              <div className="text-[10px] uppercase tracking-[0.26em] font-black mb-2" style={{ color: "#FFD880" }}>
                Cultural notes
              </div>
              <p className="text-sm text-white/70 leading-6">{data.culturalNotes}</p>
            </div>
          )}

          {data.porterVibe && (
            <div className="rounded-2xl px-4 py-4 border" style={{ background: "rgba(196,150,42,0.06)", borderColor: "rgba(196,150,42,0.20)" }}>
              <div className="text-[10px] uppercase tracking-[0.26em] font-black mb-2" style={{ color: "#FFD880" }}>
                Porter read
              </div>
              <p className="text-sm text-white/75 leading-6 italic">{data.porterVibe}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {country.reasons?.map((reason) => (
              <span
                key={reason}
                className="rounded-full border px-3 py-1 text-xs font-bold"
                style={{ background: "rgba(196,150,42,0.08)", borderColor: "rgba(196,150,42,0.18)", color: "#FFD880" }}
              >
                {reason}
              </span>
            ))}
          </div>

          {(() => {
            const cohorts = getCohortsForCity(country.name);
            const orgs = getPreviousVisitOrgsForCity(country.name);
            const freshness = getFreshnessLabel(country.name);
            const operatorRead = getCohortBuiltConnectionRead(country.name);
            const displayOrgs = orgs.slice(0, 8);
            const extraOrgs = orgs.length - displayOrgs.length;
            const freshnessColor =
              freshness === "Fresh pick"
                ? "#7DD3C0"
                : freshness === "Some precedent"
                  ? "#A8C5E8"
                  : freshness === "Strong precedent"
                    ? "#E8B84B"
                    : "#E07060";
            return (
              <div className="rounded-2xl border p-4" style={{ background: "rgba(0,0,0,0.28)", borderColor: "rgba(196,150,42,0.16)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[10px] uppercase tracking-[0.26em] font-black" style={{ color: "#FFD880" }}>
                    Prior cohort intel
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                    style={{ background: "rgba(0,0,0,0.30)", border: `1px solid ${freshnessColor}44`, color: freshnessColor }}
                  >
                    {freshness}
                  </span>
                </div>
                {cohorts.length > 0 ? (
                  <p className="text-xs text-white/55 mb-3">
                    Prior cohorts visited: <span className="font-bold text-white/70">{cohorts.join(", ")}</span>
                  </p>
                ) : (
                  <p className="text-xs text-white/38 mb-3">No prior cohort has visited this city.</p>
                )}
                {orgs.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[9px] uppercase tracking-[0.18em] font-black mb-2" style={{ color: "rgba(243,213,138,0.45)" }}>
                      Organizations prior cohorts visited
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {displayOrgs.map((org) => (
                        <span
                          key={org}
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.58)" }}
                        >
                          {org}
                        </span>
                      ))}
                      {extraOrgs > 0 && (
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                          style={{ background: "rgba(196,150,42,0.08)", border: "1px solid rgba(196,150,42,0.18)", color: "#FFD88077" }}
                        >
                          +{extraOrgs} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs leading-5 text-white/45 italic">{operatorRead}</p>
                <p className="mt-2 text-[10px] text-white/28 leading-4">
                  This shows what prior cohorts accessed. Cohort 85 would still need to build and confirm actual access.
                </p>
              </div>
            );
          })()}

          <button
            onClick={onClose}
            className="w-full rounded-2xl px-4 py-4 font-black uppercase tracking-[0.08em] text-base"
            style={{ background: "rgba(196,150,42,0.08)", border: "1px solid rgba(196,150,42,0.22)", color: "#FFD880" }}
          >
            ← Back to the chamber
          </button>
        </div>
      </div>
    </div>
  );
}

function DeepDiveStat({ icon, label, value }) {
  return (
    <div className="rounded-2xl px-3 py-3 border" style={{ background: "rgba(0,0,0,0.30)", borderColor: "rgba(196,150,42,0.14)" }}>
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-[9px] uppercase tracking-[0.18em] text-white/38 font-black mb-1">{label}</div>
      <div className="text-xs font-bold leading-4" style={{ color: COLORS.champagneLight }}>
        {value}
      </div>
    </div>
  );
}

/* ── Celebration overlay: the two finalists locked ───────────────────────────── */
function FinalistsLockedOverlay({ finalists, onDismiss }) {
  const [a, b] = finalists;
  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center celebration-enter">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <ConfettiLayer />

      <div
        className="relative z-10 mx-5 max-w-md w-full rounded-[2rem] overflow-hidden border"
        style={{
          background:
            "linear-gradient(155deg, rgba(12,8,0,0.96) 0%, rgba(6,4,0,0.94) 100%), radial-gradient(circle at 30% 10%, rgba(196,150,42,0.28), transparent 50%)",
          borderColor: "rgba(243,213,138,0.34)",
          boxShadow: "0 0 80px rgba(196,150,42,0.26), 0 0 160px rgba(196,150,42,0.12), inset 0 0 60px rgba(196,150,42,0.05)",
        }}
      >
        <CornerBrackets />
        <div className="relative p-7 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] mb-4"
            style={{ borderColor: "rgba(243,213,138,0.30)", color: "#FFD880", background: "rgba(196,150,42,0.08)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#E8B84B] animate-pulse" />
            Finalists locked
          </div>

          <h1 className="text-5xl font-black" style={{ fontFamily: "Georgia, serif", color: COLORS.champagneLight }}>
            {countryIcon(a)}
          </h1>
          <h1 className="text-5xl font-black mt-1" style={{ fontFamily: "Georgia, serif", color: COLORS.champagneLight }}>
            {countryIcon(b)}
          </h1>

          <div className="mt-4">
            <div className="text-2xl font-black" style={{ fontFamily: "Georgia, serif" }}>
              {a.name}
            </div>
            <div className="text-sm text-white/40 my-1">+</div>
            <div className="text-2xl font-black" style={{ fontFamily: "Georgia, serif" }}>
              {b.name}
            </div>
          </div>

          <p className="mt-5 text-sm text-white/60 leading-6">
            The cohort ranked these two City A finalists highest. They advance to the next round.
          </p>

          {TRIP_DATE && <TripCountdownMini tripDate={TRIP_DATE} />}

          <button
            onClick={onDismiss}
            className="mt-6 w-full rounded-2xl px-4 py-4 font-black text-base"
            style={{ background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`, color: COLORS.midnight }}
          >
            See the results →
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfettiLayer() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 55 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 2.2 + Math.random() * 2,
        color: ["#F3D58A", "#E8B84B", "#C4962A", "#BA0C2F", "#ffffff", "#FFE8A3", "#C65A2E"][Math.floor(Math.random() * 7)],
        size: 6 + Math.random() * 9,
        rotate: Math.random() * 360,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "-20px",
            width: p.size,
            height: p.size * 0.55,
            background: p.color,
            borderRadius: "2px",
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in both`,
            transform: `rotate(${p.rotate}deg)`,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}

function TripCountdownMini({ tripDate }) {
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

  return (
    <div className="mt-5 flex justify-center gap-5">
      {[["days", timeLeft.days], ["hrs", timeLeft.hours], ["min", timeLeft.minutes]].map(([label, val]) => (
        <div key={label} className="text-center">
          <div className="text-3xl font-black tabular-nums" style={{ color: COLORS.champagneLight }}>
            {String(val).padStart(2, "0")}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-white/40 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Bottom console: browse candidates on the globe ──────────────────────────── */
function DestinationConsole({ countries, activeCountry, winnerNames = [], ranked = [], onSelectCountry, briefs = [] }) {
  return (
    <div
      className="rounded-[1.5rem] border p-2.5 backdrop-blur-2xl sm:rounded-[1.8rem] sm:p-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(14,3,4,0.62), rgba(0,0,0,0.52)), radial-gradient(circle at 50% 0%, rgba(196,150,42,0.14), transparent 60%)",
        borderColor: "rgba(196,150,42,0.24)",
        boxShadow: "0 -10px 50px rgba(196,150,42,0.07), 0 22px 95px rgba(0,0,0,0.84), inset 0 1px 0 rgba(255,232,163,0.08)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.28em] font-black" style={{ color: "#FFD880" }}>
            Destination console
          </p>
          <p className="hidden truncate text-[11px] uppercase tracking-[0.16em] text-white/38 sm:block">
            Targets available · choose a country to materialize intel
          </p>
        </div>
      </div>

      <div className="chamber-scrollbar flex gap-2 overflow-x-auto pb-1">
        {countries.map((country) => {
          const active = activeCountry?.name === country.name;
          const finalist = winnerNames.includes(country.name);
          const onBallot = ranked.includes(country.name);
          const hasBrief = Boolean(findBriefForCountry(briefs, country));

          return (
            <button
              key={country.name}
              onClick={() => onSelectCountry(country)}
              className="shrink-0 rounded-2xl border px-3 py-2 text-left transition"
              style={{
                minWidth: "126px",
                background: finalist
                  ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne})`
                  : active
                    ? "rgba(196,150,42,0.18)"
                    : "rgba(255,255,255,0.038)",
                color: finalist ? COLORS.midnight : "rgba(255,255,255,0.76)",
                borderColor: finalist ? "transparent" : active ? "rgba(196,150,42,0.52)" : "rgba(255,255,255,0.09)",
                boxShadow: active ? "0 0 22px rgba(196,150,42,0.14)" : "none",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg">{countryIcon(country)}</span>
                {finalist && <span className="text-[9px] font-black">TOP 2</span>}
                {!finalist && onBallot && <span className="text-[9px] font-black text-white/45">RANKED</span>}
              </div>
              <div className="mt-1 truncate text-sm font-black">{country.name}</div>
              <div className="truncate text-[10px] opacity-60">{country.region}</div>
              {hasBrief && (
                <div
                  className="mt-1.5 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] inline-block"
                  style={{ background: "rgba(196,150,42,0.18)", color: COLORS.champagne }}
                >
                  Brief ◆
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChamberReticle({ activeCountry, pulseKey }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div
        className="relative rounded-full"
        style={{
          width: "min(78vw, 720px)",
          height: "min(78vw, 720px)",
          border: "1px solid rgba(196,150,42,0.18)",
          boxShadow: "inset 0 0 70px rgba(196,150,42,0.030), 0 0 70px rgba(196,150,42,0.030)",
        }}
      >
        <div
          className="absolute left-1/2 top-0 bottom-0"
          style={{ width: "1px", background: "linear-gradient(180deg, transparent, rgba(196,150,42,0.26), transparent)" }}
        />
        <div
          className="absolute top-1/2 left-0 right-0"
          style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(196,150,42,0.26), transparent)" }}
        />
        <div className="absolute inset-[18%] rounded-full" style={{ border: "1px dashed rgba(196,150,42,0.16)" }} />
        <div className="absolute inset-[32%] rounded-full" style={{ border: "1px solid rgba(243,213,138,0.08)" }} />
      </div>

      {activeCountry && (
        <div key={pulseKey} className="absolute grid place-items-center">
          <div className="h-24 w-24 rounded-full border border-[#F3D58A]/55" style={{ animation: "targetPing 900ms ease-out both" }} />
          <div className="absolute h-12 w-12 rounded-full border border-[#F3D58A]/70" />
          <div className="absolute h-px w-28 bg-gradient-to-r from-transparent via-[#F3D58A]/80 to-transparent" />
          <div className="absolute h-28 w-px bg-gradient-to-b from-transparent via-[#F3D58A]/80 to-transparent" />
        </div>
      )}
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-2 sm:p-3 text-center">
      <div className="font-black text-sm sm:text-base" style={{ color: COLORS.champagneLight }}>
        {value}
      </div>
      <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-white/35">{label}</div>
    </div>
  );
}
