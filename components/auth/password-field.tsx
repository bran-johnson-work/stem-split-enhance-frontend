"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  autoComplete,
  autoFocus,
  labelRight,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  autoComplete?: string;
  autoFocus?: boolean;
  labelRight?: React.ReactNode;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>{label}</FormLabel>
            {labelRight}
          </div>
          <div className="relative">
            <FormControl>
              <Input
                type={show ? "text" : "password"}
                autoComplete={autoComplete}
                autoFocus={autoFocus}
                className="pr-10"
                {...field}
              />
            </FormControl>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
