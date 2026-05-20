/**
 * Exam-board grading modes for AI analysis.
 *
 * Only specifications where creative writing is assessed by COURSEWORK / NEA
 * are included here — never live exam-only assessments. The mark breakdowns
 * below are aligned with each board's published assessment objectives, but
 * the model is told to use the rubric block as guidance, not as a literal
 * conversion table; the goal is realistic, useful feedback for a piece of
 * coursework, not pretending to be the official examiner.
 *
 * To add a new exam mode: append an entry below — the API endpoints, the
 * client picker, and the result renderer all read from this single list.
 */

export interface ExamBreakdownComponent {
  /** Short component name shown in the UI, e.g. "Content & Structure". */
  name: string;
  /** Maximum marks for this component. */
  outOf: number;
  /** One-line summary of what is being assessed (used in the prompt). */
  focus: string;
}

export interface ExamMode {
  id: string;
  /** Short label for the picker, e.g. "IGCSE Edexcel". */
  label: string;
  /** One-line context shown under the picker, e.g. "Imaginative Writing coursework, 40 marks". */
  description: string;
  /** Total marks for the piece. Components must sum to this. */
  totalMarks: number;
  components: ExamBreakdownComponent[];
  /**
   * Full rubric block embedded into the system prompt. Should describe the
   * bands and what distinguishes a top-band response from a lower-band one.
   * Keep it dense — the model is paying per token.
   */
  rubricBlock: string;
}

const IGCSE_EDEXCEL_COURSEWORK: ExamMode = {
  id: "igcse-edexcel-coursework",
  label: "IGCSE Edexcel — Imaginative Writing (coursework)",
  description: "Pearson Edexcel IGCSE English Language A, Paper 3 coursework — 40 marks",
  totalMarks: 40,
  components: [
    { name: "Content & Structure (AO4)", outOf: 24, focus: "ideas, voice, narrative shape, paragraph cohesion, reader engagement" },
    { name: "Style & Accuracy (AO5)",   outOf: 16, focus: "vocabulary range, sentence variety, control of grammar, punctuation, spelling" },
  ],
  rubricBlock: `RUBRIC — Edexcel IGCSE English Language A, Paper 3, Assignment A (Imaginative Writing). 40 marks total.
AO4 (Content & Structure, /24): Level 5 (20-24) = compelling, well-crafted narrative with assured control of structure, distinctive voice, deliberate paragraphing, vivid and original ideas. Level 4 (15-19) = engaging and clearly structured with developed ideas. Level 3 (10-14) = clear narrative with some structural shape. Level 2 (5-9) = simple narrative with limited shape. Level 1 (1-4) = fragmentary.
AO5 (Style & Accuracy, /16): Level 5 (14-16) = ambitious vocabulary, varied and controlled sentence forms, near-faultless accuracy. Level 4 (10-13) = wide vocabulary, varied sentences, mostly accurate. Level 3 (7-9) = adequate range, generally accurate, errors don't impede. Level 2 (4-6) = limited range, frequent errors. Level 1 (1-3) = very limited.`,
};

const IGCSE_CAMBRIDGE_COURSEWORK: ExamMode = {
  id: "igcse-cambridge-coursework",
  label: "IGCSE Cambridge — Composition (coursework)",
  description: "Cambridge IGCSE 0500 / 0990 Component 3 coursework — 40 marks per assignment",
  totalMarks: 40,
  components: [
    { name: "Content & Structure (W1-W3)", outOf: 16, focus: "ideas, development, sequencing, paragraphing, register" },
    { name: "Style & Accuracy (W4-W5)",    outOf: 24, focus: "vocabulary precision, sentence structure variety, grammatical accuracy, spelling and punctuation" },
  ],
  rubricBlock: `RUBRIC — Cambridge IGCSE 0500 / 0990, Component 3 (Coursework Portfolio), single composition assessed out of 40.
Content/Structure (/16, W1-W3): Band 6 (14-16) = highly developed and complex ideas, sophisticated sequencing, register precisely matched. Band 5 (11-13) = well-developed ideas, effective structure. Band 4 (8-10) = relevant ideas, clear structure. Band 3 (5-7) = some development, basic structure. Below = limited.
Style/Accuracy (/24, W4-W5): Band 6 (21-24) = ambitious and precise vocabulary, varied sentence structures used for effect, near-faultless accuracy. Band 5 (16-20) = wide vocabulary, varied sentences, occasional lapses. Band 4 (11-15) = clear and generally accurate, some variety. Band 3 (6-10) = simple but mostly clear. Below = limited control.`,
};

const ALEVEL_AQA_NEA: ExamMode = {
  id: "alevel-aqa-nea",
  label: "A-Level AQA — Original Writing (NEA)",
  description: "AQA A-Level English Language 7702, NEA Original Writing piece — 25 marks",
  totalMarks: 25,
  components: [
    { name: "AO5 — Creative & Expressive Writing", outOf: 25, focus: "crafting of language for the chosen genre, audience, and purpose; originality; control of form" },
  ],
  rubricBlock: `RUBRIC — AQA A-Level English Language 7702, NEA Original Writing piece (/25). Assesses AO5 only — creative and expressive writing for a stated style model and audience.
Level 5 (21-25) = sophisticated, sustained crafting; deliberate choices at every level (lexis, syntax, discourse, graphology) that match the style model with originality; assured control of genre conventions for effect.
Level 4 (16-20) = effective crafting; clear awareness of audience and form; consistent stylistic control with some moments of distinction.
Level 3 (11-15) = competent crafting; broadly appropriate stylistic choices; some inconsistencies.
Level 2 (6-10) = limited crafting; basic awareness of audience and form; stylistic choices often generic.
Level 1 (1-5) = very limited crafting.`,
};

