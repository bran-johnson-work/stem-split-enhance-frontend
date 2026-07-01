import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// NOTE: placeholder pre-launch testimonials — replace with real quotes.
const testimonials = [
  {
    quote:
      "I fed it a rough AI demo and got back stems clean enough to drop straight into my session. It saved me an afternoon of editing.",
    name: "Maya Okafor",
    role: "Producer, Northwave",
    initials: "MO",
  },
  {
    quote:
      "The enhanced master is the part that surprised me — my tracks finally sound finished, not like exports from a model.",
    name: "Diego Salas",
    role: "Artist, Pulse Studio",
    initials: "DS",
  },
  {
    quote:
      "Separation quality on generated vocals is genuinely the best I've tried. It's become a standard step in my workflow.",
    name: "Erin Vasquez",
    role: "Engineer, Lumen Audio",
    initials: "EV",
  },
];

export function Testimonials() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {testimonials.map((t) => (
        <Card key={t.name} className="flex flex-col">
          <CardContent className="flex flex-1 flex-col gap-5 pt-6">
            <div className="text-brand flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </div>
            <p className="flex-1 text-pretty">&ldquo;{t.quote}&rdquo;</p>
            <div className="flex items-center gap-3">
              <span className="bg-brand-tint text-brand grid size-10 shrink-0 place-items-center rounded-full font-mono text-sm font-semibold">
                {t.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {t.role}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
