import { ANCHOR_COUNTRIES, COMPANION_CITIES, CITY_B_MAP } from "../data/cityData.js";
import { DEPARTURE_DATE } from "../constants.js";

export function getInitialGlobeSize() {
  if (typeof window === "undefined") return { width: 1400, height: 900 };
  return { width: window.innerWidth, height: window.innerHeight };
}

export function uniqueByName(items) {
  return Array.from(new Map(items.map((item) => [item.name, item])).values());
}

export function getCountryByName(name) {
  return uniqueByName([...ANCHOR_COUNTRIES, ...COMPANION_CITIES]).find((c) => c.name === name);
}

export function buildCompanionOptions(anchorName) {
  const names = CITY_B_MAP[anchorName] || CITY_B_MAP["Santiago"];
  return names.map(getCountryByName).filter(Boolean);
}

export function getTopCountries(options, votes, count = 2) {
  const voteNames = Object.keys(votes || {});

  if (!voteNames.length) return [];

  const selected = voteNames.map(getCountryByName).filter(Boolean);
  const backups = options.filter((country) => !voteNames.includes(country.name));

  return uniqueByName([...selected, ...backups]).slice(0, count);
}

// Returns true if top two anchor candidates are within `n` votes of each other at a given position
export function withinN(votes, position, n) {
  const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  if (sorted.length <= position + 1) return false;
  return sorted[position][1] - sorted[position + 1][1] <= n;
}

// Anchor-longlist runoff trigger: within 1 vote at 1st OR 2nd place
export function needsAnchorRunoff(votes) {
  return withinN(votes, 0, 1) || withinN(votes, 1, 1);
}

// Combo-vote runoff trigger: top two combos within 2 votes
export function needsComboRunoff(votes) {
  return withinN(votes, 0, 2);
}

// Build combo objects from anchor finalists × their City B options
export function buildCombos(finalists) {
  const combos = [];
  finalists.forEach((cityA, i) => {
    const bNames = CITY_B_MAP[cityA.name] || [];
    bNames.forEach((bName, j) => {
      const cityB = getCountryByName(bName);
      if (!cityB) return;
      combos.push({
        name: `${cityA.name} + ${bName}`,
        cityA,
        cityB,
        region: cityA.region,
        flag: cityA.flag,
        emoji: cityA.emoji,
        // Slight position offset so multiple combos from same City A don't stack on globe
        lat: cityA.lat + j * 0.8,
        lng: cityA.lng + j * 0.8,
        score: cityA.score,
        image: cityA.image,
        fit: cityA.fit,
        cost: cityA.cost,
        travel: cityA.travel,
        reasons: cityA.reasons,
        note: `${cityA.name} + ${bName}`,
        porter: `${cityA.porter} Paired with ${bName}: ${cityB.porter}`,
      });
    });
  });
  return combos;
}

export function countryIcon(country) {
  return country?.emoji || country?.flag || "🌍";
}

export function timeUntilDeparture() {
  const now = new Date();
  let years = DEPARTURE_DATE.getFullYear() - now.getFullYear();
  let months = DEPARTURE_DATE.getMonth() - now.getMonth();
  let days = DEPARTURE_DATE.getDate() - now.getDate();
  if (days < 0) { months -= 1; days += new Date(DEPARTURE_DATE.getFullYear(), DEPARTURE_DATE.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  return { months: Math.max(0, months), days: Math.max(0, days) };
}

// Detect ties in vote results. Returns array of city names that are tied for the given rank position.
export function getTiedCitiesForPosition(voteMap, position) {
  const entries = Object.entries(voteMap).sort((a, b) => b[1] - a[1]);
  if (entries.length <= position) return [];
  const targetScore = entries[position]?.[1];
  if (targetScore === undefined) return [];
  return entries.filter(([, score]) => score === targetScore).map(([name]) => name);
}

export function hasTieAtPosition(voteMap, position) {
  return getTiedCitiesForPosition(voteMap, position).length > 1;
}
