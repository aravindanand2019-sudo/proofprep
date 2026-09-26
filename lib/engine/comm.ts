// Communication metrics and the no-LLM fallback scorer. Pure.
import type { CommScores, Structure } from "../schemas/index.ts";

const FILLERS = [
  "um",
  "uh",
  "erm",
  "like",
  "basically",
  "actually",
  "you know",
  "i mean",
  "so yeah",
];
const WORDS_PER_MINUTE_SPOKEN = 130;

export type CommMetrics = {
  wordCount: number;
  durationSec: number | null;
  wpm: number | null;
  fillerCount: number;
  fillers: Record<string, number>;
};

export function commMetrics(transcript: string, durationSec: number | null): CommMetrics {
  const lower = ` ${transcript.toLowerCase().replace(/[^a-z0-9'\s]/g, " ")} `;
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const fillers: Record<string, number> = {};
  let fillerCount = 0;
  for (const filler of FILLERS) {
    const matches = lower.split(` ${filler} `).length - 1;
    if (matches > 0) {
      fillers[filler] = matches;
      fillerCount += matches;
    }
  }
  const wpm = durationSec && durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : null;
  return { wordCount, durationSec, wpm, fillerCount, fillers };
}

const CUES: Record<"STAR" | "CRE", string[][]> = {
  STAR: [
    ["situation", "when i", "during", "at my", "in my", "once"],
    ["task", "responsible", "my role", "needed to", "had to", "goal"],
    ["i did", "i decided", "i built", "i talked", "action", "so i", "i wrote", "i started"],
    ["result", "as a result", "in the end", "finally", "outcome", "we got", "improved", "%"],
  ],
  CRE: [
    ["i think", "i believe", "in my view", "the answer", "is a", "is the", "means"],
    ["because", "since", "the reason", "this is why", "so that"],
    ["for example", "for instance", "such as", "like when", "e.g", "imagine"],
  ],
};

const PART_NAMES: Record<"STAR" | "CRE", string[]> = {
  STAR: ["Situation", "Task", "Action", "Result"],
  CRE: ["Claim", "Reason", "Example"],
};

/** Keyword-based fallback used only when the LLM is unavailable. */
export function heuristicCommScore(
  transcript: string,
  kind: "behavioral" | "technical" | "opinion",
  targetDurationSec: number,
  metrics: CommMetrics,
): {
  scores: CommScores;
  structureDetected: Structure;
  missingParts: string[];
  tips: string[];
} {
  const expected = kind === "behavioral" ? "STAR" : "CRE";
  const lower = transcript.toLowerCase();
  const present = CUES[expected].map((cues) => cues.some((c) => lower.includes(c)));
  const found = present.filter(Boolean).length;
  const missingParts = PART_NAMES[expected].filter((_, i) => !present[i]);

  const seconds = metrics.durationSec ?? (metrics.wordCount / WORDS_PER_MINUTE_SPOKEN) * 60;
  const ratio = targetDurationSec > 0 ? seconds / targetDurationSec : 0;
  const length =
    ratio >= 0.6 && ratio <= 1.4 ? 5 : ratio >= 0.35 && ratio <= 1.8 ? 3 : ratio > 0 ? 1 : 0;
  const structure = Math.round((found / present.length) * 5);
  const fillerRate = metrics.wordCount ? metrics.fillerCount / metrics.wordCount : 0;
  const clarity = metrics.wordCount < 15 ? 1 : fillerRate > 0.08 ? 2 : fillerRate > 0.04 ? 3 : 4;
  const relevance = metrics.wordCount < 15 ? 1 : 3;

  const tips = [
    missingParts.length
      ? `Add the missing part${missingParts.length > 1 ? "s" : ""}: ${missingParts.join(", ")}.`
      : `Keep this ${expected} structure; lead with your main point.`,
    length < 5
      ? `Aim for about ${Math.round((targetDurationSec / 60) * 10) / 10} minute(s); yours was ${ratio < 1 ? "too short" : "too long"}.`
      : "Your length is right for the question.",
    metrics.fillerCount > 2
      ? `Cut filler words (${metrics.fillerCount} found); pause instead.`
      : "Name one concrete number or outcome to make it memorable.",
  ];
  return {
    scores: { structure, relevance, clarity, length },
    structureDetected: found >= Math.ceil(present.length * 0.75) ? expected : "none",
    missingParts,
    tips,
  };
}
