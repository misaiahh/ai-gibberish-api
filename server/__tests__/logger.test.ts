import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "../lib/logger";

// Strip ANSI escape codes for test assertions
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[\d+m/g, "");
}

describe("createLogger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function getOutput(): string {
    return stripAnsi((logSpy.mock.calls[0] as string[])[0]);
  }

  it("includes app name, environment, and user in every log line", () => {
    const logger = createLogger({
      appName: "todo-app-api",
      environment: "test",
      user: "user-123",
    });

    logger.info("[test]");

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(getOutput()).toContain("todo-app-api");
    expect(getOutput()).toContain("test");
    expect(getOutput()).toContain("user=user-123");
  });

  it("shows anonymous when no user is set", () => {
    const logger = createLogger({
      appName: "todo-app-api",
      environment: "test",
    });

    logger.info("[test]");

    expect(getOutput()).toContain("user=anonymous");
  });

  it("overrides user per-call via request context", () => {
    const logger = createLogger({
      appName: "todo-app-api",
      environment: "test",
      user: "boot-user",
    });

    logger.infoReq({ endpoint: "/api/todos", user: "call-user" }, "[test]");

    expect(getOutput()).toContain("user=call-user");
    expect(getOutput()).toContain("/api/todos");
  });

  it("includes endpoint when provided", () => {
    const logger = createLogger({
      appName: "todo-app-api",
      environment: "staging",
      user: "u-1",
    });

    logger.infoReq({ endpoint: "/api/preferences" }, "[prefs]");

    expect(getOutput()).toContain("/api/preferences");
  });

  it("pretty-prints objects in log body", () => {
    const logger = createLogger({
      appName: "todo-app-api",
      environment: "test",
      user: "u-1",
    });

    logger.info("[test]", { key: "value", nested: { a: 1 } });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(getOutput()).toContain('"key": "value"');
    expect(getOutput()).toContain('"nested":');
    expect(getOutput()).toContain('"a": 1');
  });

  it("shows before/after for traceMutation", () => {
    const logger = createLogger({
      appName: "todo-app-api",
      environment: "test",
      user: "u-1",
    });

    logger.traceMutation("[update]", {
      input: { title: "old" },
      output: { title: "new" },
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(getOutput()).toContain("before:");
    expect(getOutput()).toContain("after:");
    expect(getOutput()).toContain('"title": "old"');
    expect(getOutput()).toContain('"title": "new"');
  });

  it("shows all four log levels", () => {
    const logger = createLogger({
      appName: "todo-app-api",
      environment: "test",
      user: "u-1",
    });

    logger.debug("[dbg]");
    logger.info("[inf]");
    logger.warn("[wrn]");
    logger.error("[err]");

    expect(logSpy).toHaveBeenCalledTimes(4);
    const outputs = (logSpy.mock.calls as string[][]).map((c) => stripAnsi(c[0]));
    expect(outputs[0]).toContain("DBG");
    expect(outputs[1]).toContain("INF");
    expect(outputs[2]).toContain("WRN");
    expect(outputs[3]).toContain("ERR");
  });

  it("uses call-level user when boot user is missing", () => {
    const logger = createLogger({
      appName: "todo-app-api",
      environment: "test",
    });

    logger.infoReq({ user: "token-abc" }, "[test]");

    expect(getOutput()).toContain("user=token-abc");
  });
});
