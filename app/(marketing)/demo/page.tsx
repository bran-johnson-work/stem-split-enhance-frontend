import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Sliders, Upload } from "lucide-react";
import { DemoEmbed } from "@/components/marketing/demo-embed";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Live demo",
  description:
    "Try KlearNote's stem separation and audio enhancement in your browser — no account, no install.",
};

const steps = [
  {
    icon: Upload,
    title: "Drop in a track",
    body: "Any MP3 or WAV. A 30–60 second clip is plenty to hear the difference.",
  },
  {
    icon: Sliders,
    title: "Separate and enhance",
    body: "The demo splits the mix into stems, then runs the enhancement pass.",
  },
  {
    icon: Download,
    title: "Listen and download",
    body: "Preview each stem in the player and pull down the ones you want.",
  },
];

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <SectionHeading
          eyebrow="Live demo"
          title="Hear it on your own track"
          subtitle="Separation and enhancement running live, right here. No account, nothing to install — bring a track and press go."
          className="mx-auto"
        />
      </Reveal>

      {/* three-step primer, so the embedded app isn't the first thing to parse */}
      <Reveal delay={80} className="mt-12">
        <ol className="grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="bg-brand-gradient grid size-9 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold text-white shadow-sm">
                {i + 1}
              </span>
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <step.icon className="text-brand size-4" />
                  {step.title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* Always the embedded preview, for everyone. The signed-in pipeline runner
          lives at /pipeline-demo — deliberately a different URL, so this page
          shows the same thing to every visitor regardless of session state. */}
      <Reveal delay={120} className="mt-10">
        <DemoEmbed />
      </Reveal>

      <p className="text-muted-foreground mt-4 text-center text-sm">
        This is a research preview running on a single machine — it can be slow
        under load, and processing quality is still being tuned.
      </p>

      {/* CTA out of the demo and into the product */}
      <Reveal delay={80} className="mt-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-balance">
            Like what you hear?
          </h2>
          <p className="text-muted-foreground max-w-xl text-pretty">
            The full product adds project history, batch processing, lossless
            downloads and a proper stem mixer.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start for free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
