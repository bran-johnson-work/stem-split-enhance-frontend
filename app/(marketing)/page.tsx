import Link from "next/link";
import {
  AudioLines,
  Download,
  Gauge,
  Layers,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { LogosStrip } from "@/components/marketing/logos-strip";
import { RotatingWord } from "@/components/marketing/rotating-word";
import { Badge } from "@/components/ui/badge";
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
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-80 max-w-4xl bg-brand-gradient opacity-20 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 rounded-full px-3 py-1"
          >
            <Sparkles className="size-3.5 text-brand" />
            KlearNote MVP v1
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            <span className="sr-only">
              Turn any audio into clean, usable stems — for AI music, podcasts, films,
              interviews, old recordings, and more.
            </span>
            <span aria-hidden className="flex flex-col items-center gap-1">
              <span className="text-balance">
                Turn Any Audio into clean, usable stems
              </span>
              <span className="flex items-baseline justify-center gap-[0.3em]">
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
          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg text-pretty">
            Upload a song, watch it process in real time, and download
            studio-grade stems and an enhanced master — all in one place.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">Start for free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <LogosStrip />

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            From upload to master in three steps
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <Card key={step.n} className="relative overflow-hidden">
                <CardContent className="pt-6">
                  <span className="text-brand/30 font-mono text-4xl font-bold">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {step.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Everything you need to finish a track
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="bg-brand-tint text-brand grid size-10 place-items-center rounded-lg">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Card className="bg-brand-gradient border-0 text-white">
            <CardContent className="flex flex-col items-center gap-6 py-14 text-center">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">
                Ready to hear your track, separated and mastered?
              </h2>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/signup">Get started free</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
