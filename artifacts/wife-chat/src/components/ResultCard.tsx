import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  value: string;
  tone?: "default" | "primary" | "soft" | "warn";
  multiline?: boolean;
};

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  default: "border-border bg-card",
  primary: "border-primary/30 bg-primary/5",
  soft: "border-amber-200 bg-amber-50",
  warn: "border-rose-200 bg-rose-50",
};

export function ResultCard({ label, value, tone = "default", multiline = true }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={copy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <p className={`text-sm leading-relaxed text-foreground ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function ListCard({ label, items }: { label: string; items: string[] }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(items.map((s) => `• ${s}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={copy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 inline-block h-1.5 w-1.5 flex-none rounded-full bg-primary/60" />
            <span className="whitespace-pre-wrap">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={copy}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}
