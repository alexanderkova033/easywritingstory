export type DiffToken = { type: "same" | "del" | "add"; text: string };

/** Very simple LCS-based word diff. Whitespace tokens are preserved. */
export function wordDiff(oldText: string, newText: string): DiffToken[] {
  const split = (t: string) => t.split(/(\s+)/);
  const a = split(oldText);
  const b = split(newText);
  const m = a.length, n = b.length;

  // Build LCS length table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }

  // Trace back
  const result: DiffToken[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: "same", text: a[i - 1]! });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      result.push({ type: "add", text: b[j - 1]! });
      j--;
    } else {
      result.push({ type: "del", text: a[i - 1]! });
      i--;
    }
  }
  return result.reverse();
}
