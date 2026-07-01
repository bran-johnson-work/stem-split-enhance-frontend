import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function PlaceholderPage({
  title,
  description,
  phase,
  icon: Icon,
}: {
  title: string;
  description?: string;
  phase: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          {Icon && (
            <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-xl">
              <Icon className="size-6" />
            </div>
          )}
          <p className="font-medium">Building in {phase}</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            The pixel-perfect UI for this screen lands in {phase} of the sprint.
            The route, shell, and navigation are wired and live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
