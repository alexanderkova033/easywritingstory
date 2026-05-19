export type LineDiffRow =
  | { kind: "same"; text: string }
  | { kind: "left"; text: string }
  | { kind: "right"; text: string }
  | { kind: "change"; left: string; right: string };

/**
 * Line-oriented diff (LCS on lines). Pairs adjacent delete+insert as "change"
 * for a compact poetry-oriented view.
 */
export function diffPoemLines(left: string, right: string): LineDiffRow[] {
  const a = left.split("\n");
  const b = right.split("\n");
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        a[i] === b[j]
          ? 1 + dp[i + 1]![j + 1]!
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const raw: Array<{ t: "L" | "R" | "S"; line: string }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      raw.push({ t: "S", line: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      raw.push({ t: "L", line: a[i]! });
      i++;
    } else {
      raw.push({ t: "R", line: b[j]! });
      j++;
    }
  }
  while (i < n) {
    raw.push({ t: "L", line: a[i]! });
    i++;
  }
  while (j < m) {
    raw.push({ t: "R", line: b[j]! });
    j++;
  }

  const rows: LineDiffRow[] = [];
  for (let k = 0; k < raw.length; k++) {
    const cur = raw[k]!;
    if (cur.t === "S") {
      rows.push({ kind: "same", text: cur.line });
      continue;
    }
    if (cur.t === "L" && raw[k + 1]?.t === "R") {
      rows.push({
        kind: "change",
        left: cur.line,
        right: raw[k + 1]!.line,
      });
      k++;
      continue;
    }
    if (cur.t === "L") {
      rows.push({ kind: "left", text: cur.line });
      continue;
    }
    rows.push({ kind: "right", text: cur.line });
  }
  return rows;
}
