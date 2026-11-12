const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;

export function databaseConnectionUrl(connectionString: string): string {
  const url = new URL(connectionString);
  if (!url.searchParams.has("connectTimeout")) {
    url.searchParams.set("connectTimeout", String(DEFAULT_CONNECT_TIMEOUT_MS));
  }
  return url.toString();
}
