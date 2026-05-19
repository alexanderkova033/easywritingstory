import { randomUUID } from "node:crypto";

function emit(level: string, fields: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level,
      ts: new Date().toISOString(),
      ...fields,
    })
  );
}

export function createRequestLogger(defaults: Record<string, unknown> = {}) {
  const base = { ...defaults };
  return {
    info(msg: string, extra: Record<string, unknown> = {}) {
      emit("info", { msg, ...base, ...extra });
    },
    warn(msg: string, extra: Record<string, unknown> = {}) {
      emit("warn", { msg, ...base, ...extra });
    },
    error(msg: string, extra: Record<string, unknown> = {}) {
      emit("error", { msg, ...base, ...extra });
    },
  };
}

export function newRequestId(headerValue: string | undefined): string {
  const fromClient =
    typeof headerValue === "string" ? headerValue.trim() : "";
  if (fromClient.length > 0 && fromClient.length <= 128) return fromClient;
  return randomUUID();
}
