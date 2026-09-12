import { useEffect, useState } from "react";
import { addLink, deleteLink, subscribeLinks, validateLink } from "../lib/links";
import { useAuth } from "../lib/AuthContext";
import { COLORS } from "../constants.js";

const EMPTY = { title: "", url: "", notes: "" };

export default function Docs({ isAdmin }) {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeLinks((rows) => {
      setLinks(rows);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleDelete(id) {
    if (!window.confirm("Remove this doc from the shelf?")) return;
    await deleteLink(id);
  }

  return (
    <main className="px-5 py-5 pb-28">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06]">
        <p className="text-xs uppercase tracking-[0.22em] font-bold" style={{ color: COLORS.champagne }}>
          Command center
        </p>
        <h1 className="text-3xl font-black mt-2" style={{ fontFamily: "Georgia, serif" }}>
          Docs shelf
        </h1>
        <p className="text-sm text-white/60 mt-3 leading-6">
          The actual files. Flight emails, visa PDFs, company one-pagers. Anyone can drop a link.
        </p>
      </section>

      <button
        onClick={() => setAddOpen(true)}
        className="mt-4 w-full rounded-2xl px-4 py-3.5 font-black"
        style={{
          background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
          color: "#17060b",
        }}
      >
        + Add a doc
      </button>

      <div className="mt-5 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 h-20 animate-pulse" />
          ))
        ) : links.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/55 leading-6">
            Nothing on the shelf yet. Add the first link when the instructor packet lands.
          </div>
        ) : (
          links.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-black leading-tight"
                style={{ fontFamily: "Georgia, serif", color: COLORS.champagneLight }}
              >
                {item.title}
              </a>
              {item.notes ? <p className="mt-2 text-sm text-white/65 leading-6">{item.notes}</p> : null}
              <p className="mt-2 text-xs text-white/40 break-all">{item.url}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                <span>{item.createdByName || "Member"}</span>
                {(isAdmin || user?.id === item.createdByUid) && (
                  <button onClick={() => handleDelete(item.id)} className="font-bold text-red-300">
                    Remove
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {addOpen && (
        <AddDocModal
          user={user}
          onClose={() => setAddOpen(false)}
        />
      )}
    </main>
  );
}

function AddDocModal({ user, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const problem = validateLink(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addLink(form, {
        uid: user?.id,
        name: user?.user_metadata?.display_name || user?.email || "Member",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Could not save this doc.");
    } finally {
      setSaving(false);
    }
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
          Docs shelf
        </p>
        <h2 className="mt-1 text-2xl font-black" style={{ fontFamily: "Georgia, serif" }}>
          New doc
        </h2>

        <label className="block mt-5">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Visa packet, Christopherson email..."
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
          />
        </label>
        <label className="block mt-4">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">URL</span>
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
          />
        </label>
        <label className="block mt-4">
          <span className="text-[10px] uppercase tracking-[0.16em] font-black text-white/45">Note (optional)</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Why this belongs on the shelf."
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full rounded-2xl px-4 py-3.5 font-black disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${COLORS.champagneLight}, ${COLORS.champagne}, ${COLORS.ember})`,
            color: "#17060b",
          }}
        >
          {saving ? "Saving..." : "Save to shelf"}
        </button>
        <button onClick={onClose} className="mt-2 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white/55">
          Cancel
        </button>
      </div>
    </div>
  );
}
