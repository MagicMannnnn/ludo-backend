type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function now() {
  return new Date().toISOString();
}

export function makeLogger(level: Level) {
  const min = order[level] ?? order.info;

  function log(l: Level, msg: string, extra?: unknown) {
    if (order[l] < min) return;
    const base = `[${now()}] ${l.toUpperCase()} ${msg}`;
    if (extra === undefined) {
      // eslint-disable-next-line no-console
      console.log(base);
    } else {
      // eslint-disable-next-line no-console
      console.log(base, extra);
    }
  }

  return {
    debug: (m: string, e?: unknown) => log("debug", m, e),
    info: (m: string, e?: unknown) => log("info", m, e),
    warn: (m: string, e?: unknown) => log("warn", m, e),
    error: (m: string, e?: unknown) => log("error", m, e),
  };
}
