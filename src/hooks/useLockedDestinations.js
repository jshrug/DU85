import { DESTINATIONS, ROUTE_LOCKED } from "../data/trip.js";

const LOCKED = {
  anchorWinner: DESTINATIONS[0].name,
  companionWinner: DESTINATIONS[1].name,
};

export default function useLockedDestinations() {
  // Destinations are official. Do not wait on cohort_state; Joe can still
  // write the row so other tools stay in sync.
  if (ROUTE_LOCKED) return LOCKED;
  return { anchorWinner: null, companionWinner: null };
}
