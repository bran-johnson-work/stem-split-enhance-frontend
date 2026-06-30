import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Faq, type FaqItem } from "@/components/marketing/faq";
import { PricingComparison } from "@/components/marketing/pricing-comparison";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for KlearNote.",
};

const pricingFaqs: FaqItem[] = [
  {
    q: "Can I try KlearNote before paying?",
    a: "Yes. The Trial plan is free forever and lets you process a few tracks — no credit card required — so you can hear the quality before subscribing.",
  },
  {
    q: "Can I change or cancel my plan later?",
    a: "Anytime. Upgrades take effect immediately and we prorate the difference; downgrades and cancellations apply at the end of your current billing period.",
  },
  {
    q: "How does annual billing work?",
    a: "Annual plans are billed once up front at a discounted rate — roughly two months free versus paying monthly. The price you see is the effective monthly cost.",
  },
  {
    q: "Do you offer refunds?",
    a: "If something isn't right, reach out within 14 days of a charge and we'll make it right. Because the Trial plan is free, you can fully evaluate KlearNote before you ever pay.",
  },
  {
    q: "Are taxes included in the price?",
    a: "Prices are shown excluding tax. Any applicable VAT or sales tax is calculated and shown at checkout based on your billing location.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit and debit cards, processed securely through our payment provider. We never store your card details on our servers.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <SectionHeading
          title="Pricing that scales with you"
          subtitle="Start free. Upgrade when you're ready to ship more."
          className="mx-auto"
        />
      </Reveal>

      <Reveal delay={120} className="mt-14">
        <PricingPlans />
      </Reveal>

      {/* Trust / guarantee row */}
      <Reveal delay={80} className="mt-10">
        <div className="text-muted-foreground flex flex-col flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm sm:flex-row">
          <span className="inline-flex items-center gap-2">
            <Check className="text-completed size-4" />
            No credit card required
          </span>
          <span className="inline-flex items-center gap-2">
            <Check className="text-completed size-4" />
            Cancel anytime
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="text-completed size-4" />
            Secure payments · 14-day money-back guarantee
          </span>
        </div>
      </Reveal>

      {/* Feature comparison */}
      <section className="mt-24">
        <Reveal>
          <SectionHeading
            title="Compare every plan"
            subtitle="Everything that comes with each plan, side by side."
            className="mx-auto"
          />
        </Reveal>
        <Reveal delay={120} className="mt-10">
          <PricingComparison />
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mt-24">
        <Reveal>
          <SectionHeading title="Frequently asked questions" className="mx-auto" />
        </Reveal>
        <Reveal delay={120} className="mt-10">
          <Faq items={pricingFaqs} />
        </Reveal>
      </section>

      {/* CTA band */}
      <section className="mt-24">
        <Reveal>
          <Card className="bg-brand-gradient relative overflow-hidden border-0 text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
            <CardContent className="relative flex flex-col items-center gap-6 py-14 text-center">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Start free, upgrade when you&apos;re ready.
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
      </section>
    </div>
  );
}
