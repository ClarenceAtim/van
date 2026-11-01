"use client";

import { cloneElement, isValidElement, useId, type ReactElement } from "react";
import { Label } from "@/components/ui/label";

type ControlProps = { id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

/** Label + control + error message, wired together for screen readers. */
export function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string[]; hint?: string; children: ReactElement<ControlProps> }) {
  const id = `${useId()}-${name}`;
  const describedBy = [hint ? `${id}-hint` : null, error?.length ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {isValidElement(children) ? cloneElement(children, { id, "aria-invalid": !!error?.length, "aria-describedby": describedBy }) : children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error?.length ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}
