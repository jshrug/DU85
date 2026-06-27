import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import SplashScreen from "./components/SplashScreen.jsx";
import { supabase, COHORT_ID, getOrCreateUserId } from "./lib/supabase.js";
import { DEEP_DIVE } from "./data/countryDeepDive.js";
import { useAuth } from "./lib/AuthContext.jsx";
import { fetchCountryBriefs, submitCountryBrief } from "./lib/porterMemory.js";
import mammoth from "mammoth";
import {
  getFreshnessLabel,
  getCohortsForCity,
  getPreviousVisitOrgsForCity,
  getCohortBuiltConnectionRead,
  getPrecedentScore,
  getMostRepeatedDestinations,
  getRecentCohortDestinations,
} from "./utils/destinationIntel.js";
import { previousCohortTrips } from "./data/previousCohortIntel.js";

const TRIP_DATE = import.meta.env.VITE_TRIP_DATE || null;

const COLORS = {
  midnight: "#05050A",
  wine: "#1A0710",
  deepWine: "#2A0B12",
  roseSmoke: "#8F3F4F",
  champagne: "#F3D58A",
  champagneLight: "#FFE8A3",
  ember: "#C65A2E",
  crimson: "#BA0C2F",
  crimsonBright: "#E03050",
  gold: "#C4962A",
  goldLight: "#E8B84B",
};

const COHORT_SIZE = 16;

function getInitialGlobeSize() {
  if (typeof window === "undefined") return { width: 1400, height: 900 };
  return { width: window.innerWidth, height: window.innerHeight };
}

const DRAWER_NAV = [
  { to: "/", label: "Command Center", icon: "✦", desc: "Today, alerts, and quick actions" },
  { to: "/porter", label: "Porter", icon: "🛎️", desc: "AI cohort concierge" },
  { to: "/events", label: "Plan + RSVP", icon: "📅", desc: "Official, vote-created, and classmate events" },
  { to: "/votes", label: "Votes", icon: "🗳️", desc: "Destination chamber and trip decisions" },
  { to: "/explore", label: "Explore", icon: "🗺️", desc: "Food, places, and plans" },
  { to: "/tools", label: "Trip Tools", icon: "🛠️", desc: "Currency exchange and translation" },
  { to: "/chat", label: "Chat", icon: "💬", desc: "Cohort and team channels" },
  { to: "/team", label: "Teams", icon: "👥", desc: "Groups and classmates" },
  { to: "/gallery", label: "Gallery", icon: "📷", desc: "Photos and memories" },
  { to: "/me", label: "Profile", icon: "👤", desc: "Preferences and saved places" },
];

const SAMPLE_PROMPTS = [
  "Which anchor + companion pairing would you recommend for Global 85?",
  "Compare Japan and South Korea for a DU MBA business immersion.",
  "What’s the best 10-day itinerary if we pick Spain as anchor?",
  "Give me the top 3 company visit ideas for a tech-focused cohort.",
  "What should we know about visas and logistics before we decide?",
  "What’s the honest case against Japan given the cost and flight time?",
];

const DESTINATION_OPTIONS = [
  {
    name: "Santiago",
    region: "South America",
    flag: "CL",
    emoji: "🇨🇱",
    score: 24,
    lat: -33.4489,
    lng: -70.6693,
    image: "https://picsum.photos/seed/global85-santiago/1200/800",
    note: "Chile · Andes gateway, business hub, wine country",
    fit: "High",
    cost: "$$",
    travel: "Medium",
    reasons: ["Latin America hub", "Business climate", "Andes access", "Food & wine"],
    porter: "Chile's capital is the cleanest entry point into South America — strong institutions, a growing startup scene, and one of the most walkable business districts on the continent.",
  },
  {
    name: "Seoul",
    region: "Asia",
    flag: "KR",
    emoji: "🇰🇷",
    score: 28,
    lat: 37.5665,
    lng: 126.9780,
    image: "https://picsum.photos/seed/global85-seoul/1200/800",
    note: "South Korea · Tech, K-culture, food, corporate visits",
    fit: "Very High",
    cost: "$$$",
    travel: "Long",
    reasons: ["Tech & innovation", "K-culture", "Food scene", "Corporate visits"],
    porter: "Seoul punches above its weight — Samsung, Hyundai, HYBE, and a relentless startup ecosystem make it one of the most MBA-relevant cities in Asia. The food alone justifies the flight.",
  },
  {
    name: "Singapore",
    region: "Asia",
    flag: "SG",
    emoji: "🇸🇬",
    score: 26,
    lat: 1.3521,
    lng: 103.8198,
    image: "https://picsum.photos/seed/global85-singapore/1200/800",
    note: "Singapore · Finance, trade, innovation, city-state",
    fit: "Very High",
    cost: "$$$",
    travel: "Long",
    reasons: ["Finance hub", "Global trade", "Innovation", "City systems"],
    porter: "The most efficient city-state on earth. Singapore's concentration of MNCs, private equity, and regional HQs makes it an extraordinary MBA immersion stop — and it pairs naturally with Southeast Asia.",
  },
  {
    name: "Istanbul",
    region: "Europe / Middle East",
    flag: "TR",
    emoji: "🇹🇷",
    score: 23,
    lat: 41.0082,
    lng: 28.9784,
    image: "https://picsum.photos/seed/global85-istanbul/1200/800",
    note: "Turkey · Bridge of East & West, trade, culture, food",
    fit: "High",
    cost: "$$",
    travel: "Medium",
    reasons: ["Strategic crossroads", "Trade routes", "Cultural depth", "Food"],
    porter: "Istanbul is one of the most strategically located cities on earth — a literal bridge between Europe and Asia. Strong for geopolitics, emerging markets, supply chain, and one of the great food cities in the world.",
  },
  {
    name: "Lisbon",
    region: "Europe",
    flag: "PT",
    emoji: "🇵🇹",
    score: 21,
    lat: 38.7223,
    lng: -9.1393,
    image: "https://picsum.photos/seed/global85-lisbon/1200/800",
    note: "Portugal · Tech hub, startups, culture, Atlantic trade",
    fit: "High",
    cost: "$$",
    travel: "Medium",
    reasons: ["Startup ecosystem", "Web Summit host city", "Culture", "Affordability"],
    porter: "Lisbon has quietly become Europe's hottest startup hub and the host of Web Summit. Compact, walkable, deeply historical, and genuinely affordable — a smart pick for an MBA group.",
  },
  {
    name: "Cape Town",
    region: "Africa",
    flag: "ZA",
    emoji: "🇿🇦",
    score: 22,
    lat: -33.9249,
    lng: 18.4241,
    image: "https://picsum.photos/seed/global85-cape-town/1200/800",
    note: "South Africa · Africa gateway, finance, sustainability, nature",
    fit: "High",
    cost: "$$",
    travel: "Long",
    reasons: ["Africa's finance hub", "Sustainability", "Natural beauty", "Cultural depth"],
    porter: "Cape Town is the most visually dramatic city on the list and one of the best entry points into African markets. Strong for impact investing, sustainability, and finance — and unlike anywhere else the group has likely been.",
  },
  {
    name: "Nairobi",
    region: "Africa",
    flag: "KE",
    emoji: "🇰🇪",
    score: 20,
    lat: -1.2921,
    lng: 36.8219,
    image: "https://picsum.photos/seed/global85-nairobi/1200/800",
    note: "Kenya · East Africa hub, fintech, social enterprise, wildlife",
    fit: "High",
    cost: "$",
    travel: "Long",
    reasons: ["East Africa hub", "M-Pesa fintech story", "Social enterprise", "Unique experiences"],
    porter: "Nairobi is the Silicon Savannah — home to M-Pesa, a booming tech ecosystem, and some of the most compelling social enterprise work in the world. A once-in-a-career immersion opportunity.",
  },
  {
    name: "Kigali",
    region: "Africa",
    flag: "RW",
    emoji: "🇷🇼",
    score: 19,
    lat: -1.9441,
    lng: 30.0619,
    image: "https://picsum.photos/seed/global85-kigali/1200/800",
    note: "Rwanda · Africa's comeback story, clean governance, innovation",
    fit: "High",
    cost: "$",
    travel: "Long",
    reasons: ["Remarkable governance story", "Innovation push", "Safety", "Contrarian pick"],
    porter: "Kigali is the most surprising city on this list — one of the cleanest, safest, and fastest-growing cities in Africa. Rwanda's governance transformation is a genuine MBA case study you can't get from a classroom.",
  },
];

