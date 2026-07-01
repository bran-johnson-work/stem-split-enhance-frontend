// NOTE: placeholder pre-launch metrics — swap for real numbers once available.
const stats = [
  { value: "4+", label: "Stems per track" },
  { value: "<5 min", label: "Avg. processing" },
  { value: "WAV · MP3", label: "Lossless exports" },
  { value: "100%", label: "Yours to keep" },
];

export function StatsBand() {
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-2xl border shadow-sm md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card flex flex-col items-center gap-1 px-4 py-8 text-center"
        >
          <span className="bg-brand-gradient bg-clip-text font-mono text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            {stat.value}
          </span>
          <span className="text-muted-foreground text-sm">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
