"use client";

import { DangerZone } from "@/components/settings/danger-zone";
import { PasswordForm } from "@/components/settings/password-form";
import { PreferencesCard } from "@/components/settings/preferences-card";
import { ProfileForm } from "@/components/settings/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/lib/hooks/queries";

export function SettingsView() {
  const { data: user, isLoading, isError } = useCurrentUser();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Account settings"
        description="Manage your profile, password and preferences."
      />

      {isLoading && <SettingsSkeleton />}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your account</AlertTitle>
          <AlertDescription>
            Refresh the page to try again. If it keeps happening, sign out and
            back in.
          </AlertDescription>
        </Alert>
      )}

      {user && (
        <>
          {/* Keyed on the user so the forms re-seed their defaults if the
              cached user is replaced (e.g. after a refetch). */}
          <ProfileForm key={user.email} user={user} />
          <PasswordForm />
          <PreferencesCard />
          <DangerZone user={user} />
        </>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-9 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