const COMPANION_CITIES = [
  // Santiago companions
  {
    name: "Buenos Aires",
    region: "South America",
    flag: "AR",
    emoji: "🇦🇷",
    score: 22,
    lat: -34.6037,
    lng: -58.3816,
    image: "https://picsum.photos/seed/global85-buenos-aires/1200/800",
    note: "Argentina · Culture, beef, finance, walkability",
    fit: "High",
    cost: "$$",
    travel: "Short",
    reasons: ["Culture", "Food", "Finance", "Walkability"],
    porter: "Buenos Aires has the best steak on the planet and a surprisingly deep finance and startup scene. Great pairing with Santiago for a South America double.",
  },
  {
    name: "Panama City",
    region: "Central America",
    flag: "PA",
    emoji: "🇵🇦",
    score: 17,
    lat: 8.9936,
    lng: -79.5197,
    image: "https://picsum.photos/seed/global85-panama-city/1200/800",
    note: "Panama · Canal, logistics, banking, Latin hub",
    fit: "Medium",
    cost: "$$",
    travel: "Short",
    reasons: ["Canal logistics", "Banking hub", "Trade", "Easy transit"],
    porter: "Panama City is the logistics capital of the Americas — the Canal alone is a world-class supply chain case study. Adds a completely different angle to a Santiago week.",
  },
  {
    name: "Medellín",
    region: "South America",
    flag: "CO",
    emoji: "🇨🇴",
    score: 20,
    lat: 6.2442,
    lng: -75.5812,
    image: "https://picsum.photos/seed/global85-medellin/1200/800",
    note: "Colombia · Urban transformation, innovation, entrepreneurship",
    fit: "High",
    cost: "$",
    travel: "Short",
    reasons: ["Urban transformation story", "Innovation hub", "Affordable", "Compelling narrative"],
    porter: "Medellín's transformation from one of the most dangerous cities in the world to a global innovation hub is the most compelling urban turnaround story in recent memory. Remarkable for strategy and social enterprise tracks.",
  },
  {
    name: "Lima",
    region: "South America",
    flag: "PE",
    emoji: "🇵🇪",
    score: 19,
    lat: -12.0464,
    lng: -77.0428,
    image: "https://picsum.photos/seed/global85-lima/1200/800",
    note: "Peru · World-class food, Pacific trade, culture",
    fit: "High",
    cost: "$$",
    travel: "Short",
    reasons: ["World-class food", "Cultural depth", "Pacific trade", "Archaeology"],
    porter: "Lima has quietly become one of the world's great food cities — Central, Maido, and Astrid y Gastón are world-class. Strong for food business, Pacific trade routes, and cultural depth.",
  },
  // Seoul companion
  {
    name: "Ulaanbaatar",
    region: "Asia",
    flag: "MN",
    emoji: "🇲🇳",
    score: 15,
    lat: 47.8864,
    lng: 106.9057,
    image: "https://picsum.photos/seed/global85-ulaanbaatar/1200/800",
    note: "Mongolia · Mining, nomadic culture, frontier market",
    fit: "Medium",
    cost: "$$",
    travel: "Short",
    reasons: ["Frontier market", "Mining industry", "Unique culture", "Off-the-beaten-path"],
    porter: "Ulaanbaatar is the most contrarian choice on the whole list — a frontier market with massive mining wealth, nomadic culture, and a city almost no MBA cohort has visited. If Seoul is the anchor, Mongolia adds a completely different dimension.",
  },
  // Singapore companions
  {
    name: "Bangkok",
    region: "Asia",
    flag: "TH",
    emoji: "🇹🇭",
    score: 22,
    lat: 13.7563,
    lng: 100.5018,
    image: "https://picsum.photos/seed/global85-bangkok/1200/800",
    note: "Thailand · Hospitality, food, ASEAN hub, culture",
    fit: "High",
    cost: "$",
    travel: "Short",
    reasons: ["Hospitality industry", "Food scene", "ASEAN hub", "Cost efficiency"],
    porter: "Bangkok is one of the most dynamic cities in Southeast Asia — world-class food, a booming hospitality sector, and a gateway to ASEAN markets. Easy, cheap, and genuinely memorable.",
  },
  {
    name: "Kuala Lumpur",
    region: "Asia",
    flag: "MY",
    emoji: "🇲🇾",
    score: 18,
    lat: 3.1390,
    lng: 101.6869,
    image: "https://picsum.photos/seed/global85-kuala-lumpur/1200/800",
    note: "Malaysia · Finance, manufacturing, multicultural hub",
    fit: "Medium",
    cost: "$",
    travel: "Short",
    reasons: ["Finance hub", "Manufacturing", "Multicultural", "Affordable"],
    porter: "KL is underrated as a business destination — strong financial sector, deep manufacturing ties, and one of the most multicultural cities in Asia. Pairs naturally with Singapore.",
  },
  {
    name: "Ho Chi Minh City",
    region: "Asia",
    flag: "VN",
    emoji: "🇻🇳",
    score: 20,
    lat: 10.8231,
    lng: 106.6297,
    image: "https://picsum.photos/seed/global85-ho-chi-minh-city/1200/800",
    note: "Vietnam · Manufacturing boom, entrepreneurship, food",
    fit: "High",
    cost: "$",
    travel: "Short",
    reasons: ["Manufacturing boom", "Entrepreneurship", "Food", "Growth market"],
    porter: "Ho Chi Minh City is one of the fastest-growing economies in Asia. The manufacturing story, entrepreneurship culture, and food scene make it a strong companion to Singapore's corporate polish.",
  },
  {
    name: "Hanoi",
    region: "Asia",
    flag: "VN",
    emoji: "🇻🇳",
    score: 18,
    lat: 21.0285,
    lng: 105.8542,
    image: "https://picsum.photos/seed/global85-hanoi/1200/800",
    note: "Vietnam · Government hub, culture, street food, history",
    fit: "High",
    cost: "$",
    travel: "Short",
    reasons: ["Cultural depth", "Street food", "History", "Authentic feel"],
    porter: "Hanoi has a completely different energy from Ho Chi Minh City — more traditional, more French-influenced, and more historically layered. Great for culture and contrast.",
  },
  {
    name: "Delhi",
    region: "Asia",
    flag: "IN",
    emoji: "🇮🇳",
    score: 21,
    lat: 28.7041,
    lng: 77.1025,
    image: "https://picsum.photos/seed/global85-delhi/1200/800",
    note: "India · Government, scale, history, rising power",
    fit: "High",
    cost: "$",
    travel: "Medium",
    reasons: ["India gateway", "Government hub", "Scale & complexity", "Historic depth"],
    porter: "Delhi is India's political and historical center — an overwhelming, fascinating city that makes the sheer scale of the Indian economy visceral. Strong for government relations, policy, and understanding emerging market complexity.",
  },
  {
    name: "Bangalore",
    region: "Asia",
    flag: "IN",
    emoji: "🇮🇳",
    score: 23,
    lat: 12.9716,
    lng: 77.5946,
    image: "https://picsum.photos/seed/global85-bangalore/1200/800",
    note: "India · Tech capital, startups, outsourcing, innovation",
    fit: "Very High",
    cost: "$",
    travel: "Medium",
    reasons: ["India's Silicon Valley", "Tech & startups", "Outsourcing hub", "Innovation"],
    porter: "Bangalore is India's tech capital — home to Infosys, Wipro, and a booming startup scene. For any MBA cohort interested in tech, operations, or India's digital economy, this is the right city.",
  },
  {
    name: "Mumbai",
    region: "Asia",
    flag: "IN",
    emoji: "🇮🇳",
    score: 22,
    lat: 19.0760,
    lng: 72.8777,
    image: "https://picsum.photos/seed/global85-mumbai/1200/800",
    note: "India · Finance, Bollywood, commerce, energy",
    fit: "High",
    cost: "$$",
    travel: "Medium",
    reasons: ["India's financial capital", "Bollywood", "Commerce hub", "Raw energy"],
    porter: "Mumbai is India's financial and commercial engine — the Bombay Stock Exchange, major banks, and Bollywood all call it home. One of the most energetic cities on earth.",
  },
  // Istanbul companions
  {
    name: "Budapest",
    region: "Europe",
    flag: "HU",
    emoji: "🇭🇺",
    score: 18,
    lat: 47.4979,
    lng: 19.0402,
    image: "https://picsum.photos/seed/global85-budapest/1200/800",
    note: "Hungary · Central Europe, architecture, emerging market, culture",
    fit: "Medium",
    cost: "$$",
    travel: "Short",
    reasons: ["Central Europe gateway", "Architecture", "Value", "Culture"],
    porter: "Budapest is the most beautiful city in Central Europe and a smart pairing with Istanbul — it adds European institutional context, great food, and one of the most photogenic cities anywhere.",
  },
  {
    name: "Belgrade",
    region: "Europe",
    flag: "RS",
    emoji: "🇷🇸",
    score: 15,
    lat: 44.8176,
    lng: 20.4569,
    image: "https://picsum.photos/seed/global85-belgrade/1200/800",
    note: "Serbia · Emerging Europe, growth, contrarian pick",
    fit: "Medium",
    cost: "$",
    travel: "Short",
    reasons: ["Contrarian pick", "Fast growth", "Affordability", "Emerging Europe"],
    porter: "Belgrade is one of the most underrated cities in Europe — fast-growing, very affordable, and with a nightlife scene that rivals Berlin. Adds an unconventional angle to an Istanbul anchor.",
  },
  {
    name: "Tunis",
    region: "Africa",
    flag: "TN",
    emoji: "🇹🇳",
    score: 17,
    lat: 36.8190,
    lng: 10.1658,
    image: "https://picsum.photos/seed/global85-tunis/1200/800",
    note: "Tunisia · North Africa, Carthage, Mediterranean, emerging market",
    fit: "Medium",
    cost: "$",
    travel: "Short",
    reasons: ["North Africa gateway", "History", "Mediterranean", "Affordable"],
    porter: "Tunis puts the cohort in North Africa — a region most MBA programs completely ignore. Adds an entirely different lens on emerging markets and trade culture, right on the Mediterranean.",
  },
  {
    name: "Athens",
    region: "Europe",
    flag: "GR",
    emoji: "🇬🇷",
    score: 19,
    lat: 37.9838,
    lng: 23.7275,
    image: "https://picsum.photos/seed/global85-athens/1200/800",
    note: "Greece · Antiquity, shipping industry, tourism, culture",
    fit: "Medium",
    cost: "$$",
    travel: "Short",
    reasons: ["Antiquity", "Shipping capital", "Tourism", "Culture"],
    porter: "Athens sits at the intersection of ancient history and modern shipping — Greece controls the world's largest commercial fleet. Strong pairing with Istanbul for a Mediterranean arc.",
  },
  {
    name: "Warsaw",
    region: "Europe",
    flag: "PL",
    emoji: "🇵🇱",
    score: 17,
    lat: 52.2297,
    lng: 21.0122,
    image: "https://picsum.photos/seed/global85-warsaw/1200/800",
    note: "Poland · Fast-growing EU economy, tech, resilience story",
    fit: "Medium",
    cost: "$$",
    travel: "Short",
    reasons: ["Fast-growing EU economy", "Tech hub", "Resilience story", "Manufacturing"],
    porter: "Warsaw is the fastest-growing major economy in the EU and a tech hub most Americans overlook. Adds a compelling Central European growth story to an Istanbul anchor.",
  },
  // Lisbon companions
  {
    name: "Casablanca",
    region: "Africa",
    flag: "MA",
    emoji: "🇲🇦",
    score: 20,
    lat: 33.5731,
    lng: -7.5898,
    image: "https://picsum.photos/seed/global85-casablanca/1200/800",
    note: "Morocco · North Africa finance hub, trade, Islamic culture, markets",
    fit: "High",
    cost: "$",
    travel: "Short",
    reasons: ["North Africa hub", "Trade", "Cultural contrast", "Accessible"],
    porter: "Casablanca is Morocco's commercial capital and one of Africa's leading financial hubs — a sharp cultural contrast to Lisbon that adds Islamic business culture, North African markets, and a genuinely cinematic city.",
  },
  {
    name: "Dakar",
    region: "Africa",
    flag: "SN",
    emoji: "🇸🇳",
    score: 18,
    lat: 14.7167,
    lng: -17.4677,
    image: "https://picsum.photos/seed/global85-dakar/1200/800",
    note: "Senegal · West Africa hub, culture, Atlantic gateway, growth",
    fit: "Medium",
    cost: "$",
    travel: "Short",
    reasons: ["West Africa gateway", "Culture", "Music & art", "Growth market"],
    porter: "Dakar is the most culturally vibrant city in West Africa — great music, art, food, and a fast-growing economy. Pairs beautifully with Lisbon given the Portuguese-Francophone trade history across the Atlantic.",
  },
  // Cape Town companions
  {
    name: "Windhoek",
    region: "Africa",
    flag: "NA",
    emoji: "🇳🇦",
    score: 14,
    lat: -22.5594,
    lng: 17.0832,
    image: "https://picsum.photos/seed/global85-windhoek/1200/800",
    note: "Namibia · German colonial history, wildlife, diamond industry",
    fit: "Low",
    cost: "$$",
    travel: "Short",
    reasons: ["Unique frontier", "Wildlife", "German influence", "Diamond industry"],
    porter: "Windhoek is a tiny, extremely unusual capital — clean, German-influenced, and surrounded by one of the most dramatic landscapes on earth. A niche but memorable add-on to Cape Town.",
  },
  {
    name: "Lusaka",
    region: "Africa",
    flag: "ZM",
    emoji: "🇿🇲",
    score: 13,
    lat: -15.3875,
    lng: 28.3228,
    image: "https://picsum.photos/seed/global85-lusaka/1200/800",
    note: "Zambia · Copper belt, agriculture, emerging market, Victoria Falls",
    fit: "Low",
    cost: "$",
    travel: "Short",
    reasons: ["Copper economy", "Emerging market", "Victoria Falls access", "Agriculture"],
    porter: "Lusaka is a frontier market with a commodity story centered on copper and agriculture. Genuinely educational for supply chain and emerging market tracks — especially with Victoria Falls a short drive away.",
  },
  {
    name: "Maputo",
    region: "Africa",
    flag: "MZ",
    emoji: "🇲🇿",
    score: 13,
    lat: -25.9653,
    lng: 32.5732,
    image: "https://picsum.photos/seed/global85-maputo/1200/800",
    note: "Mozambique · Portuguese heritage, coastal city, resource economy",
    fit: "Low",
    cost: "$",
    travel: "Short",
    reasons: ["Portuguese heritage", "Coastal beauty", "Emerging economy", "LNG industry"],
    porter: "Maputo is one of Africa's most undervisited coastal capitals — Portuguese-influenced, on the Indian Ocean, and at the center of a major LNG resource boom. High surprise value paired with Cape Town.",
  },
  {
    name: "Gaborone",
    region: "Africa",
    flag: "BW",
    emoji: "🇧🇼",
    score: 14,
    lat: -24.6540,
    lng: 25.9087,
    image: "https://picsum.photos/seed/global85-gaborone/1200/800",
    note: "Botswana · Governance success story, diamonds, safari, stability",
    fit: "Medium",
    cost: "$$",
    travel: "Short",
    reasons: ["Governance success story", "Diamond industry", "Safari access", "Stability"],
    porter: "Botswana is Africa's great governance success story — a country that took diamonds and built one of the continent's most stable democracies. Gaborone paired with Cape Town makes for a fascinating double on African economic models.",
  },
  // Kigali companion
  {
    name: "Kampala",
    region: "Africa",
    flag: "UG",
    emoji: "🇺🇬",
    score: 15,
    lat: 0.3476,
    lng: 32.5825,
    image: "https://picsum.photos/seed/global85-kampala/1200/800",
    note: "Uganda · East Africa, Nile source, agriculture, fast-growing city",
    fit: "Medium",
    cost: "$",
    travel: "Short",
    reasons: ["Fast-growing city", "Nile gateway", "Agriculture story", "Culture"],
    porter: "Kampala is one of the fastest-growing cities in Africa — young, energetic, and positioned at the source of the Nile. Pairs naturally with Kigali as a two-country East Africa deep dive.",
  },
];

const CITY_B_MAP = {
  "Santiago": ["Buenos Aires", "Panama City", "Medellín", "Lima"],
  "Seoul": ["Ulaanbaatar"],
  "Singapore": ["Bangkok", "Kuala Lumpur", "Ho Chi Minh City", "Hanoi", "Delhi", "Bangalore", "Mumbai"],
  "Istanbul": ["Nairobi", "Budapest", "Belgrade", "Tunis", "Athens", "Warsaw"],
  "Lisbon": ["Casablanca", "Dakar"],
  "Cape Town": ["Nairobi", "Windhoek", "Lusaka", "Maputo", "Gaborone"],
  "Nairobi": ["Mumbai", "Istanbul", "Kigali", "Cape Town"],
  "Kigali": ["Kampala", "Nairobi"],
};

const ANCHOR_COUNTRIES = DESTINATION_OPTIONS;

