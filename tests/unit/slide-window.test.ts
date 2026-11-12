import { describe, expect, it } from "vitest";
import { mountedSlideIndices } from "@/components/tv/slide-window";

describe("TV slide window", () => {
  it("keeps three slides on each side, wrapping around the carousel", () => {
    expect([...mountedSlideIndices(15, 0, [])].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 12, 13, 14]);
    expect([...mountedSlideIndices(15, 7, [])].sort((a, b) => a - b)).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect([...mountedSlideIndices(15, 14, [])].sort((a, b) => a - b)).toEqual([0, 1, 2, 11, 12, 13, 14]);
  });

  it("keeps visible slides during transitions without retaining other distant slides", () => {
    expect([...mountedSlideIndices(15, 7, [0, 1])].sort((a, b) => a - b)).toEqual([0, 1, 4, 5, 6, 7, 8, 9, 10]);
    expect([...mountedSlideIndices(15, 7, [7])].sort((a, b) => a - b)).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it("handles short, empty, and changing slide lists", () => {
    expect([...mountedSlideIndices(1, 0, [0])]).toEqual([0]);
    expect([...mountedSlideIndices(4, 0, [0])].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    expect([...mountedSlideIndices(0, 0, [0])]).toEqual([]);
    expect([...mountedSlideIndices(2, 10, [0, 10])]).toEqual([0]);
  });
});
