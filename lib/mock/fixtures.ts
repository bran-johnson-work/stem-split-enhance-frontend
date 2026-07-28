import type {
  AdminOverview,
  AdminProject,
  AdminProjectStatus,
  AdminRevenue,
  AdminTrendPoint,
  AdminUser,
  Invoice,
  PaymentMethod,
  Plan,
  Project,
  Stem,
  User,
} from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

function stems(prefix: string, durationSec: number): Stem[] {
  const kinds = [
    { kind: "vocals", name: "Vocals", size: 28_400_000 },
    { kind: "drums", name: "Drums", size: 24_100_000 },
    { kind: "bass", name: "Bass", size: 19_700_000 },
    { kind: "other", name: "Other", size: 22_300_000 },
  ] as const;
  return kinds.map((k, i) => ({
    id: `${prefix}-stem-${i}`,
    name: k.name,
    kind: k.kind,
    url: `/mock/${prefix}/${k.kind}.wav`,
    sizeBytes: k.size,
    durationSec,
  }));
}

function completed(
  id: string,
  title: string,
  sourceFileName: string,
  sourceSizeBytes: number,
  durationSec: number,
  createdMsAgo: number,
): Project {
  return {
    id,
    title,
    status: "completed",
    progress: 100,
    createdAt: iso(createdMsAgo),
    updatedAt: iso(createdMsAgo - 7 * 60 * 1000),
    sourceFileName,
    sourceSizeBytes,
    durationSec,
    stems: stems(id, durationSec),
    masterUrl: `/mock/${id}/master.wav`,
  };
}

// Annual is priced at 10× the monthly rate across every paid tier — two months
// free, which is what the pricing FAQ promises. The "Save ~17%" badge and the
// effective-monthly figures on the plan cards are derived from these two numbers,
// so this is the only place a price lives.
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Trial",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "Try KlearNote with a few tracks.",
    features: ["3 uploads", "Standard stems", "MP3 downloads"],
    uploadsPerMonth: 3,
  },
  {
    id: "creator",
    name: "Creator",
    priceMonthly: 39,
    priceAnnual: 390,
    description: "For hobbyists and growing creators.",
    features: [
      "50 uploads / mo",
      "HQ stem separation",
      "WAV + MP3 downloads",
      "Enhanced mastering",
      "Email support",
    ],
    uploadsPerMonth: 50,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 79,
    priceAnnual: 790,
    description: "For professionals who ship constantly.",
    features: [
      "Unlimited uploads",
      "Lossless stems",
      "Priority processing",
      "Advanced mastering",
    ],
    highlighted: true,
    uploadsPerMonth: "unlimited",
  },
  {
    id: "studio",
    name: "Studio",
    priceMonthly: 129,
    priceAnnual: 1290,
    description: "For teams and studios at scale.",
    features: [
      "Everything in Pro",
      "Team seats",
      "API access",
      "Dedicated support",
    ],
    uploadsPerMonth: "unlimited",
  },
];

export const CURRENT_USER: User = {
  id: "u_1",
  name: "Alfie Martin",
  email: "amart@klearnote.ai",
  role: "admin",
  createdAt: iso(120 * DAY),
  // A brand-new account starts on the free plan with no card and nothing to
  // renew. This is also the subscription `mapUser` (lib/api/auth) stamps onto a
  // real backend user, so a just-registered user lands here — not on a paid
  // plan. Upgrading (plan picker) mutates this in place; see MockApi.changePlan.
  subscription: {
    planId: "free",
    status: "active",
    cycle: "monthly",
    renewsAt: iso(-30 * DAY), // unused on the free plan (nothing renews)
  },
};

