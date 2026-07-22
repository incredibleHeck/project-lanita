import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getDefaultRedirectForRole,
  isRoleAllowed,
} from "@/components/role-guard";

describe("formatCurrency", () => {
  it("formats GHS amounts", () => {
    const formatted = formatCurrency(1500.5);
    expect(formatted).toContain("1,500.50");
  });
});

describe("formatDate", () => {
  it("formats ISO dates in en-GB style", () => {
    const formatted = formatDate("2026-07-22T12:00:00.000Z");
    expect(formatted).toMatch(/22/);
    expect(formatted).toMatch(/2026/);
  });
});

describe("role guards", () => {
  it("allows matching roles", () => {
    expect(isRoleAllowed("PARENT", ["PARENT", "ADMIN"])).toBe(true);
    expect(isRoleAllowed("TEACHER", ["PARENT"])).toBe(false);
    expect(isRoleAllowed(undefined, ["ADMIN"])).toBe(false);
  });

  it("maps roles to default portals", () => {
    expect(getDefaultRedirectForRole("PARENT")).toBe("/parent/dashboard");
    expect(getDefaultRedirectForRole("TEACHER")).toBe("/teacher/classes");
    expect(getDefaultRedirectForRole("STUDENT")).toBe("/student/dashboard");
    expect(getDefaultRedirectForRole("ADMIN")).toBe("/dashboard");
  });
});
