const names = [
  "Skylab Records",
  "Northwave",
  "Pulse Studio",
  "Echo Collective",
  "Lumen Audio",
];

function LogoGroup({ hidden }: { hidden?: boolean }) {
  return (
    <ul
      aria-hidden={hidden}
      className="flex shrink-0 items-center gap-x-12 pr-12"
    >
      {names.map((name) => (
        <li
          key={name}
          className="text-muted-foreground/60 hover:text-brand text-sm font-semibold whitespace-nowrap transition-colors"
        >
          {name}
        </li>
      ))}
    </ul>
  );
}

export function LogosStrip() {
  return (
    <section className="border-border/60 bg-muted/20 border-y">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-muted-foreground text-center text-xs font-medium tracking-widest uppercase">
          Trusted by independent artists &amp; studios
        </p>
        {/* Seamless marquee: two identical groups so a -50% shift loops
            cleanly. Pauses on hover; frozen under reduced motion via the
            global guard on `animate-marquee` in globals.css. */}
        <div className="mask-fade-x relative mt-6 overflow-hidden">
          <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
            <LogoGroup />
            <LogoGroup hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
