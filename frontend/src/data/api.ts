const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() || "/api";

export function getApiUrl(resource: string): URL {
  const baseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
  return new URL(`${baseUrl}${resource}`, window.location.origin);
}

export async function getApiCollection<T>(
  resource: string,
  params: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<T[]> {
  const url = getApiUrl(resource);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Unable to load ${resource} (${response.status}).`);
  }

  const result: unknown = await response.json();
  if (!Array.isArray(result)) {
    throw new Error(`Invalid ${resource} response.`);
  }

  return result as T[];
}

export async function postApi<T>(
  resource: string,
  body: unknown,
  token?: string,
): Promise<T> {
  const url = getApiUrl(resource);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof result === "object" && result && "error" in result && typeof result.error === "string"
      ? result.error
      : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return result as T;
}
