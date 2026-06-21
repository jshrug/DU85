import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import SplashScreen from "./components/SplashScreen.jsx";

const COLORS = {
  midnight: "#05050A",
  wine: "#1A0710",
  deepWine: "#2A0B12",
  roseSmoke: "#8F3F4F",
  champagne: "#F3D58A",
  champagneLight: "#FFE8A3",
  ember: "#C65A2E",
  holo: "#64D7FF",
  magenta: "#FF4FD8",
  electric: "#7DEBFF",
};

function getInitialGlobeSize() {
  if (typeof window === "undefined") return { width: 900, height: 790 };

  const width = window.innerWidth;
  const height = window.innerHeight;

  if (width < 640) {
    return {
      width: Math.min(width + 130, 590),
      height: Math.min(height * 0.58, 550),
    };
  }

  if (width < 1024) {
    return {
      width: Math.min(width * 0.9, 800),
      height: Math.min(height * 0.68, 700),
    };
  }

  return {
    width: Math.min(width * 0.64, 1020),
    height: Math.min(height * 0.84, 820),
  };
}

const DRAWER_NAV = [
  { to: "/", label: "Command Center", icon: "✦", desc: "Today, alerts, and quick actions" },
  { to: "/porter", label: "Porter", icon: "🛎️", desc: "AI cohort concierge" },
  { to: "/events", label: "Plan + RSVP", icon: "📅", desc: "Official, vote-created, and classmate events" },
  { to: "/votes", label: "Votes", icon: "🗳️", desc: "Destination chamber and trip decisions" },
  { to: "/explore", label: "Explore", icon: "🗺️", desc: "Food, places, and plans" },
  { to: "/chat", label: "Chat", icon: "💬", desc: "Cohort and team channels" },
  { to: "/team", label: "Teams", icon: "👥", desc: "Groups and classmates" },
  { to: "/gallery", label: "Gallery", icon: "📷", desc: "Photos and memories" },
  { to: "/me", label: "Profile", icon: "👤", desc: "Preferences and saved places" },
];

const SAMPLE_PROMPTS = [
  "What should I do with 3 free hours near the hotel?",
  "Find dinner for 6 that feels local but not chaotic.",
  "What should I know before tomorrow’s company visit?",
  "Give me a quick etiquette briefing for the city.",
];

const DESTINATION_OPTIONS = [
  {
    name: "Japan",
    region: "Asia",
    flag: "JP",
    emoji: "🇯🇵",
    score: 28,
    lat: 36.2048,
    lng: 138.2529,
    image: "https://picsum.photos/seed/global85-japan/1200/800",
    note: "Business, food, culture, transit",
    fit: "Very High",
    cost: "$$$",
    travel: "Long",
    reasons: ["Food", "Tech/business visits", "Culture", "Transit"],
    porter: "Great pick for tech, operations, hospitality, design, and food. Higher cost, but very high trip quality.",
  },
  {
    name: "Spain",
    region: "Europe",
    flag: "ES",
    emoji: "🇪🇸",
    score: 24,
    lat: 40.4637,
    lng: -3.7492,
    image: "https://picsum.photos/seed/global85-spain/1200/800",
    note: "Culture, food, cities, global business",
    fit: "High",
    cost: "$$",
    travel: "Medium",
    reasons: ["Food", "Culture", "Cities", "Walkability"],
    porter: "Strong balance of business, culture, food, and accessibility. Easier logistics than some long-haul options.",
  },
  {
    name: "South Korea",
    region: "Asia",
    flag: "KR",
    emoji: "🇰🇷",
    score: 21,
    lat: 35.9078,
    lng: 127.7669,
    image: "https://picsum.photos/seed/global85-south-korea/1200/800",
    note: "Tech, culture, food, design",
    fit: "Very High",
    cost: "$$$",
    travel: "Long",
    reasons: ["Tech", "Food", "Culture", "Design"],
    porter: "Excellent for innovation, consumer trends, entertainment, and modern city systems.",
  },
  {
    name: "Germany",
    region: "Europe",
    flag: "DE",
    emoji: "🇩🇪",
    score: 17,
    lat: 51.1657,
    lng: 10.4515,
    image: "https://picsum.photos/seed/global85-germany/1200/800",
    note: "Manufacturing, policy, history",
    fit: "High",
    cost: "$$",
    travel: "Medium",
    reasons: ["Manufacturing", "History", "Policy", "Transit"],
    porter: "Great for operations, industry, sustainability, and European business context.",
  },
  {
    name: "Italy",
    region: "Europe",
    flag: "IT",
    emoji: "🇮🇹",
    score: 16,
    lat: 41.8719,
    lng: 12.5674,
    image: "https://picsum.photos/seed/global85-italy/1200/800",
    note: "Design, food, heritage, industry",
    fit: "High",
    cost: "$$$",
    travel: "Medium",
    reasons: ["Food", "Design", "History", "Fashion"],
    porter: "Very appealing culturally, with strong design and food angles, but may feel less differentiated.",
  },
  {
    name: "Netherlands",
    region: "Europe",
    flag: "NL",
    emoji: "🇳🇱",
    score: 15,
    lat: 52.1326,
    lng: 5.2913,
    image: "https://picsum.photos/seed/global85-netherlands/1200/800",
    note: "Trade, infrastructure, design, sustainability",
    fit: "High",
    cost: "$$$",
    travel: "Medium",
    reasons: ["Trade", "Infrastructure", "Design", "Sustainability"],
    porter: "A sharp country for global trade, logistics, urban design, sustainability, and infrastructure.",
  },
  {
    name: "France",
    region: "Europe",
    flag: "FR",
    emoji: "🇫🇷",
    score: 14,
    lat: 46.2276,
    lng: 2.2137,
    image: "https://picsum.photos/seed/global85-france/1200/800",
    note: "Luxury, food, policy, culture",
    fit: "High",
    cost: "$$$",
    travel: "Medium",
    reasons: ["Luxury", "Food", "Culture", "Policy"],
    porter: "A premium country with strong luxury, hospitality, policy, food, and cultural learning.",
  },
  {
    name: "United Kingdom",
    region: "Europe",
    flag: "GB",
    emoji: "🇬🇧",
    score: 13,
    lat: 55.3781,
    lng: -3.436,
    image: "https://picsum.photos/seed/global85-united-kingdom/1200/800",
    note: "Finance, history, policy, media",
    fit: "High",
    cost: "$$$",
    travel: "Medium",
    reasons: ["Finance", "Policy", "History", "Media"],
    porter: "A strong country for finance, policy, media, global business, and history.",
  },
  {
    name: "Singapore",
    region: "Asia",
    flag: "SG",
    emoji: "🇸🇬",
    score: 12,
    lat: 1.3521,
    lng: 103.8198,
    image: "https://picsum.photos/seed/global85-singapore/1200/800",
    note: "Finance, trade, innovation, city systems",
    fit: "Very High",
    cost: "$$$",
    travel: "Long",
    reasons: ["Finance", "Trade", "Innovation", "City systems"],
    porter: "Compact but powerful for finance, global trade, innovation, logistics, and city design.",
  },
  {
    name: "Australia",
    region: "Oceania",
    flag: "AU",
    emoji: "🇦🇺",
    score: 11,
    lat: -25.2744,
    lng: 133.7751,
    image: "https://picsum.photos/seed/global85-australia/1200/800",
    note: "Resources, culture, cities, sustainability",
    fit: "High",
    cost: "$$$",
    travel: "Very Long",
    reasons: ["Resources", "Cities", "Sustainability", "Culture"],
    porter: "Memorable and strong for resources, sustainability, cities, and regional strategy.",
  },
];

