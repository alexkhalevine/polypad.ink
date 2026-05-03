import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";

// Canvas would create a WebGL context which jsdom doesn't support.
// Mock the entire R3F module so SceneContent never mounts.
vi.mock("@react-three/fiber", () => ({
  Canvas: () => null,
  useFrame: vi.fn(),
  useThree: vi.fn(),
}));

import { snapPoint } from "./scene";

// ─── snapPoint ────────────────────────────────────────────────────────────────
// Business critical: snapPoint affects geometry placement precision.
// Incorrect snapping could cause objects to be misaligned.

describe("snapPoint", () => {
  it("returns the same reference when snap is disabled", () => {
    const p = new THREE.Vector3(1.7, 5, 2.3);
    expect(snapPoint(p, false)).toBe(p);
  });

  it("rounds x and z to nearest integer when snap is enabled", () => {
    const result = snapPoint(new THREE.Vector3(1.7, 0, 2.3), true);
    expect(result.x).toBe(2);
    expect(result.z).toBe(2);
  });

  it("preserves the y value when snap is enabled", () => {
    const result = snapPoint(new THREE.Vector3(1.7, 3.5, 2.3), true);
    expect(result.y).toBe(3.5);
  });

  it("correctly snaps negative coordinates", () => {
    const result = snapPoint(new THREE.Vector3(-1.6, 0, -2.4), true);
    expect(result.x).toBe(-2);
    expect(result.z).toBe(-2);
  });

  it("returns a new vector instance when snap is enabled", () => {
    const p = new THREE.Vector3(1.7, 0, 2.3);
    expect(snapPoint(p, true)).not.toBe(p);
  });

  it("handles exact .5 rounding (standard JS Math.round behavior)", () => {
    // JS Math.round rounds half values up: 1.5 -> 2, 2.5 -> 3, 3.5 -> 4, 4.5 -> 5
    expect(snapPoint(new THREE.Vector3(1.5, 0, 0), true).x).toBe(2);
    expect(snapPoint(new THREE.Vector3(2.5, 0, 0), true).x).toBe(3);
    expect(snapPoint(new THREE.Vector3(3.5, 0, 0), true).x).toBe(4);
    expect(snapPoint(new THREE.Vector3(4.5, 0, 0), true).x).toBe(5);
  });

  it("snaps zero values", () => {
    const result = snapPoint(new THREE.Vector3(0.1, 0, 0.4), true);
    expect(result.x).toBe(0);
    expect(result.z).toBe(0);
  });
});
