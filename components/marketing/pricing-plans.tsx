"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth/auth-context";
import {
  annualSavings,
  monthlyEquivalent,
  topAnnualDiscount,
  uploadsLabel,
} from "@/lib/billing/plans";
import { usePlans } from "@/lib/hooks/queries";
import { cn } from "@/lib/utils";

export function PricingPlans() {
  const { data: plans, isLoading } = usePlans();
  const { isAuthenticated } = useAuth();
  const [annual, setAnnual] = React.useState(false);

  const discount = plans ? topAnnualDiscount(plans) : 0;
  const cycle = annual ? "annual" : "monthly";

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-center gap-3">
        <Label htmlFor="billing-cycle" className="text-sm">
          Monthly
        </Label>
        <Switch
          id="billing-cycle"
          checked={annual}
          onCheckedChange={setAnnual}
        />
        <Label htmlFor="billing-cycle" className="text-sm">
          Annual
        </Label>
        {discount > 0 && (
          <Badge variant="secondary" className="text-brand">
            Save ~{discount}%
          </Badge>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))
          : plans?.map((plan, i) => {
              const isFree = plan.priceMonthly === 0;
              // Annual headline shows the effective monthly rate; the full
              // annual charge moves to a sub-line.
              const headline = monthlyEquivalent(plan, cycle);
              const savings = annualSavings(plan);
              // Signed-in visitors go straight to the plan picker on /billing,
              // carrying the cycle they toggled so it isn't lost (annual vs
              // monthly changes what checkout charges); everyone else signs up first.
              const href =
                isAuthenticated && !isFree
                  ? `/billing?plan=${plan.id}&cycle=${cycle}`
                  : "/signup";

              return (
                <Reveal key={plan.id} delay={i * 80} className="h-full">
                  <Card
                    className={cn(
                      "flex h-full flex-col transition-transform",
                      plan.highlighted &&
                        "border-brand shadow-lg ring-1 ring-brand/30 lg:-translate-y-2 lg:scale-[1.02]",
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{plan.name}</CardTitle>
                        {plan.highlighted && (
                          <Badge className="bg-brand">Popular</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {plan.description}
                      </p>

                      {isFree ? (
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-4xl font-semibold">Free</span>
                          <span className="text-muted-foreground text-sm">
                            forever
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-4xl font-semibold">
                              ${headline}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              /mo
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-1 h-5 text-xs">
                            {annual ? (
                              <>
                                Billed ${plan.priceAnnual}/yr
                                {savings > 0 && (
                                  <span className="text-brand font-medium">
                                    {" "}
                                    · Save ${savings}
                                  </span>
                                )}
                              </>
                            ) : (
                              "Billed monthly"
                            )}
                          </p>
                        </>
                      )}

                      <p className="text-foreground mt-3 text-sm font-medium">
                        {uploadsLabel(plan.uploadsPerMonth)}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <ul className="space-y-2.5">
                        {plan.features.map((feat) => (
                          <li
                            key={feat}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Check className="text-brand mt-0.5 size-4 shrink-0" />
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={plan.highlighted ? "default" : "outline"}
                        asChild
                      >
                        <Link href={href}>
                          {isFree ? "Start free" : `Choose ${plan.name}`}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </Reveal>
              );
            })}
      </div>
    </div>
  );
}
