// Canonical Global 85 trip. Locked destinations and program dates only.
// Do not put hotels, company visits, or C84 (Singapore / Vietnam) content here.

export const ROUTE_LOCKED = true;

// XMBA 4354 window from the program calendar. Depart Denver May 24,
// return June 4 (or onward travel). Nothing else about the on-the-ground
// plan is booked.
export const TRIP_WINDOW = {
  departDenver: "2027-05-24",
  returnDenver: "2027-06-04",
};

export const TRIP_START = new Date("2027-05-24T00:00:00");

export const DESTINATIONS = [
  {
    slug: "istanbul",
    name: "Istanbul",
    country: "Turkey",
    hub: "Istanbul",
    emoji: "🇹🇷",
    timezone: "Europe/Istanbul",
    currency: "TRY",
    lat: 41.0082,
    lng: 28.9784,
  },
  {
    slug: "kenya",
    name: "Kenya",
    country: "Kenya",
    hub: "Nairobi",
    emoji: "🇰🇪",
    timezone: "Africa/Nairobi",
    currency: "KES",
    lat: -1.2921,
    lng: 36.8219,
  },
];

export const DESTINATION_NAMES = DESTINATIONS.map((d) => d.name);
export const DEFAULT_DESTINATION = DESTINATIONS[0].name;

const LEGACY = new Set([
  "singapore",
  "vietnam",
  "hcmc",
  "ho chi minh",
  "ho chi minh city",
]);

export function findDestination(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const low = raw.toLowerCase();
  return (
    DESTINATIONS.find(
      (d) => d.slug === low || d.name.toLowerCase() === low || d.hub.toLowerCase() === low
    ) || null
  );
}

export function coerceDestination(value) {
  const found = findDestination(value);
  if (found) return found.name;
  if (LEGACY.has(String(value || "").trim().toLowerCase())) return DEFAULT_DESTINATION;
  return DESTINATION_NAMES.includes(value) ? value : DEFAULT_DESTINATION;
}

export function destinationLabel(value, { withEmoji = true } = {}) {
  const d = findDestination(value);
  if (!d) return value || "";
  return withEmoji ? `${d.emoji} ${d.name}` : d.name;
}
