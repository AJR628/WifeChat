import { useState } from "react";
import { HeartHandshake, MessageSquareText, Send, Sun, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BeforeYouSend } from "@/components/tools/BeforeYouSend";
import { FightRepair } from "@/components/tools/FightRepair";
import { Planner } from "@/components/tools/Planner";
import { CheckIn } from "@/components/tools/CheckIn";
import { PrivacyDialog } from "@/components/PrivacyDialog";

const TABS = [
  { value: "before-send", label: "Before You Send", short: "Send", icon: Send, desc: "Rewrite a message before you hit send." },
  { value: "repair", label: "Fight Repair", short: "Repair", icon: HeartHandshake, desc: "Make sense of what just happened, and find a way back." },
  { value: "planner", label: "Conversation Planner", short: "Plan", icon: MessageSquareText, desc: "Prepare for a hard conversation, calmly." },
  { value: "checkin", label: "Daily Check-In", short: "Today", icon: Sun, desc: "A small daily ritual for connection." },
] as const;

export function RelationshipStudio() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("before-send");
  const active = TABS.find((t) => t.value === tab) ?? TABS[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-background to-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartHandshake className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Relationship Studio</p>
              <p className="text-xs text-muted-foreground leading-tight">by WifeChat</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Private by design · Not therapy
            </span>
            <PrivacyDialog />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:pt-10">
        <section className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Say the hard thing, well.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Four small tools for the moments that matter — before you send a message, after a fight,
            before a hard talk, or just to reconnect today.
          </p>
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/60">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.value} value={t.value} className="flex flex-col gap-1 py-2 text-xs sm:flex-row sm:gap-2 sm:text-sm">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <p className="mt-3 text-sm text-muted-foreground">{active.desc}</p>

          <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <TabsContent value="before-send" className="mt-0"><BeforeYouSend /></TabsContent>
            <TabsContent value="repair" className="mt-0"><FightRepair /></TabsContent>
            <TabsContent value="planner" className="mt-0"><Planner /></TabsContent>
            <TabsContent value="checkin" className="mt-0"><CheckIn /></TabsContent>
          </div>
        </Tabs>

        <footer className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
            <p>
              This is a communication tool, not therapy or emergency support. If you're in danger or in crisis,
              please reach out to a qualified professional. In the US: 988 (Suicide &amp; Crisis Lifeline) or
              1-800-799-7233 (National Domestic Violence Hotline).
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
