export default function DemoPage({ eyebrow, title, subtitle, cards = [] }) {
  return (
    <main className="px-5 py-5">
      <section className="rounded-[2rem] p-5 border border-white/10 bg-white/[0.06] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: "rgba(243,213,138,0.72)" }}>
          {eyebrow}
        </p>
        <h1 className="text-3xl font-black mt-2" style={{ fontFamily: "Georgia, serif" }}>
          {title}
        </h1>
        <p className="text-sm text-white/60 mt-3 leading-6">{subtitle}</p>

        <div className="grid gap-3 mt-5">
          {cards.map((card) => (
            <div key={card.title} className="rounded-3xl p-4 border border-white/10 bg-black/20">
              <h3 className="font-black">{card.title}</h3>
              <p className="text-sm text-white/55 mt-1">{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
