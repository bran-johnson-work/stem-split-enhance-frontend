import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type FaqItem = { q: string; a: string };

const defaultFaqs: FaqItem[] = [
  {
    q: "Is there a free trial?",
    a: "Yes. The Trial plan lets you process a few tracks at no cost so you can hear the quality before subscribing.",
  },
  {
    q: "What audio formats can I upload?",
    a: "KlearNote accepts common formats like WAV, MP3 and AIFF. For best results, upload lossless audio at 44.1kHz or higher.",
  },
  {
    q: "How long does processing take?",
    a: "Most tracks move through separation and mastering in a few minutes. You can watch each stage live from your dashboard.",
  },
  {
    q: "Do I own the stems and master?",
    a: "Absolutely. Everything you process is yours to download and use, and your uploads stay private to your account.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — plans are month-to-month (or annual) and you can cancel or change plans whenever you like.",
  },
];

export function Faq({ items = defaultFaqs }: { items?: FaqItem[] }) {
  return (
    <Accordion type="single" collapsible className="mx-auto w-full max-w-2xl">
      {items.map((f, i) => (
        <AccordionItem key={f.q} value={`item-${i}`}>
          <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {f.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
