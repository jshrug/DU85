export const TRIP_DATE = import.meta.env.VITE_TRIP_DATE || null;

export const COLORS = {
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

export const COHORT_SIZE = 16;

export const DEPARTURE_DATE = new Date("2027-05-23T00:00:00");

export const DRAWER_NAV = [
  { to: "/", label: "Command Center", icon: "✦", desc: "Today, alerts, and quick actions" },
  { to: "/porter", label: "Porter", icon: "🛎️", desc: "AI cohort concierge" },
  { to: "/events", label: "Schedule", icon: "📅", desc: "Key dates, deadlines, and planning calendar" },
  { to: "/city-events", label: "City Events", icon: "🎯", desc: "Events, activities, and RSVPs by city" },
  { to: "/votes", label: "Votes", icon: "🗳️", desc: "Destination chamber and trip decisions" },
  { to: "/champions", label: "Champions", icon: "🏙️", desc: "City research teams and assignments" },
  { to: "/explore", label: "Explore", icon: "🗺️", desc: "Food, places, and plans" },
  { to: "/media", label: "Media", icon: "🎬", desc: "Curated videos and articles by city" },
  { to: "/chat", label: "Chat", icon: "💬", desc: "Cohort and team channels" },
  { to: "/team", label: "Teams", icon: "👥", desc: "Groups and classmates" },
  { to: "/gallery", label: "Gallery", icon: "📷", desc: "Photos and memories" },
  { to: "/tools", label: "Trip Tools", icon: "🛠️", desc: "Currency, translation, and trip utilities" },
  { to: "/me", label: "Profile", icon: "👤", desc: "Preferences and saved places" },
];
