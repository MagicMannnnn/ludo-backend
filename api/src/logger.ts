type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function makeLogger(level: Level) {
  const min = order[level] ?? order.info;
  const now = () => new Date().toISOString();

  function log(l: Level, msg: string, extra?: unknown) {
    if (order[l] < min) return;
    // eslint-disable-next-line no-console
    console.log(`[${now()}] ${l.toUpperCase()} ${msg}`, extra ?? "");
  }

  return {
    debug: (m: string, e?: unknown) => log("debug", m, e),
    info: (m: string, e?: unknown) => log("info", m, e),
    warn: (m: string, e?: unknown) => log("warn", m, e),
    error: (m: string, e?: unknown) => log("error", m, e),
  };
}
