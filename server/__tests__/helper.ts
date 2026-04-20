export async function startServer(): Promise<void> {
  // Wait for server to be ready (started by globalSetup)
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://127.0.0.1:3001/api/health");
      if (res.ok) return;
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server failed to start within 4 seconds");
}

export async function stopServer(): Promise<void> {
  // No-op: Nitro server lifecycle not manageable in Vitest module caching env
}

export async function api(
  path: string,
  options?: RequestInit,
  baseUrl?: string,
): Promise<Response> {
  const base = baseUrl ?? "http://127.0.0.1:3001";
  return fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
}
