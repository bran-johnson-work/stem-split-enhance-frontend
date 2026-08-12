"use client";

// All three versions' spectra on one log-frequency axis.
//
// Ported from `spectrum_figure` in the pipeline's Streamlit app. This is the plot
// that answers the question the metrics cannot: the cards report a cutoff moving
// from 21598Hz to 21703Hz, and only the curve tells you whether that is a real
// rebuilt high band or a rounding artifact on a file that already had one.
//
// Overlaid on one axis rather than stacked, because the whole content is *where
// the three curves diverge*. Separate panels would make a 3dB difference at 12kHz
// invisible.
//
// The dB values are not directly comparable to the Streamlit plot's — that one
// goes through librosa's STFT scaling and this one is a plain windowed transform
// — but every curve here is measured identically, so the comparison between them,
// which is the only thing being read, holds.

import * as React from "react";
import type { AudioAnalysis } from "@/lib/audio/analysis";
import { MIN_PLOT_HZ } from "@/lib/audio/analysis";

export interface SpectrumSeries {
  key: string;
  label: string;
  color: string;
  analysis: AudioAnalysis;
}

/** Series colours. Fixed hues rather than design tokens: these encode data
 *  identity, not chrome, and all three must stay distinguishable in both themes
 *  and from the brand red used everywhere else on the page. */
export const SERIES_COLORS = {
  original: "#3b82f6",
  v2: "#f59e0b",
  v3: "#ef4444",
} as const;

const VIEW_W = 1000;
const VIEW_H = 300;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

/** Anything below this is the noise floor of the transform, not signal. Clamping
 *  keeps a near-silent top octave from stretching the axis over 100dB of nothing. */
const DB_FLOOR = -110;

const GRID_HZ = [100, 1000, 10000];

function label(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
}

export function SpectrumCompare({ series }: { series: SpectrumSeries[] }) {
  const geometry = React.useMemo(() => {
    if (series.length === 0) return null;

    const nyquist = Math.max(...series.map((s) => s.analysis.sampleRate / 2));
    const logMin = Math.log10(MIN_PLOT_HZ);
    const logMax = Math.log10(nyquist);

    let dbMax = -Infinity;
    for (const s of series) {
      for (const v of s.analysis.spectrum.db) if (v > dbMax) dbMax = v;
    }
    const top = Math.ceil((dbMax + 6) / 10) * 10;
    const bottom = DB_FLOOR;

    const x = (hz: number) =>
      PAD.left +
      ((Math.log10(Math.max(hz, MIN_PLOT_HZ)) - logMin) / (logMax - logMin)) *
        (VIEW_W - PAD.left - PAD.right);
    const y = (db: number) =>
      PAD.top +
      (1 - (Math.max(db, bottom) - bottom) / (top - bottom)) *
        (VIEW_H - PAD.top - PAD.bottom);

    const paths = series.map((s) => {
      const { hz, db } = s.analysis.spectrum;
      let d = "";
      for (let i = 0; i < hz.length; i++) {
        if (hz[i] > nyquist) break;
        d += `${i === 0 ? "M" : "L"}${x(hz[i]).toFixed(1)} ${y(db[i]).toFixed(1)}`;
      }
      return { ...s, d };
    });

    const dbTicks: number[] = [];
    for (let v = top; v >= bottom; v -= 20) dbTicks.push(v);

    return { paths, x, y, dbTicks, nyquist };
  }, [series]);

  if (!geometry) return null;

  return (
    <div className="space-y-2">
      <div className="bg-muted/40 overflow-hidden rounded-md">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-72 w-full"
          role="img"
          aria-label="Frequency spectrum of each version"
        >
          {geometry.dbTicks.map((db) => (
            <g key={db}>
              <line
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={geometry.y(db)}
                y2={geometry.y(db)}
                className="stroke-muted-foreground/15"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={geometry.y(db) + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[9px]"
              >
                {db}
              </text>
            </g>
          ))}

          {GRID_HZ.filter((hz) => hz < geometry.nyquist).map((hz) => (
            <g key={hz}>
              <line
                x1={geometry.x(hz)}
                x2={geometry.x(hz)}
                y1={PAD.top}
                y2={VIEW_H - PAD.bottom}
                className="stroke-muted-foreground/15"
                strokeWidth={1}
              />
              <text
                x={geometry.x(hz)}
                y={VIEW_H - PAD.bottom + 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {label(hz)}
              </text>
            </g>
          ))}
          <text
            x={VIEW_W - PAD.right}
            y={VIEW_H - PAD.bottom + 14}
            textAnchor="end"
            className="fill-muted-foreground text-[9px]"
          >
            Hz
          </text>

          {geometry.paths.map((p) => (
            <path
              key={p.key}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={1.6}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-0.5 w-4 rounded"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-muted-foreground">{s.label}</span>
          </span>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        dB against frequency, log scale. Where the curves separate is what the run
        changed; where Version 3 extends past the others is rebuilt high end.
      </p>
    </div>
  );
}
