export interface PreferencesRepository<T> {
  load(): T | null;
  save(value: T): void;
}

export class LocalStoragePreferencesRepository<T> implements PreferencesRepository<T> {
  constructor(private readonly key: string) {}

  load(): T | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(this.key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      throw new Error(`Unable to read preferences at ${this.key}`, { cause: error });
    }
  }

  save(value: T): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key, JSON.stringify(value));
  }
}
