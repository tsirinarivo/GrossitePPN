import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isDemoFallbackEnabled } from "./demo-mode";

describe("isDemoFallbackEnabled", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const ORIGINAL_OVERRIDE = process.env.DEMO_FALLBACK;

  afterEach(() => {
    if (ORIGINAL_NODE_ENV !== undefined) {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    } else {
      delete process.env.NODE_ENV;
    }
    if (ORIGINAL_OVERRIDE !== undefined) {
      process.env.DEMO_FALLBACK = ORIGINAL_OVERRIDE;
    } else {
      delete process.env.DEMO_FALLBACK;
    }
  });

  beforeEach(() => {
    delete process.env.DEMO_FALLBACK;
  });

  it("activé par défaut en dev", () => {
    process.env.NODE_ENV = "development";
    expect(isDemoFallbackEnabled()).toBe(true);
  });

  it("désactivé par défaut en prod", () => {
    process.env.NODE_ENV = "production";
    expect(isDemoFallbackEnabled()).toBe(false);
  });

  it("override DEMO_FALLBACK=on force l'activation en prod", () => {
    process.env.NODE_ENV = "production";
    process.env.DEMO_FALLBACK = "on";
    expect(isDemoFallbackEnabled()).toBe(true);
  });

  it("override DEMO_FALLBACK=off force la désactivation en dev", () => {
    process.env.NODE_ENV = "development";
    process.env.DEMO_FALLBACK = "off";
    expect(isDemoFallbackEnabled()).toBe(false);
  });
});
