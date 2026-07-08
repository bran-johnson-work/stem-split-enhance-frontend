import { Progress } from "@/components/ui/progress";
import { STAGE_COLORS } from "@/lib/processing/pipeline";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Compact progress readout for a project row (KN-28). Shows a state-colored bar
 * + percentage while work is underway; a dash for states with nothing to show
 * yet (queued) or nothing left to show (failed). Completed reads as a full bar.
 */
export function ProjectProgress({
  project,
  className,
}: {
  project: Project;
  className?: string;
}) {
  const { status, progress } = project;

  if (status === "failed" || progress === 0) {
    return (
      <span className={cn("text-muted-foreground text-sm", className)}>—</span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress
        value={progress}
        className="h-1.5 w-full flex-1"
        indicatorClassName={STAGE_COLORS[status].bg}
      />
      <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
        {progress}%
      </span>
    </div>
  );
}
