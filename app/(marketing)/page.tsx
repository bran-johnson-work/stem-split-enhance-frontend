import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Check,
  Download,
  Gauge,
  Layers,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { BeforeAfter } from "@/components/marketing/before-after";
import { ImageScroller } from "@/components/marketing/image-scroller";
import { LogosStrip } from "@/components/marketing/logos-strip";
import { PipelineFlow } from "@/components/marketing/pipeline-flow";
import { Faq } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/reveal";
import { RotatingWord } from "@/components/marketing/rotating-word";
import { SectionHeading } from "@/components/marketing/section-heading";
import { StatsBand } from "@/components/marketing/stats-band";
import { StemPlayer } from "@/components/marketing/stem-player";
import { Testimonials } from "@/components/marketing/testimonials";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Layers,
    title: "Clean stem separation",
    body: "Pull vocals, drums, bass and more into pristine, isolated tracks.",
  },
  {
    icon: Wand2,
    title: "Enhanced mastering",
    body: "A studio-grade master applied automatically to every upload.",
  },
  {
    icon: Gauge,
    title: "Fast processing",
    body: "Track every stage live — from analyzing to a finished master.",
  },
  {
    icon: Download,
    title: "Lossless downloads",
    body: "Grab individual stems or the full master in WAV or MP3.",
  },
  {
    icon: ShieldCheck,
    title: "Yours to keep",
    body: "Your audio and outputs stay private and downloadable anytime.",
  },
  {
    icon: AudioLines,
    title: "Built for AI audio",
    body: "Tuned for the artifacts and quirks of AI-generated tracks.",
  },
];

const steps = [
  { n: "01", title: "Upload", body: "Drop in an AI-generated track in seconds." },
  { n: "02", title: "Process", body: "We separate stems and master your track." },
  { n: "03", title: "Download", body: "Export clean stems and an enhanced master." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero — tucks up behind the transparent floating header (-mt-16
          cancels the header's 64px flow band) so the backdrop fills the
          whole top of the page and the header pill floats over it */}
      <section className="relative -mt-16 overflow-hidden">
        {/* decorative backdrops */}
        <div className="bg-aurora animate-aurora pointer-events-none absolute inset-0 -z-10 opacity-70 dark:opacity-60" />
        {/* transparent hero background image */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/hero-image.jpg')] bg-cover bg-center bg-no-repeat opacity-25 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] dark:opacity-30" />

        <div className="mx-auto flex min-h-[calc(100svh-9rem)] max-w-6xl items-center px-4 py-20 sm:px-6">
          <div className="grid w-full items-center gap-12 lg:grid-cols-2">
            {/* copy */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              {/* <Badge
                variant="secondary"
                className="mb-6 gap-1.5 rounded-full px-3 py-1"
              >
                <Sparkles className="text-brand size-3.5" />
                KlearNote MVP v1
              </Badge> */}
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
                <span className="sr-only">
                  Turn any audio into clean, usable stems — for AI music,
                  podcasts, films, interviews, old recordings, and more.
                </span>
                <span
                  aria-hidden
                  className="flex flex-col items-center gap-1 lg:items-start"
                >
                  <span className="text-balance">
                    Turn Any Audio into clean, usable stems
                  </span>
                  <span className="flex items-baseline justify-center gap-[0.3em] lg:justify-start">
                    <span>for</span>
                    <RotatingWord
                      words={[
                        "AI music",
                        "podcasts",
                        "films",
                        "interviews",
                        "old recordings",
                        "voice recordings",
                        "live recordings",
                        "demos",
                        "archival audio",
                      ]}
                      className="bg-brand-gradient bg-clip-text text-transparent"
                    />
                  </span>
                </span>
              </h1>
              <p className="text-muted-foreground mt-6 max-w-xl text-lg text-pretty">
                Upload a song, watch it process in real time, and download
                studio-grade stems and an enhanced master — all in one place.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
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
              <p className="text-muted-foreground mt-6 flex items-center gap-2 text-sm">
                <Check className="text-completed size-4" />
                No credit card required · Cancel anytime
              </p>
            </div>

            {/* animated stem-player mockup */}
            <Reveal delay={120}>
              <StemPlayer />
            </Reveal>
          </div>
        </div>
      </section>

      <LogosStrip />

      {/* Core flow — animated Upload -> Audio Processing -> Download */}
      <section className="border-border/60 bg-muted/30 border-t">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading
              title="Upload. Process. Download."
              subtitle="Drop in a track and watch KlearNote separate, clean, and master it — then pull down studio-grade stems and a finished master."
              className="mx-auto"
            />
          </Reveal>
          <Reveal delay={120} className="mt-16">
            <PipelineFlow />
          </Reveal>
        </div>
      </section>

      {/* Image scroller (drag to scroll, constrained to section width) */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading
              title="A look inside KlearNote"
              className="mx-auto"
            />
          </Reveal>
          <Reveal className="mt-12">
            <ImageScroller />
          </Reveal>
        </div>
      </section>

      {/* Before / After */}
      <section className="border-border/60 bg-muted/30 border-t">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading
              title="From a tangled mix to clean, isolated stems"
              subtitle="See the original mixdown and the separated stems KlearNote pulls out of it, side by side."
              className="mx-auto"
            />
          </Reveal>
          <Reveal delay={120} className="mt-12">
            <BeforeAfter />
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <Reveal>
          <StatsBand />
        </Reveal>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-border/60 bg-muted/30 border-t"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading
              title="From upload to master in three steps"
              className="mx-auto"
            />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 100}>
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <span className="bg-brand-gradient grid size-12 place-items-center rounded-xl font-mono text-lg font-bold text-white shadow-sm">
                      {step.n}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {step.body}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading
              title="Everything you need to finish a track"
              className="mx-auto"
            />
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <Card className="h-full transition-all hover:-translate-y-1 hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="bg-brand-gradient grid size-10 place-items-center rounded-lg text-white shadow-sm">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {f.body}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-border/60 bg-muted/30 border-t">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading
              title="Built for the people finishing the track"
              className="mx-auto"
            />
          </Reveal>
          <Reveal delay={120} className="mt-12">
            <Testimonials />
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionHeading
              title="Frequently asked questions"
              className="mx-auto"
            />
          </Reveal>
          <Reveal delay={120} className="mt-10">
            <Faq />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-border/60 border-t">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <Card className="bg-brand-gradient relative overflow-hidden border-0 text-white">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
              <CardContent className="relative flex flex-col items-center gap-6 py-14 text-center">
                <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  Ready to hear your track, separated and mastered?
                </h2>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/signup">
                    Get started free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>
    </>
  );
}
