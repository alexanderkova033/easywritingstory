import { useEffect, useState } from "react";
import { loadEnglishWordlist } from "@/spellcheck/wordlist";

type IdleCb = (cb: () => void, opts?: { timeout: number }) => number;
type CancelIdleCb = (id: number) => void;

function scheduleIdle(run: () => void, fallbackDelayMs: number, timeoutMs: number) {
  const ric = (window as { requestIdleCallback?: IdleCb }).requestIdleCallback;
  const cic = (window as { cancelIdleCallback?: CancelIdleCb }).cancelIdleCallback;
  if (typeof ric === "function") {
    const id = ric(run, { timeout: timeoutMs });
    return () => { if (typeof cic === "function") cic(id); };
  }
  const t = window.setTimeout(run, fallbackDelayMs);
  return () => window.clearTimeout(t);
}

export interface DictionariesState {
  wordlist: Set<string> | null;
  wordlistErr: string | null;
  retryWordlist: () => void;
  /** Always null in the story app — kept on the shape until callers drop it. */
  stressLexicon: Map<string, string> | null;
  /** Always null in the story app — kept on the shape until callers drop it. */
  stressLexiconErr: string | null;
}

export function useDictionaries(): DictionariesState {
  const [wordlist, setWordlist] = useState<Set<string> | null>(null);
  const [wordlistErr, setWordlistErr] = useState<string | null>(null);
  const [wordlistRetryBump, setWordlistRetryBump] = useState(0);

  const retryWordlist = () => setWordlistRetryBump((n) => n + 1);

  useEffect(() => {
    setWordlistErr(null);
    const run = () => {
      void loadEnglishWordlist()
        .then((w) => {
          setWordlist(w);
          setWordlistErr(null);
        })
        .catch((e) => {
          setWordlistErr(e instanceof Error ? e.message : "Could not load word list.");
        });
    };
    return scheduleIdle(run, 800, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordlistRetryBump]);

  return {
    wordlist,
    wordlistErr,
    retryWordlist,
    stressLexicon: null,
    stressLexiconErr: null,
  };
}
