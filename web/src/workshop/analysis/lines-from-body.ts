export function linesFromBody(body: string): string[] {
  const raw = body.split("\n");
  if (raw.length === 0) return [""];
  return raw;
}
