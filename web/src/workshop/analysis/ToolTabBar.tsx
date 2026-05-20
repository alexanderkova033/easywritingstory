import type { JSX, ReactNode } from "react";
import type { ToolTab } from "@/workshop/shell/workshop-helpers";

function IconTabIssues() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7v6m0 3.5h.01M9.8 4.5h4.4L18 8.3v7.4l-3.8 3.8H9.8L6 15.7V8.3l3.8-3.8z"
      />
    </svg>
  );
}


function IconTabGoals() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.65" />
      <circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function IconTabRepeat() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 5.5h3v3M8 18.5H5v-3m0-5.5a7.5 7.5 0 0112.85-5.3M19 12a7.5 7.5 0 01-12.85 5.3"
      />
    </svg>
  );
}

function IconTabDialogue() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6.5h11a2 2 0 012 2v4.5a2 2 0 01-2 2H9l-3 2.5v-2.5H6a2 2 0 01-2-2v-4.5z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 11.5h.01M12 11.5h.01"
      />
    </svg>
  );
}

function IconTabPov() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <ellipse cx="12" cy="12" rx="8" ry="5" fill="none" stroke="currentColor" strokeWidth="1.65" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function IconTabTense() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.65" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        d="M12 7.5V12l3 2"
      />
    </svg>
  );
}

function IconTabShowTell() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12z"
      />
      <circle cx="12" cy="12" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function IconTabAdverbs() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 18l4-12 4 12M6.5 14h5M14 18l3-9 3 9M15 15.5h4"
      />
    </svg>
  );
}

function IconTabCharacters() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.65" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        d="M3.5 19c.5-3 3-4.5 5.5-4.5s5 1.5 5.5 4.5"
      />
      <circle cx="16.5" cy="10.5" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.65" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        d="M14 16.5c.6-1.4 2-2.5 3.5-2.5s2.9 1.1 3.5 2.5"
      />
    </svg>
  );
}

function IconTabSpell() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 18.5V6.5l5.5 3.2L16 6.5v12M11 9.2V19"
      />
    </svg>
  );
}

function IconTabSnapshots() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 7.5h4l1-2h5l1 2h2.5a1 1 0 011 1v10a1 1 0 01-1 1h-15a1 1 0 01-1-1v-10a1 1 0 011-1z"
      />
      <circle cx="12" cy="13.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function IconTabSuggest() {
  return (
    <svg className="tool-tab-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 18h6M10 21h4M12 3a6 6 0 014.5 10c.6.7 1 1.6 1 2.5V17H6.5v-1.5c0-.9.4-1.8 1-2.5A6 6 0 0112 3z"
      />
    </svg>
  );
}

/** Order tuned for flow: triage → spelling → polish → versions → external help */
export const TOOL_TABS: {
  id: ToolTab;
  label: string;
  desc: string;
  Icon: () => JSX.Element;
}[] = [
  { id: "issues",     label: "Queue",      desc: "Spelling flags, checklist gaps & goal warnings in one list",   Icon: IconTabIssues },
  { id: "spell",      label: "Spell",      desc: "Find and fix misspelled words",                                Icon: IconTabSpell },
  { id: "repeat",     label: "Repeats",    desc: "Words that appear more than once",                             Icon: IconTabRepeat },
  { id: "dialogue",   label: "Dialogue",   desc: "Speech tags, attribution verbs, and unattributed lines",       Icon: IconTabDialogue },
  { id: "pov",        label: "POV",        desc: "First/second/third-person consistency and off-POV lines",      Icon: IconTabPov },
  { id: "tense",      label: "Tense",      desc: "Past vs. present consistency and off-tense lines",             Icon: IconTabTense },
  { id: "showtell",   label: "Show/Tell",  desc: "Filter words that signal telling instead of showing",          Icon: IconTabShowTell },
  { id: "adverbs",    label: "Adverbs",    desc: "-ly adverbs and weasel words (very, really, just)",            Icon: IconTabAdverbs },
  { id: "characters", label: "Cast",       desc: "Named characters, mention counts, and entrance/exit",          Icon: IconTabCharacters },
  { id: "goals",      label: "Goals",      desc: "Set targets for word counts",                                  Icon: IconTabGoals },
  { id: "snapshots",  label: "Snapshots",  desc: "Save and compare draft snapshots",                             Icon: IconTabSnapshots },
  { id: "suggest",    label: "Ideas",      desc: "AI suggestions when you\u2019re stuck",                        Icon: IconTabSuggest },
];

export function LiveSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="tool-heading-live">
      <span className="live-dot" aria-hidden />
      <span className="tool-heading-live-text">{children}</span>
    </h3>
  );
}
