import { supabase, COHORT_ID } from "./supabase";

async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not signed in.");
  return user;
}

async function assertAdmin(uid) {
  const { data } = await supabase.from("admins").select("enabled").eq("id", uid).single();
  if (!data?.enabled) throw new Error("Admin access required.");
}

function mapItem(row) {
  return {
    id: row.id,
    city: row.city,
    type: row.type,
    category: row.category,
    name: row.name,
    neighborhood: row.neighborhood,
    hours: row.hours,
    price: row.price,
    tags: row.tags || [],
    googleMapsUrl: row.google_maps_url,
    reservationUrl: row.reservation_url,
    notes: row.notes,
    recommendedBy: row.recommended_by,
    stableKey: row.stable_key,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function subscribeExplore({ city, category }, cb) {
  let active = true;

  async function fetch() {
    let q = supabase
      .from("explore_items")
      .select("*")
      .eq("cohort_id", COHORT_ID)
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(250);
    if (city) q = q.eq("city", city);
    if (category) q = q.eq("category", category);
    const { data } = await q;
    if (active) cb((data || []).map(mapItem));
  }

  fetch();

  const channel = supabase
    .channel(`explore-${COHORT_ID}-${city || "all"}-${category || "all"}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "explore_items" }, fetch)
    .subscribe();

  return () => { active = false; supabase.removeChannel(channel); };
}

export async function deleteExploreItem(id) {
  const { error } = await supabase.from("explore_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Normalize helpers (unchanged from original) ───────────────────────────────

function normalizeCity(s) {
  const v = (s || "").trim();
  if (!v) return "";
  const low = v.toLowerCase();
  if (low === "singapore") return "Singapore";
  if (low === "hcmc" || low === "ho chi minh" || low === "ho chi minh city") return "Ho Chi Minh City";
  return v;
}

function normalizeType(s) {
  const v = (s || "").trim().toLowerCase();
  if (!v) return "";
  if (v === "restaurant") return "Restaurant";
  if (v === "coffee" || v === "cafe") return "Coffee";
  if (v === "bar" || v === "drinks" || v === "pub") return "Bar";
  if (v === "rooftop bar" || v === "rooftop") return "Rooftop Bar";
  if (v === "hawker center" || v === "hawker centre" || v === "hawker" || v === "food court") return "Hawker Center";
  if (v === "museum" || v === "gallery") return "Museum";
  if (v === "temple" || v === "church" || v === "mosque" || v === "pagoda") return "Temple";
  if (v === "market" || v === "bazaar" || v === "night market") return "Market";
  if (v === "shopping" || v === "mall") return "Shopping";
  if (v === "spa" || v === "wellness" || v === "massage") return "Spa";
  if (v === "nightlife" || v === "club" || v === "lounge") return "Nightlife";
  if (v === "nature" || v === "park" || v === "garden") return "Nature";
  if (v === "tour" || v === "experience") return "Tour";
  if (v === "adventure" || v === "sport" || v === "activity") return "Adventure";
  return s.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function normalizePrice(s) {
  const v = (s || "").trim();
  return ["$", "$$", "$$$"].includes(v) ? v : "";
}

function parseTags(s) {
  return (s || "").trim().split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20);
}

function normalizeName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function makeStableKey({ city, type, name }) {
  return `${city}::${type}::${normalizeName(name)}`;
}

function normalizeCategory(s) {
  const v = (s || "").trim().toLowerCase();
  if (v === "dining") return "dining";
  if (v === "activity" || v === "activities") return "activity";
  return "";
}

function inferCategory(type) {
  const DINING_TYPES = ["restaurant", "coffee", "bar", "rooftop bar", "hawker center"];
  return DINING_TYPES.includes((type || "").toLowerCase()) ? "dining" : "activity";
}

function cleanRow(r) {
  const city = normalizeCity(r.city);
  const type = normalizeType(r.type);
  const name = (r.name || "").trim();
  const rawCategory = normalizeCategory(r.category);
  const category = rawCategory || inferCategory(type);
  return {
    valid: !!(city && type && name),
    city, type, category, name,
    neighborhood: (r.neighborhood || "").trim(),
    hours: (r.hours || "").trim(),
    price: normalizePrice(r.price),
    tags: parseTags(r.tags),
    googleMapsUrl: (r.googlemapsurl || r.googleMapsUrl || "").trim(),
    reservationUrl: (r.reservationurl || r.reservationUrl || "").trim(),
    notes: (r.notes || "").trim(),
    recommendedBy: (r.recommendedby || r.recommendedBy || "").trim(),
  };
}

export function getExploreImportPreview(rows, previewLimit = 10) {
  const prepared = rows.map((row, index) => ({ rowNumber: index + 1, ...cleanRow(row) }));
  const valid = prepared.filter((r) => r.valid);
  return { previewRows: prepared.slice(0, previewLimit), validRows: valid, importableCount: valid.length, skippedCount: prepared.length - valid.length };
}

export async function importExploreItems(rows, options = {}) {
  const user = await getCurrentUser();
  await assertAdmin(user.id);

  const preview = getExploreImportPreview(rows);
  if (preview.validRows.length === 0) throw new Error("No valid rows found (need city, type, name).");

  // Fetch all existing items to find duplicates
  const { data: existing } = await supabase
    .from("explore_items")
    .select("id, city, type, name, stable_key")
    .eq("cohort_id", COHORT_ID);

  const existingByKey = new Map();
  (existing || []).forEach((doc) => {
    const key = doc.stable_key || makeStableKey(doc);
    if (!existingByKey.has(key)) existingByKey.set(key, []);
    existingByKey.get(key).push(doc.id);
  });

  const dedupedByKey = new Map();
  for (const row of preview.validRows) {
    dedupedByKey.set(makeStableKey(row), row);
  }

  const toUpsert = [];
  const toDelete = [];

  for (const [stableKey, row] of dedupedByKey.entries()) {
    const existingIds = existingByKey.get(stableKey) || [];
    const [keepId, ...extraIds] = existingIds;
    toUpsert.push({ stableKey, row, existingId: keepId || null });
    toDelete.push(...extraIds);
  }

  let removedDuplicates = 0;
  if (toDelete.length) {
    await supabase.from("explore_items").delete().in("id", toDelete);
    removedDuplicates = toDelete.length;
  }

  const now = new Date().toISOString();
  let imported = 0;
  let updated = 0;

  for (const { stableKey, row, existingId } of toUpsert) {
    const payload = {
      cohort_id: COHORT_ID,
      city: row.city, type: row.type, category: row.category, name: row.name,
      neighborhood: row.neighborhood, hours: row.hours, price: row.price,
      tags: row.tags, google_maps_url: row.googleMapsUrl, reservation_url: row.reservationUrl,
      notes: row.notes, recommended_by: row.recommendedBy,
      stable_key: stableKey, status: "active",
      updated_at: now, updated_by_uid: user.id,
    };

    if (existingId) {
      await supabase.from("explore_items").update(payload).eq("id", existingId);
      updated += 1;
    } else {
      await supabase.from("explore_items").insert({ ...payload, created_at: now, created_by_uid: user.id });
      imported += 1;
    }
  }

  await supabase.from("explore_import_logs").insert({
    cohort_id: COHORT_ID,
    admin_uid: user.id,
    file_name: options.fileName || "CSV import",
    imported_count: imported,
    updated_count: updated,
    skipped_count: preview.skippedCount,
    removed_duplicates: removedDuplicates,
  });

  return { imported, updated, skipped: preview.skippedCount, removedDuplicates };
}

export async function cleanupExploreDuplicates() {
  const user = await getCurrentUser();
  await assertAdmin(user.id);

  const { data: all } = await supabase
    .from("explore_items")
    .select("id, city, type, name, stable_key, created_at")
    .eq("cohort_id", COHORT_ID);

  const byKey = new Map();
  (all || []).forEach((d) => {
    const key = d.stable_key || makeStableKey(d);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ id: d.id, createdAt: d.created_at ? new Date(d.created_at).getTime() : 0 });
  });

  const toDelete = [];
  for (const docs of byKey.values()) {
    if (docs.length <= 1) continue;
    const sorted = [...docs].sort((a, b) => a.createdAt - b.createdAt);
    toDelete.push(...sorted.slice(1).map((d) => d.id));
  }

  if (toDelete.length) {
    await supabase.from("explore_items").delete().in("id", toDelete);
  }

  return { removedDuplicates: toDelete.length };
}
