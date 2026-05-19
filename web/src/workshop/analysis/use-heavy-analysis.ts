/**
 * React hook that wraps the heavy-analysis Web Worker.
 *
 * Owns one Worker instance for the component's lifetime. Each input change
 * fires a new request with a monotonically increasing id; results with an
 * older id than the most recent request are discarded (race protection).
 *
 * Falls back to a synchronous analysis on the main thread if Worker isn't
 * supported (older browsers, SSR, test environments).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeRepetition } from "@/workshop/analysis/repeated-words";
import type { RepetitionAnalysis } from "@/workshop/analysis/repeated-words";
import { scanCliches } from "@/workshop/analysis/cliche-scan";
import type { ClicheHit } from "@/workshop/analysis/cliche-scan";
import type {
  HeavyAnalysisRequest,
  HeavyAnalysisResult,
  RhymeBreadth,
  RhymeCluster,
  StanzaClusterGroup,
  InternalRhymeMark,
} from "@/workshop/analysis/heavy-analysis-worker";

// Re-export so existing call-sites keep working until the rhyme plumbing is
// fully removed.
export type { RhymeCluster, StanzaClusterGroup, InternalRhymeMark, RhymeBreadth };

export interface HeavyAnalysisOutput {
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

const EMPTY: HeavyAnalysisOutput = {
  repetition: { words: [], phrases: [], anaphora: [], epistrophe: [] },
  clicheHits: [],
  rhymeClusters: [],
  vowelTailClusters: [],
  assonanceClusters: [],
  consonanceClusters: [],
  heavyRhymeScheme: [],
  stanzaRhymeGroups: [],
  internalRhymes: [],
};

function computeSync(heavyLines: string[]): HeavyAnalysisOutput {
  return {
    ...EMPTY,
    repetition: analyzeRepetition(heavyLines),
    clicheHits: scanCliches(heavyLines),
  };
}

const WORKER_SUPPORTED = typeof Worker !== "undefined";

export function useHeavyAnalysis(
  heavyLines: string[],
  rhymeBreadth: RhymeBreadth,
  manualRhymeLinks: string[],
  manualRhymeUnlinks: string[],
): HeavyAnalysisOutput {
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const lastSeenIdRef = useRef(-1);
  const [output, setOutput] = useState<HeavyAnalysisOutput>(EMPTY);

  // Lazily create the worker once on mount; tear it down on unmount.
  useEffect(() => {
    if (!WORKER_SUPPORTED) return;
    const worker = new Worker(
      new URL("./heavy-analysis-worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    const onMessage = (e: MessageEvent<HeavyAnalysisResult>) => {
      // Drop stale results — only commit the most recent request.
      if (e.data.id < lastSeenIdRef.current) return;
      lastSeenIdRef.current = e.data.id;
      const { id: _id, ...rest } = e.data;
      setOutput(rest);
    };
    worker.addEventListener("message", onMessage);
    return () => {
      worker.removeEventListener("message", onMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Stable key for the manual-rhyme arrays so identity churn (parent passes
  // a new array literal each render) doesn't refire the worker uselessly.
  const linksKey = useMemo(() => manualRhymeLinks.join("|"), [manualRhymeLinks]);
  const unlinksKey = useMemo(() => manualRhymeUnlinks.join("|"), [manualRhymeUnlinks]);

  // Fire a new request whenever inputs change. Worker handles the work in the
  // background; the hook commits the latest result via the message handler.
  useEffect(() => {
    if (!WORKER_SUPPORTED || !workerRef.current) {
      setOutput(computeSync(heavyLines));
      return;
    }
    const id = ++reqIdRef.current;
    const req: HeavyAnalysisRequest = {
      id,
      heavyLines,
      rhymeBreadth,
      manualRhymeLinks,
      manualRhymeUnlinks,
    };
    workerRef.current.postMessage(req);
    // linksKey / unlinksKey are the value-stable dependency proxies for the
    // array props — they ensure we don't fire when only identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heavyLines, rhymeBreadth, linksKey, unlinksKey]);

  return output;
}
