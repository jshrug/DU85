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

// Build the City B candidate list for the combo round: one entry per City B
// destination (deduped), carrying its City A anchor as `.cityA` for display
// underneath, and `.comboName` ("<City A> + <City B>") for brief matching —
// champion teams submit briefs under the full combo name, not the bare city.
export function buildCityBCandidates(anchors) {
  const seen = new Set();
  const list = [];
  anchors.forEach((cityA) => {
    (CITY_B_MAP[cityA.name] || []).forEach((bName) => {
      if (seen.has(bName)) return;
      seen.add(bName);
      const cityB = getCountryByName(bName);
      if (!cityB) return;
      list.push({ ...cityB, cityA, comboName: `${cityA.name} + ${bName}` });
    });
  });
  return list;
}

export function countryIcon(country) {
  return country?.emoji || country?.flag || "🌍";
}

// Porter briefs are submitted under the full combo name ("<City A> + <City B>")
// for City B candidates (see buildCityBCandidates), or under either the city
// name (e.g. "Kigali") or the country name (e.g. "Rwanda") teams associate it
// with for a plain City A country — match on both so a brief doesn't silently
// fail to show up over a naming mismatch.
// Briefs are meant to be filed under the full combo name ("Nairobi + Cape Town"),
// but teams file them under the City B name alone too, usually tagged with the
// City B designator (e.g. 'Cape Town "B"'). Normalize both sides so a brief is
// recognized whichever form its team used.
export function normalizeBriefKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/["'‘’“”]/g, "")
    .replace(/\bcity\s*b\b/g, " ")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+b\s*$/, "")
    .replace(/\s*\+\s*/g, " + ")
    .trim();
}

// Every name a team might reasonably file this combo's brief under.
export function briefKeysForCombo(combo) {
  const keys = [combo?.name];
  const cityB = combo?.cityB;
  if (cityB?.name) {
    keys.push(cityB.name);
    const countryName = cityB.note?.split(" · ")[0]?.trim();
    if (countryName) keys.push(countryName);
  }
  return Array.from(new Set(keys.map(normalizeBriefKey).filter(Boolean)));
}

export function briefKeysForComboName(comboName) {
  const combo = buildCombos(ANCHOR_COUNTRIES).find((c) => c.name === comboName);
  return combo ? briefKeysForCombo(combo) : [normalizeBriefKey(comboName)].filter(Boolean);
}

export function briefMatchNames(country) {
  if (!country) return [];
  if (country.comboName) return [country.comboName];
  const city = country?.cityA || country;
  if (!city) return [];
  const countryName = city.note?.split(" · ")[0]?.trim();
  return [city.name, countryName].filter(Boolean);
}

export function findBriefForCountry(briefs, country) {
  const names = briefMatchNames(country).map((n) => n.toLowerCase());
  return briefs.find((b) => names.includes(b.country_name.toLowerCase()));
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
