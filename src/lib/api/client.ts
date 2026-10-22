export async function apiGet<T>(path: string, schema: { parse(value: unknown): T }): Promise<T> {
  if (!path.startsWith("/")) throw new Error("BFF paths must be absolute from the application root");
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`BFF request failed (${response.status})`);
  return schema.parse(await response.json());
}
