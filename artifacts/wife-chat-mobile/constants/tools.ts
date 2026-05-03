import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

type FeatherIcon = ComponentProps<typeof Feather>["name"];

export type ToolKey =
  | "before-send"
  | "repair"
  | "planner"
  | "checkin"
  | "practice";

export interface Tool {
  key: ToolKey;
  title: string;
  outcome: string;
  longDesc: string;
  icon: FeatherIcon;
  chips: string[];
  placeholder: string;
  empty: { title: string; sub: string };
  comingSoon?: boolean;
}

export const TOOLS: Record<ToolKey, Tool> = {
  "before-send": {
    key: "before-send",
    title: "Before You Send",
    outcome: "Turn a reactive text into something clear and kind.",
    longDesc:
      "Paste the message you almost sent. We will suggest a few better versions — you choose.",
    icon: "send",
    chips: [
      "Make it softer",
      "Make it more direct",
      "Shorter",
      "Add accountability",
    ],
    placeholder: "Paste the message you wanted to send…",
    empty: {
      title: "Say the hard thing, well.",
      sub: "Paste a draft you do not love yet. We will suggest 2–3 better versions and you pick.",
    },
  },
  repair: {
    key: "repair",
    title: "Repair After a Fight",
    outcome: "Find a small, honest message that opens the door again.",
    longDesc:
      "Tell us what just happened. We will help you own your part without losing yourself.",
    icon: "heart",
    chips: [
      "Help me repair",
      "Acknowledge their side",
      "Ask a calmer question",
      "Suggest a next step",
    ],
    placeholder: "Tell me what just happened…",
    empty: {
      title: "Find your way back.",
      sub: "Briefly describe the fight. We will suggest a repair message that owns your part — no blame.",
    },
  },
  planner: {
    key: "planner",
    title: "Plan a Hard Conversation",
    outcome: "Walk in calm, with the points you actually want to land.",
    longDesc:
      "Name the topic, your goal, and what scares you. We will prep an opener and key points.",
    icon: "message-square",
    chips: [
      "Draft an opener",
      "Three key points",
      "Likely sensitive spots",
      "What to ask at the end",
    ],
    placeholder: "What is the conversation about?",
    empty: {
      title: "Walk in calm.",
      sub: "Tell us the topic, your goal, and one fear. We will help you plan an opener you would actually say.",
    },
    comingSoon: true,
  },
  checkin: {
    key: "checkin",
    title: "Daily Check-In",
    outcome: "A two-minute ritual to notice, appreciate, and reach.",
    longDesc:
      "Share how today landed. We will suggest one warm message you could send right now.",
    icon: "sun",
    chips: [
      "What I appreciate",
      "Small friction today",
      "What I would like more of",
      "Suggest a tiny gesture",
    ],
    placeholder: "How did today feel?",
    empty: {
      title: "A small ritual.",
      sub: "Even a few words today. We will suggest one warm thing you could say or do tonight.",
    },
  },
  practice: {
    key: "practice",
    title: "Practice Conversation",
    outcome: "Rehearse a tough talk before you have it for real.",
    longDesc:
      "Set the scene. We will role-play a realistic, hedged stand-in — never a caricature.",
    icon: "users",
    chips: [
      "Set the scene",
      "Try a calmer reply",
      "What if they shut down?",
      "End the practice",
    ],
    placeholder: "Describe the conversation you want to practice…",
    empty: {
      title: "Rehearse, then talk.",
      sub: "Set the scene in a sentence. We will respond as a realistic stand-in — not a caricature.",
    },
    comingSoon: true,
  },
};

export const TOOL_LIST: Tool[] = [
  TOOLS["before-send"],
  TOOLS.repair,
  TOOLS.planner,
  TOOLS.checkin,
  TOOLS.practice,
];

export function isToolKey(value: string | undefined): value is ToolKey {
  return (
    value === "before-send" ||
    value === "repair" ||
    value === "planner" ||
    value === "checkin" ||
    value === "practice"
  );
}
