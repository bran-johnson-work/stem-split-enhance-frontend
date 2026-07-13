"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import {
  getPreferences,
  getServerPreferences,
  setPreference,
  subscribePreferences,
} from "@/lib/preferences/preferences-store";
import type { NotificationPrefs } from "@/lib/types";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const NOTIFICATIONS: {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
}[] = [
  {
    key: "processingComplete",
    label: "Processing complete",
    description: "Email me when a track finishes and the stems are ready.",
  },
  {
    key: "processingFailed",
    label: "Processing failed",
    description: "Email me if a track fails so I can retry it.",
  },
  {
    key: "productUpdates",
    label: "Product updates",
    description: "Occasional news about new KlearNote features.",
  },
];

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // next-themes only knows the stored theme in the browser; rendering the
  // selected state on the server would mismatch the hydrated HTML.
  const hydrated = useHydrated();

  if (!hydrated) return <Skeleton className="h-9 w-60" />;

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
      {THEMES.map(({ value, label, icon: Icon }) => {
        const selected = theme === value;
        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            onClick={() => setTheme(value)}
          >
            <Icon />
            {label}
          </Button>
        );
      })}
    </div>
  );
}

export function PreferencesCard() {
  const prefs = React.useSyncExternalStore(
    subscribePreferences,
    getPreferences,
    getServerPreferences,
  );

  function toggle(key: keyof NotificationPrefs, value: boolean) {
    setPreference(key, value);
    toast.success("Preferences saved.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          How KlearNote looks, and when it emails you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Theme</Label>
          <ThemePicker />
        </div>

        <Separator />

        <div className="space-y-4">
          <Label>Email notifications</Label>
          {NOTIFICATIONS.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-start justify-between gap-4 sm:items-center"
            >
              <div className="space-y-0.5">
                <Label htmlFor={key} className="font-normal">
                  {label}
                </Label>
                <p className="text-muted-foreground text-sm">{description}</p>
              </div>
              <Switch
                id={key}
                checked={prefs[key]}
                onCheckedChange={(checked) => toggle(key, checked)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