export const PROJECTS: Project[] = [
  {
    id: "p_1001",
    title: "Midnight Drive — Master",
    status: "completed",
    progress: 100,
    createdAt: iso(2 * DAY),
    updatedAt: iso(2 * DAY - 6 * 60 * 1000),
    sourceFileName: "midnight-drive.wav",
    sourceSizeBytes: 84_300_000,
    durationSec: 212,
    stems: stems("p_1001", 212),
    masterUrl: "/mock/p_1001/master.wav",
  },
  {
    id: "p_1002",
    title: "Neon Skyline",
    status: "mastering",
    progress: 82,
    createdAt: iso(0.2 * DAY),
    updatedAt: iso(2 * 60 * 1000),
    sourceFileName: "neon-skyline.mp3",
    sourceSizeBytes: 9_800_000,
    durationSec: 188,
    stems: [],
  },
  {
    id: "p_1003",
    title: "Lo-Fi Sketch 04",
    status: "separating",
    progress: 41,
    createdAt: iso(0.05 * DAY),
    updatedAt: iso(30 * 1000),
    sourceFileName: "lofi-sketch-04.wav",
    sourceSizeBytes: 51_200_000,
    durationSec: 142,
    stems: [],
  },
  {
    id: "p_1004",
    title: "Anthem (Demo)",
    status: "failed",
    progress: 0,
    createdAt: iso(5 * DAY),
    updatedAt: iso(5 * DAY - 60 * 1000),
    sourceFileName: "anthem-demo.aiff",
    sourceSizeBytes: 132_000_000,
    durationSec: 0,
    stems: [],
    error: "Unsupported sample rate. Re-export at 44.1kHz and try again.",
  },
  {
    id: "p_1005",
    title: "Summer Haze",
    status: "queued",
    progress: 0,
    createdAt: iso(0.01 * DAY),
    updatedAt: iso(0.01 * DAY),
    sourceFileName: "summer-haze.wav",
    sourceSizeBytes: 67_500_000,
    durationSec: 176,
    stems: [],
  },
  {
    id: "p_1006",
    title: "Velvet Static",
    status: "analyzing",
    progress: 12,
    createdAt: iso(0.03 * DAY),
    updatedAt: iso(0.02 * DAY),
    sourceFileName: "velvet-static.mp3",
    sourceSizeBytes: 8_200_000,
    durationSec: 201,
    stems: [],
  },
  completed("p_1007", "Golden Hour", "golden-hour.wav", 72_900_000, 198, 1 * DAY),
  completed("p_1008", "Paper Planes", "paper-planes.mp3", 7_400_000, 167, 1.4 * DAY),
  {
    id: "p_1009",
    title: "Undertow",
    status: "cleaning",
    progress: 63,
    createdAt: iso(0.08 * DAY),
    updatedAt: iso(0.01 * DAY),
    sourceFileName: "undertow.flac",
    sourceSizeBytes: 41_800_000,
    durationSec: 233,
    stems: [],
  },
  completed("p_1010", "Cassette Dreams", "cassette-dreams.wav", 61_200_000, 184, 3 * DAY),
  completed("p_1011", "City Lights", "city-lights.mp3", 9_100_000, 205, 4 * DAY),
  {
    id: "p_1012",
    title: "Broken Radio",
    status: "failed",
    progress: 0,
    createdAt: iso(4.5 * DAY),
    updatedAt: iso(4.5 * DAY - 90 * 1000),
    sourceFileName: "broken-radio.m4a",
    sourceSizeBytes: 14_600_000,
    durationSec: 0,
    stems: [],
    error: "Corrupted audio stream. Re-export and upload the file again.",
  },
  completed("p_1013", "Slow Burn", "slow-burn.wav", 78_500_000, 221, 6 * DAY),
  completed("p_1014", "Northern Trail", "northern-trail.wav", 69_300_000, 176, 8 * DAY),
  {
    id: "p_1015",
    title: "Afterglow",
    status: "mastering",
    progress: 88,
    createdAt: iso(0.15 * DAY),
    updatedAt: iso(3 * 60 * 1000),
    sourceFileName: "afterglow.wav",
    sourceSizeBytes: 55_400_000,
    durationSec: 192,
    stems: [],
  },
  completed("p_1016", "Ember", "ember.mp3", 8_800_000, 158, 9 * DAY),
  completed("p_1017", "Glass Ocean", "glass-ocean.wav", 74_100_000, 214, 11 * DAY),
  completed("p_1018", "Parallel Lines", "parallel-lines.flac", 47_900_000, 189, 13 * DAY),
  completed("p_1019", "Ghost Notes", "ghost-notes.wav", 66_700_000, 172, 16 * DAY),
  completed("p_1020", "Midnight Loop", "midnight-loop.mp3", 7_900_000, 163, 19 * DAY),
  completed("p_1021", "Static Bloom", "static-bloom.wav", 71_600_000, 207, 23 * DAY),
  completed("p_1022", "Low Tide", "low-tide.wav", 63_400_000, 181, 28 * DAY),
  // Completed, but nothing was produced — exercises the delivery empty state
  // (KN-43), which is also what the real backend returns today (no stems yet).
  {
    id: "p_1023",
    title: "Field Recording",
    status: "completed",
    progress: 100,
    createdAt: iso(31 * DAY),
    updatedAt: iso(31 * DAY - 4 * 60 * 1000),
    sourceFileName: "field-recording.wav",
    sourceSizeBytes: 22_500_000,
    durationSec: 96,
    stems: [],
  },
];

