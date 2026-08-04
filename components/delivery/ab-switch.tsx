"use client";

// The A/B control: which engine version is reaching the speakers.
//
// A segmented pair rather than two play buttons, because there is only one
// transport — both versions are already playing and this only chooses what you
// hear. Two play buttons would imply two independent players and invite the user to
// start both.
//
// Blind mode hides the labels behind "A"/"B". Knowing which side is the new model
// is enough to hear an improvement that isn't there, and this screen exists to
// decide whether the new model is actually better.

import * as React from "react";
import { ENGINE_VERSION_META } from "@/lib/delivery/comparison";
import type { EngineVersion } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AbSwitch({
  versions,
  active,
  blind,
  disabled,
  onSelect,
}: {
  versions: EngineVersion[];
  active: EngineVersion;
  /** Hide which side is which. */
  blind: boolean;
  disabled?: boolean;
  onSelect: (version: EngineVersion) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Which version to listen to"
      className="bg-muted/60 inline-flex items-center gap-1 rounded-lg p-1"
    >
      {versions.map((version) => {
        const meta = ENGINE_VERSION_META[version];
        const selected = version === active;
        return (
          <button
            key={version}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(version)}
            className={cn(
              "focus-visible:ring-ring/60 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
              "disabled:pointer-events-none disabled:opacity-50",
              selected
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("font-mono text-xs", selected && meta.text)}>
              {meta.initial}
            </span>
            {!blind && <span className="ml-2">{meta.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
