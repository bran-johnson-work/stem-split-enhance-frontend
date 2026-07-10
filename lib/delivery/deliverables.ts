// What a completed project hands back: its separated stems plus the enhanced
// master. `StemKind` already includes `"master"`, so the master is modelled as
// just another `Stem` — the delivery UI renders one row type for everything.
//
// Stem colors mirror the marketing hero's stem lanes
// (components/marketing/stem-player.tsx) so the product delivers on exactly the
// visual promise the landing page makes.

import {
  AudioWaveform,
  Drum,
  Mic2,
  Music,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { formatBytes, formatDuration } from "@/lib/format";
import type { Project, Stem, StemKind } from "@/lib/types";

export interface StemMeta {
  label: string;
  /** One-line description of what this file contains. */
  description: string;
  icon: LucideIcon;
  /** Literal class strings (one per kind) so Tailwind v4's scanner keeps them. */
  text: string;
  softBg: string;
}

export const STEM_META: Record<StemKind, StemMeta> = {
  master: {
    label: "Enhanced master",
    description: "The full mix, cleaned and mastered.",
    icon: Sparkles,
    text: "text-brand",
    softBg: "bg-brand/15",
  },
  vocals: {
    label: "Vocals",
    description: "Lead and backing vocals, isolated.",
    icon: Mic2,
    text: "text-analyzing",
    softBg: "bg-analyzing/15",
  },
  drums: {
    label: "Drums",
    description: "The full drum kit and percussion.",
    icon: Drum,
    text: "text-mastering",
    softBg: "bg-mastering/15",
  },
  bass: {
    label: "Bass",
    description: "Bass guitar and sub-bass.",
    icon: AudioWaveform,
    text: "text-separating",
    softBg: "bg-separating/15",
  },
  other: {
    label: "Other",
    description: "Everything else — keys, guitars, synths.",
    icon: Music,
    text: "text-cleaning",
    softBg: "bg-cleaning/15",
  },
};

/**
 * The master as a `Stem`, synthesized from `project.masterUrl`. The API reports
 * no size for it, hence `sizeBytes: 0` — rows render size as `—` when it's zero.
 */
export function masterDeliverable(project: Project): Stem | null {
  if (!project.masterUrl) return null;
  return {
    id: `${project.id}-master`,
    name: STEM_META.master.label,
    kind: "master",
    url: project.masterUrl,
    sizeBytes: 0,
    durationSec: project.durationSec,
  };
}

/**
 * Everything downloadable for a project, master first. A backend may deliver the
 * master as a `kind: "master"` entry in `stems` rather than via `masterUrl` — if
 * it does, that entry wins and we don't synthesize a duplicate.
 */
export function deliverables(project: Project): Stem[] {
  const { master, stems } = splitDeliverables(project);
  return master ? [master, ...stems] : stems;
}

/**
 * The same set, split by role. The KN-44 player needs these apart, not flattened:
 * the stems share one synced transport, while the master is an exclusive
 * reference player (playing it against the stem bus would double the mix).
 */
export function splitDeliverables(project: Project): {
  master: Stem | null;
  stems: Stem[];
} {
  const explicitMaster = project.stems.find((s) => s.kind === "master");
  return {
    master: explicitMaster ?? masterDeliverable(project),
    stems: project.stems.filter((s) => s.kind !== "master"),
  };
}

/**
 * The `WAV · 28 MB · 3:32` metadata line, also folded into the download button's
 * accessible name. The master carries no size from the API, so that part is
 * omitted rather than rendered as "0 B".
 */
export function stemDetails(stem: Stem): string[] {
  return [
    fileExtension(stem.url).toUpperCase(),
    stem.sizeBytes ? formatBytes(stem.sizeBytes) : null,
    stem.durationSec ? formatDuration(stem.durationSec) : null,
  ].filter((part): part is string => part !== null);
}

const EXTENSION = /\.([a-z0-9]{1,5})(?:\?.*)?$/i;

/** File extension from a (possibly signed, query-carrying) URL. */
export function fileExtension(url: string, fallback = "wav"): string {
  return url.match(EXTENSION)?.[1].toLowerCase() ?? fallback;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "track"
  );
}

/** e.g. `midnight-drive-master-vocals.wav` — what the file saves as. */
export function downloadFilename(project: Project, stem: Stem): string {
  return `${slugify(project.title)}-${stem.kind}.${fileExtension(stem.url)}`;
}
