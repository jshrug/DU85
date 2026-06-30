export default function SectionTitle({ eyebrow, title }) {
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
