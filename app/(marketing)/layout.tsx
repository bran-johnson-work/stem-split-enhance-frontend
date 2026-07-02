import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // overflow-x-clip guards against any section bleeding past the viewport
    // (e.g. the coverflow's 3D cards, whose composited layers can escape a
    // nested clip on some mobile browsers). `clip` — unlike `hidden` — is not
    // a scrolling value, so it never becomes a scroll container: the sticky
    // header still pins to the viewport and vertical scrolling is unaffected.
    // Without this, horizontal overflow makes mobile browsers zoom the whole
    // page out to fit, leaving it rendered narrower than the screen.
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
