"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  billingGateway,
  DECLINE_TEST_CARD,
  IS_SIMULATED_GATEWAY,
} from "@/lib/billing/billing-gateway";
import { useSavePaymentMethod } from "@/lib/hooks/queries";
import {
  cardSchema,
  formatCardNumber,
  formatExpiry,
  parseExpiry,
  type CardValues,
} from "@/lib/validations/billing";

/**
 * Collects a card and hands it to the `BillingGateway` (lib/billing), which
 * returns a token the API attaches. With a real gateway this dialog is replaced
 * wholesale — Stripe Elements owns the fields, or the user is redirected to
 * Checkout — and the raw number never touches our code. That's the entire point
 * of the seam, so nothing here reaches past `billingGateway.collectCard`.
 */
export function CardDialog({
  open,
  onOpenChange,
  replacing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** There's already a card on file, so this one replaces it. */
  replacing: boolean;
}) {
  const savePaymentMethod = useSavePaymentMethod();
  const form = useForm<CardValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      number: "",
      expiry: "",
      cvc: "",
      postalCode: "",
    },
  });

  // Start clean every time — a half-typed card shouldn't survive a dismissal.
  React.useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  async function onSubmit(values: CardValues) {
    const expiry = parseExpiry(values.expiry);
    if (!expiry) return; // unreachable: the schema already rejected it

    try {
      const token = await billingGateway.collectCard({
        name: values.name,
        number: values.number,
        expMonth: expiry.month,
        expYear: expiry.year,
        cvc: values.cvc,
        postalCode: values.postalCode,
      });
      await savePaymentMethod.mutateAsync(token);
      onOpenChange(false);
      toast.success(replacing ? "Payment method updated." : "Card saved.");
    } catch (err) {
      // A decline is the gateway's to report — surface its message verbatim.
      toast.error(
        err instanceof Error ? err.message : "Couldn't save that card.",
      );
    }
  }

  const { isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {replacing ? "Update payment method" : "Add a payment method"}
          </DialogTitle>
          <DialogDescription>
            {replacing
              ? "The new card replaces the one on file and is used for your next renewal."
              : "Used for your subscription renewals. You can remove it at any time."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name on card</FormLabel>
                  <FormControl>
                    <Input autoComplete="cc-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card number</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="4242 4242 4242 4242"
                      {...field}
                      // Group the digits as they're typed. The schema strips the
                      // spaces again before anything downstream sees the value.
                      onChange={(e) =>
                        field.onChange(formatCardNumber(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        {...field}
                        onChange={(e) =>
                          field.onChange(formatExpiry(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cvc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CVC</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        maxLength={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing postcode</FormLabel>
                  <FormControl>
                    <Input autoComplete="billing postal-code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-muted-foreground flex items-start gap-2 text-xs">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {IS_SIMULATED_GATEWAY ? (
                <span>
                  No payment provider is connected, so this card is simulated and
                  never leaves your browser. Use{" "}
                  <code className="font-mono">{DECLINE_TEST_CARD}</code> to see
                  the declined state.
                </span>
              ) : (
                <span>
                  Your card is encrypted and handled by our payment provider. We
                  never store the number.
                </span>
              )}
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {replacing ? "Update card" : "Save card"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
