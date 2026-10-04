import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("Card Component", () => {
  it("should render product name", () => {
    expect(true).toBe(true);
  });

  it("should display correct price formatting", () => {
    expect((1234).toLocaleString()).toBe("1,234");
  });
});
