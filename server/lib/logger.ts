// Configurable logger for debugging and tracking user activity.
//
// Create at app boot (in server/plugins/logger.ts):
//   const logger = createLogger({ appName: "todo-app-api", environment: "development" });
//
// Usage in endpoints (import { getLogger } from "../lib/logger"):
//   logger.info("[createTodo]", { title: "Buy milk" });
//   logger.debug("[createTodo]", { endpoint: "/api/todos", user: token }, input, output);
//   logger.error("[createTodo]", { endpoint: "/api/todos", user: token }, err);
//   logger.traceMutationReq({ endpoint: "/api/todos", user: token }, "[updateTodo]", { input, output });

// ─── Types ─────────────────────────────────────────────────────────────

export interface LoggerConfig {
  appName: string;
  environment: string;
  user?: string;
}

export interface Logger {
  debug: (label: string, ...args: unknown[]) => void;
  info: (label: string, ...args: unknown[]) => void;
  warn: (label: string, ...args: unknown[]) => void;
  error: (label: string, ...args: unknown[]) => void;
  traceMutation: (label: string, mutation: { input: unknown; output: unknown }) => void;
  debugReq: (ctx: RequestContext, label: string, ...args: unknown[]) => void;
  infoReq: (ctx: RequestContext, label: string, ...args: unknown[]) => void;
  warnReq: (ctx: RequestContext, label: string, ...args: unknown[]) => void;
  errorReq: (ctx: RequestContext, label: string, ...args: unknown[]) => void;
  traceMutationReq: (ctx: RequestContext, label: string, mutation: { input: unknown; output: unknown }) => void;
}

export interface RequestContext {
  endpoint?: string;
  user?: string;
}

// ─── Color codes ───────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
} as const;

const LEVEL: Record<string, { color: string; tag: string }> = {
  debug: { color: C.dim, tag: "DBG" },
  info: { color: C.cyan, tag: "INF" },
  warn: { color: C.yellow, tag: "WRN" },
  error: { color: C.red, tag: "ERR" },
};

// ─── Helpers ───────────────────────────────────────────────────────────

function fmt(value: unknown): string {
  if (typeof value === "string") return value;
  if (value != null && typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function header(level: string, label: string, ctx: RequestContext | undefined, app: string, env: string, user: string): string {
  const ts = `${C.dim}${new Date().toISOString()}${C.reset}`;
  const { color, tag } = LEVEL[level];
  const parts = [
    ts,
    ` ${color}[${tag}]${C.reset}`,
    ` ${C.cyan}[${app}]${C.reset}`,
    ` ${C.dim}[${env}]${C.reset}`,
    ` ${C.dim}user=${C.reset}${C.cyan}${user}${C.reset}`,
  ];

  if (ctx?.endpoint) parts.push(` ${C.dim}(${ctx.endpoint})${C.reset}`);
  parts.push(` ${C.cyan}[${label}]${C.reset}`);

  return parts.join("");
}

// ─── Factory ───────────────────────────────────────────────────────────

let appLogger: Logger | null = null;

export function createLogger({ appName, environment, user: initUser }: LoggerConfig): Logger {
  function resolveUser(ctx: RequestContext | undefined): string {
    return ctx?.user ?? initUser ?? "anonymous";
  }

  function log(level: string, label: string, ctx: RequestContext | undefined, ...args: unknown[]) {
    const user = resolveUser(ctx);
    const line = header(level, label, ctx, appName, environment, user);
    const body = args.length > 0 ? "\n" + args.map(fmt).join("\n") : "";
    console.log(`${LEVEL[level].color}${line}${C.reset}${body}`);
  }

  function traceMutation(label: string, ctx: RequestContext | undefined, mutation: { input: unknown; output: unknown }) {
    const user = resolveUser(ctx);
    const line = header("debug", label, ctx, appName, environment, user);
    const divider = `${C.dim}─${C.reset}`.repeat(40);

    console.log(
      line +
        "\n" +
        divider +
        `\n${C.yellow}before:${C.reset}\n${fmt(mutation.input)}` +
        `\n${C.yellow}after:${C.reset}\n${fmt(mutation.output)}`
    );
  }

  return {
    debug: (label: string, ...args: unknown[]) => log("debug", label, undefined, ...args),
    info: (label: string, ...args: unknown[]) => log("info", label, undefined, ...args),
    warn: (label: string, ...args: unknown[]) => log("warn", label, undefined, ...args),
    error: (label: string, ...args: unknown[]) => log("error", label, undefined, ...args),
    traceMutation: (label: string, mutation: { input: unknown; output: unknown }) =>
      traceMutation(label, undefined, mutation),

    debugReq: (ctx: RequestContext, label: string, ...args: unknown[]) => log("debug", label, ctx, ...args),
    infoReq: (ctx: RequestContext, label: string, ...args: unknown[]) => log("info", label, ctx, ...args),
    warnReq: (ctx: RequestContext, label: string, ...args: unknown[]) => log("warn", label, ctx, ...args),
    errorReq: (ctx: RequestContext, label: string, ...args: unknown[]) => log("error", label, ctx, ...args),
    traceMutationReq: (ctx: RequestContext, label: string, mutation: { input: unknown; output: unknown }) =>
      traceMutation(label, ctx, mutation),
  };
}

export function getLogger(): Logger {
  if (!appLogger) {
    appLogger = createLogger({ appName: "todo-app-api", environment: "development" });
  }
  return appLogger;
}

export function setLogger(logger: Logger): void {
  appLogger = logger;
}
