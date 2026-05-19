import "./ReadAloudButton.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHoverHintBinder } from "@/workshop/hints/HoverHintsContext";

interface ReadAloudButtonProps {
  getText: () => string;
}

// Ordered preference list of high-quality TTS voices.
// Neural/Online voices are listed first — they sound most natural.
const PREFERRED_VOICES = [
  // Windows/Edge — Microsoft Neural (Online) voices — best quality
  "Microsoft Aria Online (Natural) - English (United States)",
  "Microsoft Jenny Online (Natural) - English (United States)",
  "Microsoft Sonia Online (Natural) - English (United Kingdom)",
  "Microsoft Guy Online (Natural) - English (United States)",
  "Microsoft Emma Online (Natural) - English (United States)",
  "Microsoft Brian Online (Natural) - English (United States)",
  "Microsoft Libby Online (Natural) - English (United Kingdom)",
  "Microsoft Ryan Online (Natural) - English (United Kingdom)",
  // macOS / iOS — high-quality neural voices
  "Samantha",
  "Karen",
  "Daniel",
  "Moira",
  "Tessa",
  "Rishi",
  // Chrome / Android - Google voices
  "Google UK English Female",
  "Google UK English Male",
  "Google US English",
  // Windows — Microsoft Desktop voices (fallback)
  "Microsoft Zira - English (United States)",
  "Microsoft David - English (United States)",
  "Microsoft Hazel Desktop - English (Great Britain)",
];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  // Fall back to any English voice
  const eng = voices.filter((v) => v.lang.startsWith("en"));
  return eng[0] ?? voices[0] ?? null;
}

export function ReadAloudButton({ getText }: ReadAloudButtonProps) {
  const hint = useHoverHintBinder();
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => "speechSynthesis" in window);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(
    () => localStorage.getItem("read-aloud-voice") ?? "",
  );
  const [showPicker, setShowPicker] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Load voices — they may arrive asynchronously.
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (!v.length) return;
      setVoices(v);
      setSelectedVoiceName((prev) => {
        // Keep stored/chosen voice if it's still available
        if (prev && v.find((x) => x.name === prev)) return prev;
        // Otherwise pick best default but don't persist it (user didn't choose)
        return pickVoice(v)?.name ?? "";
      });
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [supported]);

  // Close picker on outside click.
  useEffect(() => {
    if (!showPicker) return;
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showPicker]);

  const clearKeepAlive = () => {
    if (keepAliveRef.current !== null) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      clearKeepAlive();
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    clearKeepAlive();
    setSpeaking(false);
  }, []);

  const play = useCallback(() => {
    const text = getText().trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    clearKeepAlive();

    const utt = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.name === selectedVoiceName) ?? pickVoice(voices);
    if (voice) utt.voice = voice;
    utt.rate = 0.82;
    utt.pitch = 1.0;

    utt.onstart = () => {
      setSpeaking(true);
      // Chrome cuts off after ~15 s unless periodically resumed.
      keepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 14000);
    };
    utt.onend = () => { clearKeepAlive(); setSpeaking(false); };
    utt.onerror = () => { clearKeepAlive(); setSpeaking(false); };

    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [getText, voices, selectedVoiceName]);

  if (!supported) return null;

  const englishVoices = voices.filter((v) => v.lang.startsWith("en"));

  return (
    <div className="read-aloud-wrap" ref={pickerRef}>
      <button
        type="button"
        className={`fmt-btn fmt-tidy-btn read-aloud-btn${speaking ? " is-active" : ""}`}
        {...hint(speaking ? "Stop reading aloud" : "Read poem aloud")}
        aria-label={speaking ? "Stop reading aloud" : "Read poem aloud"}
        onClick={speaking ? stop : play}
      >
        {speaking ? "⏹" : "▶"}
      </button>

      {/* Voice picker trigger */}
      {englishVoices.length > 1 && (
        <button
          type="button"
          className={`fmt-btn read-aloud-voice-btn${showPicker ? " is-active" : ""}`}
          aria-label="Choose reading voice"
          aria-expanded={showPicker}
          onClick={() => setShowPicker((s) => !s)}
          title="Choose voice"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path d="M2 4l3.5 3.5L9 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {showPicker && (
        <div className="read-aloud-voice-picker" role="listbox" aria-label="Reading voice">
          <p className="read-aloud-voice-label">Reading voice</p>
          {englishVoices.map((v) => (
            <button
              key={v.name}
              type="button"
              role="option"
              aria-selected={v.name === selectedVoiceName}
              className={`read-aloud-voice-item${v.name === selectedVoiceName ? " is-selected" : ""}`}
              onClick={() => {
                setSelectedVoiceName(v.name);
                try { localStorage.setItem("read-aloud-voice", v.name); } catch {}
                setShowPicker(false);
              }}
            >
              <span className="read-aloud-voice-name">{v.name}</span>
              <span className="read-aloud-voice-lang">{v.lang}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
