// The v1-vs-v2 comparison, shaped for the UI.
//
// Two jobs: name the engine versions in language a musician can act on, and pair
// each stem's two takes into one row.
//
// Naming matters more than it looks. "v1"/"v2" is meaningless to someone deciding
// which vocal take to use, but the raw version is still what support and the job
// record talk about — so each version carries a plain-language label *and* keeps its
// `v1`/`v2` tag visible in the details disclosure.

import { Layers, Sparkle, type LucideIcon } from "lucide-react";
import type {
  EngineRunConfig,
  EngineVersion,
  Stem,
  StemComparison,
  VersionOutput,
} from "@/lib/types";

export interface EngineVersionMeta {
  /** What the user reads. */
  label: string;
  /** One line on what makes this version different. */
  description: string;
  /** Single character for the compact A/B toggle. */
  initial: string;
  icon: LucideIcon;
  /** Literal class strings (one per version) so Tailwind v4's scanner keeps them. */
  text: string;
  softBg: string;
  /** Shown as a badge; the new engine is explicitly marked while it's rolling out. */
  beta?: boolean;
}

/**
 * "Precision" rather than "Enhanced" for v2: the delivery panel already ships an
 * "Enhanced master", and two different meanings of "enhanced" on one screen is how
 * a user ends up comparing the wrong two things.
 */
export const ENGINE_VERSION_META: Record<EngineVersion, EngineVersionMeta> = {
  v1: {
    label: "Standard",
    description: "Our established separation model.",
    initial: "A",
    icon: Layers,
    text: "text-separating",
    softBg: "bg-separating/15",
  },
  v2: {
    label: "Precision",
    description: "A newer model with cleaner vocal separation.",
    initial: "B",
    icon: Sparkle,
    text: "text-brand",
    softBg: "bg-brand/15",
    beta: true,
  },
};

/** One stem, with each version's take on it. A side is `null` when that version
 *  didn't produce the stem — a real answer, not a missing value. */
export interface ComparisonRow {
  /** Raw stem name, e.g. `vocals`. Stable across versions; used as the React key. */
  name: string;
  /** Display name, taken from whichever version has the stem. */
  label: string;
  takes: Record<EngineVersion, Stem | null>;
  /** True when both versions produced this stem, i.e. it is actually comparable. */
  comparable: boolean;
}

/**
 * Pair every stem name with each version's take.
 *
 * Built from the union of stem names rather than one version's list, because the
 * backend's content gate runs per model and legitimately keeps a quiet stem in one
 * version while dropping it from the other. Rendering only the intersection would
 * silently hide output the user paid for.
 */
export function comparisonRows(comparison: StemComparison): ComparisonRow[] {
  return comparison.stemNames.map((name) => {
    const takes = { v1: null, v2: null } as Record<EngineVersion, Stem | null>;
    for (const version of comparison.versions) {
      takes[version.version] = version.stems[name] ?? null;
    }
    const present = Object.values(takes).filter(
      (take): take is Stem => take !== null,
    );
    return {
      name,
      label: present[0]?.name ?? titleCase(name),
      takes,
      comparable: present.length > 1,
    };
  });
}

function titleCase(name: string): string {
  const words = name.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Versions in display order, v1 first, so the A/B toggle never reorders itself. */
export function orderedVersions(comparison: StemComparison): VersionOutput[] {
  const rank: Record<EngineVersion, number> = { v1: 0, v2: 1 };
  return [...comparison.versions].sort(
    (a, b) => rank[a.version] - rank[b.version],
  );
}

/**
 * The `Vocals: Mel-Band RoFormer · light · overlap 2` line behind "how was this
 * made". This is what keeps an A/B judgement interpretable later: the same version
 * rendered at a different overlap is a different artifact, and without the dials on
 * screen two runs look identical.
 */
export function configSummary(config: EngineRunConfig | null): string[] {
  if (!config) return [];
  return [
    config.vocalsModel ? `Vocals: ${config.vocalsModel}` : null,
    config.rhythmModel ? `Rhythm: ${config.rhythmModel}` : null,
    config.enhancementLevel ? `Post: ${config.enhancementLevel}` : null,
    config.overlap !== undefined ? `Overlap ${config.overlap}` : null,
    config.shifts !== undefined ? `Shifts ${config.shifts}` : null,
  ].filter((part): part is string => part !== null);
}