const ALEVEL_EDEXCEL_NEA: ExamMode = {
  id: "alevel-edexcel-nea",
  label: "A-Level Edexcel — Crafting Language (NEA)",
  description: "Pearson Edexcel A-Level English Language 9EL0, NEA crafted text — 40 marks",
  totalMarks: 40,
  components: [
    { name: "AO2 — Methods of language analysis applied to own writing", outOf: 15, focus: "deliberate use of linguistic features (lexis, semantics, grammar, phonology, discourse) for effect" },
    { name: "AO5 — Creativity in producing texts for specific audiences and purposes", outOf: 25, focus: "originality, audience awareness, genre control, voice, structural craft" },
  ],
  rubricBlock: `RUBRIC — Pearson Edexcel A-Level English Language 9EL0, NEA Crafting Language (/40, crafted text only).
AO2 (/15): Level 5 (13-15) = sophisticated, controlled and deliberate use of a range of linguistic methods, integrated seamlessly into the text. Level 4 (10-12) = secure, varied methods used for effect. Level 3 (7-9) = clear awareness of methods. Level 2 (4-6) = some methods, often basic. Level 1 (1-3) = limited.
AO5 (/25): Level 5 (21-25) = highly original and audience-aware, distinctive voice, deliberate structural craft, sustained genre control. Level 4 (16-20) = effective and engaging for the audience, clear voice, controlled structure. Level 3 (11-15) = competent and appropriate. Level 2 (6-10) = limited engagement and control. Level 1 (1-5) = very limited.`,
};

const ALEVEL_OCR_NEA: ExamMode = {
  id: "alevel-ocr-nea",
  label: "A-Level OCR — Original Writing (NEA)",
  description: "OCR A-Level English Language H470, NEA original writing — 25 marks",
  totalMarks: 25,
  components: [
    { name: "AO2 — Methods of language analysis applied to own writing", outOf: 10, focus: "deliberate, principled choices of lexis, grammar, discourse and graphology for effect" },
    { name: "AO5 — Creativity in producing texts",                       outOf: 15, focus: "originality, audience awareness, genre control, voice, narrative shape" },
  ],
  rubricBlock: `RUBRIC — OCR A-Level English Language H470, NEA original writing piece (/25).
AO2 (/10): Level 6 (9-10) = sophisticated, controlled application of language methods used for deliberate effect. Level 5 (7-8) = secure, varied. Level 4 (5-6) = competent. Level 3 (3-4) = some awareness. Level 1-2 (1-2) = limited.
AO5 (/15): Level 6 (13-15) = highly original, distinctive voice, deliberate structural craft, sustained genre control. Level 5 (10-12) = effective and engaging. Level 4 (7-9) = competent. Level 3 (4-6) = limited. Level 1-2 (1-3) = very limited.`,
};

export const EXAM_MODES: readonly ExamMode[] = [
  IGCSE_EDEXCEL_COURSEWORK,
  IGCSE_CAMBRIDGE_COURSEWORK,
  ALEVEL_AQA_NEA,
  ALEVEL_EDEXCEL_NEA,
  ALEVEL_OCR_NEA,
];

export function getExamMode(id: string | undefined): ExamMode | null {
  if (!id) return null;
  return EXAM_MODES.find((m) => m.id === id) ?? null;
}

/** Build the rubric block to splice into the system prompt. */
export function buildExamPromptBlock(mode: ExamMode): string {
  const componentList = mode.components
    .map((c) => `  - ${c.name} (/${c.outOf}): ${c.focus}`)
    .join("\n");
  const breakdownShape = mode.components
    .map((c) => `{name:"${c.name}", mark:int 0-${c.outOf}, outOf:${c.outOf}, comment:"1-2 sentence justification quoting specific lines"}`)
    .join(", ");
  return `

--- Exam grading mode: ${mode.label} ---
You are also acting as a coursework moderator for this specification. The piece below is a draft for ${mode.label}. Components:
${componentList}

${mode.rubricBlock}

When you return JSON, INCLUDE an additional top-level "exam_grade" object:
exam_grade: {
  mark: int 0-${mode.totalMarks},                 // total awarded
  outOf: ${mode.totalMarks},
  band: string,                                    // band/level label e.g. "Level 4"
  comment: string,                                 // 2-3 sentences explaining the overall mark
  breakdown: [ ${breakdownShape} ]
}
Mark like a fair-but-demanding teacher: justify against the descriptors above with specific evidence from the draft. Do NOT inflate. The overall_score (1-100) should still be returned and should roughly correlate with exam_grade.mark (e.g. 30/40 → ~75/100).
`;
}
