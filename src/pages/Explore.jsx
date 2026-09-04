import { useEffect, useMemo, useState } from "react";
import { addExploreItem, deleteExploreItem, subscribeExplore } from "../lib/explore";
import { subscribeFavorites, toggleFavorite } from "../lib/favorites";
import { useAuth } from "../lib/AuthContext";
import { COLORS } from "../constants.js";
import { DESTINATION_NAMES, DESTINATIONS, destinationLabel } from "../data/trip.js";

const LANES = [
  { key: "all", label: "All" },
  { key: "coursework", label: "Coursework" },
  { key: "cultural", label: "Cultural" },
];

const PLACE_TYPES = [
  "Company",
  "School",
  "Restaurant",
  "Museum / arts",
  "Market",
  "Neighborhood",
  "Experience",
  "Other",
];

function matchesLane(item, lane) {
  if (lane === "all") return true;
  if (item.category === "both") return true;
  return item.category === lane;
}

function laneChips(category) {
  if (category === "both") return ["coursework", "cultural"];
  if (category === "coursework" || category === "cultural") return [category];
  return [];
}

const EMPTY_FORM = {
  name: "",
  city: DESTINATION_NAMES[0],
  category: "coursework",
  type: "Company",
  neighborhood: "",
  notes: "",
  url: "",
};

