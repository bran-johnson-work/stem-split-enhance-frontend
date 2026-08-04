"use client";

// One stem in the comparison list: pick it to hear both versions of it.
//
// A row is only selectable when *both* versions produced the stem. When one side is
// missing the row says so instead of disappearing — the backend's content gate runs
// per model, so "the new model didn't find a hi-hat here" is a real result about the
// separation, and silently dropping the row would hide it.

import * as React from "react";
import { Check } from "lucide-react";
import { ENGINE_VERSION_META } from "@/lib/delivery/comparison";
import { STEM_META } from "@/lib/delivery/deliverables";
import type { ComparisonRow } from "@/lib/delivery/comparison";
import type { EngineVersion } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CompareStemRow = React.memo(function CompareStemRow({
  row,
  selected,
  blind,
  onSelect,
}: {
  row: ComparisonRow;
  selected: boolean;
  blind: boolean;
  onSelect: (stemName: string) => void;
}) {
  const kind = row.takes.v1?.kind ?? row.takes.v2?.kind ?? "other";
  const meta = STEM_META[kind];
  const Icon = meta.icon;

  // Which side is missing, if either. Named for the user, unless we're blind
  // testing — "only in Precision" would give the answer away.
  const onlyIn: EngineVersion | null = row.comparable
    ? null
    : row.takes.v1
      ? "v1"
      : "v2";

  return (
    <li>
      <button
        type="button"
        disabled={!row.comparable}
        aria-pressed={selected}
        onClick={() => onSelect(row.name)}
        className={cn(
          "focus-visible:ring-ring/60 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
          row.comparable ? "hover:bg-muted/50" : "cursor-not-allowed",
          selected && "bg-muted/60",
        )}
      >
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            meta.softBg,
            meta.text,
            !row.comparable && "opacity-40",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>

        <div className={cn("min-w-0 flex-1", !row.comparable && "opacity-60")}>
          <p className="truncate text-sm font-medium">{row.label}</p>
          {onlyIn && (
            <p className="text-muted-foreground truncate text-xs">
              {blind
                ? "Only one version produced this"
                : `Only in ${ENGINE_VERSION_META[onlyIn].label} — nothing to compare`}
            </p>
          )}
        </div>

        {selected && (
          <Check className="text-brand size-4 shrink-0" aria-hidden />
        )}
      </button>
    </li>
  );
});