const COHORT_EVENTS = [
  {
    id: "cohort-1",
    source: "Class Session",
    title: "Countries Announced + Team Assignments",
    date: "Jun 26",
    fullDate: new Date("2026-06-26"),
    detail: "Cohort finds out which countries are on the list and gets assigned to presentation teams.",
    badge: "Required",
  },
  {
    id: "cohort-2",
    source: "Assignment Due",
    title: "Presentation Briefing Due",
    date: "Jul 8",
    fullDate: new Date("2026-07-08"),
    detail: "Each presentation team submits their briefing document to Joseph before class.",
    badge: "Due",
  },
  {
    id: "cohort-3",
    source: "Class Session",
    title: "City A Presentations + Vote",
    date: "Jul 11",
    fullDate: new Date("2026-07-11"),
    detail: "30-min presentations per team, 10-min Q&A, 10-min break, then anonymous vote through Porter. Porter tallies results, announces top 2, and runs any tiebreaker runoff on the spot. Top 2 advance to the City A final vote.",
    badge: "Required",
  },
  {
    id: "cohort-4",
    source: "Assignment Due",
    title: "City B Briefing Due",
    date: "Jul 15",
    fullDate: new Date("2026-07-15"),
    detail: "Each presentation team submits their City B briefing document to Porter before class.",
    badge: "Due",
  },
  {
    id: "cohort-5",
    source: "Class Session",
    title: "City B Presentations + Vote",
    date: "Jul 18",
    fullDate: new Date("2026-07-18"),
    detail: "Same format as City A: 30-min presentations, 10-min Q&A, 10-min break, anonymous vote through Porter. Porter tallies results and announces the winning City B. Up to 2 cities advance to the City B final vote.",
    badge: "Required",
  },
];

function uniqueByName(items) {
  return Array.from(new Map(items.map((item) => [item.name, item])).values());
}

function getCountryByName(name) {
  return uniqueByName([...ANCHOR_COUNTRIES, ...COMPANION_CITIES]).find((c) => c.name === name);
}

function buildCompanionOptions(anchorName) {
  const names = CITY_B_MAP[anchorName] || CITY_B_MAP["Santiago"];
  return names.map(getCountryByName).filter(Boolean);
}

function getTopCountries(options, votes, count = 2) {
  const voteNames = Object.keys(votes || {});

  if (!voteNames.length) return [];

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

function useLockedDestinations() {
  const [locked, setLocked] = useState({ anchorWinner: null, companionWinner: null });

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("cohort_state")
      .select("anchor_winner,companion_winner")
      .eq("cohort_id", COHORT_ID)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setLocked({ anchorWinner: data.anchor_winner || null, companionWinner: data.companion_winner || null });
      });

    const ch = supabase
      .channel("home-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cohort_state", filter: `cohort_id=eq.${COHORT_ID}` },
        (payload) => {
          if (payload.new)
            setLocked({
              anchorWinner: payload.new.anchor_winner || null,
              companionWinner: payload.new.companion_winner || null,
            });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  return locked;
}

