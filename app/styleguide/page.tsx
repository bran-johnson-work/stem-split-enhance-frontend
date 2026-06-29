import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/projects/status-badge";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProjectStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const brandSwatches = [
  { name: "brand", className: "bg-brand" },
  { name: "brand-hover", className: "bg-brand-hover" },
  { name: "brand-tint", className: "bg-brand-tint" },
  { name: "primary", className: "bg-primary" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "accent", className: "bg-accent" },
  { name: "destructive", className: "bg-destructive" },
];

const stateSwatches: { name: ProjectStatus; className: string }[] = [
  { name: "queued", className: "bg-queued" },
  { name: "analyzing", className: "bg-analyzing" },
  { name: "separating", className: "bg-separating" },
  { name: "cleaning", className: "bg-cleaning" },
  { name: "mastering", className: "bg-mastering" },
  { name: "completed", className: "bg-completed" },
  { name: "failed", className: "bg-failed" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <Logo />
          <p className="text-muted-foreground text-sm">
            Design system reference — colors, type and component states.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Brand & surface colors">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {brandSwatches.map((s) => (
            <div key={s.name} className="space-y-1.5">
              <div
                className={`${s.className} h-16 rounded-lg border border-border/60`}
              />
              <p className="font-mono text-xs">{s.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Processing-state colors">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {stateSwatches.map((s) => (
            <div key={s.name} className="space-y-1.5">
              <div className={`${s.className} h-16 rounded-lg`} />
              <p className="font-mono text-xs">{s.name}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {stateSwatches.map((s) => (
            <StatusBadge key={s.name} status={s.name} />
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-2">
          <p className="text-5xl font-semibold tracking-tight">Display</p>
          <p className="text-3xl font-semibold tracking-tight">Heading 1</p>
          <p className="text-xl font-semibold">Heading 2</p>
          <p className="text-base">Body — the quick brown fox jumps over the lazy dog.</p>
          <p className="text-muted-foreground text-sm">Muted small text.</p>
          <p className="font-mono text-sm">Mono · 03:41 · 84.3 MB</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
          <Button disabled>
            <Loader2 className="size-4 animate-spin" /> Loading
          </Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge className="bg-brand">Brand</Badge>
        </div>
      </Section>

      <Section title="Form inputs">
        <div className="grid max-w-md gap-4">
          <div className="space-y-2">
            <Label htmlFor="sg-default">Default</Label>
            <Input id="sg-default" placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-disabled">Disabled</Label>
            <Input id="sg-disabled" placeholder="Disabled" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-error" className="text-destructive">
              Error
            </Label>
            <Input
              id="sg-error"
              aria-invalid
              defaultValue="not-an-email"
            />
            <p className="text-destructive text-sm">Enter a valid email</p>
          </div>
        </div>
      </Section>

      <Section title="Alerts">
        <div className="grid gap-3">
          <Alert>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>
              Your track is queued and will start processing shortly.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Processing failed</AlertTitle>
            <AlertDescription>
              Unsupported sample rate. Re-export at 44.1kHz and try again.
            </AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Progress & loading">
        <div className="max-w-md space-y-4">
          <Progress value={28} />
          <Progress value={64} />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Section>

      <Section title="Card & tabs">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="stems">
              <TabsList>
                <TabsTrigger value="stems">Stems</TabsTrigger>
                <TabsTrigger value="master">Master</TabsTrigger>
              </TabsList>
              <TabsContent value="stems" className="text-muted-foreground pt-3 text-sm">
                Vocals, drums, bass and other — ready to download.
              </TabsContent>
              <TabsContent value="master" className="text-muted-foreground pt-3 text-sm">
                Your enhanced master file.
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