const COMPANION_COUNTRIES = [
  {
    name: "Portugal",
    region: "Europe",
    flag: "PT",
    emoji: "🇵🇹",
    score: 19,
    lat: 39.3999,
    lng: -8.2245,
    image: "https://picsum.photos/seed/global85-portugal/1200/800",
    note: "Trade, tourism, lifestyle, history",
    fit: "High",
    cost: "$$",
    travel: "Medium",
    reasons: ["Lifestyle", "Food", "Tourism", "History"],
    porter: "A strong companion country because it adds food, coast, trade history, and a softer travel rhythm.",
  },
  {
    name: "Morocco",
    region: "Africa",
    flag: "MA",
    emoji: "🇲🇦",
    score: 18,
    lat: 31.7917,
    lng: -7.0926,
    image: "https://picsum.photos/seed/global85-morocco/1200/800",
    note: "Markets, culture, hospitality, contrast",
    fit: "High",
    cost: "$",
    travel: "Medium",
    reasons: ["Markets", "Culture", "Hospitality", "Contrast"],
    porter: "A high-contrast companion country with cultural immersion, hospitality, markets, and visual memorability.",
  },
  {
    name: "Taiwan",
    region: "Asia",
    flag: "TW",
    emoji: "🇹🇼",
    score: 18,
    lat: 23.6978,
    lng: 120.9605,
    image: "https://picsum.photos/seed/global85-taiwan/1200/800",
    note: "Semiconductors, food, democracy, culture",
    fit: "Very High",
    cost: "$$",
    travel: "Long",
    reasons: ["Semiconductors", "Food", "Culture", "Business"],
    porter: "A smart companion country for tech, manufacturing, food, and geopolitics.",
  },
  {
    name: "Thailand",
    region: "Asia",
    flag: "TH",
    emoji: "🇹🇭",
    score: 17,
    lat: 15.87,
    lng: 100.9925,
    image: "https://picsum.photos/seed/global85-thailand/1200/800",
    note: "Hospitality, food, tourism, culture",
    fit: "High",
    cost: "$",
    travel: "Long",
    reasons: ["Hospitality", "Food", "Tourism", "Cost"],
    porter: "Strong for hospitality, tourism, food, and cost balance.",
  },
  {
    name: "Vietnam",
    region: "Asia",
    flag: "VN",
    emoji: "🇻🇳",
    score: 16,
    lat: 14.0583,
    lng: 108.2772,
    image: "https://picsum.photos/seed/global85-vietnam/1200/800",
    note: "Manufacturing, food, growth, culture",
    fit: "High",
    cost: "$",
    travel: "Long",
    reasons: ["Manufacturing", "Food", "Growth", "Culture"],
    porter: "Strong for manufacturing, growth markets, food, and emerging business context.",
  },
  {
    name: "Malaysia",
    region: "Asia",
    flag: "MY",
    emoji: "🇲🇾",
    score: 14,
    lat: 4.2105,
    lng: 101.9758,
    image: "https://picsum.photos/seed/global85-malaysia/1200/800",
    note: "Trade, food, culture, regional access",
    fit: "Medium",
    cost: "$",
    travel: "Long",
    reasons: ["Trade", "Food", "Regional access", "Culture"],
    porter: "Practical for food, trade, and regional access without extreme cost.",
  },
  {
    name: "Indonesia",
    region: "Asia",
    flag: "ID",
    emoji: "🇮🇩",
    score: 13,
    lat: -0.7893,
    lng: 113.9213,
    image: "https://picsum.photos/seed/global85-indonesia/1200/800",
    note: "Scale, tourism, growth, culture",
    fit: "Medium",
    cost: "$",
    travel: "Long",
    reasons: ["Scale", "Tourism", "Growth", "Culture"],
    porter: "Large, complex, memorable, and strong for growth markets and tourism.",
  },
  {
    name: "Philippines",
    region: "Asia",
    flag: "PH",
    emoji: "🇵🇭",
    score: 12,
    lat: 12.8797,
    lng: 121.774,
    image: "https://picsum.photos/seed/global85-philippines/1200/800",
    note: "Services, culture, tourism, growth",
    fit: "Medium",
    cost: "$",
    travel: "Long",
    reasons: ["Services", "Tourism", "Culture", "Growth"],
    porter: "People-centered with services, tourism, cultural warmth, and good value.",
  },
  {
    name: "Ireland",
    region: "Europe",
    flag: "IE",
    emoji: "🇮🇪",
    score: 14,
    lat: 53.1424,
    lng: -7.6921,
    image: "https://picsum.photos/seed/global85-ireland/1200/800",
    note: "Tech, culture, finance, history",
    fit: "High",
    cost: "$$$",
    travel: "Medium",
    reasons: ["Tech", "Culture", "Finance", "History"],
    porter: "Strong for tech, finance, culture, storytelling, and an easy Western Europe pairing.",
  },
  {
    name: "Greece",
    region: "Europe",
    flag: "GR",
    emoji: "🇬🇷",
    score: 13,
    lat: 39.0742,
    lng: 21.8243,
    image: "https://picsum.photos/seed/global85-greece/1200/800",
    note: "History, tourism, shipping, food",
    fit: "Medium",
    cost: "$$",
    travel: "Medium",
    reasons: ["History", "Tourism", "Shipping", "Food"],
    porter: "Cultural, memorable, and strong for tourism, shipping, food, and history.",
  },
  {
    name: "Croatia",
    region: "Europe",
    flag: "HR",
    emoji: "🇭🇷",
    score: 12,
    lat: 45.1,
    lng: 15.2,
    image: "https://picsum.photos/seed/global85-croatia/1200/800",
    note: "Tourism, coast, history, hospitality",
    fit: "Medium",
    cost: "$$",
    travel: "Medium",
    reasons: ["Tourism", "Coast", "Hospitality", "History"],
    porter: "A visually strong companion with tourism, hospitality, coastline, and history.",
  },
  {
    name: "Switzerland",
    region: "Europe",
    flag: "CH",
    emoji: "🇨🇭",
    score: 11,
    lat: 46.8182,
    lng: 8.2275,
    image: "https://picsum.photos/seed/global85-switzerland/1200/800",
    note: "Finance, pharma, policy, precision",
    fit: "High",
    cost: "$$$$",
    travel: "Medium",
    reasons: ["Finance", "Pharma", "Policy", "Precision"],
    porter: "Premium and strong academically for finance, pharma, policy, and precision operations.",
  },
  {
    name: "Austria",
    region: "Europe",
    flag: "AT",
    emoji: "🇦🇹",
    score: 10,
    lat: 47.5162,
    lng: 14.5501,
    image: "https://picsum.photos/seed/global85-austria/1200/800",
    note: "Culture, policy, history, music",
    fit: "Medium",
    cost: "$$",
    travel: "Medium",
    reasons: ["Culture", "Policy", "History", "Cities"],
    porter: "Graceful companion country with culture, policy, history, and polished city experiences.",
  },
  {
    name: "Czech Republic",
    region: "Europe",
    flag: "CZ",
    emoji: "🇨🇿",
    score: 10,
    lat: 49.8175,
    lng: 15.473,
    image: "https://picsum.photos/seed/global85-czech-republic/1200/800",
    note: "Industry, history, beer, cities",
    fit: "Medium",
    cost: "$$",
    travel: "Medium",
    reasons: ["Industry", "History", "Cities", "Value"],
    porter: "Good value with history, cities, and industry.",
  },
  {
    name: "Poland",
    region: "Europe",
    flag: "PL",
    emoji: "🇵🇱",
    score: 9,
    lat: 51.9194,
    lng: 19.1451,
    image: "https://picsum.photos/seed/global85-poland/1200/800",
    note: "Growth, history, manufacturing, tech",
    fit: "Medium",
    cost: "$$",
    travel: "Medium",
    reasons: ["Growth", "History", "Manufacturing", "Tech"],
    porter: "Smart companion option for growth, manufacturing, history, and tech.",
  },
  {
    name: "Denmark",
    region: "Europe",
    flag: "DK",
    emoji: "🇩🇰",
    score: 9,
    lat: 56.2639,
    lng: 9.5018,
    image: "https://picsum.photos/seed/global85-denmark/1200/800",
    note: "Design, sustainability, food, policy",
    fit: "High",
    cost: "$$$",
    travel: "Medium",
    reasons: ["Design", "Sustainability", "Policy", "Food"],
    porter: "Clean, smart, and strong for design, sustainability, food, and policy.",
  },
  {
    name: "Belgium",
    region: "Europe",
    flag: "BE",
    emoji: "🇧🇪",
    score: 8,
    lat: 50.5039,
    lng: 4.4699,
    image: "https://picsum.photos/seed/global85-belgium/1200/800",
    note: "EU policy, food, trade, history",
    fit: "Medium",
    cost: "$$",
    travel: "Medium",
    reasons: ["EU policy", "Food", "Trade", "History"],
    porter: "Practical for EU policy, food, trade, and history.",
  },
  {
    name: "New Zealand",
    region: "Oceania",
    flag: "NZ",
    emoji: "🇳🇿",
    score: 8,
    lat: -40.9006,
    lng: 174.886,
    image: "https://picsum.photos/seed/global85-new-zealand/1200/800",
    note: "Nature, sustainability, culture, tourism",
    fit: "Medium",
    cost: "$$$",
    travel: "Very Long",
    reasons: ["Nature", "Sustainability", "Tourism", "Culture"],
    porter: "Beautiful, memorable, and strong for sustainability, tourism, and nature.",
  },
];

const COMPANION_COUNTRY_MAP = {
  Japan: ["South Korea", "Taiwan", "Thailand", "Vietnam", "Singapore", "Philippines", "Indonesia", "Malaysia"],
  Spain: ["Portugal", "Morocco", "France", "Italy", "Netherlands", "Croatia", "Greece", "Ireland"],
  "South Korea": ["Japan", "Taiwan", "Vietnam", "Thailand", "Singapore", "Philippines", "Malaysia", "Indonesia"],
  Germany: ["Netherlands", "France", "Switzerland", "Austria", "Czech Republic", "Poland", "Italy", "Denmark"],
  Italy: ["France", "Spain", "Greece", "Croatia", "Switzerland", "Austria", "Portugal", "Morocco"],
  Netherlands: ["Germany", "France", "United Kingdom", "Denmark", "Belgium", "Switzerland", "Portugal", "Ireland"],
  France: ["Spain", "Italy", "Portugal", "Morocco", "Netherlands", "Switzerland", "United Kingdom", "Germany"],
  "United Kingdom": ["Ireland", "France", "Netherlands", "Portugal", "Spain", "Germany", "Denmark", "Belgium"],
  Singapore: ["Thailand", "Malaysia", "Indonesia", "Vietnam", "Philippines", "Japan", "South Korea", "Australia"],
  Australia: ["Singapore", "New Zealand", "Indonesia", "Malaysia", "Thailand", "Japan", "South Korea", "Vietnam"],
};

const ANCHOR_COUNTRIES = DESTINATION_OPTIONS;

const INITIAL_EVENTS = [
  {
    id: "official-1",
    source: "Official Itinerary",
    title: "Company Visit",
    time: "9:00 AM",
    date: "Today",
    detail: "Meet in the lobby at 8:20. Business casual.",
    badge: "Required",
    going: 43,
    maybe: 2,
    notGoing: 0,
    thread: ["Bring notebooks?", "Professor said business casual.", "Leaving lobby at 8:20 sharp."],
  },
  {
    id: "official-2",
    source: "Official Itinerary",
    title: "Cultural Tour",
    time: "1:30 PM",
    date: "Today",
    detail: "Bring water, comfortable shoes, and your passport copy.",
    badge: "Group",
    going: 39,
    maybe: 5,
    notGoing: 1,
    thread: ["Wear good shoes.", "Anyone bringing sunscreen?", "Porter says it may be humid."],
  },
  {
    id: "vote-1",
    source: "Created from Vote",
    title: "Local Market Dinner",
    time: "7:30 PM",
    date: "Tonight",
    detail: "Winning option from the dinner vote. Meet in the hotel lobby at 7:00.",
    badge: "Optional",
    going: 18,
    maybe: 8,
    notGoing: 3,
    thread: ["Should we split into smaller groups?", "I’m down if we leave by 7.", "Porter says 14 minutes by cab."],
  },
];

