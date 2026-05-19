import "./TemplatesModal.css";
import { useState } from "react";
interface Template {
  id: string;
  name: string;
  form: string;
  hint: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: "dialogue-open",
    name: "Open on dialogue",
    form: "Story opening · dialogue",
    hint: "Drops the reader into a conversation already underway. Forces voice and tension on line 1.",
    body:
      "\"You weren't supposed to come back,\" she said.\n\n" +
      "He set the keys on the kitchen table, slowly, the way you set down something fragile. Outside, a dog was barking at nothing.\n\n" +
      "\"I know.\"\n",
  },
  {
    id: "action-open",
    name: "Open on action",
    form: "Story opening · in medias res",
    hint: "Begin in the middle of something happening. Backstory waits.",
    body:
      "The brick missed her head by a hand's width and shattered against the wall behind her.\n\n" +
      "Later, when the police asked what she had been thinking, she would not be able to say. She had not been thinking. She had been running.\n",
  },
  {
    id: "sensory-place",
    name: "Place — five senses",
    form: "Descriptive opening",
    hint: "Anchor the reader in a place using three or more senses before anyone moves or speaks.",
    body:
      "The market smelled of frying oil and wet cardboard, and the air pressed close enough to taste. Plastic tarps clattered overhead in a wind that did not reach the ground. Somewhere a radio was playing the same song it had been playing yesterday, and the day before that.\n",
  },
  {
    id: "memory-hook",
    name: "Memory hook",
    form: "Present + flashback",
    hint: "Begin in the present, then drop into a remembered scene. The contrast does the work.",
    body:
      "She still keeps the key in the bowl by the door, though the house it belongs to was sold ten years ago.\n\n" +
      "She was seven the first time her grandmother handed it to her. \"Don't lose this,\" the old woman had said, closing her fingers around it. \"This one matters.\"\n",
  },
  {
    id: "mystery-hook",
    name: "Mystery hook",
    form: "Story opening · question",
    hint: "Open with an unanswered question or strange image. Make the reader want to know.",
    body:
      "No one in the village remembered when the lighthouse had last been lit, but the night Anya went missing, it was burning.\n",
  },
  {
    id: "character-gesture",
    name: "Character through gesture",
    form: "Character introduction",
    hint: "Show who a character is in one telling action — no exposition.",
    body:
      "Mr Patel counted the change twice before he handed it back, the way he counted everything twice. Even his prayers, his wife said, were said twice, in case one of them did not get through.\n",
  },
  {
    id: "three-act",
    name: "Three-beat skeleton",
    form: "Structure · setup / shift / close",
    hint: "A minimal three-paragraph spine: situation, complication, resolution. Fill in around it.",
    body:
      "[Setup — establish character, place, ordinary world. 1–2 paragraphs.]\n\n" +
      "[Shift — something arrives, something is discovered, something refuses to behave. The story turns. 2–4 paragraphs.]\n\n" +
      "[Close — the consequence, the changed thing. Not necessarily a tidy ending. 1–2 paragraphs.]\n",
  },
  {
    id: "blank-start",
    name: "Blank start",
    form: "Empty draft",
    hint: "Nothing to react to. Begin with whatever is in front of you.",
    body: "",
  },
];

function templatePreview(body: string): string {
  const lines = body.split("\n").filter((l) => l.trim().length > 0).slice(0, 3);
  return lines.join("\n");
}

export function TemplatesModal({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (body: string, form: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal templates-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-modal-title"
      >
        <div className="modal-head">
          <h2 id="templates-modal-title" className="modal-title">
            Story starters
          </h2>
          <button type="button" className="small-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="modal-note">
          Inserting a starter replaces your current story body. Save a snapshot first if you want to keep what's there.
        </p>
        <ul className="templates-list">
          {TEMPLATES.map((t) => (
            <li
              key={t.id}
              className="template-item"
              onMouseEnter={() => setHoveredId(t.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(t.id)}
              onBlur={() => setHoveredId(null)}
            >
              <div className="template-item-info">
                <span className="template-item-name">{t.name}</span>
                <span className="template-item-form muted small">{t.form}</span>
                <span className="template-item-hint muted small">{t.hint}</span>
                {hoveredId === t.id && t.body && (
                  <pre className="template-item-preview" aria-hidden>
                    {templatePreview(t.body)}
                    {"\n…"}
                  </pre>
                )}
              </div>
              <button
                type="button"
                className="small-btn small-btn-primary"
                onClick={() => {
                  onInsert(t.body, t.form);
                  onClose();
                }}
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