export default function Explore({ isAdmin }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(new Set());
  const [city, setCity] = useState("all");
  const [lane, setLane] = useState("all");
  const [kind, setKind] = useState("All");
  const [search, setSearch] = useState("");
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const unsub = subscribeExplore({}, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeFavorites(setFavorites);
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (city !== "all") result = result.filter((i) => i.city === city);
    result = result.filter((i) => matchesLane(i, lane));
    if (kind !== "All") result = result.filter((i) => i.type === kind);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) =>
        [i.name, i.neighborhood, i.notes, i.recommendedBy, i.city, i.type, ...(i.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (showFavOnly) result = result.filter((i) => favorites.has(i.id));
    return result;
  }, [items, city, lane, kind, search, showFavOnly, favorites]);

  const courseworkCount = items.filter((i) => matchesLane(i, "coursework")).length;
  const culturalCount = items.filter((i) => matchesLane(i, "cultural")).length;

  async function handleDelete(id) {
    if (!window.confirm("Remove this place? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteExploreItem(id);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="px-5 py-5 pb-28">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06]">
        <p className="text-xs uppercase tracking-[0.22em] font-bold" style={{ color: COLORS.champagne }}>
          Istanbul · Kenya
        </p>
        <h1 className="text-3xl font-black mt-2" style={{ fontFamily: "Georgia, serif" }}>
          Interest board
        </h1>
        <p className="text-sm text-white/60 mt-3 leading-6">
          Drop a company visit, a neighborhood, a restaurant. Tag it coursework or cultural so we can tell program from fun later. Hotels and the official itinerary are still empty on purpose.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
          <span>{courseworkCount} coursework</span>
          <span className="text-white/20">·</span>
          <span>{culturalCount} cultural</span>
        </div>
      </section>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setAddOpen(true)}
          className="flex-1 rounded-2xl px-4 py-3.5 font-black"
          style={{
            background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
            color: "#17060b",
          }}
        >
          + Add a place
        </button>
        <button
          onClick={() => setShowFavOnly((v) => !v)}
          className="rounded-2xl px-4 py-3.5 font-black border border-white/10 bg-white/[0.06]"
          style={{ color: showFavOnly ? COLORS.champagneLight : "rgba(255,255,255,0.7)" }}
        >
          {showFavOnly ? "★ Saved" : "☆ Saved"}
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {[{ name: "all", label: "All cities" }, ...DESTINATIONS.map((d) => ({ name: d.name, label: destinationLabel(d.name) }))].map((opt) => (
          <FilterChip key={opt.name} active={city === opt.name} onClick={() => setCity(opt.name)}>
            {opt.label}
          </FilterChip>
        ))}
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {LANES.map((opt) => (
          <FilterChip key={opt.key} active={lane === opt.key} onClick={() => setLane(opt.key)} tone={opt.key}>
            {opt.label}
          </FilterChip>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search the board"
        className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/35 focus:outline-none"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {["All", ...PLACE_TYPES].map((t) => (
          <FilterChip key={t} active={kind === t} onClick={() => setKind(t)}>
            {t}
          </FilterChip>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 animate-pulse h-24" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/55 leading-6">
            {items.length === 0
              ? "Nothing on the board yet. Add the first company, school, or place you want the cohort to consider."
              : "No places match those filters."}
          </div>
        ) : (
          filtered.map((item) => (
            <PlaceCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              isOwner={user?.id && item.createdByUid === user.id}
              isFavorited={favorites.has(item.id)}
              deleting={deleting === item.id}
              onDelete={() => handleDelete(item.id)}
            />
          ))
        )}
      </div>

      {addOpen && (
        <AddPlaceModal
          user={user}
          onClose={() => setAddOpen(false)}
        />
      )}
    </main>
  );
}

function FilterChip({ active, onClick, children, tone }) {
  const activeColor =
    tone === "coursework" ? COLORS.champagneLight : tone === "cultural" ? "#E8C4A8" : COLORS.champagneLight;
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-black border transition"
      style={
        active
          ? { borderColor: "rgba(243,213,138,0.45)", background: "rgba(196,150,42,0.16)", color: activeColor }
          : { borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }
      }
    >
      {children}
    </button>
  );
}

function PlaceCard({ item, isAdmin, isOwner, isFavorited, deleting, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const chips = laneChips(item.category);

  async function handleFavorite(e) {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    try {
      await toggleFavorite(item.id, isFavorited);
    } finally {
      setToggling(false);
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.05] overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="text-[10px] font-black uppercase tracking-[0.14em] rounded-full px-2 py-0.5"
                  style={
                    chip === "coursework"
                      ? { background: "rgba(243,213,138,0.16)", color: COLORS.champagneLight }
                      : { background: "rgba(232,196,168,0.14)", color: "#E8C4A8" }
                  }
                >
                  {chip}
                </span>
              ))}
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40 px-1 py-0.5">
                {destinationLabel(item.city)}
              </span>
            </div>
            <h2 className="text-base font-black leading-tight" style={{ fontFamily: "Georgia, serif" }}>
              {item.name}
            </h2>
            <p className="mt-1 text-xs text-white/50">
              {item.type}
              {item.neighborhood ? ` · ${item.neighborhood}` : ""}
            </p>
          </div>
          <button
            onClick={handleFavorite}
            disabled={toggling}
            className="text-lg leading-none px-1"
            style={{ color: isFavorited ? COLORS.champagneLight : "rgba(255,255,255,0.35)" }}
            title={isFavorited ? "Remove from saved" : "Save"}
          >
            {isFavorited ? "★" : "☆"}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-2">
          {item.notes && <p className="text-sm text-white/75 leading-6">{item.notes}</p>}
          {item.recommendedBy && (
            <p className="text-xs text-white/45">
              Added by <span className="font-semibold text-white/70">{item.recommendedBy}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            {item.googleMapsUrl && (
              <a
                href={item.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold"
                style={{ color: COLORS.champagneLight }}
              >
                Open link
              </a>
            )}
            {(isAdmin || isOwner) && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="text-xs font-bold text-red-300 disabled:opacity-40"
              >
                {deleting ? "Removing..." : "Remove"}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function AddPlaceModal({ user, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = form.name.trim() && form.city && form.category && form.type;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    try {
      await addExploreItem({
        ...form,
        recommendedBy: user?.user_metadata?.display_name || user?.email || "Member",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Could not save this place.");
    } finally {
      setSaving(false);
    }
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-white/10 p-6 sm:rounded-[2rem]"
        style={{ background: "rgba(12,10,16,0.98)" }}
      >
        <p className="text-[9px] uppercase tracking-[0.32em] font-black" style={{ color: COLORS.champagne }}>
          Add to the board
        </p>
        <h2 className="mt-1 text-2xl font-black" style={{ fontFamily: "Georgia, serif" }}>
          New place
        </h2>

        <label className="block mt-5">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">Name</span>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Company, restaurant, neighborhood..."
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
          />
        </label>

        <div className="mt-4">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">City</span>
          <div className="mt-1 flex gap-2">
            {DESTINATION_NAMES.map((name) => (
              <button
                key={name}
                onClick={() => set("city", name)}
                className="flex-1 rounded-xl py-2.5 text-sm font-black border"
                style={
                  form.city === name
                    ? { borderColor: "rgba(243,213,138,0.45)", background: "rgba(196,150,42,0.16)", color: COLORS.champagneLight }
                    : { borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
                }
              >
                {destinationLabel(name)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">Tag</span>
          <p className="text-[11px] text-white/40 mt-1 leading-5">
            Coursework is DU program (company visits, school, cases). Cultural is fun to visit.
          </p>
          <div className="mt-2 flex gap-2">
            {[
              { key: "coursework", label: "Coursework" },
              { key: "cultural", label: "Cultural" },
              { key: "both", label: "Both" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => set("category", opt.key)}
                className="flex-1 rounded-xl py-2.5 text-xs font-black border"
                style={
                  form.category === opt.key
                    ? { borderColor: "rgba(243,213,138,0.45)", background: "rgba(196,150,42,0.16)", color: COLORS.champagneLight }
                    : { borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block mt-4">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">Kind of place</span>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white focus:outline-none"
          >
            {PLACE_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[#12080c]">
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block mt-4">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">Neighborhood (optional)</span>
          <input
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
            placeholder="Karakoy, Westlands..."
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
          />
        </label>

        <label className="block mt-4">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">Why it belongs (optional)</span>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="What the cohort would get out of this."
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
          />
        </label>

        <label className="block mt-4">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">Link (optional)</span>
          <input
            value={form.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="https://"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="mt-5 w-full rounded-2xl px-4 py-3.5 font-black disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
            color: "#17060b",
          }}
        >
          {saving ? "Saving..." : "Save to board"}
        </button>
        <button onClick={onClose} className="mt-2 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white/55">
          Cancel
        </button>
      </div>
    </div>
  );
}