function TripCountdownSection({ tripDate, anchorWinner, companionWinner }) {
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
  const aw = getCountryByName(anchorWinner);
  const cw = getCountryByName(companionWinner);

  return (
    <section className="mx-5 mt-5">
      <div
        className="rounded-[2rem] overflow-hidden border"
        style={{
          borderColor: "rgba(196,150,42,0.24)",
          background:
            "linear-gradient(135deg, rgba(14,10,0,0.92), rgba(8,6,0,0.88)), radial-gradient(circle at 20% 0%, rgba(196,150,42,0.22), transparent 50%)",
        }}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E8B84B] shadow-[0_0_10px_rgba(232,184,75,0.8)] animate-pulse" />
            <div className="text-[9px] uppercase tracking-[0.28em] font-black" style={{ color: "#FFD880" }}>
              Destination locked · T-minus
            </div>
          </div>

          <div className="flex gap-5 items-end">
            {[["days", timeLeft.days], ["hrs", timeLeft.hours], ["min", timeLeft.minutes]].map(([label, val]) => (
              <div key={label}>
                <div className="text-5xl font-black tabular-nums leading-none" style={{ color: COLORS.champagneLight }}>
                  {String(val).padStart(2, "0")}
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/38 font-black mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            {aw && (
              <div
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black"
                style={{ borderColor: "rgba(243,213,138,0.22)", background: "rgba(196,150,42,0.08)", color: COLORS.champagneLight }}
              >
                {countryIcon(aw)} {aw.name}
              </div>
            )}
            {aw && cw && <span className="text-white/30 text-xs">+</span>}
            {cw && (
              <div
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black"
                style={{ borderColor: "rgba(243,213,138,0.22)", background: "rgba(196,150,42,0.08)", color: COLORS.champagneLight }}
              >
                {countryIcon(cw)} {cw.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const DEPARTURE_DATE = new Date("2027-05-23T00:00:00");

function timeUntilDeparture() {
  const now = new Date();
  let years = DEPARTURE_DATE.getFullYear() - now.getFullYear();
  let months = DEPARTURE_DATE.getMonth() - now.getMonth();
  let days = DEPARTURE_DATE.getDate() - now.getDate();
  if (days < 0) { months -= 1; days += new Date(DEPARTURE_DATE.getFullYear(), DEPARTURE_DATE.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  return { months: Math.max(0, months), days: Math.max(0, days) };
}

function HomePage({ onAsk }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || "";
  const { anchorWinner, companionWinner } = useLockedDestinations();
  const routeLocked = Boolean(anchorWinner && companionWinner);
  const [timeLeft, setTimeLeft] = useState(timeUntilDeparture);

  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const t = setTimeout(() => setTimeLeft(timeUntilDeparture()), midnight - new Date());
    return () => clearTimeout(t);
  }, [timeLeft]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextEvent = COHORT_EVENTS.find((e) => e.fullDate >= today);
  const daysToNext = nextEvent ? Math.ceil((nextEvent.fullDate - today) / 86400000) : null;
  const voteLabel = routeLocked ? "Route locked" : "Voting open";

  return (
    <main className="py-5">
      {routeLocked && TRIP_DATE && (
        <TripCountdownSection tripDate={TRIP_DATE} anchorWinner={anchorWinner} companionWinner={companionWinner} />
      )}

      {/* Greeting + countdown */}
      <div className="px-5 mb-1 flex items-end justify-between">
        <div>
          <div className="text-2xl font-black leading-tight" style={{ fontFamily: "Georgia, serif" }}>
            {displayName ? `Hey, ${displayName}.` : "Global 85"}
          </div>
          <div className="text-xs uppercase tracking-[0.20em] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Your trip is coming
          </div>
        </div>
        <div className="flex items-end gap-4">
          {[
            { value: timeLeft.months, label: timeLeft.months === 1 ? "month" : "months" },
            { value: timeLeft.days,   label: timeLeft.days   === 1 ? "day"   : "days"   },
          ].map(({ value, label }) => (
            <div key={label} className="text-right">
              <div style={{
                fontFamily: "Georgia, serif", fontSize: "40px", fontWeight: 700,
                lineHeight: 1, letterSpacing: "-1px",
                background: `linear-gradient(135deg, ${COLORS.goldLight} 0%, ${COLORS.champagne} 45%, ${COLORS.gold} 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{value}</div>
              <div style={{
                fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.40)", fontWeight: 600, marginTop: "2px",
              }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5">
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
              Porter, destination votes, trip planning, and everything the cohort needs on the road.
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
                <div className="text-base">Get a recommendation</div>
              </button>

              <button
                onClick={() => navigate("/votes")}
                className="rounded-2xl px-4 py-4 font-black text-left shadow-xl border border-white/10 bg-black/25"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Destination Vote</div>
                <div className="text-base">Open chamber</div>
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <FeatureTile icon="🗳️" label="Destination Vote" value={voteLabel} />
          <FeatureTile
            icon="📅"
            label="Next Key Date"
            value={daysToNext !== null ? (daysToNext === 0 ? "Today" : `${daysToNext}d`) : "—"}
          />
        </section>

        <section className="mt-6 grid gap-3">
          <SectionTitle eyebrow="Upcoming" title="Key dates" />
          {COHORT_EVENTS.map((event) => (
            <SmallEventCard key={event.id} event={event} today={today} />
          ))}
        </section>
      </div>
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

function SmallEventCard({ event, today }) {
  const base = today || (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const daysAway = event.fullDate ? Math.ceil((event.fullDate - base) / 86400000) : null;

  return (
    <div className="rounded-3xl p-4 border border-white/10 bg-white/[0.06] backdrop-blur">
      <div className="flex items-start gap-4">
        <div
          className="rounded-2xl px-3 py-2 font-black text-sm min-w-[60px] text-center leading-tight"
          style={{ background: "rgba(243,213,138,0.12)", color: COLORS.champagneLight }}
        >
          {event.date}
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/35 font-bold">{event.source}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <h3 className="font-black text-white">{event.title}</h3>
            <span
              className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border shrink-0"
              style={{ background: "rgba(198,90,46,0.14)", color: COLORS.champagneLight, borderColor: "rgba(243,213,138,0.18)" }}
            >
              {event.badge}
            </span>
          </div>
          <p className="text-sm text-white/55 mt-1 leading-5">{event.detail}</p>
          {daysAway !== null && (
            <p className="text-xs mt-2 font-black" style={{ color: daysAway === 0 ? COLORS.champagneLight : "rgba(255,255,255,0.32)" }}>
              {daysAway === 0 ? "Today" : daysAway > 0 ? `In ${daysAway} day${daysAway !== 1 ? "s" : ""}` : "Past"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PorterCSS() {
  return (
    <style>{`
      @keyframes porterRingIdle {
        0%   { transform: scale(0.74); opacity: 0.70; }
        100% { transform: scale(2.60); opacity: 0; }
      }
      @keyframes porterRingActive {
        0%   { transform: scale(0.68); opacity: 0.88; }
        100% { transform: scale(1.85); opacity: 0; }
      }
      @keyframes porterBellIdle {
        0%, 100% {
          box-shadow: 0 0 22px rgba(196,150,42,0.18), 0 0 0 1px rgba(196,150,42,0.16);
        }
        50% {
          box-shadow: 0 0 44px rgba(232,184,75,0.36), 0 0 80px rgba(196,150,42,0.14), 0 0 0 1px rgba(243,213,138,0.28);
        }
      }
      @keyframes porterBellActive {
        0%, 100% {
          box-shadow: 0 0 28px rgba(198,90,46,0.30), 0 0 0 1px rgba(198,90,46,0.28);
        }
        50% {
          box-shadow: 0 0 58px rgba(232,120,60,0.52), 0 0 110px rgba(196,90,46,0.22), 0 0 0 1px rgba(230,110,50,0.44);
        }
      }
      @keyframes porterMsgIn {
        0%   { opacity: 0; transform: translateY(10px) scale(0.98); }
        100% { opacity: 1; transform: translateY(0)   scale(1); }
      }
      @keyframes porterDot {
        0%, 60%, 100% { transform: translateY(0);    opacity: 0.25; }
        30%            { transform: translateY(-6px); opacity: 1; }
      }
      @keyframes porterCursor {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
      @keyframes porterStatusPulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.28; }
      }
      @keyframes porterGridDrift {
        0%   { background-position: 0 0; }
        100% { background-position: 40px 40px; }
      }
      .porter-msg        { animation: porterMsgIn 380ms cubic-bezier(.18,.9,.22,1) both; }
      .porter-dot-1      { animation: porterDot 1.15s ease-in-out infinite 0s; }
      .porter-dot-2      { animation: porterDot 1.15s ease-in-out infinite 0.19s; }
      .porter-dot-3      { animation: porterDot 1.15s ease-in-out infinite 0.38s; }
      .porter-cursor     { animation: porterCursor 0.85s step-end infinite; }
      .porter-status-active { animation: porterStatusPulse 1.4s ease-in-out infinite; }
      .porter-grid       {
        animation: porterGridDrift 8s linear infinite;
        background-image:
          linear-gradient(rgba(196,150,42,0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(196,150,42,0.055) 1px, transparent 1px);
        background-size: 40px 40px;
      }
    `}</style>
  );
}

function PorterBellRings({ streaming }) {
  const rings = [0, 1, 2];
  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
      {rings.map((i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 76, height: 76,
            border: `1px solid ${streaming ? "rgba(198,90,46,0.75)" : "rgba(196,150,42,0.68)"}`,
            animation: streaming
              ? `porterRingActive 1.05s ease-out infinite ${i * 0.35}s`
              : `porterRingIdle  3.60s ease-out infinite ${i * 1.18}s`,
          }}
        />
      ))}
      <div
        className="relative z-10 flex items-center justify-center rounded-[22px]"
        style={{
          width: 76, height: 76,
          fontSize: "2.1rem",
          background: streaming
            ? `linear-gradient(145deg, ${COLORS.ember}cc, ${COLORS.roseSmoke}aa)`
            : `linear-gradient(145deg, rgba(196,150,42,0.16), rgba(243,213,138,0.07))`,
          border: `1px solid ${streaming ? "rgba(198,90,46,0.48)" : "rgba(196,150,42,0.32)"}`,
          animation: streaming ? "porterBellActive 1.6s ease-in-out infinite" : "porterBellIdle 3.4s ease-in-out infinite",
        }}
      >
        🛎️
      </div>
    </div>
  );
}

function PorterPage() {
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "I’m Porter — Global 85’s private concierge. Before I start throwing city picks at you, tell me: what do you actually want out of this trip? What’s your track, what industries excite you, and what would make this feel like a once-in-a-career experience for you specifically? The more you share, the sharper I can make the picks.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [briefs, setBriefs] = useState([]);

  useEffect(() => {
    fetchCountryBriefs().then(setBriefs).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function sendMessage(text = input) {
    const clean = (typeof text === "string" ? text : input).trim();
    if (!clean || streaming) return;

    const next = [...messages, { role: "user", text: clean }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/porter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, text: m.text })),
          briefs,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Porter unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) { accumulated += parsed.text; setStreamingText(accumulated); }
            if (parsed.error) throw new Error(parsed.error);
          } catch {}
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", text: accumulated || "No response — try again." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Porter hit a snag. Check that ANTHROPIC_API_KEY is set in Vercel env vars, then try again." }]);
    } finally {
      setStreaming(false);
      setStreamingText("");
      inputRef.current?.focus();
    }
  }

  const allDisplayMessages = streaming
    ? [...messages, { role: "assistant", text: streamingText, streaming: true }]
    : messages;

  const statusLabel = streaming
    ? "Processing intel"
    : briefs.length > 0
    ? `${briefs.length} brief${briefs.length !== 1 ? "s" : ""} loaded`
    : "Standing by";

  return (
    <main className="pb-6">
      <PorterCSS />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden pt-7 pb-8 px-5">
        {/* Ambient radials */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(196,150,42,0.13), transparent)",
              "radial-gradient(circle at 18% 85%, rgba(198,90,46,0.09), transparent 42%)",
              "radial-gradient(circle at 88% 20%, rgba(243,213,138,0.06), transparent 36%)",
            ].join(", "),
          }}
        />
        {/* Drifting grid */}
        <div className="porter-grid pointer-events-none absolute inset-0 opacity-100" />

        {/* Horizontal accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(196,150,42,0.48) 35%, rgba(243,213,138,0.72) 50%, rgba(196,150,42,0.48) 65%, transparent 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <PorterBellRings streaming={streaming} />

          {/* Wordmark */}
          <div className="mt-4">
            <p
              className="text-[9px] uppercase font-black tracking-[0.52em] mb-2"
              style={{ color: "rgba(243,213,138,0.44)" }}
            >
              Global 85
            </p>
            <h1
              style={{
                fontFamily: "Georgia, ‘Times New Roman’, serif",
                fontSize: "clamp(3.4rem, 13vw, 5.8rem)",
                fontWeight: 900,
                letterSpacing: "0.20em",
                lineHeight: 1,
                background: `linear-gradient(155deg, ${COLORS.champagneLight} 0%, ${COLORS.champagne} 35%, ${COLORS.gold} 68%, ${COLORS.ember} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              PORTER
            </h1>
          </div>

          {/* Divider */}
          <div
            className="mt-4 h-px"
            style={{
              width: "min(280px,74vw)",
              background: "linear-gradient(90deg, transparent, rgba(196,150,42,0.52), rgba(243,213,138,0.76), rgba(196,150,42,0.52), transparent)",
            }}
          />

          {/* Tagline */}
          <p
            className="mt-3 text-[10px] uppercase tracking-[0.30em] font-bold"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            Private Cohort Concierge
          </p>

          {/* Status indicator */}
          <div className="mt-3 flex items-center gap-2.5">
            <span
              className={`rounded-full ${streaming ? "porter-status-active" : ""}`}
              style={{
                display: "inline-block",
                width: 6, height: 6,
                background: streaming ? COLORS.ember : COLORS.goldLight,
                boxShadow: streaming
                  ? `0 0 10px ${COLORS.ember}, 0 0 20px rgba(198,90,46,0.44)`
                  : `0 0 8px ${COLORS.goldLight}`,
              }}
            />
            <span
              className="text-[9px] uppercase tracking-[0.28em] font-black"
              style={{ color: streaming ? "rgba(232,120,60,0.72)" : "rgba(243,213,138,0.52)" }}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── TAB STRIP ────────────────────────────────────────── */}
      <div className="px-5 mb-5">
        <div
          className="flex rounded-2xl p-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {[["chat", "Briefing Room"], ["brief", "Dossier"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all"
              style={{
                background: tab === key
                  ? `linear-gradient(135deg, ${COLORS.champagne}, ${COLORS.ember})`
                  : "transparent",
                color: tab === key ? "#16060a" : "rgba(255,255,255,0.34)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CHAT TAB ─────────────────────────────────────────── */}
      {tab === "chat" && (
        <div className="px-5 flex flex-col gap-4">
          {/* Mission prompt tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={streaming}
                className="group relative overflow-hidden text-left rounded-2xl p-4 border transition-all disabled:opacity-30"
                style={{
                  background: "rgba(255,255,255,0.028)",
                  borderColor: "rgba(255,255,255,0.07)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(196,150,42,0.38)";
                  e.currentTarget.style.background = "rgba(196,150,42,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.028)";
                }}
              >
                <div
                  className="text-[8px] uppercase tracking-[0.30em] font-black mb-2"
                  style={{ color: "rgba(243,213,138,0.34)" }}
                >
                  Query {String(i + 1).padStart(2, "0")}
                </div>
                <p className="text-sm text-white/60 leading-5 pr-5">
                  {prompt}
                </p>
                <span
                  className="absolute bottom-3.5 right-4 text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: COLORS.champagne }}
                >
                  →
                </span>
              </button>
            ))}
          </div>

          {/* Conversation panel */}
          <div
            className="relative rounded-[1.8rem] overflow-hidden flex flex-col"
            style={{
              background: "rgba(4,3,1,0.68)",
              border: "1px solid rgba(196,150,42,0.14)",
              minHeight: 340,
            }}
          >
            {/* Top accent line */}
            <div
              className="h-px shrink-0"
              style={{
                background: streaming
                  ? `linear-gradient(90deg, transparent, rgba(198,90,46,0.52), rgba(230,110,50,0.72), rgba(198,90,46,0.52), transparent)`
                  : `linear-gradient(90deg, transparent, rgba(196,150,42,0.36), rgba(243,213,138,0.52), rgba(196,150,42,0.36), transparent)`,
                transition: "background 0.6s ease",
              }}
            />

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-5 max-h-[500px] chamber-scrollbar">
              {allDisplayMessages.map((msg, i) => (
                <div key={i} className="porter-msg">
                  {msg.role === "assistant" ? (
                    <div>
                      {/* Porter briefing panel */}
                      <div
                        className="relative py-3.5 px-4 pl-[18px] rounded-r-2xl rounded-bl-2xl max-w-[94%]"
                        style={{
                          background: "rgba(255,255,255,0.038)",
                          borderLeft: `2.5px solid ${msg.streaming && !msg.text ? COLORS.ember : COLORS.gold}`,
                        }}
                      >
                        {msg.streaming && !msg.text ? (
                          <div className="flex items-center gap-2.5 py-0.5">
                            {[1, 2, 3].map((j) => (
                              <span
                                key={j}
                                className={`porter-dot-${j} inline-block rounded-full`}
                                style={{
                                  width: 7, height: 7,
                                  background: COLORS.goldLight,
                                  boxShadow: `0 0 7px ${COLORS.gold}`,
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm leading-[1.75] text-white/80 whitespace-pre-wrap">
                            {msg.text}
                            {msg.streaming && (
                              <span
                                className="porter-cursor inline-block ml-0.5 align-middle"
                                style={{
                                  width: 2, height: "1em",
                                  background: COLORS.goldLight,
                                  borderRadius: 1,
                                  verticalAlign: "middle",
                                }}
                              />
                            )}
                          </p>
                        )}
                      </div>
                      <div
                        className="text-[8px] uppercase tracking-[0.22em] font-black mt-1.5 ml-[20px]"
                        style={{ color: "rgba(196,150,42,0.38)" }}
                      >
                        Porter
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div
                        className="rounded-l-2xl rounded-br-2xl px-4 py-3 max-w-[88%] text-sm leading-[1.7] font-semibold"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne} 60%, ${COLORS.ember}88)`,
                          color: "#17060b",
                        }}
                      >
                        {msg.text}
                      </div>
                      <div
                        className="text-[8px] uppercase tracking-[0.22em] font-black mt-1.5 mr-1"
                        style={{ color: "rgba(255,255,255,0.20)" }}
                      >
                        You
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="p-3 shrink-0"
              style={{ borderTop: "1px solid rgba(196,150,42,0.10)" }}
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder={streaming ? "Porter is processing…" : "Enter query…"}
                  disabled={streaming}
                  className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none disabled:opacity-40 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${input.trim() ? "rgba(196,150,42,0.38)" : "rgba(196,150,42,0.18)"}`,
                    color: "rgba(255,255,255,0.88)",
                    caretColor: COLORS.champagne,
                    maxHeight: 120,
                    lineHeight: 1.6,
                    fontFamily: "inherit",
                    transition: "border-color 0.2s",
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={streaming || !input.trim()}
                  className="shrink-0 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:opacity-30"
                  style={{
                    background: input.trim() && !streaming
                      ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`
                      : "rgba(255,255,255,0.05)",
                    color: input.trim() && !streaming ? "#16060a" : "rgba(255,255,255,0.28)",
                    border: "1px solid rgba(196,150,42,0.18)",
                  }}
                >
                  {streaming ? "···" : "Send"}
                </button>
              </div>
              <p
                className="text-[8px] uppercase tracking-[0.18em] mt-1.5 ml-1"
                style={{ color: "rgba(255,255,255,0.16)" }}
              >
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>

          {/* Brief memory indicator */}
          {briefs.length > 0 && (
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{
                background: "rgba(196,150,42,0.06)",
                border: "1px solid rgba(196,150,42,0.16)",
              }}
            >
              <span style={{ color: COLORS.gold, fontSize: "0.7rem" }}>◆</span>
              <p className="text-[10px] uppercase tracking-[0.18em] font-black" style={{ color: "rgba(243,213,138,0.54)" }}>
                Porter has {briefs.length} brief{briefs.length !== 1 ? "s" : ""} in memory —
              </p>
              <div className="flex flex-wrap gap-1.5">
                {briefs.map((b) => (
                  <span
                    key={b.id}
                    className="rounded-full px-2.5 py-0.5 text-[9px] font-bold border"
                    style={{
                      background: "rgba(196,150,42,0.08)",
                      borderColor: "rgba(196,150,42,0.22)",
                      color: "#FFD880",
                    }}
                  >
                    {b.country_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOSSIER TAB ──────────────────────────────────────── */}
      {tab === "brief" && (
        <CountryBriefTab
          briefs={briefs}
          onBriefSubmitted={(updated) => setBriefs(updated)}
        />
      )}
    </main>
  );
}

function DossierField({ label, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <span
          className="text-[8px] uppercase tracking-[0.32em] font-black shrink-0"
          style={{ color: "rgba(196,150,42,0.50)" }}
        >
          {label}
        </span>
        <div className="flex-1 h-px" style={{ background: "rgba(196,150,42,0.14)" }} />
      </div>
      {children}
    </div>
  );
}

function CountryBriefTab({ briefs, onBriefSubmitted }) {
  const [countryName, setCountryName] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedFileName, setParsedFileName] = useState("");
  const fileInputRef = useRef(null);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) {
      setSubmitError("Only .docx files are supported.");
      return;
    }
    setParsing(true);
    setSubmitError("");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extracted = result.value.trim();
      if (!extracted) throw new Error("No text found in the document.");
      setContent(extracted);
      setParsedFileName(file.name);
    } catch (err) {
      setSubmitError(err.message || "Could not read the file.");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  }

  async function handleSubmit() {
    if (!countryName.trim() || !content.trim()) {
      setSubmitError("Country name and brief content are required.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      await submitCountryBrief({ countryName, teamMembers, content });
      const updated = await fetchCountryBriefs();
      onBriefSubmitted(updated);
      setSubmitSuccess(true);
      setCountryName("");
      setTeamMembers("");
      setContent("");
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function fieldStyle(name) {
    return {
      background: "rgba(255,255,255,0.042)",
      border: `1px solid ${focusedField === name ? "rgba(196,150,42,0.52)" : "rgba(196,150,42,0.16)"}`,
      boxShadow: focusedField === name ? "0 0 18px rgba(196,150,42,0.10)" : "none",
      color: "rgba(255,255,255,0.88)",
      caretColor: COLORS.champagne,
      transition: "border-color 0.2s, box-shadow 0.2s",
      outline: "none",
      fontFamily: "inherit",
    };
  }

  const canSubmit = countryName.trim() && content.trim() && !submitting;

  return (
    <div className="px-5 flex flex-col gap-4">
      {/* Dossier form */}
      <div
        className="relative rounded-[1.8rem] overflow-hidden"
        style={{ background: "rgba(4,3,1,0.68)", border: "1px solid rgba(196,150,42,0.16)" }}
      >
        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(196,150,42,0.52), rgba(243,213,138,0.72), rgba(196,150,42,0.52), transparent)" }}
        />

        <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[8px] uppercase tracking-[0.38em] font-black mb-1"
              style={{ color: "rgba(196,150,42,0.44)" }}
            >
              Global 85 · Intelligence Brief
            </p>
            <h2
              className="text-xl font-black"
              style={{ fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.88)" }}
            >
              Submit Dossier
            </h2>
            <p className="text-[11px] text-white/38 mt-1 leading-4">
              Briefs due July 8 · Porter loads them automatically
            </p>
          </div>
          <div
            className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center mt-0.5"
            style={{ border: "2px solid rgba(196,150,42,0.28)", background: "rgba(196,150,42,0.06)" }}
          >
            <span style={{ fontSize: "1.3rem" }}>🛎️</span>
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-4">
          <DossierField label="Destination">
            <input
              value={countryName}
              onChange={(e) => setCountryName(e.target.value)}
              onFocus={() => setFocusedField("country")}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. Singapore"
              className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-white/28"
              style={fieldStyle("country")}
            />
          </DossierField>

          <DossierField label="Team">
            <input
              value={teamMembers}
              onChange={(e) => setTeamMembers(e.target.value)}
              onFocus={() => setFocusedField("team")}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. Sarah, Marcus, Priya, Devon"
              className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-white/28"
              style={fieldStyle("team")}
            />
          </DossierField>

          <DossierField label="Intelligence Brief">
            {/* File upload strip */}
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:opacity-40"
                style={{
                  background: "rgba(196,150,42,0.09)",
                  border: "1px solid rgba(196,150,42,0.28)",
                  color: COLORS.champagne,
                }}
              >
                {parsing ? "Reading…" : "Upload .docx"}
              </button>
              {parsedFileName && !parsing && (
                <span className="text-[10px] text-white/38 truncate">{parsedFileName}</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocusedField("content")}
              onBlur={() => setFocusedField(null)}
              placeholder="Paste your brief here, or upload a .docx above."
              rows={8}
              className="w-full rounded-xl px-4 py-3 text-sm leading-[1.7] resize-none placeholder:text-white/28"
              style={fieldStyle("content")}
            />
            <p
              className="text-[8px] uppercase tracking-[0.18em] mt-1.5 ml-0.5"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              No limit — feeds directly into Porter’s context
            </p>
          </DossierField>

          {submitError && (
            <p className="text-[11px] font-black" style={{ color: "#fca5a5" }}>{submitError}</p>
          )}

          {submitSuccess && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: "rgba(196,150,42,0.08)", border: "1px solid rgba(196,150,42,0.28)" }}
            >
              <span style={{ color: COLORS.gold }}>◆</span>
              <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: COLORS.champagneLight }}>
                Dossier transmitted. Porter has it.
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.20em] transition-all disabled:opacity-35"
            style={{
              background: canSubmit
                ? `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne} 55%, ${COLORS.ember})`
                : "rgba(255,255,255,0.06)",
              color: canSubmit ? "#16060a" : "rgba(255,255,255,0.25)",
              border: "1px solid rgba(196,150,42,0.20)",
            }}
          >
            {submitting ? "Transmitting…" : "Transmit to Porter →"}
          </button>
        </div>
      </div>

      {/* Existing briefs */}
      {briefs.length > 0 && (
        <div>
          <p
            className="text-[8px] uppercase tracking-[0.32em] font-black mb-3 ml-1"
            style={{ color: "rgba(196,150,42,0.44)" }}
          >
            Porter’s Memory — {briefs.length} Brief{briefs.length !== 1 ? "s" : ""} Loaded
          </p>
          <div className="flex flex-col gap-2">
            {briefs.map((b, i) => (
              <div
                key={b.id}
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.024)",
                  border: "1px solid rgba(196,150,42,0.12)",
                  borderLeft: "3px solid rgba(196,150,42,0.44)",
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[8px] font-black uppercase tracking-[0.20em]"
                      style={{ color: "rgba(196,150,42,0.44)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-black text-white/90">{b.country_name}</span>
                  </div>
                  <span className="text-[9px] text-white/28 shrink-0">
                    {new Date(b.submitted_at).toLocaleDateString()}
                  </span>
                </div>
                {b.team_members && (
                  <p className="text-[10px] uppercase tracking-[0.16em] font-black mb-2" style={{ color: "rgba(255,255,255,0.30)" }}>
                    {b.team_members}
                  </p>
                )}
                <p className="text-[12px] text-white/48 leading-[1.6] line-clamp-3">{b.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {briefs.length === 0 && (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[11px] text-white/28 uppercase tracking-[0.18em]">No briefs on file — teams have until July 8</p>
        </div>
      )}
    </div>
  );
}

// Detect ties in vote results. Returns array of city names that are tied for the given rank position.
function getTiedCitiesForPosition(voteMap, position) {
  const entries = Object.entries(voteMap).sort((a, b) => b[1] - a[1]);
  if (entries.length <= position) return [];
  const targetScore = entries[position]?.[1];
  if (targetScore === undefined) return [];
  return entries.filter(([, score]) => score === targetScore).map(([name]) => name);
}

function hasTieAtPosition(voteMap, position) {
  return getTiedCitiesForPosition(voteMap, position).length > 1;
}

function VotesPage() {
// Mission index 0-5:
// 0 = anchor-longlist, 1 = anchor-runoff (optional), 2 = anchor-final
// 3 = companion-longlist, 4 = companion-runoff (optional), 5 = companion-final
const [missionIndex, setMissionIndex] = useState(0);
const [allVoteCounts, setAllVoteCounts] = useState({});
const [myVotes, setMyVotes] = useState({});
const [anchorWinner, setAnchorWinner] = useState(null);
const [companionWinner, setCompanionWinner] = useState(null);
const [showCelebration, setShowCelebration] = useState(false);
const userId = useMemo(() => getOrCreateUserId(), []);

const anchorVotes = allVoteCounts["anchor-longlist"] || {};
const anchorRunoffVotes = allVoteCounts["anchor-runoff"] || {};
const companionVotes = allVoteCounts["companion-longlist"] || {};
const companionRunoffVotes = allVoteCounts["companion-runoff"] || {};

function parseVotes(rows) {
const counts = {};
const mine = {};
rows.forEach((v) => {
if (!counts[v.vote_phase]) counts[v.vote_phase] = {};
counts[v.vote_phase][v.country_name] = (counts[v.vote_phase][v.country_name] || 0) + 1;
if (v.user_id === userId) mine[v.vote_phase] = v.country_name;
});
return { counts, mine };
}

useEffect(() => {
if (!supabase) return;

async function load() {
  const [{ data: votes }, { data: state }] = await Promise.all([
    supabase.from("cohort_votes").select("vote_phase,country_name,user_id").eq("cohort_id", COHORT_ID),
    supabase.from("cohort_state").select("*").eq("cohort_id", COHORT_ID).maybeSingle(),
  ]);

  if (votes) {
    const { counts, mine } = parseVotes(votes);
    setAllVoteCounts(counts);
    setMyVotes(mine);
  }

  if (state) {
          if (state) {
        setMissionIndex(state.mission_index ?? 0);

        if (state.anchor_winner) {
          const aw = getCountryByName(state.anchor_winner);
          if (aw) setAnchorWinner(aw);
        }

        if (state.companion_winner) {
          const cw = getCountryByName(state.companion_winner);
          if (cw) setCompanionWinner(cw);
        }
      }
    }

    load();

    const channel = supabase
            .channel("cohort-" + COHORT_ID)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cohort_votes",
          filter: "cohort_id=eq." + COHORT_ID,
        },
        async () => {
          const { data: votes } = await supabase
            .from("cohort_votes")
            .select("vote_phase,country_name,user_id")
            .eq("cohort_id", COHORT_ID);

          if (votes) {
            const { counts, mine } = parseVotes(votes);
            setAllVoteCounts(counts);
            setMyVotes(mine);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cohort_state",
          filter: "cohort_id=eq." + COHORT_ID,
        },
        (payload) => {
          const s = payload.new;
          if (!s) return;

          setMissionIndex(s.mission_index ?? 0);

          if (s.anchor_winner) {
            const aw = getCountryByName(s.anchor_winner);
            if (aw) setAnchorWinner(aw);
          }

          if (s.companion_winner) {
            const cw = getCountryByName(s.companion_winner);
            if (cw) {
              setCompanionWinner(cw);
              setShowCelebration(true);
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);
          setMissionIndex(s.mission_index ?? 0);

          if (s.anchor_winner) {
            const aw = getCountryByName(s.anchor_winner);
            if (aw) setAnchorWinner(aw);
          }

          if (s.companion_winner) {
            const cw = getCountryByName(s.companion_winner);
            if (cw) {
              setCompanionWinner(cw);
              setShowCelebration(true);
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
        if (aw) setAnchorWinner(aw);
      }

      if (s.companion_winner) {
        const cw = getCountryByName(s.companion_winner);
        if (cw) {
          setCompanionWinner(cw);
          setShowCelebration(true);
        }
      }
    }
  )
  .subscribe();

return () => supabase.removeChannel(channel);

}, [userId]);

async function pushStateToSupabase(patch) {
if (!supabase) return;

await supabase
  .from("cohort_state")
  .upsert(
    {
      cohort_id: COHORT_ID,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cohort_id" }
  );

}

function startRunoff(longlistVotes, runoffPhase, nextMissionIndex) {
// Clear runoff votes and advance to runoff mission
setAllVoteCounts((prev) => {
const next = { ...prev };
delete next[runoffPhase];
return next;
});

setMyVotes((prev) => {
  const next = { ...prev };
  delete next[runoffPhase];
  return next;
});

if (supabase) {
  supabase
    .from("cohort_votes")
    .delete()
    .eq("cohort_id", COHORT_ID)
    .eq("vote_phase", runoffPhase)
    .then(() => {});
}

setMissionIndex(nextMissionIndex);
pushStateToSupabase({ mission_index: nextMissionIndex });

}

function handleMissionJump(index) {
if (index <= missionIndex) setMissionIndex(index);
}

function resetProtocol() {
setMissionIndex(0);
setAllVoteCounts({});
setMyVotes({});
setAnchorWinner(null);
setCompanionWinner(null);
setShowCelebration(false);

if (supabase) {
  supabase.from("cohort_votes").delete().eq("cohort_id", COHORT_ID).then(() => {});
  pushStateToSupabase({ mission_index: 0, anchor_winner: null, companion_winner: null });
}

}

// Compute anchor finalists — accounts for runoff results
const anchorFinalists = useMemo(() => {
if (missionIndex >= 2 && Object.keys(anchorRunoffVotes).length > 0) {
const sortedLonglist = Object.entries(anchorVotes).sort((a, b) => b[1] - a[1]);
const firstScore = sortedLonglist[0]?.[1];
const secondScore = sortedLonglist[1]?.[1];
const runoffWinner = Object.entries(anchorRunoffVotes).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (firstScore === secondScore) {
    // Tie for 1st: runoff winner + the highest-scoring city not in the runoff
    const runoffNames = sortedLonglist.filter(([, s]) => s === firstScore).map(([n]) => n);
    const autoAdvance = sortedLonglist.find(([name]) => !runoffNames.includes(name))?.[0];
    return uniqueByName([runoffWinner, autoAdvance].filter(Boolean).map(getCountryByName).filter(Boolean));
  }

  // Tie for 2nd: unchallenged longlist leader + runoff winner
  return uniqueByName([sortedLonglist[0]?.[0], runoffWinner].filter(Boolean).map(getCountryByName).filter(Boolean));
}

return getTopCountries(ANCHOR_COUNTRIES, anchorVotes, 2);

}, [anchorVotes, anchorRunoffVotes, missionIndex]);

// Compute anchor runoff candidates: cities tied for 1st or 2nd in longlist
const anchorRunoffCandidates = useMemo(() => {
const entries = Object.entries(anchorVotes).sort((a, b) => b[1] - a[1]);
if (entries.length < 2) return entries.map(([name]) => getCountryByName(name)).filter(Boolean);

const secondScore = entries[1]?.[1];
const firstScore = entries[0]?.[1];

// If tie for 1st, include all tied for 1st; otherwise include all tied for 2nd
const tiedScore = firstScore === secondScore ? firstScore : secondScore;
const relevantNames = entries.filter(([, score]) => score === tiedScore).map(([name]) => name);

return relevantNames.map(getCountryByName).filter(Boolean);
```

}, [anchorVotes]);

const companionOptions = useMemo(
() => buildCompanionOptions(anchorWinner?.name || anchorFinalists[0]?.name || "Santiago"),
[anchorFinalists, anchorWinner]
);

// Compute companion finalists — accounts for runoff results
const companionFinalists = useMemo(() => {
if (missionIndex >= 5 && Object.keys(companionRunoffVotes).length > 0) {
const sortedLonglist = Object.entries(companionVotes).sort((a, b) => b[1] - a[1]);
const firstScore = sortedLonglist[0]?.[1];
const secondScore = sortedLonglist[1]?.[1];
const runoffWinner = Object.entries(companionRunoffVotes).sort((a, b) => b[1] - a[1])[0]?.[0];

```
  if (firstScore === secondScore) {
    const runoffNames = sortedLonglist.filter(([, s]) => s === firstScore).map(([n]) => n);
    const autoAdvance = sortedLonglist.find(([name]) => !runoffNames.includes(name))?.[0];
    return uniqueByName([runoffWinner, autoAdvance].filter(Boolean).map(getCountryByName).filter(Boolean));
  }

  return uniqueByName([sortedLonglist[0]?.[0], runoffWinner].filter(Boolean).map(getCountryByName).filter(Boolean));
}

return getTopCountries(companionOptions, companionVotes, 2);
```

}, [companionOptions, companionVotes, companionRunoffVotes, missionIndex]);

// Compute companion runoff candidates
const companionRunoffCandidates = useMemo(() => {
const entries = Object.entries(companionVotes).sort((a, b) => b[1] - a[1]);
if (entries.length < 2) return entries.map(([name]) => getCountryByName(name)).filter(Boolean);

const secondScore = entries[1]?.[1];
const firstScore = entries[0]?.[1];
const tiedScore = firstScore === secondScore ? firstScore : secondScore;
const relevantNames = entries.filter(([, score]) => score === tiedScore).map(([name]) => name);

return relevantNames.map(getCountryByName).filter(Boolean);

}, [companionVotes]);

const missions = useMemo(
() => [
{
id: "anchor-longlist",
eyebrow: "Vote 01",
title: "Vote for City A",
shortTitle: "City A",
mode: "anchor-longlist",
status: missionIndex === 0 ? "active" : "complete",
instruction:
"Pick the city that should anchor the Global 85 trip. The two most-voted advance. If there's a close call, a runoff vote runs on the spot.",
options: ANCHOR_COUNTRIES,
votes: anchorVotes,
selectedName: myVotes["anchor-longlist"],
voteLabel: "Cast Vote",
nextLabel:
hasTieAtPosition(anchorVotes, 0) || hasTieAtPosition(anchorVotes, 1)
? "Tied — Start Runoff"
: "Advance Top Two",
canAdvance: Object.keys(anchorVotes).length > 0,
finalistNames: anchorFinalists.map((c) => c.name),
},
{
id: "anchor-runoff",
eyebrow: "Runoff A",
title: "City A Tiebreaker",
shortTitle: "Runoff A",
mode: "anchor-runoff",
status: missionIndex < 1 ? "locked" : missionIndex === 1 ? "active" : "complete",
instruction:
"Tied cities from Vote 01 — one more vote to break the tie. Winner joins the top city to form the final two.",
options: anchorRunoffCandidates.length ? anchorRunoffCandidates : ANCHOR_COUNTRIES.slice(0, 2),
votes: anchorRunoffVotes,
selectedName: myVotes["anchor-runoff"],
voteLabel: "Break the Tie",
nextLabel: "Confirm Finalists",
canAdvance: Object.keys(anchorRunoffVotes).length > 0,
finalistNames: [],
},
{
id: "anchor-final",
eyebrow: "Vote 02",
title: "Lock in City A",
shortTitle: "City A Final",
mode: "anchor-final",
status: missionIndex < 2 ? "locked" : missionIndex === 2 ? "active" : "complete",
instruction: "Top two from Vote 01 head-to-head. The winner becomes City A and unlocks the City B list.",
options: anchorFinalists.length ? anchorFinalists : ANCHOR_COUNTRIES.slice(0, 2),
votes: allVoteCounts["anchor-final"] || {},
selectedName: myVotes["anchor-final"] || anchorWinner?.name,
voteLabel: "Lock City A",
nextLabel: "Generate City B List",
canAdvance: Object.keys(allVoteCounts["anchor-final"] || {}).length > 0 || Boolean(anchorWinner),
finalistNames: anchorFinalists.map((c) => c.name),
},
{
id: "companion-longlist",
eyebrow: "Vote 03",
title: "Vote for City B",
shortTitle: "City B",
mode: "companion-longlist",
status: missionIndex < 3 ? "locked" : missionIndex === 3 ? "active" : "complete",
instruction: anchorWinner
? `Porter built the City B list around ${anchorWinner.name} — matched on flight logic, cost balance, cultural contrast, and trip pacing.`
: "City B list will be generated once City A is locked.",
options: companionOptions,
votes: companionVotes,
selectedName: myVotes["companion-longlist"],
voteLabel: "Cast Vote",
nextLabel:
hasTieAtPosition(companionVotes, 0) || hasTieAtPosition(companionVotes, 1)
? "Tied — Start Runoff"
: "Advance Top Two",
canAdvance: Object.keys(companionVotes).length > 0,
finalistNames: companionFinalists.map((c) => c.name),
},
{
id: "companion-runoff",
eyebrow: "Runoff B",
title: "City B Tiebreaker",
shortTitle: "Runoff B",
mode: "companion-runoff",
status: missionIndex < 4 ? "locked" : missionIndex === 4 ? "active" : "complete",
instruction:
"Tied cities from Vote 03 — one more vote to break the tie. Winner joins the top city to form the final two.",
options: companionRunoffCandidates.length ? companionRunoffCandidates : companionOptions.slice(0, 2),
votes: companionRunoffVotes,
selectedName: myVotes["companion-runoff"],
voteLabel: "Break the Tie",
nextLabel: "Confirm Finalists",
canAdvance: Object.keys(companionRunoffVotes).length > 0,
finalistNames: [],
},
{
id: "companion-final",
eyebrow: "Vote 04",
title: "Lock in City B",
shortTitle: "City B Final",
mode: "companion-final",
status: missionIndex < 5 ? "locked" : "active",
instruction: "Top two from Vote 03 head-to-head. The winner becomes City B — destination locked.",
options: companionFinalists.length ? companionFinalists : companionOptions.slice(0, 2),
votes: allVoteCounts["companion-final"] || {},
selectedName: myVotes["companion-final"] || companionWinner?.name,
voteLabel: "Lock City B",
nextLabel: "Lock Destination",
canAdvance: Object.keys(allVoteCounts["companion-final"] || {}).length > 0 || Boolean(companionWinner),
finalistNames: companionFinalists.map((c) => c.name),
},
],
[
missionIndex,
anchorVotes,
anchorRunoffVotes,
anchorFinalists,
anchorRunoffCandidates,
companionOptions,
companionVotes,
companionRunoffVotes,
companionFinalists,
companionRunoffCandidates,
anchorWinner,
companionWinner,
myVotes,
allVoteCounts,
]
);

const activeMission = missions[Math.min(missionIndex, missions.length - 1)];
const activeVoteCount = Object.values(activeMission?.votes || {}).reduce((s, n) => s + n, 0);

function handleVote(country) {
const phase = activeMission?.mode;
if (!phase || activeMission.status !== "active") return;

const prevVote = myVotes[phase];

setMyVotes((prev) => ({ ...prev, [phase]: country.name }));

setAllVoteCounts((prev) => {
  const pv = { ...(prev[phase] || {}) };

  if (prevVote && pv[prevVote]) pv[prevVote] = Math.max(0, pv[prevVote] - 1);
  pv[country.name] = (pv[country.name] || 0) + 1;

  return { ...prev, [phase]: pv };
});

if (supabase) {
  supabase
    .from("cohort_votes")
    .upsert(
      {
        cohort_id: COHORT_ID,
        vote_phase: phase,
        country_name: country.name,
        user_id: userId,
      },
      { onConflict: "cohort_id,vote_phase,user_id" }
    )
    .then(() => {});
}

if (phase === "anchor-final") setAnchorWinner(country);
if (phase === "companion-final") setCompanionWinner(country);
```

}

const handleAdvance = useCallback(
async function handleAdvance() {
if (!activeMission?.canAdvance) return;

  // 0: anchor-longlist → check for tie → go to runoff (1) or skip to final (2)
  if (missionIndex === 0) {
    const tiedFor2nd = hasTieAtPosition(anchorVotes, 1);
    const tiedFor1st = hasTieAtPosition(anchorVotes, 0);

    if (tiedFor2nd || tiedFor1st) {
      startRunoff(anchorVotes, "anchor-runoff", 1);
    } else {
      setMissionIndex(2);
      pushStateToSupabase({ mission_index: 2 });
    }

    return;
  }

  // 1: anchor-runoff → go to anchor-final (2)
  if (missionIndex === 1) {
    setMissionIndex(2);
    pushStateToSupabase({ mission_index: 2 });
    return;
  }

  // 2: anchor-final → lock winner, clear companion votes, go to companion-longlist (3)
  if (missionIndex === 2) {
    const finalVotes = allVoteCounts["anchor-final"] || {};
    const topName = Object.entries(finalVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || anchorWinner?.name;
    const winner = topName ? getCountryByName(topName) : anchorFinalists[0];

    if (winner) {
      setAnchorWinner(winner);

      setAllVoteCounts((prev) => {
        const next = { ...prev };
        delete next["companion-longlist"];
        delete next["companion-runoff"];
        delete next["companion-final"];
        return next;
      });

      setMyVotes((prev) => {
        const next = { ...prev };
        delete next["companion-longlist"];
        delete next["companion-runoff"];
        delete next["companion-final"];
        return next;
      });

      setMissionIndex(3);
      pushStateToSupabase({ mission_index: 3, anchor_winner: winner.name });

      if (supabase) {
        supabase
          .from("cohort_votes")
          .delete()
          .eq("cohort_id", COHORT_ID)
          .in("vote_phase", ["companion-longlist", "companion-runoff", "companion-final"])
          .then(() => {});
      }
    }

    return;
  }

  // 3: companion-longlist → check for tie → go to runoff (4) or skip to final (5)
  if (missionIndex === 3) {
    const tiedFor2nd = hasTieAtPosition(companionVotes, 1);
    const tiedFor1st = hasTieAtPosition(companionVotes, 0);

    if (tiedFor2nd || tiedFor1st) {
      startRunoff(companionVotes, "companion-runoff", 4);
    } else {
      setMissionIndex(5);
      pushStateToSupabase({ mission_index: 5 });
    }

    return;
  }

  // 4: companion-runoff → go to companion-final (5)
  if (missionIndex === 4) {
    setMissionIndex(5);
    pushStateToSupabase({ mission_index: 5 });
    return;
  }

  // 5: companion-final → lock destination
  if (missionIndex === 5) {
    const finalVotes = allVoteCounts["companion-final"] || {};
    const topName = Object.entries(finalVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || companionWinner?.name;
    const winner = topName ? getCountryByName(topName) : companionFinalists[0];

    if (winner) {
      setCompanionWinner(winner);
      setShowCelebration(true);
      pushStateToSupabase({ companion_winner: winner.name });
    }
  }
},
[
  missionIndex,
  activeMission,
  anchorVotes,
  anchorFinalists,
  companionVotes,
  companionFinalists,
  anchorWinner,
  companionWinner,
  allVoteCounts,
]
```

);

// Auto-advance when all COHORT_SIZE votes are in for the active phase.
// A ref guards against firing twice if the count briefly hits 16 during a re-render.
const autoAdvancedForPhase = useRef(null);

useEffect(() => {
const phase = activeMission?.mode;
if (!phase || !activeMission?.canAdvance) return;

// Don't auto-advance the final missions — those lock the destination; keep that explicit.
if (phase === "anchor-final" || phase === "companion-final") return;

const voteCount = Object.values(activeMission.votes || {}).reduce((s, n) => s + n, 0);

if (voteCount >= COHORT_SIZE && autoAdvancedForPhase.current !== phase) {
  autoAdvancedForPhase.current = phase;
  handleAdvance();
}

}, [activeMission, handleAdvance]);

function porterPick() {
const sorted = [...(activeMission?.options || [])].sort((a, b) => b.score - a.score);
if (sorted[0]) handleVote(sorted[0]);
}

return ( <main className="fixed inset-0 z-[999] overflow-hidden">
<DestinationChamber
missions={missions}
missionIndex={missionIndex}
activeMission={activeMission}
activeVoteCount={activeVoteCount}
anchorWinner={anchorWinner}
companionWinner={companionWinner}
showCelebration={showCelebration}
onVote={handleVote}
onAdvance={handleAdvance}
onMissionJump={handleMissionJump}
onPorterPick={porterPick}
onReset={resetProtocol}
onDismissCelebration={() => setShowCelebration(false)}
/> </main>
);
}

function DestinationChamber({
  missions,
  missionIndex,
  activeMission,
  activeVoteCount,
  anchorWinner,
  companionWinner,
  showCelebration,
  onVote,
  onAdvance,
  onMissionJump,
  onPorterPick,
  onReset,
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

  const countries = activeMission.options;
  const selectedName = activeMission.selectedName;
  const selected = selectedName === activeCountry?.name;
  const routeComplete = Boolean(anchorWinner && companionWinner);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

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
        setIsMobile(window.innerWidth < 768);
      });
    }

    window.addEventListener("resize", handleResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    // Rotate the globe Group on its own Y axis so the floor stays stationary
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
    fetch("https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson")
      .then((r) => r.json())
      .then((data) => setWorldGeoData(data));
  }, []);

  useEffect(() => {
    if (!globeRef.current || !activeCountry) return;

    const globe = globeRef.current;
    const duration = firstPovRef.current ? 0 : 520;
    firstPovRef.current = false;

    if (typeof globe.pointOfView === "function") {
      const scene = typeof globe.scene === "function" ? globe.scene() : null;
      const grp = scene?.children.find((c) => c.isGroup);
      const rotOffsetDeg = grp ? (grp.rotation.y * 180 / Math.PI) : 0;

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
          // Floor grid — 600-unit plane at Y=-140 (below globe radius 100)
          const grid = new THREE.GridHelper(600, 30, 0xe8b84b, 0xa07020);
          grid.position.y = -140;
          const applyGridOpacity = (m) => {
            m.transparent = true;
            m.opacity = 0.45;
            m.depthWrite = false;
          };
          if (Array.isArray(grid.material)) {
            grid.material.forEach(applyGridOpacity);
          } else {
            applyGridOpacity(grid.material);
          }
          scene.add(grid);

          // Subtle glow disc on the floor directly under the globe
          const disc = new THREE.Mesh(
            new THREE.CircleGeometry(90, 48),
            new THREE.MeshBasicMaterial({
              color: 0xc4962a,
              transparent: true,
              opacity: 0.10,
              depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          disc.rotation.x = -Math.PI / 2;
          disc.position.y = -139;
          scene.add(disc);

          // Beam cone from globe centre (Y=0) to floor (Y=-140)
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

          // Concentric floor rings replacing FloorEmitter
          const ringDefs = [
            { r: 28, color: 0xe8b84b, opacity: 0.70 },
            { r: 52, color: 0xba0c2f, opacity: 0.38 },
            { r: 78, color: 0xc4962a, opacity: 0.30 },
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
  }, [activeMission.id]);

  const points = useMemo(() => {
    return countries.map((country) => ({
      ...country,
      size: country.name === activeCountry?.name ? 0.82 : 0.3,
      color:
        country.name === selectedName
          ? COLORS.champagneLight
          : country.name === activeCountry?.name
            ? COLORS.goldLight
            : "rgba(255,200,175,0.80)",
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
    const mode = activeMission.mode;
    const isAnchor = mode === "anchor-longlist" || mode === "anchor-runoff" || mode === "anchor-final";
    const isCompanion = mode === "companion-longlist" || mode === "companion-runoff" || mode === "companion-final";
    if (isAnchor) {
      const source = activeCountry;
      if (!source) return [];
      const bNames = CITY_B_MAP[source.name] || [];
      return bNames
        .map((name) => getCountryByName(name))
        .filter(Boolean)
        .map((bCity) => ({ startLat: source.lat, startLng: source.lng, endLat: bCity.lat, endLng: bCity.lng, label: bCity.name }));
    }
    if (anchorWinner && isCompanion) {
      return activeMission.options.map((bCity) => ({
        startLat: anchorWinner.lat, startLng: anchorWinner.lng, endLat: bCity.lat, endLng: bCity.lng, label: bCity.name,
      }));
    }
    return [];
  }, [activeCountry, activeMission, anchorWinner]);

  const activeContinent = useMemo(() => {
    if (!activeCountry || !worldGeoData.features.length) return null;
    const match = worldGeoData.features.find((f) => {
      const p = f.properties;
      return p.NAME === activeCountry.name || p.ADMIN === activeCountry.name || p.NAME_EN === activeCountry.name;
    });
    return match?.properties?.CONTINENT ?? null;
  }, [activeCountry, worldGeoData.features]);

  const polygonCapColor = useCallback(
    (d) => activeContinent && d.properties.CONTINENT === activeContinent
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

        <button
          onClick={() => {
            onReset();
            setActiveCountry(null);
            firstPovRef.current = true;
            if (globeRef.current && typeof globeRef.current.pointOfView === "function") {
              const scene = typeof globeRef.current.scene === "function" ? globeRef.current.scene() : null;
              const grp = scene?.children.find((c) => c.isGroup);
              const rotOffsetDeg = grp ? (grp.rotation.y * 180 / Math.PI) : 0;
              globeRef.current.pointOfView({ lat: 20, lng: rotOffsetDeg, altitude: 2.5 }, 600);
            }
          }}
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
          activeVoteCount={activeVoteCount}
          anchorWinner={anchorWinner}
          companionWinner={companionWinner}
          onMissionJump={onMissionJump}
        />
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
            ringColor={(d) => (d.name === selectedName ? COLORS.champagneLight : COLORS.gold)}
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
            atmosphereAltitude={0.40}
          />
        </div>

        <ChamberReticle activeCountry={activeCountry} pulseKey={pulseKey} />
      </div>

      {activeCountry && !isMobile && !deepDiveCountry && <ConnectorBeam />}

      {/* ── DESKTOP (xl+): right-side intel panel ── */}
      {!deepDiveCountry && (
        <div className="absolute right-5 top-1/2 z-40 hidden w-[min(35vw,500px)] -translate-y-1/2 xl:block">
          {activeCountry ? (
            <FloatingIntelPanel
              mission={activeMission}
              country={activeCountry}
              selected={selected}
              routeComplete={routeComplete}
              anchorWinner={anchorWinner}
              companionWinner={companionWinner}
              onVote={() => activeCountry && onVote(activeCountry)}
              onAdvance={onAdvance}
              onDeepDive={openDeepDive}
            />
          ) : (
            <EmptyCountryPrompt activeMission={activeMission} />
          )}
        </div>
      )}

      {/* ── DESKTOP (xl+): bottom-left route archive ── */}
      {!deepDiveCountry && (
        <div className="absolute left-5 z-40 hidden xl:block w-[min(22vw,260px)]" style={{ bottom: "min(14vh,140px)" }}>
          <RouteArchive />
        </div>
      )}

      {/* ── DESKTOP (xl+): bottom console ── */}
      {!deepDiveCountry && (
        <div className="absolute bottom-2 left-1/2 z-50 hidden w-[min(94vw,900px)] -translate-x-1/2 sm:bottom-3 xl:block">
          <DestinationConsole
            countries={countries}
            activeCountry={activeCountry}
            selectedName={selectedName}
            finalistNames={activeMission.status === "active" ? [] : activeMission.finalistNames}
            onSelectCountry={handlePointClick}
            onPorterPick={onPorterPick}
            onAdvance={onAdvance}
            canAdvance={activeMission.canAdvance}
            routeComplete={routeComplete}
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
          {activeCountry && (
            <FloatingIntelPanel
              mission={activeMission}
              country={activeCountry}
              selected={selected}
              routeComplete={routeComplete}
              anchorWinner={anchorWinner}
              companionWinner={companionWinner}
              onVote={() => activeCountry && onVote(activeCountry)}
              onAdvance={onAdvance}
              onDeepDive={openDeepDive}
              mobile
            />
          )}
          <DestinationConsole
            countries={countries}
            activeCountry={activeCountry}
            selectedName={selectedName}
            finalistNames={activeMission.status === "active" ? [] : activeMission.finalistNames}
            onSelectCountry={handlePointClick}
            onPorterPick={onPorterPick}
            onAdvance={onAdvance}
            canAdvance={activeMission.canAdvance}
            routeComplete={routeComplete}
          />
        </div>
      )}

      {deepDiveCountry && (
        <DeepDivePanel
          country={deepDiveCountry}
          mission={activeMission}
          selected={deepDiveCountry.name === activeMission.selectedName}
          onClose={closeDeepDive}
          onVote={() => { onVote(deepDiveCountry); closeDeepDive(); }}
        />
      )}

      {showCelebration && anchorWinner && companionWinner && (
        <DestinationLockedOverlay
          anchorWinner={anchorWinner}
          companionWinner={companionWinner}
          onDismiss={onDismissCelebration}
        />
      )}
    </section>
  );
}

function RouteArchive() {
  const [open, setOpen] = useState(false);
  const recentRoutes = getRecentCohortDestinations(5);
  const topCities = getMostRepeatedDestinations().slice(0, 5);

  return (
    <div
      className="rounded-2xl border backdrop-blur-xl overflow-hidden"
      style={{
        background: "rgba(8,4,0,0.68)",
        borderColor: "rgba(196,150,42,0.20)",
        boxShadow: "0 0 24px rgba(0,0,0,0.48)",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-[9px] uppercase tracking-[0.26em] font-black" style={{ color: "rgba(243,213,138,0.62)" }}>
          Route archive
        </span>
        <span className="text-[9px]" style={{ color: "rgba(243,213,138,0.45)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {!open && (
        <div className="px-4 pb-2.5">
          <p className="text-[9px] text-white/32 leading-4">
            Prior cohorts left a route history. Use it as signal.
          </p>
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
                  <span className="text-[9px] text-white/45 truncate">
                    {trip.destinations.join(" + ")}
                  </span>
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
                  style={{
                    background: "rgba(196,150,42,0.08)",
                    border: "1px solid rgba(196,150,42,0.16)",
                    color: "rgba(255,216,128,0.55)",
                  }}
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
        will-change: transform, opacity;
        background:
          repeating-linear-gradient(
            0deg,
            rgba(196,150,42,0.14) 0px,
            rgba(196,150,42,0.14) 1px,
            transparent 2px,
            transparent 7px
          ),
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

      .chamber-scrollbar::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }

      .chamber-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(196,150,42,.48);
        border-radius: 999px;
      }

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

      .deep-dive-enter {
        animation: deepDiveEnter 420ms cubic-bezier(.2,.9,.2,1) both;
      }

      .celebration-enter {
        animation: celebrationEnter 500ms cubic-bezier(.2,.9,.2,1) both;
      }
    `}</style>
  );
}

function RoomBackground({ active }) {
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
          boxShadow:
            "inset 0 0 120px rgba(196,150,42,0.06), inset 0 -80px 110px rgba(0,0,0,0.56), 0 0 130px rgba(0,0,0,0.86)",
        }}
      />

      <div
        className="absolute left-1/2 top-[7.5vh] h-[2px] w-[66vw] max-w-[960px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(196,150,42,0.52), rgba(196,150,42,0.78), rgba(243,213,138,0.62), rgba(196,150,42,0.52), transparent)",
          boxShadow:
            "0 0 18px rgba(196,150,42,0.42), 0 0 55px rgba(196,150,42,0.28)",
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

function MissionHud({
  missions,
  missionIndex,
  activeMission,
  activeVoteCount,
  anchorWinner,
  companionWinner,
  onMissionJump,
}) {
  const isFinal = activeMission.mode === "anchor-final" || activeMission.mode === "companion-final";
  const allVoted = activeVoteCount >= COHORT_SIZE;

  return (
    <div
      className="rounded-[1.35rem] border px-3 py-2 backdrop-blur-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(14,3,4,0.62), rgba(10,2,3,0.40)), radial-gradient(circle at 16% 12%, rgba(196,150,42,0.12), transparent 34%)",
        borderColor: allVoted && !isFinal ? "rgba(232,184,75,0.52)" : "rgba(196,150,42,0.22)",
        boxShadow: allVoted && !isFinal
          ? "0 0 28px rgba(232,184,75,0.22)"
          : "0 0 35px rgba(196,150,42,0.08)",
        transition: "border-color 0.4s, box-shadow 0.4s",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: allVoted && !isFinal ? COLORS.champagneLight : "#E8B84B",
                boxShadow: allVoted && !isFinal
                  ? "0 0 12px rgba(243,213,138,1)"
                  : "0 0 12px rgba(232,184,75,0.9)",
              }}
            />
            <p className="text-[9px] uppercase tracking-[0.28em] font-black" style={{ color: "#FFD880" }}>
              {activeMission.eyebrow}
            </p>
          </div>

          <h1 className="mt-1 truncate text-base font-black sm:text-xl" style={{ fontFamily: "Georgia, serif" }}>
            {activeMission.title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Live vote counter */}
          {!isFinal && (
            <div
              className="rounded-xl border px-2.5 py-1.5 text-center"
              style={{
                background: allVoted ? "rgba(243,213,138,0.12)" : "rgba(0,0,0,0.22)",
                borderColor: allVoted ? "rgba(243,213,138,0.36)" : "rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-[8px] uppercase tracking-[0.18em] text-white/35 font-black">Voted</p>
              <p
                className="mt-0.5 text-sm font-black tabular-nums"
                style={{ color: allVoted ? COLORS.champagneLight : "rgba(255,255,255,0.72)" }}
              >
                {activeVoteCount}<span className="text-[10px] text-white/35">/{COHORT_SIZE}</span>
              </p>
            </div>
          )}
          <div className="hidden items-center gap-2 md:flex">
            <HudLock label="A" value={anchorWinner?.name || "Pending"} active={Boolean(anchorWinner)} />
            <HudLock label="B" value={companionWinner?.name || "Pending"} active={Boolean(companionWinner)} />
          </div>
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
                    : "rgba(196,150,42,0.10)",
                color: active ? COLORS.midnight : locked ? "rgba(255,255,255,0.24)" : "#FFD880",
                borderColor: active ? "transparent" : locked ? "rgba(255,255,255,0.07)" : "rgba(196,150,42,0.22)",
              }}
            >
              {mission.eyebrow.replace("Vote ", "V")}
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
          "linear-gradient(135deg, rgba(14,3,4,0.62), rgba(10,2,3,0.48)), radial-gradient(circle at 10% 0%, rgba(196,150,42,0.14), transparent 34%)",
        borderColor: "rgba(196,150,42,0.22)",
        boxShadow:
          "0 0 45px rgba(196,150,42,0.08), inset 0 0 42px rgba(196,150,42,0.025)",
      }}
    >
      <p className="text-xs uppercase tracking-[0.28em] font-black" style={{ color: "#FFD880" }}>
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
          background: "linear-gradient(90deg, rgba(243,213,138,0), rgba(196,150,42,0.82), rgba(196,150,42,0.64), rgba(196,150,42,0))",
          boxShadow: "0 0 18px rgba(196,150,42,0.44), 0 0 34px rgba(196,150,42,0.30)",
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
  onDeepDive,
  mobile = false,
}) {
  if (!country) return null;

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
        boxShadow:
          "0 0 48px rgba(196,150,42,0.10), 0 30px 120px rgba(0,0,0,0.64), inset 0 0 42px rgba(196,150,42,0.04)",
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
              background: selected ? "rgba(243,213,138,0.12)" : "rgba(196,150,42,0.08)",
              borderColor: selected ? "rgba(243,213,138,0.28)" : "rgba(196,150,42,0.22)",
            }}
          >
            {countryIcon(country)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.26em] font-black" style={{ color: "#FFD880" }}>
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
                style={{
                  background: "rgba(196,150,42,0.08)",
                  borderColor: "rgba(196,150,42,0.18)",
                  color: "#FFD880",
                }}
              >
                {reason}
              </span>
            ))}
          </div>
        </div>

        {!mobile && (() => {
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
              {cohorts.length > 0 && (
                <p className="text-[10px] text-white/48 mb-2 font-bold">
                  Cohorts {cohorts.join(", ")}
                </p>
              )}
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

        {(mission.mode === "anchor-longlist" || mission.mode === "anchor-runoff" || mission.mode === "anchor-final") && CITY_B_MAP[country.name]?.length > 0 && (
          <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.18em] font-black" style={{ color: COLORS.champagne }}>
              City B options
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CITY_B_MAP[country.name].map((name) => (
                <span
                  key={name}
                  className="rounded-full border px-3 py-1 text-xs font-bold"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.62)",
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

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
              background: "rgba(196,150,42,0.08)",
              border: "1px solid rgba(196,150,42,0.22)",
              color: "#FFD880",
            }}
          >
            {mission.mode === "companion-final" ? "Lock destination" : `${mission.nextLabel} →`}
          </button>
        </div>

        {!mobile && (
          <button
            onClick={() => onDeepDive?.(country)}
            className="mt-2 w-full rounded-2xl px-4 py-2.5 text-center font-black uppercase tracking-[0.1em] text-xs border transition-all hover:border-[rgba(243,213,138,0.4)]"
            style={{
              background: "rgba(196,150,42,0.05)",
              border: "1px solid rgba(196,150,42,0.18)",
              color: "rgba(243,213,138,0.72)",
            }}
          >
            Deep dive → full intel
          </button>
        )}
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

function DeepDivePanel({ country, mission, selected, onClose, onVote }) {
  const data = DEEP_DIVE[country.name] || {};

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden deep-dive-enter">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,3,0,0.96) 0%, rgba(8,7,0,0.94) 100%)",
          backdropFilter: "blur(24px)",
        }}
      />

      <div className="relative z-10 flex flex-col h-full overflow-y-auto chamber-scrollbar">
        <div
          className="sticky top-0 z-20 flex items-center gap-3 px-5 py-3 border-b"
          style={{
            background: "rgba(4,3,0,0.88)",
            borderColor: "rgba(196,150,42,0.18)",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black border"
            style={{
              background: "rgba(196,150,42,0.08)",
              borderColor: "rgba(196,150,42,0.22)",
              color: "#FFD880",
            }}
          >
            ← Back
          </button>

          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-[0.3em] font-black" style={{ color: "rgba(243,213,138,0.55)" }}>
              Deep Dive · {mission.eyebrow}
            </div>
            <div className="text-lg font-black truncate" style={{ fontFamily: "Georgia, serif" }}>
              {countryIcon(country)} {country.name}
            </div>
          </div>

          <button
            onClick={onVote}
            className="shrink-0 rounded-2xl px-4 py-2 text-xs font-black"
            style={
              selected
                ? { background: "rgba(243,213,138,0.12)", color: COLORS.champagneLight, border: "1px solid rgba(243,213,138,0.28)" }
                : { background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`, color: COLORS.midnight }
            }
          >
            {selected ? "✓ Voted" : mission.voteLabel}
          </button>
        </div>

        <div className="relative h-56 sm:h-72 shrink-0 overflow-hidden">
          <img
            src={country.image}
            alt={country.name}
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: "cover" }}
          />
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

          {data.currency && (
            <div className="rounded-2xl px-4 py-3 border flex items-start gap-3" style={{ background: "rgba(0,0,0,0.22)", borderColor: "rgba(196,150,42,0.14)" }}>
              <span className="text-lg shrink-0">💵</span>
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] font-black mb-1" style={{ color: "rgba(243,213,138,0.55)" }}>Currency & payments</div>
                <p className="text-xs text-white/70 leading-5">{data.currency}</p>
              </div>
            </div>
          )}

          {(mission.mode === "anchor-longlist" || mission.mode === "anchor-runoff" || mission.mode === "anchor-final") && CITY_B_MAP[country.name]?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] font-black mb-3" style={{ color: "#FFD880" }}>
                City B add-on options
              </div>
              <div className="flex flex-wrap gap-2">
                {CITY_B_MAP[country.name].map((name) => (
                  <span
                    key={name}
                    className="rounded-full border px-3 py-1.5 text-xs font-bold"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      borderColor: "rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.65)",
                    }}
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
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-2xl px-4 py-3 border"
                    style={{ background: "rgba(196,150,42,0.05)", borderColor: "rgba(196,150,42,0.14)" }}
                  >
                    <span className="shrink-0 text-sm" style={{ color: COLORS.gold }}>◆</span>
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
                    <div className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: `${COLORS.champagne}88` }}>{r.dish}</div>
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
            onClick={onVote}
            className="w-full rounded-2xl px-4 py-4 font-black uppercase tracking-[0.08em] text-base"
            style={
              selected
                ? { background: "rgba(243,213,138,0.10)", color: COLORS.champagneLight, border: "1px solid rgba(243,213,138,0.28)" }
                : { background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`, color: COLORS.midnight }
            }
          >
            {selected ? "✓ Vote cast for " + country.name : mission.voteLabel + " — " + country.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeepDiveStat({ icon, label, value }) {
  return (
    <div
      className="rounded-2xl px-3 py-3 border"
      style={{ background: "rgba(0,0,0,0.30)", borderColor: "rgba(196,150,42,0.14)" }}
    >
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-[9px] uppercase tracking-[0.18em] text-white/38 font-black mb-1">{label}</div>
      <div className="text-xs font-bold leading-4" style={{ color: COLORS.champagneLight }}>{value}</div>
    </div>
  );
}

function DestinationLockedOverlay({ anchorWinner, companionWinner, onDismiss }) {
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
          boxShadow:
            "0 0 80px rgba(196,150,42,0.26), 0 0 160px rgba(196,150,42,0.12), inset 0 0 60px rgba(196,150,42,0.05)",
        }}
      >
        <CornerBrackets />

        <div className="relative p-7 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] mb-4"
            style={{ borderColor: "rgba(243,213,138,0.30)", color: "#FFD880", background: "rgba(196,150,42,0.08)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#E8B84B] animate-pulse" />
            Route locked
          </div>

          <h1 className="text-5xl font-black" style={{ fontFamily: "Georgia, serif", color: COLORS.champagneLight }}>
            {countryIcon(anchorWinner)}
          </h1>
          <h1 className="text-5xl font-black mt-1" style={{ fontFamily: "Georgia, serif", color: COLORS.champagneLight }}>
            {countryIcon(companionWinner)}
          </h1>

          <div className="mt-4">
            <div className="text-2xl font-black" style={{ fontFamily: "Georgia, serif" }}>
              {anchorWinner.name}
            </div>
            <div className="text-sm text-white/40 my-1">+</div>
            <div className="text-2xl font-black" style={{ fontFamily: "Georgia, serif" }}>
              {companionWinner.name}
            </div>
          </div>

          <p className="mt-5 text-sm text-white/60 leading-6">
            The Global 85 destination is locked. Porter is briefing the full itinerary.
          </p>

          {TRIP_DATE && <TripCountdownMini tripDate={TRIP_DATE} />}

          <button
            onClick={onDismiss}
            className="mt-6 w-full rounded-2xl px-4 py-4 font-black text-base"
            style={{
              background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
              color: COLORS.midnight,
            }}
          >
            View the route →
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
        color: ["#F3D58A", "#E8B84B", "#C4962A", "#BA0C2F", "#ffffff", "#FFE8A3", "#C65A2E"][
          Math.floor(Math.random() * 7)
        ],
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
          "linear-gradient(180deg, rgba(14,3,4,0.62), rgba(0,0,0,0.52)), radial-gradient(circle at 50% 0%, rgba(196,150,42,0.14), transparent 60%)",
        borderColor: "rgba(196,150,42,0.24)",
        boxShadow:
          "0 -10px 50px rgba(196,150,42,0.07), 0 22px 95px rgba(0,0,0,0.84), inset 0 1px 0 rgba(255,232,163,0.08)",
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

        <div className="flex shrink-0 gap-2">
          <button
            onClick={onPorterPick}
            className="rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] sm:text-[10px]"
            style={{
              background: "rgba(196,150,42,0.08)",
              borderColor: "rgba(196,150,42,0.22)",
              color: "#FFD880",
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
                    ? "rgba(196,150,42,0.18)"
                    : "rgba(255,255,255,0.038)",
                color: selected ? COLORS.midnight : "rgba(255,255,255,0.76)",
                borderColor: selected
                  ? "transparent"
                  : active
                    ? "rgba(196,150,42,0.52)"
                    : "rgba(255,255,255,0.09)",
                boxShadow: active ? "0 0 22px rgba(196,150,42,0.14)" : "none",
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
          style={{
            width: "1px",
            background: "linear-gradient(180deg, transparent, rgba(196,150,42,0.26), transparent)",
          }}
        />
        <div
          className="absolute top-1/2 left-0 right-0"
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(196,150,42,0.26), transparent)",
          }}
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

function EventsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <main className="px-5 py-5">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] font-bold" style={{ color: COLORS.champagne }}>
          Plan + Schedule
        </p>
        <h1 className="text-3xl font-black mt-2" style={{ fontFamily: "Georgia, serif" }}>
          Cohort schedule
        </h1>
        <p className="text-sm text-white/60 mt-3 leading-6">
          Class sessions, assignments, and key dates for the Global 85 trip selection process.
        </p>
      </section>

      <section className="mt-6">
        <SectionTitle eyebrow="Upcoming" title="Key dates" />
        <div className="grid gap-3 mt-3">
          {COHORT_EVENTS.map((event) => (
            <EventCard key={event.id} event={event} today={today} />
          ))}
        </div>
      </section>
    </main>
  );
}

function EventCard({ event, today }) {
  const base = today || (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const daysAway = event.fullDate ? Math.ceil((event.fullDate - base) / 86400000) : null;

  return (
    <div className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-[0.18em] text-white/35 font-bold">{event.source}</div>
          <h3 className="text-xl font-black mt-1 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
            {event.title}
          </h3>
          <p className="text-sm text-white/55 mt-1">{event.date}</p>
        </div>
        <span
          className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border shrink-0"
          style={{ background: "rgba(198,90,46,0.14)", color: COLORS.champagneLight, borderColor: "rgba(243,213,138,0.18)" }}
        >
          {event.badge}
        </span>
      </div>

      <p className="text-sm text-white/60 mt-3 leading-6">{event.detail}</p>

      {daysAway !== null && (
        <p className="mt-3 text-xs font-black" style={{ color: daysAway === 0 ? COLORS.champagneLight : daysAway > 0 ? `${COLORS.champagne}80` : "rgba(255,255,255,0.28)" }}>
          {daysAway === 0 ? "Today" : daysAway > 0 ? `In ${daysAway} day${daysAway !== 1 ? "s" : ""}` : "Past"}
        </p>
      )}
    </div>
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

function ToolsPage() {
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
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {showSplash && <SplashScreen user={user} onComplete={() => setShowSplash(false)} />}

      <Shell drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen}>
        <Routes>
          <Route path="/" element={<HomePage onAsk={() => navigate("/porter")} />} />
          <Route path="/porter" element={<PorterPage />} />
          <Route path="/votes" element={<VotesPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/tools" element={<ToolsPage />} />

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
