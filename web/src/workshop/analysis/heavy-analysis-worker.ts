/**
 * Web Worker: heavy story analyses.
 *
 * Runs the heaviest pure analysis functions off the main thread so typing in
 * the editor doesn't compete with them for CPU. The main thread posts a
 * snapshot of the parsed lines; the worker posts the bundled result back.
 * Each request carries an id; the consuming hook ignores any result whose id
 * is older than the most recent request.
 *
 * Analyses bundled here all take pure data in and return pure data out — no
 * DOM, no React, no localStorage.
 */
import { analyzeRepetition } from "@/workshop/analysis/repeated-words";
import type { RepetitionAnalysis } from "@/workshop/analysis/repeated-words";
import { scanCliches } from "@/workshop/analysis/cliche-scan";
import type { ClicheHit } from "@/workshop/analysis/cliche-scan";

// Opaque stubs for rhyme-derived shapes that the worker no longer computes.
// Kept on the result type so downstream call-sites (WorkshopToolPanels,
// useStoryWorkshopModel) still typecheck while their poetry features are
// being torn out. Removed in a later cleanup pass.
export type RhymeCluster = unknown;
export type StanzaClusterGroup = unknown;
export type InternalRhymeMark = unknown;
export type RhymeBreadth = "strict" | "near" | "broad";

export interface HeavyAnalysisRequest {
  id: number;
  heavyLines: string[];
  rhymeBreadth: RhymeBreadth;
  manualRhymeLinks: string[];
  manualRhymeUnlinks: string[];
}

export interface HeavyAnalysisResult {
  id: number;
  repetition: RepetitionAnalysis;
  clicheHits: ClicheHit[];
  rhymeClusters: RhymeCluster[];
  vowelTailClusters: RhymeCluster[];
  assonanceClusters: RhymeCluster[];
  consonanceClusters: RhymeCluster[];
  heavyRhymeScheme: string[];
  stanzaRhymeGroups: StanzaClusterGroup[];
  internalRhymes: InternalRhymeMark[];
}

self.onmessage = (e: MessageEvent<HeavyAnalysisRequest>) => {
  const { id, heavyLines } = e.data;

  const result: HeavyAnalysisResult = {
    id,
    repetition: analyzeRepetition(heavyLines),
    clicheHits: scanCliches(heavyLines),
    rhymeClusters: [],
    vowelTailClusters: [],
    assonanceClusters: [],
    consonanceClusters: [],
    heavyRhymeScheme: [],
    stanzaRhymeGroups: [],
    internalRhymes: [],
  };

  (self as unknown as { postMessage: (m: HeavyAnalysisResult) => void }).postMessage(result);
};
