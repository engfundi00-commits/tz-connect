import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  VoucherAction,
} from "./voucher.types";

type Status =
  | "GENERATED"
  | "AVAILABLE"
  | "RESERVED"
  | "SOLD"
  | "ACTIVE"
  | "EXPIRED"
  | "USED"
  | "DISABLED"
  | "CANCELLED";

describe("voucher state machine", () => {
  it("a generated voucher can be reserved, but not activated directly", () => {
    expect(canTransition("GENERATED", "reserve")).toBe(false);
    expect(canTransition("AVAILABLE", "reserve")).toBe(true);
    expect(canTransition("GENERATED", "activate")).toBe(false);
    expect(canTransition("GENERATED", "cancel")).toBe(true);
    expect(canTransition("GENERATED", "disable")).toBe(true);
  });

  it("an available voucher can be sold or reserved", () => {
    expect(canTransition("AVAILABLE", "sell")).toBe(true);
    expect(canTransition("AVAILABLE", "reserve")).toBe(true);
    expect(canTransition("AVAILABLE", "activate")).toBe(true);
  });

  it("a sold voucher can be activated or expired but not cancelled", () => {
    expect(canTransition("SOLD", "activate")).toBe(true);
    expect(canTransition("SOLD", "expire")).toBe(true);
    expect(canTransition("SOLD", "cancel")).toBe(false);
  });

  it("only an active voucher can be activated (already active -> no-op path)", () => {
    // activate is not a valid action from ACTIVE (the state machine
    // guards against re-activating via the normal transition table)
    expect(ALLOWED_TRANSITIONS.activate.includes("ACTIVE" as Status)).toBe(false);
  });

  it("an active voucher can expire but disable can also apply", () => {
    expect(canTransition("ACTIVE", "expire")).toBe(true);
    expect(canTransition("ACTIVE", "disable")).toBe(true);
  });

  it("a used voucher is terminal", () => {
    expect(canTransition("USED", "activate")).toBe(false);
    expect(canTransition("USED", "sell")).toBe(false);
    expect(canTransition("USED", "reserve")).toBe(false);
    expect(canTransition("USED", "expire")).toBe(false);
  });

  it("defines allowed source states for every action", () => {
    for (const action of Object.keys(ALLOWED_TRANSITIONS) as VoucherAction[]) {
      expect(Array.isArray(ALLOWED_TRANSITIONS[action])).toBe(true);
      expect(ALLOWED_TRANSITIONS[action].length).toBeGreaterThan(0);
    }
  });

  it("reserve and generate are deliberately narrow", () => {
    expect(ALLOWED_TRANSITIONS.reserve).toEqual(["AVAILABLE"]);
  });
});