// A new free-plan account has no billing history. MockApi prepends to this list
// when an upgrade bills immediately, so receipts appear once the user actually
// subscribes to a paid plan.
export const INVOICES: Invoice[] = [];

/**
 * Billing state MockApi mutates in place (a card can be added, replaced and
 * removed). Wrapped in an object because an exported `let` can't be reassigned
 * across module boundaries. Resets on a full page reload, like PROJECTS.
 */
export const BILLING_STATE: { paymentMethod: PaymentMethod | null } = {
  // No card on file by default — a free-plan account hasn't entered one. A card
  // is attached only when the user adds one (plan picker / payment method card).
  paymentMethod: null,
};

export const ADMIN_USERS: AdminUser[] = [
  {
    id: "u_1",
    name: "Alfie Martin",
    email: "amart@klearnote.ai",
    role: "admin",
    isActive: true,
    isVerified: true,
    createdAt: iso(120 * DAY),
  },
  {
    id: "u_2",
    name: "Dakota Reyes",
    email: "dakota@klearnote.ai",
    role: "admin",
    isActive: true,
    isVerified: true,
    createdAt: iso(110 * DAY),
  },
  {
    id: "u_3",
    name: "Jordan Blake",
    email: "jordan@example.com",
    role: "user",
    isActive: true,
    isVerified: true,
    createdAt: iso(40 * DAY),
  },
  {
    id: "u_4",
    name: "Sam Okafor",
    email: "sam@example.com",
    role: "user",
    isActive: false,
    isVerified: false,
    createdAt: iso(9 * DAY),
  },
];

// Admin project rows for mock mode — derived from PROJECTS so the monitor looks
// alive without a backend. The app's finer client statuses collapse back onto
// the backend `AdminProjectStatus` the real endpoint would send.
const ADMIN_STATUS_FROM_PROJECT: Record<Project["status"], AdminProjectStatus> = {
  queued: "queued",
  analyzing: "processing",
  separating: "processing",
  cleaning: "processing",
  mastering: "processing",
  completed: "completed",
  failed: "failed",
};

export const ADMIN_PROJECTS: AdminProject[] = PROJECTS.map((p) => ({
  id: p.id,
  userId: CURRENT_USER.id,
  ownerEmail: CURRENT_USER.email,
  name: p.title,
  status: ADMIN_STATUS_FROM_PROJECT[p.status],
  outputFileCount: p.stems.length,
  hasOutputs: p.stems.length > 0,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
}));

// --- Admin dashboard stats (mock GET /admin/stats/*) ----------------------
// Plausible platform aggregates so the admin dashboard looks alive with no
// backend. Money is in whole dollars, matching the mapped domain type.

export const ADMIN_OVERVIEW: AdminOverview = {
  users: { total: 1284, active: 1197, verified: 1120, admins: 2 },
  projects: {
    total: 3921,
    byStatus: {
      pending: 14,
      uploading: 6,
      queued: 22,
      processing: 9,
      completed: 3798,
      failed: 72,
    },
  },
  jobs: {
    total: 3905,
    byStatus: { pending: 22, processing: 9, completed: 3802, failed: 72 },
  },
  subscriptions: {
    total: 486,
    active: 431,
    byStatus: {
      trialing: 38,
      active: 431,
      past_due: 9,
      cancelled: 6,
      incomplete: 2,
      incomplete_expired: 0,
    },
  },
};

export const ADMIN_REVENUE: AdminRevenue = {
  mrr: 6187,
  arr: 74244,
  activePaidSubscriptions: 393,
  currency: "usd",
  byPlan: [
    { planName: "pro", displayName: "Pro", activeSubscriptions: 168, mrr: 3360 },
    { planName: "studio", displayName: "Studio", activeSubscriptions: 61, mrr: 2379 },
    { planName: "creator", displayName: "Creator", activeSubscriptions: 164, mrr: 1640 },
    { planName: "free", displayName: "Free", activeSubscriptions: 38, mrr: 0 },
  ],
};

/** 30 days of deterministic-but-organic signup/creation activity, ending today. */
export const ADMIN_TRENDS: AdminTrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const daysAgo = 29 - i;
  const date = new Date(now - daysAgo * DAY).toISOString().slice(0, 10);
  // A gentle wave + weekly dip so the chart reads like real traffic.
  const wave = Math.sin(i / 3) * 4;
  const weekend = i % 7 === 5 || i % 7 === 6 ? 0.5 : 1;
  const signups = Math.max(0, Math.round((10 + wave) * weekend));
  const projectsCreated = Math.max(0, Math.round((26 + wave * 2) * weekend));
  return { date, signups, projectsCreated };
});
