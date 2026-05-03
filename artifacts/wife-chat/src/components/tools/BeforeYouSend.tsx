import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResultCard } from "@/components/ResultCard";
import { coach, CoachError, type BeforeSendResult } from "@/lib/coach";

const PLACEHOLDER = `e.g. I can't believe you forgot again. You never listen to me. I'm so done with this.`;

export function BeforeYouSend() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BeforeSendResult | null>(null);

  async function run() {
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await coach.beforeSend(text);
      setResult(r);
    } catch (err) {
      setError(err instanceof CoachError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="bys-input" className="text-sm font-medium">
          The message you're about to send
        </Label>
        <Textarea
          id="bys-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={5}
          maxLength={4000}
          className="resize-none bg-background"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{message.length}/4000</span>
          <span>Sent to the assistant to generate a response. Not saved to a WifeChat account.</span>
        </div>
      </div>

      <Button
        type="button"
        onClick={run}
        disabled={loading || !message.trim()}
        className="w-full sm:w-auto"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {loading ? "Reworking…" : "Help me say this better"}
      </Button>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!loading && !error && !result && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Paste what you wanted to send. We'll give you four versions, plus what's underneath it.
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <ResultCard tone="primary" label="Better version" value={result.better} />
          <div className="grid gap-3 sm:grid-cols-2">
            <ResultCard label="Softer" value={result.softer} />
            <ResultCard label="Direct" value={result.direct} />
          </div>
          <ResultCard label="Short text" value={result.shortText} />
          <div className="grid gap-3 sm:grid-cols-2">
            <ResultCard tone="soft" label="How it might land" value={result.howItMightLand} />
            <ResultCard tone="soft" label="The real need underneath" value={result.realNeed} />
          </div>
          <ResultCard tone="warn" label="One thing to avoid saying" value={result.oneThingToAvoid} />
        </div>
      )}
    </div>
  );
}
