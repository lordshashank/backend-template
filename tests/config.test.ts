import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.js";

describe("Config", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads config from env vars", () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/test";
    process.env.PORT = "4000";
    process.env.WS_PORT = "4001";

    const config = loadConfig();
    assert.equal(config.databaseUrl, "postgres://localhost:5432/test");
    assert.equal(config.port, 4000);
    assert.equal(config.wsPort, 4001);
  });

  it("uses default port values", () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/test";
    delete process.env.PORT;
    delete process.env.WS_PORT;

    const config = loadConfig();
    assert.equal(config.port, 3001);
    assert.equal(config.wsPort, 3002);
  });

  it("throws when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;

    assert.throws(() => loadConfig(), {
      message: "DATABASE_URL environment variable is required",
    });
  });
});
