import { Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PrivacyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <Shield className="h-3 w-3" />
          How privacy works
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How privacy works</DialogTitle>
          <DialogDescription>
            Plain-language summary of what this prototype does — and does not —
            do with your text.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed text-foreground">
          <section>
            <h3 className="mb-1 font-semibold">What gets sent</h3>
            <p className="text-muted-foreground">
              When you submit a message to one of the tools, your text is sent
              to the WifeChat API and then to OpenAI to generate a response.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">What WifeChat does not save</h3>
            <p className="text-muted-foreground">
              In this prototype, WifeChat does not save your entries to a
              WifeChat cloud account or database. There is no account, no
              history sync, and no shared storage between devices.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Local storage</h3>
            <p className="text-muted-foreground">
              The web app does not persist your drafts. The companion mobile
              app may keep recent drafts and conversations on your device only,
              using local storage on the phone.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Logs are metadata-only</h3>
            <p className="text-muted-foreground">
              Server logs are designed to capture only metadata (request id,
              route, status, timing, error name) — never the body of your
              message, the model's response, or full provider error payloads.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">AI provider note</h3>
            <p className="text-muted-foreground">
              Your text is processed by the AI provider (OpenAI) to generate a
              response. We do not make a specific retention promise here —
              please refer to the provider's own documentation for their
              current data-handling and retention policy.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Safety / crisis language</h3>
            <p className="text-muted-foreground">
              If safety or crisis language is detected in your input, the app
              may return a static safety response with hotline information
              instead of a normal rewrite. This check runs on the server before
              the AI provider is called.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Not a substitute for care</h3>
            <p className="text-muted-foreground">
              This is a communication tool. It is not therapy, legal advice,
              medical advice, or emergency support, and it does not track,
              score, or diagnose your partner.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Crisis resources</h3>
            <p className="text-muted-foreground">
              The crisis numbers shown in the app are US defaults (988 Suicide
              &amp; Crisis Lifeline; 1-800-799-7233 National Domestic Violence
              Hotline). If you are outside the US, please use your local
              emergency or crisis resources.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
