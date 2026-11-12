import { describe, expect, it } from "vitest";
import { databaseConnectionUrl } from "../../src/lib/db-config";

describe("database connection settings", () => {
  it("allows a slow MySQL connection up to five seconds by default", () => {
    const url = new URL(databaseConnectionUrl("mysql://user:p%40ss@db.example:3306/plant?connectionLimit=4"));
    expect(url.searchParams.get("connectTimeout")).toBe("5000");
    expect(url.searchParams.get("connectionLimit")).toBe("4");
    expect(url.password).toBe("p%40ss");
    expect(url.pathname).toBe("/plant");
  });

  it("preserves an explicitly configured connection timeout", () => {
    const url = new URL(databaseConnectionUrl("mysql://user:pass@db.example/plant?connectTimeout=8000"));
    expect(url.searchParams.get("connectTimeout")).toBe("8000");
  });

  it("rejects malformed connection URLs", () => {
    expect(() => databaseConnectionUrl("not a url")).toThrow();
  });
});
