import type {
  AdminUserRow,
  Invoice,
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
    priceMonthly: 12,
    priceAnnual: 120,
    description: "For hobbyists and growing creators.",
    features: ["50 uploads / mo", "HQ stems", "WAV downloads", "Enhanced master"],
    uploadsPerMonth: 50,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    priceAnnual: 290,
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
    priceMonthly: 79,
    priceAnnual: 790,
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
  email: "alfie@klearnote.ai",
  role: "admin",
  createdAt: iso(120 * DAY),
  subscription: {
    planId: "pro",
    status: "active",
    renewsAt: iso(-18 * DAY),
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
];

export const INVOICES: Invoice[] = [
  { id: "in_9001", date: iso(12 * DAY), amount: 29, status: "paid", url: "#" },
  { id: "in_9000", date: iso(42 * DAY), amount: 29, status: "paid", url: "#" },
  { id: "in_8999", date: iso(72 * DAY), amount: 29, status: "paid", url: "#" },
];

export const ADMIN_USERS: AdminUserRow[] = [
  {
    id: "u_1",
    name: "Alfie Martin",
    email: "alfie@klearnote.ai",
    role: "admin",
    planId: "pro",
    projectCount: 12,
    status: "active",
    createdAt: iso(120 * DAY),
  },
  {
    id: "u_2",
    name: "Dakota Reyes",
    email: "dakota@klearnote.ai",
    role: "admin",
    planId: "studio",
    projectCount: 31,
    status: "active",
    createdAt: iso(110 * DAY),
  },
  {
    id: "u_3",
    name: "Jordan Blake",
    email: "jordan@example.com",
    role: "user",
    planId: "creator",
    projectCount: 7,
    status: "active",
    createdAt: iso(40 * DAY),
  },
  {
    id: "u_4",
    name: "Sam Okafor",
    email: "sam@example.com",
    role: "user",
    planId: "free",
    projectCount: 2,
    status: "suspended",
    createdAt: iso(9 * DAY),
  },
];
