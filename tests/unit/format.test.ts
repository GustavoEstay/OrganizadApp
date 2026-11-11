import { describe, expect, it } from "vitest";
import {
  formatRelativeTime,
  formatSol,
  formatUtcDate,
  lamportsToSol,
  solToLamports,
  truncateAddress,
} from "@/lib/solana/format";

describe("SOL formatting", () => {
  it("converts lamports and SOL without float drift", () => {
    expect(lamportsToSol(1_500_000_000)).toBe(1.5);
    expect(solToLamports(0.1)).toBe(100_000_000);
    expect(solToLamports(0.000000001)).toBe(1);
  });

  it("formats balances with 2 decimals and keeps tiny amounts visible", () => {
    expect(formatSol(12.48)).toBe("12.48 SOL");
    expect(formatSol(2)).toBe("2.00 SOL");
    expect(formatSol(1234.5)).toBe("1,234.50 SOL");
    expect(formatSol(0.000005)).toBe("0.000005 SOL");
  });

  it("formats fees at full precision and supports signs", () => {
    expect(formatSol(0.000005, { fee: true })).toBe("0.000005 SOL");
    expect(formatSol(0.5, { fee: true })).toBe("0.5 SOL");
    expect(formatSol(-0.5, { sign: true })).toBe("−0.50 SOL");
    expect(formatSol(1, { sign: true })).toBe("+1.00 SOL");
  });
});

describe("truncateAddress", () => {
  it("keeps the first and last characters", () => {
    expect(truncateAddress("7xKpQeA1b2c3d4e5f6g7h8i9j0k1l2m3n43fQa")).toBe("7xKp…3fQa");
    expect(truncateAddress("short")).toBe("short");
    expect(truncateAddress("ABCDEFGHIJKLMNOP", 6)).toBe("ABCDEF…KLMNOP");
  });
});

describe("formatRelativeTime", () => {
  const now = Date.UTC(2026, 10, 11, 12);
  it("describes recent and older times", () => {
    expect(formatRelativeTime(now - 10_000, now)).toBe("just now");
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5 minutes ago");
    expect(formatRelativeTime(now - 3 * 3600_000, now)).toBe("3 hours ago");
    expect(formatRelativeTime(now - 26 * 3600_000, now)).toBe("yesterday");
    expect(formatRelativeTime(now - 3 * 86_400_000, now)).toBe("3 days ago");
    expect(formatRelativeTime(now - 14 * 86_400_000, now)).toBe("2 weeks ago");
  });

  it("handles missing block times", () => {
    expect(formatRelativeTime(null, now)).toBe("Pending");
    expect(formatUtcDate(null)).toBeNull();
    expect(formatUtcDate(now)).toBe("2026-11-11 12:00 UTC");
  });
});
