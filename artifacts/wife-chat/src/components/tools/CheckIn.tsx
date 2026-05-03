import { useState } from "react";
import { Loader2, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResultCard } from "@/components/ResultCard";
import { coach, CoachError, type CheckInResult } from "@/lib/coach";

export function CheckIn() {
  const [mood, setMood] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [friction, setFriction] = useState("");
  const [want, setWant] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);

  const canSubmit = (mood.trim() || gratitude.trim() || friction.trim() || want.trim()) && !loading;

  async function run() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await coach.checkin({
        mood: mood.trim(),
        gratitude: gratitude.trim(),
        friction: friction.trim(),
        want: want.trim(),
      });
      setResult(r);
    } catch (err) {
      setError(err instanceof CoachError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { id: "mood", label: "How are you feeling today?", placeholder: "e.g. Tired but okay. A bit lonely.", value: mood, set: setMood },
    { id: "grat", label: "Something you appreciate about your partner", placeholder: "e.g. He made coffee without me asking.", value: gratitude, set: setGratitude },
    { id: "fric", label: "A small friction or unmet need", placeholder: "e.g. We haven't really talked all week.", value: friction, set: setFriction },
    { id: "want", label: "What you'd like more of", placeholder: "e.g. Five quiet minutes together at night.", value: want, set: setWant },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <Label htmlFor={f.id} className="text-sm">{f.label}</Label>
            <Textarea
              id={f.id}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.placeholder}
              rows={3}
              maxLength={1000}
              className="resize-none"
            />
          </div>
        ))}
      </div>

      <Button type="button" onClick={run} disabled={!canSubmit} className="w-full sm:w-auto">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sun className="mr-2 h-4 w-4" />}
        {loading ? "Reflecting…" : "Generate today's check-in"}
      </Button>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!loading && !error && !result && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Fill in any field that fits today. You'll get one private reflection, one optional message, and one tiny action.
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <ResultCard tone="primary" label="A reflection just for you" value={result.reflection} />
          <ResultCard tone="soft" label="Optional message to send your partner" value={result.partnerMessage} />
          <ResultCard label="One tiny connection action" value={result.connectionAction} />
        </div>
      )}
    </div>
  );
}
