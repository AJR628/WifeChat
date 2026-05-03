import { useState } from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultCard, ListCard, CopyButton } from "@/components/ResultCard";
import { coach, CoachError, type PlannerResult } from "@/lib/coach";

export function Planner() {
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [fear, setFear] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlannerResult | null>(null);

  const canSubmit = topic.trim() && goal.trim() && desiredOutcome.trim() && !loading;

  async function run() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await coach.planner({
        topic: topic.trim(),
        goal: goal.trim(),
        fear: fear.trim(),
        desiredOutcome: desiredOutcome.trim(),
      });
      setResult(r);
    } catch (err) {
      setError(err instanceof CoachError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Splitting weekend childcare more fairly"
            maxLength={300}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal">Your goal in this conversation</Label>
          <Input
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Be heard without it turning into a fight"
            maxLength={300}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fear">What you're afraid could happen <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="fear"
            value={fear}
            onChange={(e) => setFear(e.target.value)}
            placeholder="e.g. She'll feel attacked and shut down"
            rows={3}
            maxLength={1000}
            className="resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="outcome">Desired outcome</Label>
          <Textarea
            id="outcome"
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            placeholder="e.g. Agree on one specific change to try this week"
            rows={3}
            maxLength={1000}
            className="resize-none"
          />
        </div>
      </div>

      <Button type="button" onClick={run} disabled={!canSubmit} className="w-full sm:w-auto">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
        {loading ? "Planning…" : "Plan the conversation"}
      </Button>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {!loading && !error && !result && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Fill in the topic, your goal, and the outcome you want. We'll prep an opener, key points, and calm replies.
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <ResultCard tone="primary" label="Opener" value={result.opener} />
          <ListCard label="Three key points to land" items={result.keyPoints} />
          <ListCard label="Likely sensitive spots" items={result.sensitiveSpots} />

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              If they say… you can say
            </p>
            <div className="space-y-3">
              {result.calmResponses.map((pair, i) => (
                <div key={i} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">If they say</p>
                  <p className="mb-2 text-sm italic">"{pair.ifTheySay}"</p>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">You can say</p>
                      <p className="text-sm">{pair.youCanSay}</p>
                    </div>
                    <CopyButton value={pair.youCanSay} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ResultCard tone="primary" label="Closing request" value={result.closingRequest} />
        </div>
      )}
    </div>
  );
}
