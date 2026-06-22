import { previousCohortTrips, previousCohortCityIntel } from "../data/previousCohortIntel.js";

// City-to-country mapping for roll-up queries
const CITY_COUNTRY_MAP = {
  "Ho Chi Minh City": "Vietnam",
  "Hanoi": "Vietnam",
  "Cape Town": "South Africa",
  "Johannesburg": "South Africa",
  "Seoul": "South Korea",
  "Ulaanbaatar": "Mongolia",
  "Istanbul": "Turkey",
  "Lisbon": "Portugal",
  "Casablanca": "Morocco",
  "Dubai": "UAE",
  "Kampala": "Uganda",
  "Gaborone": "Botswana",
  "Santiago": "Chile",
  "Buenos Aires": "Argentina",
  "Bangkok": "Thailand",
  "Kuala Lumpur": "Malaysia",
  "Athens": "Greece",
  "Prague": "Czech Republic",
  "Kigali": "Rwanda",
  "Nairobi": "Kenya",
  "Singapore": "Singapore",
};

function normalize(str) {
  return (str || "").trim().toLowerCase();
}

function getCitiesForCountry(country) {
  const norm = normalize(country);
  return Object.entries(CITY_COUNTRY_MAP)
    .filter(([, c]) => normalize(c) === norm)
    .map(([city]) => city);
}

/**
 * Returns array of cohort numbers (as strings) that visited the given city.
 */
export function getCohortsForCity(city) {
  const norm = normalize(city);
  return previousCohortTrips
    .filter((trip) =>
      !trip.status &&
      trip.destinations.some((d) => normalize(d) === norm)
    )
    .map((trip) => trip.cohort);
}

/**
 * Returns array of cohort numbers (as strings) that visited any city in the given country.
 */
export function getCohortsForCountry(country) {
  const cities = getCitiesForCountry(country);
  if (!cities.length) return getCohortsForCity(country);
  const all = cities.flatMap(getCohortsForCity);
  return [...new Set(all)].sort((a, b) => Number(a) - Number(b));
}

/**
 * Returns the previous visit org list for a city (case-insensitive).
 */
export function getPreviousVisitOrgsForCity(city) {
  const norm = normalize(city);
  const match = Object.values(previousCohortCityIntel).find(
    (entry) => normalize(entry.city) === norm
  );
  return match ? match.previousVisits : [];
}

/**
 * Returns the combined org list for all cities in a country.
 */
export function getPreviousVisitOrgsForCountry(country) {
  const cities = getCitiesForCountry(country);
  if (!cities.length) return getPreviousVisitOrgsForCity(country);
  const all = cities.flatMap((city) => getPreviousVisitOrgsForCity(city));
  return [...new Set(all)];
}

/**
 * Returns the number of prior cohort visits to a destination (city or country).
 */
export function getPrecedentScore(destination) {
  // Try city first, then country
  const cityScore = getCohortsForCity(destination).length;
  if (cityScore > 0) return cityScore;
  return getCohortsForCountry(destination).length;
}

/**
 * Returns a freshness label based on number of prior visits.
 * 0 => "Fresh pick", 1 => "Some precedent", 2-3 => "Strong precedent", 4+ => "Repeat-heavy"
 */
export function getFreshnessLabel(destination) {
  const score = getPrecedentScore(destination);
  if (score === 0) return "Fresh pick";
  if (score === 1) return "Some precedent";
  if (score <= 3) return "Strong precedent";
  return "Repeat-heavy";
}

/**
 * Returns a visit density label based on number of orgs visited in a city.
 * 0 => "No visit history", 1-5 => "Light signal", 6-9 => "Moderate signal", 10+ => "High visit-density"
 */
export function getVisitDensityLabel(city) {
  const orgs = getPreviousVisitOrgsForCity(city);
  if (!orgs.length) return "No visit history";
  if (orgs.length <= 5) return "Light signal";
  if (orgs.length <= 9) return "Moderate signal";
  return "High visit-density";
}

/**
 * Returns sorted list of most-repeated destination cities.
 */
export function getMostRepeatedDestinations() {
  const counts = {};
  previousCohortTrips.forEach((trip) => {
    if (trip.status) return;
    trip.destinations.forEach((dest) => {
      counts[dest] = (counts[dest] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => ({ city, count }));
}

/**
 * Returns the last N cohorts' destinations (most recent first).
 */
export function getRecentCohortDestinations(limit = 5) {
  return previousCohortTrips
    .filter((trip) => !trip.status)
    .slice(-limit)
    .reverse();
}

/**
 * Returns a short string like "Visited by cohorts 66, 84 (2 prior trips)"
 */
export function getPriorCohortSummary(destination) {
  const cohorts = getCohortsForCity(destination);
  if (!cohorts.length) {
    const countryCohorts = getCohortsForCountry(destination);
    if (!countryCohorts.length) return "No prior cohort visits on record";
    const count = countryCohorts.length;
    return `Visited by cohorts ${countryCohorts.join(", ")} (${count} prior trip${count !== 1 ? "s" : ""})`;
  }
  const count = cohorts.length;
  return `Visited by cohorts ${cohorts.join(", ")} (${count} prior trip${count !== 1 ? "s" : ""})`;
}

/**
 * Returns an operator-voice string about what prior cohorts showed about a destination.
 */
export function getCohortBuiltConnectionRead(destination) {
  const norm = normalize(destination);
  const intelEntry = Object.values(previousCohortCityIntel).find(
    (entry) => normalize(entry.city) === norm
  );

  if (intelEntry) {
    return intelEntry.operatorRead;
  }

  const cohorts = getCohortsForCity(destination);
  const countryCohorts = getCohortsForCountry(destination);
  const allCohorts = [...new Set([...cohorts, ...countryCohorts])].sort(
    (a, b) => Number(a) - Number(b)
  );

  if (!allCohorts.length) {
    return "No prior cohort has visited this destination. Cohort 85 would be building access from scratch.";
  }

  const count = allCohorts.length;
  return `Prior cohorts ${allCohorts.join(", ")} visited this destination. Cohort 85 would still need to build and confirm actual access.`;
}
