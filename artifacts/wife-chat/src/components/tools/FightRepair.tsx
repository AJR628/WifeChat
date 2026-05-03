import { useState } from "react";
import { Loader2, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResultCard } from "@/components/ResultCard";
import { coach, CoachError, type RepairResult } from "@/lib/coach";

const PLACEHOLDER = `e.g. We were trying to plan the weekend. I asked if she'd called her mom yet, she said I was nagging, I said I always have to remember everything. It ended with her walking out of the kitchen.`;

export function FightRepair() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepairResult | null>(null);

  async function run() {
    const text = description.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await coach.repair(text);
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
        <Label htmlFor="repair-input" className="text-sm font-medium">
          What happened?
        </Label>
        <Textarea
          id="repair-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          maxLength={4000}
          className="resize-none bg-background"
        />
        <p className="text-xs text-muted-foreground">
          Tell it like it was. We won't take sides.
        </p>
      </div>

      <Button type="button" onClick={run} disabled={loading || !description.trim()} className="w-full sm:w-auto">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HeartHandshake className="mr-2 h-4 w-4" />}
        {loading ? "Working on repair…" : "Help me repair this"}
      </Button>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!loading && !error && !result && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Describe the fight. We'll help you see it neutrally and find one thing to send.
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <ResultCard label="Neutral summary" value={result.neutralSummary} />
          <div className="grid gap-3 sm:grid-cols-2">
            <ResultCard tone="soft" label="What you may have felt" value={result.yourSideMayHaveFelt} />
            <ResultCard tone="soft" label="What they may have felt" value={result.partnerSideMayHaveFelt} />
          </div>
          <ResultCard label="Where it derailed" value={result.whereItDerailed} />
          <ResultCard tone="primary" label="Repair message you could send" value={result.repairMessage} />
          <div className="grid gap-3 sm:grid-cols-2">
            <ResultCard label="A question to ask later" value={result.questionToAskLater} />
            <ResultCard label="Next best action" value={result.nextBestAction} />
          </div>
        </div>
      )}
    </div>
  );
}
