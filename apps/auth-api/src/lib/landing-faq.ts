// The questions on the landing page. They are also the home page's FAQPage
// JSON-LD, so the questions a search engine reads are the ones the page shows.
// No imports: `site-metadata.ts` reads this, and the build config reads that.

export interface LandingQuestion {
  question: string;
  answer: string;
  /** Shown after the answer on the page. Not in the JSON-LD text. */
  link?: { label: string; href: string };
}

export const LANDING_FAQ: readonly LandingQuestion[] = [
  {
    question: "Is OpenBotFR free?",
    answer:
      "Yes. OpenBotFR is free for noncommercial use, with no locked desktop features. You pay your AI provider if its service has a fee.",
  },
  {
    question: "Is OpenBotFR open source?",
    answer:
      "The OpenBotFR source is public on GitHub. You can change and run it for noncommercial use. Commercial use needs a separate license. The license is PolyForm Noncommercial 1.0.0.",
    link: { label: "See the fork on GitHub", href: "https://github.com/daMustermann/openbotfr" },
  },
  {
    question: "Can I use my ChatGPT or Claude plan?",
    answer:
      "Yes. Codex signs in with your ChatGPT plan, and Claude Code with your Claude plan. Gemini uses a Google AI Pro or Ultra plan. OpenCode has free models that need no account.",
  },
  {
    question: "Which AI models can OpenBotFR use?",
    answer:
      "Codex, Claude Code, Gemini, Grok, OpenCode, Cursor, Cline, Muse Code, Pi and Kilo Code (ACP), and compatible local models and providers. Kilo Code needs its CLI installed.",
  },
  {
    question: "What happens when my plan reaches its limit?",
    answer:
      "An agent can move to a backup model on another provider when its plan reaches its limit, or when its provider is overloaded or down. It keeps its chat and workspace, and a note in the chat shows the switch.",
  },
  {
    question: "How do I start?",
    answer:
      "Install OpenBotFR and connect a provider. No OpenBot account is needed for desktop use. Then create an agent and give it work.",
  },
  {
    question: "Where does my data go?",
    answer:
      "Workspaces, conversations, attachments and browser data stay on the computer that runs OpenBotFR. Your AI provider receives the prompts you send. Remote access is optional and needs your own services.",
  },
  {
    question: "Which computers can run OpenBotFR?",
    answer:
      "macOS 13 or newer on Apple silicon or Intel, Windows 10 or newer on x64, and Linux on x64 or arm64 as an AppImage.",
  },
  {
    question: "Is it safe to let agents work on my computer?",
    answer:
      "OpenBotFR is a development preview. Agents can read and change files, run commands, use the network and control the built-in browser without asking each time. Give them only tasks you trust, and keep backups.",
  },
];

/** schema.org `FAQPage`, from the questions the page shows. */
export const LANDING_FAQ_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQ.map((entry) => ({
    "@type": "Question",
    name: entry.question,
    acceptedAnswer: { "@type": "Answer", text: entry.answer },
  })),
};