const RECS = [
  {
    title: "Best quick food nearby",
    body: "Casual, local-feeling, easy for groups, and good for first-timers.",
    tag: "Food",
    icon: "🍜",
  },
  {
    title: "Before the business visit",
    body: "Quick briefing on company background, etiquette, and smart questions.",
    tag: "Prep",
    icon: "🏢",
  },
  {
    title: "Destination chamber",
    body: "Open the full-screen Porter chamber and select the trip countries.",
    tag: "Votes",
    icon: "🗳️",
  },
];

function uniqueByName(items) {
  return Array.from(new Map(items.map((item) => [item.name, item])).values());
}

function getCountryByName(name) {
  return uniqueByName([...ANCHOR_COUNTRIES, ...COMPANION_COUNTRIES]).find((country) => country.name === name);
}

function buildCompanionOptions(anchorName) {
  const names = COMPANION_COUNTRY_MAP[anchorName] || COMPANION_COUNTRY_MAP.Japan;
  return names.map(getCountryByName).filter(Boolean);
}

function getSelectedVote(votes) {
  return Object.keys(votes || {})[0] || null;
}

function getTopCountries(options, votes, count = 2) {
  const voteNames = Object.keys(votes || {});

  if (!voteNames.length) return options.slice(0, count);

  const selected = voteNames.map(getCountryByName).filter(Boolean);
  const backups = options.filter((country) => !voteNames.includes(country.name));

  return uniqueByName([...selected, ...backups]).slice(0, count);
}

function countryIcon(country) {
  return country?.emoji || country?.flag || "🌍";
}

function Shell({ children, drawerOpen, setDrawerOpen }) {
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

function TopBar({ onOpenDrawer }) {
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

function SideDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const drawerRef = useRef(null);

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
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Unread" value="3" />
            <MiniStat label="Votes" value="2" />
            <MiniStat label="RSVPs" value="31" />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/35">
            Destinations TBD · Cohort OS
          </p>
        </div>
      </div>
    </>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
      <div className="text-lg font-black" style={{ color: COLORS.champagne }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-white/38">{label}</div>
    </div>
  );
}

function BottomNav() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 backdrop-blur-xl"
      style={{ background: "rgba(5,5,10,0.88)" }}
    >
      <div className="max-w-7xl mx-auto flex">
        <TabLink to="/" label="Home" icon="✦" />
        <TabLink to="/porter" label="Porter" icon="🛎️" />
        <TabLink to="/events" label="Plan" icon="📅" />
        <TabLink to="/votes" label="Votes" icon="🗳️" />
        <TabLink to="/chat" label="Chat" icon="💬" />
      </div>
    </div>
  );
}

function TabLink({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition " +
        (isActive ? "text-amber-200" : "text-white/45 hover:text-white/80")
      }
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[11px] font-bold">{label}</span>
    </NavLink>
  );
}

function HomePage({ onAsk }) {
  const navigate = useNavigate();

  return (
    <main className="px-5 py-5">
      <section
        className="rounded-[2rem] p-5 overflow-hidden border border-white/10 shadow-2xl relative"
        style={{
          background: `linear-gradient(135deg, ${COLORS.roseSmoke} 0%, ${COLORS.wine} 58%, ${COLORS.midnight} 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              `radial-gradient(circle at 20% 15%, ${COLORS.champagne}80, transparent 20%), ` +
              `radial-gradient(circle at 88% 38%, ${COLORS.ember}55, transparent 22%)`,
          }}
        />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 border text-xs font-bold"
            style={{
              background: "rgba(0,0,0,0.25)",
              borderColor: "rgba(243,213,138,0.22)",
              color: COLORS.champagneLight,
            }}
          >
            🛎️ Porter · private cohort concierge
          </div>

          <h1 className="mt-5 text-4xl font-black leading-tight" style={{ fontFamily: "Georgia, serif" }}>
            A smarter command center for Global 85.
          </h1>

          <p className="mt-3 text-white/75 text-sm leading-6">
            Porter, destination votes, trip decisions, RSVP events, chat, and everything the cohort needs while traveling.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={onAsk}
              className="rounded-2xl px-4 py-4 font-black text-left shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
                color: "#17060b",
              }}
            >
              <div className="text-xs uppercase tracking-[0.18em] opacity-70">Ask Porter</div>
              <div className="text-base">Plan my free time</div>
            </button>

            <button
              onClick={() => navigate("/votes")}
              className="rounded-2xl px-4 py-4 font-black text-left shadow-xl border border-white/10 bg-black/25"
            >
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">Class Vote</div>
              <div className="text-base">Open chamber</div>
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <FeatureTile icon="🗳️" label="Active Votes" value="2 live" />
        <FeatureTile icon="📅" label="RSVP Needed" value="1 event" />
        <FeatureTile icon="💬" label="Cohort Pulse" value="3 unread" />
        <FeatureTile icon="🧳" label="Trip Mode" value="Active" />
      </section>

      <section className="mt-6">
        <SectionTitle eyebrow="Recommended" title="Useful right now" />
        <div className="grid gap-3 mt-3 md:grid-cols-3">
          {RECS.map((rec) => (
            <div key={rec.title} className="rounded-3xl p-4 border border-white/10 bg-white/[0.06]">
              <div className="text-2xl">{rec.icon}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold mt-3" style={{ color: "rgba(243,213,138,0.72)" }}>
                {rec.tag}
              </div>
              <h3 className="font-black mt-2">{rec.title}</h3>
              <p className="text-sm text-white/55 mt-2 leading-6">{rec.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-3">
        <SectionTitle eyebrow="Today" title="Your day at a glance" />
        {INITIAL_EVENTS.slice(0, 3).map((event) => (
          <SmallEventCard key={event.id} event={event} />
        ))}
      </section>
    </main>
  );
}

function FeatureTile({ icon, label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="text-2xl">{icon}</div>
      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-white/38 font-bold">{label}</div>
      <div className="mt-1 font-black" style={{ color: COLORS.champagneLight }}>
        {value}
      </div>
    </div>
  );
}

function SmallEventCard({ event }) {
  return (
    <div className="rounded-3xl p-4 border border-white/10 bg-white/[0.06] backdrop-blur">
      <div className="flex items-start gap-4">
        <div
          className="rounded-2xl px-3 py-2 font-black text-sm min-w-[76px] text-center"
          style={{
            background: "rgba(243,213,138,0.12)",
            color: COLORS.champagneLight,
          }}
        >
          {event.time}
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35 font-bold">{event.source}</div>
          <div className="flex items-center gap-2 mt-1">
            <h3 className="font-black text-white">{event.title}</h3>
            <span
              className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border"
              style={{
                background: "rgba(198,90,46,0.14)",
                color: COLORS.champagneLight,
                borderColor: "rgba(243,213,138,0.18)",
              }}
            >
              {event.badge}
            </span>
          </div>
          <p className="text-sm text-white/55 mt-1">{event.detail}</p>
          <p className="text-xs text-white/38 mt-2">
            {event.going} Going · {event.maybe} Maybe
          </p>
        </div>
      </div>
    </div>
  );
}

function PorterPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Welcome to Porter. I’m your private Global 85 concierge. For now this is a visual demo, but eventually I’ll know the itinerary, city guide, Explore list, announcements, votes, hotels, and cohort details.",
    },
  ]);
  const [input, setInput] = useState("");

  function sendMessage(text = input) {
    const clean = text.trim();
    if (!clean) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: clean },
      {
        role: "assistant",
        text:
          "Demo answer: I’d check the itinerary, votes, RSVP counts, your location, cohort recommendations, and city guide before answering. In the real version, I’d give you a practical plan with timing, transportation, cost, and why it fits the group.",
      },
    ]);
    setInput("");
  }

  return (
    <main className="px-5 py-5">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06] backdrop-blur">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.ember}, ${COLORS.roseSmoke})` }}
          >
            🛎️
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: "rgba(243,213,138,0.72)" }}>
              Private Cohort Concierge
            </p>
            <h1 className="text-3xl font-black" style={{ fontFamily: "Georgia, serif" }}>
              Porter
            </h1>
          </div>
        </div>

        <p className="text-sm text-white/60 mt-4 leading-6">
          Ask about free time, food, culture, events, voting results, transportation, company visits, or what the group is doing next.
        </p>

        <div className="grid gap-2 mt-5">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-left rounded-2xl px-4 py-3 border border-white/10 bg-black/20 text-sm text-white/80 hover:bg-white/10 transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-black/20 overflow-hidden">
        <div className="p-4 max-h-[420px] overflow-y-auto space-y-3">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="rounded-3xl px-4 py-3 max-w-[85%] text-sm leading-6"
                style={
                  message.role === "user"
                    ? {
                        background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne})`,
                        color: "#17060b",
                        fontWeight: 700,
                      }
                    : {
                        background: "rgba(255,255,255,0.10)",
                        color: "rgba(255,255,255,0.8)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }
                }
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-white/10 flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") sendMessage();
            }}
            placeholder="Ask Porter..."
            className="flex-1 rounded-2xl px-4 py-3 bg-white/10 border border-white/10 text-white placeholder:text-white/35 outline-none"
          />
          <button
            onClick={() => sendMessage()}
            className="rounded-2xl px-5 py-3 font-black"
            style={{
              background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
              color: "#16060a",
            }}
          >
            Send
          </button>
        </div>
      </section>
    </main>
  );
}

function VotesPage() {
  const [missionIndex, setMissionIndex] = useState(0);
  const [anchorVotes, setAnchorVotes] = useState({});
  const [anchorWinner, setAnchorWinner] = useState(null);
  const [companionVotes, setCompanionVotes] = useState({});
  const [companionWinner, setCompanionWinner] = useState(null);

  const anchorFinalists = useMemo(() => getTopCountries(ANCHOR_COUNTRIES, anchorVotes, 2), [anchorVotes]);

  const companionOptions = useMemo(() => {
    return buildCompanionOptions(anchorWinner?.name || anchorFinalists[0]?.name || "Japan");
  }, [anchorFinalists, anchorWinner]);

  const companionFinalists = useMemo(() => {
    return getTopCountries(companionOptions, companionVotes, 2);
  }, [companionOptions, companionVotes]);

  const missions = useMemo(
    () => [
      {
        id: "anchor-longlist",
        eyebrow: "Mission 01",
        title: "Select the Anchor Country",
        shortTitle: "Anchor Longlist",
        mode: "anchor-longlist",
        status: missionIndex === 0 ? "active" : "complete",
        instruction: "Choose the developed country that should define the Global 85 trip. Top two advance to final selection.",
        options: ANCHOR_COUNTRIES,
        votes: anchorVotes,
        selectedName: getSelectedVote(anchorVotes),
        voteLabel: "Cast Anchor Vote",
        nextLabel: "Advance Top Two",
        canAdvance: Object.keys(anchorVotes).length > 0,
        finalistNames: anchorFinalists.map((country) => country.name),
      },
      {
        id: "anchor-final",
        eyebrow: "Mission 02",
        title: "Finalize the Anchor Country",
        shortTitle: "Anchor Final",
        mode: "anchor-final",
        status: missionIndex < 1 ? "locked" : missionIndex === 1 ? "active" : "complete",
        instruction: "The top two anchor countries are now head-to-head. Winner becomes Country A.",
        options: anchorFinalists.length ? anchorFinalists : ANCHOR_COUNTRIES.slice(0, 2),
        votes: anchorWinner ? { [anchorWinner.name]: 1 } : {},
        selectedName: anchorWinner?.name,
        voteLabel: "Lock Anchor Country",
        nextLabel: "Generate Companion List",
        canAdvance: Boolean(anchorWinner),
        finalistNames: anchorFinalists.map((country) => country.name),
      },
      {
        id: "companion-longlist",
        eyebrow: "Mission 03",
        title: "Select the Companion Country",
        shortTitle: "Companion Longlist",
        mode: "companion-longlist",
        status: missionIndex < 2 ? "locked" : missionIndex === 2 ? "active" : "complete",
        instruction: anchorWinner
          ? `Porter generated this companion list based on ${anchorWinner.name}: regional fit, flight logic, cost balance, cultural contrast, and trip pacing.`
          : "Porter will generate this list after the anchor country is selected.",
        options: companionOptions,
        votes: companionVotes,
        selectedName: getSelectedVote(companionVotes),
        voteLabel: "Cast Companion Vote",
        nextLabel: "Advance Top Two",
        canAdvance: Object.keys(companionVotes).length > 0,
        finalistNames: companionFinalists.map((country) => country.name),
      },
      {
        id: "companion-final",
        eyebrow: "Mission 04",
        title: "Finalize the Companion Country",
        shortTitle: "Companion Final",
        mode: "companion-final",
        status: missionIndex < 3 ? "locked" : "active",
        instruction: "The top two companion countries are now head-to-head. Winner becomes Country B.",
        options: companionFinalists.length ? companionFinalists : companionOptions.slice(0, 2),
        votes: companionWinner ? { [companionWinner.name]: 1 } : {},
        selectedName: companionWinner?.name,
        voteLabel: "Lock Companion Country",
        nextLabel: "Complete Destination Vote",
        canAdvance: Boolean(companionWinner),
        finalistNames: companionFinalists.map((country) => country.name),
      },
    ],
    [
      anchorFinalists,
      anchorVotes,
      anchorWinner,
      companionFinalists,
      companionOptions,
      companionVotes,
      companionWinner,
      missionIndex,
    ]
  );

  const activeMission = missions[missionIndex];

  function handleVote(country) {
    if (!activeMission || activeMission.status !== "active") return;

    if (activeMission.mode === "anchor-longlist") setAnchorVotes({ [country.name]: 1 });
    if (activeMission.mode === "anchor-final") setAnchorWinner(country);
    if (activeMission.mode === "companion-longlist") setCompanionVotes({ [country.name]: 1 });
    if (activeMission.mode === "companion-final") setCompanionWinner(country);
  }

  function handleAdvance() {
    if (!activeMission?.canAdvance) return;

    if (missionIndex === 0) {
      setMissionIndex(1);
      return;
    }

    if (missionIndex === 1) {
      setCompanionVotes({});
      setCompanionWinner(null);
      setMissionIndex(2);
      return;
    }

    if (missionIndex === 2) {
      setMissionIndex(3);
    }
  }

  function handleMissionJump(index) {
    if (index <= missionIndex) setMissionIndex(index);
  }

  function porterPick() {
    const sorted = [...(activeMission?.options || [])].sort((a, b) => b.score - a.score);
    if (sorted[0]) handleVote(sorted[0]);
  }

  function resetProtocol() {
    setMissionIndex(0);
    setAnchorVotes({});
    setAnchorWinner(null);
    setCompanionVotes({});
    setCompanionWinner(null);
  }

  return (
    <main className="fixed inset-0 z-[999] overflow-hidden">
      <DestinationChamber
        missions={missions}
        missionIndex={missionIndex}
        activeMission={activeMission}
        anchorWinner={anchorWinner}
        companionWinner={companionWinner}
        onVote={handleVote}
        onAdvance={handleAdvance}
        onMissionJump={handleMissionJump}
        onPorterPick={porterPick}
        onReset={resetProtocol}
      />
    </main>
  );
}

function DestinationChamber({
  missions,
  missionIndex,
  activeMission,
  anchorWinner,
  companionWinner,
  onVote,
  onAdvance,
  onMissionJump,
  onPorterPick,
  onReset,
}) {
  const navigate = useNavigate();
  const globeRef = useRef(null);
  const firstPovRef = useRef(true);
  const [globeSize, setGlobeSize] = useState(() => getInitialGlobeSize());
  const [activeCountry, setActiveCountry] = useState(null);
  const [pulseKey, setPulseKey] = useState(0);

  const countries = activeMission.options;
  const selectedName = activeMission.selectedName;
  const selected = selectedName === activeCountry?.name;
  const routeComplete = Boolean(anchorWinner && companionWinner);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    const selectedCountry = selectedName ? activeMission.options.find((country) => country.name === selectedName) : null;
    setActiveCountry(selectedCountry || null);
    firstPovRef.current = true;
  }, [activeMission.id, activeMission.options, selectedName]);

  useEffect(() => {
    let raf = null;

    function handleResize() {
      if (raf) cancelAnimationFrame(raf);

      raf = requestAnimationFrame(() => {
        const next = getInitialGlobeSize();
        setGlobeSize((prev) => {
          if (prev.width === next.width && prev.height === next.height) return prev;
          return next;
        });
      });
    }

    window.addEventListener("resize", handleResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!globeRef.current || !activeCountry) return;

    const globe = globeRef.current;
    const duration = firstPovRef.current ? 0 : 520;
    firstPovRef.current = false;

    if (typeof globe.pointOfView === "function") {
      globe.pointOfView(
        {
          lat: activeCountry.lat,
          lng: activeCountry.lng,
          altitude: isMobile ? 1.9 : 1.52,
        },
        duration
      );
    }
  }, [activeCountry, isMobile]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const frame = requestAnimationFrame(() => {
      const controls = typeof globe.controls === "function" ? globe.controls() : null;
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.16;
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.minDistance = 155;
        controls.maxDistance = 560;
      }

      const material = typeof globe.globeMaterial === "function" ? globe.globeMaterial() : null;
      if (material) {
        material.color = new THREE.Color("#bff8ff");
        material.emissive = new THREE.Color("#5eeaff");
        material.emissiveIntensity = 0.42;
        material.transparent = true;
        material.opacity = 0.82;
        material.wireframe = false;
        material.depthWrite = false;
        material.depthTest = true;
        material.side = THREE.DoubleSide;
        material.needsUpdate = true;
      }

      const scene = typeof globe.scene === "function" ? globe.scene() : null;
      if (scene) {
        scene.fog = new THREE.FogExp2("#050010", 0.0011);

        if (!scene.userData.porterHoloLightsAdded) {
          const cyanKey = new THREE.PointLight("#64D7FF", 2.8, 900);
          cyanKey.position.set(0, 80, 240);
          scene.add(cyanKey);

          const magentaSide = new THREE.PointLight("#FF4FD8", 2.3, 900);
          magentaSide.position.set(190, 70, 110);
          scene.add(magentaSide);

          const champagneFill = new THREE.PointLight("#FFE8A3", 1.25, 700);
          champagneFill.position.set(-160, 40, 120);
          scene.add(champagneFill);

          scene.userData.porterHoloLightsAdded = true;
        }
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [activeMission.id]);

  const points = useMemo(() => {
    return countries.map((country) => ({
      ...country,
      size: country.name === activeCountry?.name ? 0.82 : 0.3,
      color:
        country.name === selectedName
          ? COLORS.champagneLight
          : country.name === activeCountry?.name
            ? "#FF4FD8"
            : "rgba(125,235,255,0.96)",
    }));
  }, [activeCountry, countries, selectedName]);

  const rings = useMemo(() => {
    if (!activeCountry) {
      return countries.slice(0, 5).map((country) => ({
        ...country,
        maxR: 2.7,
        propagationSpeed: 0.62,
        repeatPeriod: 2450,
      }));
    }

    return [
      {
        ...activeCountry,
        maxR: 7.4,
        propagationSpeed: 1.5,
        repeatPeriod: 820,
      },
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
  }, [activeCountry, countries]);

  const arcs = useMemo(() => {
    const denver = { lat: 39.7392, lng: -104.9903 };

    return countries.slice(0, 7).map((country, index) => ({
      startLat: activeCountry?.lat || denver.lat,
      startLng: activeCountry?.lng || denver.lng,
      endLat: country.lat,
      endLng: country.lng,
      altitude: 0.16 + index * 0.012,
      color:
        country.name === activeCountry?.name
          ? "rgba(255,232,163,0.92)"
          : index % 2 === 0
            ? "rgba(125,235,255,0.44)"
            : "rgba(255,79,216,0.40)",
    }));
  }, [activeCountry, countries]);

  function selectCountry(country) {
    setActiveCountry(country);
    setPulseKey((value) => value + 1);
  }

  return (
    <section className="relative h-screen w-screen overflow-hidden text-white bg-[#040009]">
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

        <button
          onClick={onReset}
          className="rounded-full px-4 py-2 text-[10px] sm:text-xs font-black border backdrop-blur-xl"
          style={{
            background: "rgba(8,4,14,0.48)",
            borderColor: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Reset
        </button>
      </div>

      <div className="absolute left-1/2 top-4 z-40 w-[min(88vw,600px)] -translate-x-1/2 sm:top-5">
        <MissionHud
          missions={missions}
          missionIndex={missionIndex}
          activeMission={activeMission}
          anchorWinner={anchorWinner}
          companionWinner={companionWinner}
          onMissionJump={onMissionJump}
        />
      </div>

      <div className="absolute left-1/2 top-[47%] z-20 -translate-x-1/2 -translate-y-1/2 xl:left-[42%] xl:top-[47%]">
        <div className="absolute left-1/2 top-[72%] z-[-1] -translate-x-1/2 pointer-events-none">
          <FloorEmitter active={Boolean(activeCountry)} />
        </div>

        <HoloGlobeGlow active={Boolean(activeCountry)} />

        <div
          className="relative holo-globe-shell"
          style={{
            filter:
              "drop-shadow(0 0 18px rgba(125,235,255,0.92)) drop-shadow(0 0 48px rgba(255,79,216,0.58)) drop-shadow(0 0 120px rgba(125,235,255,0.38))",
          }}
        >
          <Globe
            ref={globeRef}
            width={globeSize.width}
            height={globeSize.height}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            showAtmosphere
            showGraticules
            pointsData={points}
            pointLat={(d) => d.lat}
            pointLng={(d) => d.lng}
            pointAltitude={(d) => d.size}
            pointRadius={0.18}
            pointColor={(d) => d.color}
            pointLabel={(d) => `${countryIcon(d)} ${d.name}<br/>${d.note}`}
            onPointClick={(country) => selectCountry(country)}
            ringsData={rings}
            ringLat={(d) => d.lat}
            ringLng={(d) => d.lng}
            ringColor={(d) => (d.name === selectedName ? COLORS.champagneLight : "#FF4FD8")}
            ringMaxRadius={(d) => d.maxR}
            ringPropagationSpeed={(d) => d.propagationSpeed}
            ringRepeatPeriod={(d) => d.repeatPeriod}
            arcsData={arcs}
            arcStartLat={(d) => d.startLat}
            arcStartLng={(d) => d.startLng}
            arcEndLat={(d) => d.endLat}
            arcEndLng={(d) => d.endLng}
            arcColor={(d) => [d.color, "rgba(125,235,255,0.05)"]}
            arcAltitude={(d) => d.altitude}
            arcStroke={0.42}
            arcDashLength={0.42}
            arcDashGap={1.12}
            arcDashAnimateTime={3600}
            labelsData={activeCountry && !isMobile ? [activeCountry] : []}
            labelLat={(d) => d.lat}
            labelLng={(d) => d.lng}
            labelText={(d) => `${countryIcon(d)} ${d.name}`}
            labelSize={1.25}
            labelDotRadius={0.28}
            labelColor={() => COLORS.champagneLight}
            labelResolution={2}
            atmosphereColor="#FF4FD8"
            atmosphereAltitude={0.3}
          />
        </div>

        <ChamberReticle activeCountry={activeCountry} pulseKey={pulseKey} />
      </div>

      {activeCountry && !isMobile && <ConnectorBeam />}

      {activeCountry && (
        <div className="absolute right-5 top-[52%] z-40 hidden w-[min(35vw,500px)] -translate-y-1/2 xl:block">
          <FloatingIntelPanel
            mission={activeMission}
            country={activeCountry}
            selected={selected}
            routeComplete={routeComplete}
            anchorWinner={anchorWinner}
            companionWinner={companionWinner}
            onVote={() => activeCountry && onVote(activeCountry)}
            onAdvance={onAdvance}
          />
        </div>
      )}

      {activeCountry && (
        <div className="absolute inset-x-3 bottom-[116px] z-40 xl:hidden">
          <FloatingIntelPanel
            mission={activeMission}
            country={activeCountry}
            selected={selected}
            routeComplete={routeComplete}
            anchorWinner={anchorWinner}
            companionWinner={companionWinner}
            onVote={() => activeCountry && onVote(activeCountry)}
            onAdvance={onAdvance}
            mobile
          />
        </div>
      )}

      {!activeCountry && (
        <div className="absolute right-5 top-[52%] z-40 hidden w-[min(32vw,440px)] -translate-y-1/2 xl:block">
          <EmptyCountryPrompt activeMission={activeMission} />
        </div>
      )}

      <div className="absolute bottom-2 left-1/2 z-50 w-[min(94vw,900px)] -translate-x-1/2 sm:bottom-3">
        <DestinationConsole
          countries={countries}
          activeCountry={activeCountry}
          selectedName={selectedName}
          finalistNames={activeMission.finalistNames}
          onSelectCountry={selectCountry}
          onPorterPick={onPorterPick}
          onAdvance={onAdvance}
          canAdvance={activeMission.canAdvance}
          routeComplete={routeComplete}
        />
      </div>
    </section>
  );
}

function ChamberCss() {
  return (
    <style>{`
      @keyframes chamberScan {
        0% { transform: translateY(-120%); opacity: 0; }
        12% { opacity: .38; }
        55% { opacity: .14; }
        100% { transform: translateY(120%); opacity: 0; }
      }

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

      @keyframes floorSpin {
        from { transform: translate(-50%, -50%) rotate(0deg); }
        to { transform: translate(-50%, -50%) rotate(360deg); }
      }

      @keyframes holoFlicker {
        0%, 100% { opacity: .96; }
        7% { opacity: .78; }
        9% { opacity: 1; }
        52% { opacity: .83; }
        54% { opacity: .98; }
      }

      @keyframes gridPulse {
        0%, 100% { opacity: .72; filter: brightness(1); }
        50% { opacity: 1; filter: brightness(1.35); }
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
        background:
          repeating-linear-gradient(
            0deg,
            rgba(125,235,255,0.16) 0px,
            rgba(125,235,255,0.16) 1px,
            transparent 2px,
            transparent 7px
          ),
          radial-gradient(circle at 38% 32%, rgba(255,255,255,0.22), transparent 16%),
          radial-gradient(circle, transparent 45%, rgba(125,235,255,0.18) 57%, rgba(255,79,216,0.20) 70%, transparent 74%);
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
        border: 1px solid rgba(125,235,255,0.24);
        box-shadow:
          inset 0 0 38px rgba(125,235,255,0.12),
          inset 0 0 70px rgba(255,79,216,0.10),
          0 0 42px rgba(125,235,255,0.16),
          0 0 82px rgba(255,79,216,0.12);
      }

      .panel-materialize {
        animation: panelMaterialize 520ms cubic-bezier(.2,.9,.2,1) both, holoFlicker 7s ease-in-out infinite;
      }

      .mobile-panel-materialize {
        animation: mobilePanelMaterialize 420ms cubic-bezier(.2,.9,.2,1) both, holoFlicker 7s ease-in-out infinite;
      }

      .chamber-scrollbar::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }

      .chamber-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255,79,216,.42);
        border-radius: 999px;
      }
    `}</style>
  );
}

function RoomBackground({ active }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#040009]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 17%, rgba(125,235,255,0.14), transparent 22%), " +
            "radial-gradient(circle at 24% 17%, rgba(255,79,216,0.13), transparent 22%), " +
            "radial-gradient(circle at 82% 25%, rgba(243,213,138,0.08), transparent 24%), " +
            "linear-gradient(180deg, #090014 0%, #05000B 42%, #000000 100%)",
        }}
      />

      <div
        className="absolute left-1/2 top-[6vh] h-[60vh] w-[88vw] max-w-[1380px] -translate-x-1/2 rounded-t-[4rem] border"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,4,24,0.58), rgba(6,2,14,0.28) 58%, rgba(0,0,0,0.08)), " +
            "repeating-linear-gradient(90deg, rgba(125,235,255,0.026) 0px, rgba(125,235,255,0.026) 1px, transparent 1px, transparent 124px), " +
            "repeating-linear-gradient(0deg, rgba(255,79,216,0.024) 0px, rgba(255,79,216,0.024) 1px, transparent 1px, transparent 92px)",
          borderColor: "rgba(125,235,255,0.08)",
          boxShadow:
            "inset 0 0 120px rgba(125,235,255,0.035), inset 0 -80px 110px rgba(0,0,0,0.56), 0 0 130px rgba(0,0,0,0.86)",
        }}
      />

      <div
        className="absolute left-1/2 top-[7.5vh] h-[2px] w-[66vw] max-w-[960px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(125,235,255,0.30), rgba(255,79,216,0.42), rgba(243,213,138,0.38), rgba(125,235,255,0.30), transparent)",
          boxShadow:
            "0 0 18px rgba(255,79,216,0.22), 0 0 55px rgba(125,235,255,0.24)",
        }}
      />

      <div className="absolute left-1/2 top-[9vh] h-[26vh] w-[74vw] -translate-x-1/2 rounded-full bg-[#64D7FF]/10 blur-[100px]" />
      <div className="absolute left-[25%] top-[22vh] h-[24vh] w-[38vw] rounded-full bg-[#FF4FD8]/12 blur-[110px]" />
      <div className="absolute right-[15%] top-[24vh] h-[18vh] w-[34vw] rounded-full bg-[#F3D58A]/7 blur-[110px]" />

      <div
        className="absolute left-[-7vw] top-[6vh] h-[76vh] w-[36vw] origin-right -skew-y-6 border-r"
        style={{
          background:
            "linear-gradient(90deg, #000 0%, rgba(0,0,0,0.9) 36%, rgba(15,5,30,0.42) 72%, transparent 100%), " +
            "repeating-linear-gradient(0deg, transparent 0px, transparent 76px, rgba(125,235,255,0.045) 77px, transparent 78px)",
          borderColor: "rgba(125,235,255,0.08)",
          boxShadow: "inset -50px 0 90px rgba(255,79,216,0.02)",
        }}
      />

      <div
        className="absolute right-[-7vw] top-[6vh] h-[76vh] w-[36vw] origin-left skew-y-6 border-l"
        style={{
          background:
            "linear-gradient(270deg, #000 0%, rgba(0,0,0,0.9) 36%, rgba(15,5,30,0.42) 72%, transparent 100%), " +
            "repeating-linear-gradient(0deg, transparent 0px, transparent 76px, rgba(255,79,216,0.045) 77px, transparent 78px)",
          borderColor: "rgba(255,79,216,0.08)",
          boxShadow: "inset 50px 0 90px rgba(125,235,255,0.02)",
        }}
      />

      <div
        className="absolute left-[8vw] top-[18vh] h-[44vh] w-px"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(125,235,255,0.34), transparent)",
          boxShadow: "0 0 22px rgba(125,235,255,0.28)",
        }}
      />

      <div
        className="absolute right-[8vw] top-[18vh] h-[44vh] w-px"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(255,79,216,0.34), transparent)",
          boxShadow: "0 0 22px rgba(255,79,216,0.28)",
        }}
      />

      <NeonFloorGrid active={active} />

      <div
        className="absolute left-1/2 bottom-[5.2vh] h-[18vh] w-[48vw] min-w-[360px] max-w-[780px] -translate-x-1/2 rounded-[100%] border"
        style={{
          transform: "translateX(-50%) rotateX(68deg)",
          background:
            "radial-gradient(ellipse at center, rgba(3,2,8,0.96), rgba(0,0,0,0.94) 64%, transparent 72%)",
          borderColor: "rgba(255,232,163,0.16)",
          boxShadow:
            "0 0 70px rgba(125,235,255,0.14), 0 0 90px rgba(255,79,216,0.10), inset 0 0 54px rgba(255,232,163,0.07)",
        }}
      />

      <div
        className="absolute left-1/2 bottom-[12vh] h-[49vh] w-[20vw] min-w-[170px] -translate-x-1/2"
        style={{
          background:
            "linear-gradient(180deg, rgba(125,235,255,0.00), rgba(125,235,255,0.22) 27%, rgba(255,79,216,0.22) 52%, rgba(243,213,138,0.10) 70%, rgba(100,215,255,0.00))",
          clipPath: "polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)",
          filter: "blur(18px)",
          opacity: active ? 0.96 : 0.78,
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,transparent_0%,transparent_41%,rgba(0,0,0,0.72)_100%)]" />

      <div className="absolute inset-0 opacity-[0.045] mix-blend-screen">
        <div
          className="h-[220%] w-full"
          style={{
            background:
              "repeating-linear-gradient(180deg, transparent 0px, transparent 6px, rgba(125,235,255,0.85) 7px, transparent 8px)",
            animation: "chamberScan 9s linear infinite",
          }}
        />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.88)_100%)]" />
    </div>
  );
}

function NeonFloorGrid({ active }) {
  return (
    <>
      <div
        className="absolute left-1/2 bottom-[-36vh] h-[76vh] w-[156vw] -translate-x-1/2"
        style={{
          transform: "translateX(-50%) perspective(940px) rotateX(64deg)",
          transformOrigin: "center bottom",
          background:
            "radial-gradient(ellipse at center, rgba(125,235,255,0.20), rgba(255,79,216,0.11) 26%, rgba(0,0,0,0.80) 69%), " +
            "linear-gradient(90deg, transparent 0%, rgba(255,79,216,0.18) 49.8%, rgba(125,235,255,0.52) 50%, rgba(255,79,216,0.18) 50.2%, transparent 100%)",
          boxShadow:
            "inset 0 0 120px rgba(125,235,255,0.08), 0 -35px 130px rgba(255,79,216,0.05)",
        }}
      />

      <div
        className="absolute left-1/2 bottom-[-29vh] h-[76vh] w-[156vw] -translate-x-1/2"
        style={{
          transform: "translateX(-50%) perspective(940px) rotateX(64deg)",
          transformOrigin: "center bottom",
          background:
            "linear-gradient(rgba(255,79,216,0.34) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(125,235,255,0.25) 1px, transparent 1px)",
          backgroundSize: "78px 78px",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 15%, black 75%, transparent 100%), radial-gradient(ellipse at center, black 0%, black 58%, transparent 77%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 15%, black 75%, transparent 100%), radial-gradient(ellipse at center, black 0%, black 58%, transparent 77%)",
          animation: "gridPulse 4.2s ease-in-out infinite",
          opacity: active ? 0.92 : 0.78,
        }}
      />

      <div
        className="absolute left-1/2 bottom-[-31vh] h-[76vh] w-[156vw] -translate-x-1/2"
        style={{
          transform: "translateX(-50%) perspective(940px) rotateX(64deg)",
          transformOrigin: "center bottom",
          background:
            "repeating-linear-gradient(90deg, transparent 0px, transparent 154px, rgba(243,213,138,0.28) 155px, transparent 157px), " +
            "repeating-linear-gradient(0deg, transparent 0px, transparent 154px, rgba(255,79,216,0.24) 155px, transparent 157px)",
          maskImage: "radial-gradient(ellipse at center, black 0%, black 56%, transparent 76%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, black 56%, transparent 76%)",
          opacity: 0.42,
        }}
      />

      <div
        className="absolute left-1/2 bottom-[12vh] h-[2px] w-[82vw] -translate-x-1/2 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,79,216,0.72), rgba(125,235,255,0.96), rgba(255,79,216,0.72), transparent)",
          boxShadow:
            "0 0 22px rgba(255,79,216,0.56), 0 0 58px rgba(125,235,255,0.34)",
        }}
      />
    </>
  );
}

function HoloGlobeGlow({ active }) {
  return (
    <>
      <div
        className="absolute left-1/2 top-1/2 h-[min(86vw,820px)] w-[min(86vw,820px)] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(125,235,255,0.30), rgba(125,235,255,0.11) 27%, rgba(255,79,216,0.16) 46%, transparent 72%)",
          filter: "blur(18px)",
          opacity: active ? 1 : 0.86,
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 h-[min(76vw,700px)] w-[min(76vw,700px)] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.16), transparent 18%), " +
            "radial-gradient(circle at 55% 48%, rgba(125,235,255,0.13), transparent 48%), " +
            "radial-gradient(circle at 73% 38%, rgba(255,79,216,0.18), transparent 42%)",
          filter: "blur(4px)",
          mixBlendMode: "screen",
        }}
      />

      <div
        className="absolute left-1/2 top-[61%] z-[-1] h-[330px] w-[min(80vw,640px)] rounded-[100%] pointer-events-none"
        style={{
          transform: "translateX(-50%) scaleY(-0.42)",
          background:
            "radial-gradient(ellipse at center, rgba(125,235,255,0.25), rgba(255,79,216,0.18) 32%, rgba(243,213,138,0.08) 54%, transparent 73%)",
          filter: "blur(12px)",
          animation: "reflectionBreathe 4s ease-in-out infinite",
        }}
      />

      <div
        className="absolute left-1/2 top-[53%] h-[470px] w-[330px] -translate-x-1/2 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(125,235,255,0.00), rgba(125,235,255,0.24), rgba(255,79,216,0.22), rgba(243,213,138,0.10), transparent)",
          clipPath: "polygon(44% 0%, 56% 0%, 100% 100%, 0% 100%)",
          filter: "blur(12px)",
          opacity: 0.92,
        }}
      />
    </>
  );
}

function MissionHud({
  missions,
  missionIndex,
  activeMission,
  anchorWinner,
  companionWinner,
  onMissionJump,
}) {
  return (
    <div
      className="rounded-[1.35rem] border px-3 py-2 backdrop-blur-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(8,4,14,0.56), rgba(8,3,10,0.34)), radial-gradient(circle at 16% 12%, rgba(255,79,216,0.10), transparent 34%)",
        borderColor: "rgba(255,79,216,0.18)",
        boxShadow: "0 0 35px rgba(255,79,216,0.06)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7DEBFF] shadow-[0_0_12px_rgba(125,235,255,0.9)]" />
            <p className="text-[9px] uppercase tracking-[0.28em] font-black" style={{ color: "#bdf8ff" }}>
              {activeMission.eyebrow}
            </p>
          </div>

          <h1 className="mt-1 truncate text-base font-black sm:text-xl" style={{ fontFamily: "Georgia, serif" }}>
            {activeMission.title}
          </h1>
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <HudLock label="A" value={anchorWinner?.name || "Pending"} active={Boolean(anchorWinner)} />
          <HudLock label="B" value={companionWinner?.name || "Pending"} active={Boolean(companionWinner)} />
        </div>
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 chamber-scrollbar">
        {missions.map((mission, index) => {
          const active = index === missionIndex;
          const locked = index > missionIndex;

          return (
            <button
              key={mission.id}
              onClick={() => onMissionJump(index)}
              disabled={locked}
              className="shrink-0 rounded-full border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.14em]"
              style={{
                background: active
                  ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne})`
                  : locked
                    ? "rgba(255,255,255,0.025)"
                    : "rgba(125,235,255,0.08)",
                color: active ? COLORS.midnight : locked ? "rgba(255,255,255,0.24)" : "#bdf8ff",
                borderColor: active ? "transparent" : locked ? "rgba(255,255,255,0.07)" : "rgba(125,235,255,0.18)",
              }}
            >
              {mission.eyebrow.replace("Mission ", "M")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HudLock({ label, value, active }) {
  return (
    <div
      className="rounded-2xl border px-2.5 py-1.5 text-right"
      style={{
        background: active ? "rgba(243,213,138,0.10)" : "rgba(0,0,0,0.20)",
        borderColor: active ? "rgba(243,213,138,0.22)" : "rgba(255,255,255,0.08)",
      }}
    >
      <p className="text-[8px] uppercase tracking-[0.18em] text-white/35 font-black">Country {label}</p>
      <p className="mt-0.5 max-w-[92px] truncate text-xs font-black" style={{ color: active ? COLORS.champagneLight : "rgba(255,255,255,0.46)" }}>
        {value}
      </p>
    </div>
  );
}

function EmptyCountryPrompt({ activeMission }) {
  return (
    <div
      className="rounded-[2rem] border p-5 backdrop-blur-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(8,4,14,0.56), rgba(5,5,10,0.46)), radial-gradient(circle at 10% 0%, rgba(255,79,216,0.12), transparent 34%)",
        borderColor: "rgba(255,79,216,0.20)",
        boxShadow:
          "0 0 45px rgba(255,79,216,0.08), inset 0 0 42px rgba(125,235,255,0.025)",
      }}
    >
      <p className="text-xs uppercase tracking-[0.28em] font-black" style={{ color: "#bdf8ff" }}>
        Awaiting target
      </p>
      <h2 className="mt-2 text-4xl font-black" style={{ fontFamily: "Georgia, serif" }}>
        Select a country.
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/58">
        Rotate the holographic globe or use the destination console. Once a target is selected, Porter opens the briefing panel.
      </p>
      <p className="mt-4 text-xs uppercase tracking-[0.2em] font-black" style={{ color: COLORS.champagne }}>
        {activeMission.eyebrow} active
      </p>
    </div>
  );
}

function ConnectorBeam() {
  return (
    <div className="pointer-events-none absolute left-[49%] right-[37%] top-1/2 z-30 hidden h-px origin-left xl:block">
      <div
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, rgba(243,213,138,0), rgba(125,235,255,0.92), rgba(255,79,216,0.64), rgba(100,215,255,0))",
          boxShadow: "0 0 18px rgba(125,235,255,0.48), 0 0 34px rgba(255,79,216,0.32)",
          animation: "beamBreathe 2.4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
        style={{
          background: COLORS.champagneLight,
          boxShadow: "0 0 18px rgba(243,213,138,0.8)",
        }}
      />
    </div>
  );
}

function FloatingIntelPanel({
  mission,
  country,
  selected,
  routeComplete,
  anchorWinner,
  companionWinner,
  onVote,
  onAdvance,
  mobile = false,
}) {
  if (!country) return null;

  return (
    <div
      className={[
        "relative overflow-hidden rounded-[1.7rem] sm:rounded-[2.1rem] border backdrop-blur-2xl chamber-scrollbar",
        mobile ? "mobile-panel-materialize max-h-[34vh] overflow-y-auto" : "panel-materialize max-h-[calc(100vh-168px)] overflow-y-auto",
      ].join(" ")}
      style={{
        background:
          "linear-gradient(135deg, rgba(8,4,14,0.76), rgba(5,5,10,0.64)), radial-gradient(circle at 10% 0%, rgba(255,79,216,0.16), transparent 34%)",
        borderColor: "rgba(125,235,255,0.28)",
        boxShadow:
          "0 0 48px rgba(125,235,255,0.12), 0 30px 120px rgba(0,0,0,0.64), inset 0 0 42px rgba(255,79,216,0.04)",
      }}
    >
      <div
        className="absolute inset-0 opacity-18 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125,235,255,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(255,79,216,0.09) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <CornerBrackets />

      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl sm:h-16 sm:w-16"
            style={{
              background: selected ? "rgba(243,213,138,0.12)" : "rgba(125,235,255,0.08)",
              borderColor: selected ? "rgba(243,213,138,0.28)" : "rgba(125,235,255,0.22)",
            }}
          >
            {countryIcon(country)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.26em] font-black" style={{ color: "#bdf8ff" }}>
              Target acquired · {mission.eyebrow}
            </p>
            <h2 className="mt-1 truncate text-3xl font-black leading-none sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
              {country.name}
            </h2>
            <p className="mt-2 truncate text-sm text-white/48">{country.region} · {country.note}</p>
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
                "linear-gradient(180deg, rgba(5,5,10,0.04), rgba(5,5,10,0.76)), radial-gradient(circle at 18% 12%, rgba(125,235,255,0.22), transparent 32%)",
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
                style={{
                  background: "rgba(125,235,255,0.08)",
                  borderColor: "rgba(125,235,255,0.16)",
                  color: "#bdf8ff",
                }}
              >
                {reason}
              </span>
            ))}
          </div>
        </div>

        {routeComplete && (
          <div className="mt-3 rounded-3xl border p-4" style={{ borderColor: "rgba(243,213,138,0.24)", background: "rgba(243,213,138,0.08)" }}>
            <p className="text-[10px] uppercase tracking-[0.24em] font-black" style={{ color: COLORS.champagneLight }}>
              Route locked
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {anchorWinner?.name} + {companionWinner?.name}
            </p>
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            onClick={onVote}
            className="rounded-2xl px-4 py-3 text-left font-black uppercase tracking-[0.08em]"
            style={{
              background: selected
                ? "rgba(243,213,138,0.12)"
                : `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
              color: selected ? COLORS.champagneLight : COLORS.midnight,
              border: selected ? "1px solid rgba(243,213,138,0.28)" : "none",
            }}
          >
            {selected ? "Target selected" : mission.voteLabel}
          </button>

          <button
            onClick={onAdvance}
            disabled={!mission.canAdvance || mission.mode === "companion-final"}
            className="rounded-2xl px-4 py-3 text-left font-black uppercase tracking-[0.08em] disabled:opacity-35"
            style={{
              background: "rgba(125,235,255,0.08)",
              border: "1px solid rgba(125,235,255,0.20)",
              color: "#bdf8ff",
            }}
          >
            {mission.mode === "companion-final" ? "Final protocol" : `${mission.nextLabel} →`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CornerBrackets() {
  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 h-8 w-8 border-l border-t border-[#7DEBFF]/40" />
      <div className="pointer-events-none absolute right-3 top-3 h-8 w-8 border-r border-t border-[#FF4FD8]/40" />
      <div className="pointer-events-none absolute bottom-3 left-3 h-8 w-8 border-b border-l border-[#FF4FD8]/40" />
      <div className="pointer-events-none absolute bottom-3 right-3 h-8 w-8 border-b border-r border-[#7DEBFF]/40" />
    </>
  );
}

function DestinationConsole({
  countries,
  activeCountry,
  selectedName,
  finalistNames,
  onSelectCountry,
  onPorterPick,
  onAdvance,
  canAdvance,
  routeComplete,
}) {
  return (
    <div
      className="rounded-[1.5rem] border p-2.5 backdrop-blur-2xl sm:rounded-[1.8rem] sm:p-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(8,4,14,0.58), rgba(0,0,0,0.50)), radial-gradient(circle at 50% 0%, rgba(125,235,255,0.14), transparent 60%)",
        borderColor: "rgba(125,235,255,0.22)",
        boxShadow:
          "0 -10px 50px rgba(125,235,255,0.08), 0 22px 95px rgba(0,0,0,0.84), inset 0 1px 0 rgba(255,232,163,0.08)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.28em] font-black" style={{ color: "#bdf8ff" }}>
            Destination console
          </p>
          <p className="hidden truncate text-[11px] uppercase tracking-[0.16em] text-white/38 sm:block">
            Targets available · choose a country to materialize intel
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={onPorterPick}
            className="rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] sm:text-[10px]"
            style={{
              background: "rgba(125,235,255,0.08)",
              borderColor: "rgba(125,235,255,0.20)",
              color: "#bdf8ff",
            }}
          >
            Porter
          </button>

          <button
            onClick={onAdvance}
            disabled={!canAdvance || routeComplete}
            className="hidden rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-30 sm:block"
            style={{
              background: canAdvance && !routeComplete ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne})` : "rgba(255,255,255,0.035)",
              borderColor: canAdvance && !routeComplete ? "transparent" : "rgba(255,255,255,0.10)",
              color: canAdvance && !routeComplete ? COLORS.midnight : "rgba(255,255,255,0.32)",
            }}
          >
            Advance
          </button>
        </div>
      </div>

      <div className="chamber-scrollbar flex gap-2 overflow-x-auto pb-1">
        {countries.map((country) => {
          const active = activeCountry?.name === country.name;
          const selected = selectedName === country.name;
          const finalist = finalistNames?.includes(country.name);

          return (
            <button
              key={country.name}
              onClick={() => onSelectCountry(country)}
              className="shrink-0 rounded-2xl border px-3 py-2 text-left transition"
              style={{
                minWidth: "126px",
                background: selected
                  ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne})`
                  : active
                    ? "rgba(125,235,255,0.14)"
                    : "rgba(255,255,255,0.045)",
                color: selected ? COLORS.midnight : "rgba(255,255,255,0.72)",
                borderColor: selected
                  ? "transparent"
                  : active
                    ? "rgba(125,235,255,0.44)"
                    : "rgba(255,255,255,0.09)",
                boxShadow: active ? "0 0 22px rgba(125,235,255,0.12)" : "none",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg">{countryIcon(country)}</span>
                {selected && <span className="text-[9px] font-black">VOTED</span>}
                {!selected && finalist && <span className="text-[9px] font-black text-white/38">TOP 2</span>}
              </div>
              <div className="mt-1 truncate text-sm font-black">{country.name}</div>
              <div className="truncate text-[10px] opacity-60">{country.region}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FloorEmitter({ active }) {
  return (
    <div className="relative h-[230px] w-[min(90vw,700px)]">
      <div
        className="absolute left-1/2 top-1/2 h-[132px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.42), rgba(125,235,255,0.30) 24%, rgba(255,79,216,0.24) 43%, transparent 70%)",
          transform: "translate(-50%, -50%) rotateX(64deg)",
          boxShadow: active
            ? "0 0 95px rgba(125,235,255,0.38), 0 0 120px rgba(255,79,216,0.36)"
            : "0 0 86px rgba(125,235,255,0.28)",
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 h-[190px] w-[590px] rounded-full opacity-80"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, rgba(125,235,255,.36), transparent, rgba(255,79,216,.32), transparent, rgba(243,213,138,.18), transparent)",
          filter: "blur(.3px)",
          animation: "floorSpin 18s linear infinite",
        }}
      />

      {[0, 1, 2, 3, 4].map((ring) => (
        <div
          key={ring}
          className="absolute left-1/2 top-1/2 rounded-full border"
          style={{
            width: `${236 + ring * 86}px`,
            height: `${62 + ring * 19}px`,
            transform: "translate(-50%, -50%) rotateX(64deg)",
            borderColor: ring % 2 === 0 ? "rgba(125,235,255,0.46)" : "rgba(255,79,216,0.34)",
            boxShadow: ring === 0 ? "0 0 26px rgba(125,235,255,0.52)" : "none",
          }}
        />
      ))}

      <div
        className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "#ffffff",
          boxShadow:
            "0 0 18px #ffffff, 0 0 48px rgba(125,235,255,0.92), 0 0 100px rgba(255,79,216,0.46)",
        }}
      />
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
          border: "1px solid rgba(125,235,255,0.13)",
          boxShadow: "inset 0 0 70px rgba(125,235,255,0.035), 0 0 70px rgba(255,79,216,0.035)",
        }}
      >
        <div
          className="absolute left-1/2 top-0 bottom-0"
          style={{
            width: "1px",
            background: "linear-gradient(180deg, transparent, rgba(125,235,255,0.22), transparent)",
          }}
        />
        <div
          className="absolute top-1/2 left-0 right-0"
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(255,79,216,0.22), transparent)",
          }}
        />
        <div className="absolute inset-[18%] rounded-full" style={{ border: "1px dashed rgba(125,235,255,0.12)" }} />
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

function EventsPage() {
  const [events, setEvents] = useState(INITIAL_EVENTS);

  function updateRsvp(eventId, nextStatus) {
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;

        const currentStatus = event.myStatus;
        const updated = { ...event };

        if (currentStatus === "going") updated.going -= 1;
        if (currentStatus === "maybe") updated.maybe -= 1;
        if (currentStatus === "notGoing") updated.notGoing -= 1;

        if (nextStatus === "going") updated.going += 1;
        if (nextStatus === "maybe") updated.maybe += 1;
        if (nextStatus === "notGoing") updated.notGoing += 1;

        updated.myStatus = nextStatus;
        return updated;
      })
    );
  }

  return (
    <main className="px-5 py-5">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] font-bold" style={{ color: COLORS.champagne }}>
          Plan + RSVP
        </p>
        <h1 className="text-3xl font-black mt-2" style={{ fontFamily: "Georgia, serif" }}>
          Know the plan. Tell people if you’re going.
        </h1>
        <p className="text-sm text-white/60 mt-3 leading-6">
          Official itinerary, vote-created events, and classmate-posted plans all live here.
        </p>
      </section>

      <EventSection title="Events" eyebrow="Required + optional" events={events} onRsvp={updateRsvp} />
    </main>
  );
}

function EventSection({ title, eyebrow, events, onRsvp }) {
  return (
    <section className="mt-6">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <div className="grid gap-3 mt-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} onRsvp={onRsvp} />
        ))}
      </div>
    </section>
  );
}

function EventCard({ event, onRsvp }) {
  const [showThread, setShowThread] = useState(false);

  return (
    <div className="rounded-[2rem] p-4 border border-white/10 bg-white/[0.06] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/35 font-bold">{event.source}</div>
          <h3 className="text-xl font-black mt-1" style={{ fontFamily: "Georgia, serif" }}>
            {event.title}
          </h3>
          <p className="text-sm text-white/55 mt-1">
            {event.date} · {event.time}
          </p>
        </div>

        <span
          className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border shrink-0"
          style={{
            background: "rgba(198,90,46,0.14)",
            color: COLORS.champagneLight,
            borderColor: "rgba(243,213,138,0.18)",
          }}
        >
          {event.badge}
        </span>
      </div>

      <p className="text-sm text-white/60 mt-3 leading-6">{event.detail}</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <RsvpButton label="Going" count={event.going} active={event.myStatus === "going"} onClick={() => onRsvp(event.id, "going")} />
        <RsvpButton label="Maybe" count={event.maybe} active={event.myStatus === "maybe"} onClick={() => onRsvp(event.id, "maybe")} />
        <RsvpButton label="Not going" count={event.notGoing} active={event.myStatus === "notGoing"} onClick={() => onRsvp(event.id, "notGoing")} />
      </div>

      <button
        onClick={() => setShowThread((prev) => !prev)}
        className="mt-4 w-full rounded-2xl px-4 py-3 font-black text-left"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: COLORS.champagneLight,
        }}
      >
        {showThread ? "Hide event thread" : "Open event thread"} →
      </button>

      {showThread && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-4 space-y-2">
          {event.thread.map((message) => (
            <div key={message} className="rounded-2xl bg-white/[0.07] border border-white/10 px-3 py-2 text-sm text-white/68">
              {message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RsvpButton({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border px-2 py-3 text-center"
      style={{
        background: active ? "rgba(243,213,138,0.14)" : "rgba(0,0,0,0.22)",
        borderColor: active ? "rgba(243,213,138,0.42)" : "rgba(255,255,255,0.10)",
      }}
    >
      <div className="font-black" style={{ color: active ? COLORS.champagne : "rgba(255,255,255,0.78)" }}>
        {count}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-white/42">{label}</div>
    </button>
  );
}

function DemoPage({ eyebrow, title, subtitle, cards = [] }) {
  return (
    <main className="px-5 py-5">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: "rgba(243,213,138,0.72)" }}>
          {eyebrow}
        </p>
        <h1 className="text-3xl font-black mt-2" style={{ fontFamily: "Georgia, serif" }}>
          {title}
        </h1>
        <p className="text-sm text-white/60 mt-3 leading-6">{subtitle}</p>

        <div className="grid gap-3 mt-5">
          {cards.map((card) => (
            <div key={card.title} className="rounded-3xl p-4 border border-white/10 bg-black/20">
              <h3 className="font-black">{card.title}</h3>
              <p className="text-sm text-white/55 mt-1">{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] font-bold" style={{ color: "rgba(243,213,138,0.62)" }}>
        {eyebrow}
      </p>
      <h2 className="text-xl font-black mt-1" style={{ fontFamily: "Georgia, serif" }}>
        {title}
      </h2>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <Shell drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen}>
        <Routes>
          <Route path="/" element={<HomePage onAsk={() => navigate("/porter")} />} />
          <Route path="/porter" element={<PorterPage />} />
          <Route path="/votes" element={<VotesPage />} />
          <Route path="/events" element={<EventsPage />} />

          <Route
            path="/explore"
            element={
              <DemoPage
                eyebrow="Explore"
                title="City picks that feel curated"
                subtitle="Restaurants, bars, activities, neighborhoods, and cohort-approved recommendations."
                cards={[
                  { title: "Food nearby", body: "Quick picks based on group size, vibe, timing, and distance." },
                  { title: "Free time plans", body: "Two-hour, half-day, and night-out options." },
                  { title: "Cohort favorites", body: "Places saved or recommended by classmates and admins." },
                ]}
              />
            }
          />

          <Route
            path="/chat"
            element={
              <DemoPage
                eyebrow="Chat"
                title="Cohort chat and team channels"
                subtitle="A private place to coordinate without losing everything in texts."
                cards={[
                  { title: "Main cohort", body: "Announcements, logistics, and general questions." },
                  { title: "Event threads", body: "Every event can have its own coordination thread." },
                  { title: "Pinned notes", body: "Admin messages that should not get buried." },
                ]}
              />
            }
          />

          <Route
            path="/team"
            element={
              <DemoPage
                eyebrow="Teams"
                title="Know who you are with"
                subtitle="Team assignments, classmates, shared resources, and quick links."
                cards={[
                  { title: "My team", body: "Members, roles, and team chat shortcut." },
                  { title: "Cohort directory", body: "Profiles and contact basics." },
                ]}
              />
            }
          />

          <Route
            path="/gallery"
            element={
              <DemoPage
                eyebrow="Gallery"
                title="Trip memories without the chaos"
                subtitle="Shared photos, albums, and highlights from the cohort."
                cards={[
                  { title: "Today’s uploads", body: "Recent cohort photos and moments." },
                  { title: "Albums", body: "Organized by city, event, or day." },
                ]}
              />
            }
          />

          <Route
            path="/me"
            element={
              <DemoPage
                eyebrow="Profile"
                title="Your trip settings"
                subtitle="Preferences, dietary notes, emergency info, saved places, and notification settings."
                cards={[
                  { title: "Saved places", body: "Restaurants and plans you want to remember." },
                  { title: "Preferences", body: "Food, activity, and accessibility notes for better suggestions." },
                ]}
              />
            }
          />

          <Route path="/ask" element={<Navigate to="/porter" replace />} />
          <Route path="/plan" element={<Navigate to="/events" replace />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </>
  );
}