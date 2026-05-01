import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { PlacedBox, PlacedCylinder, PlacedSphere } from "./types";

// Canvas would create a WebGL context which jsdom doesn't support.
// Mock the entire R3F module so SceneContent never mounts.
vi.mock("@react-three/fiber", () => ({
  Canvas: () => null,
  useFrame: vi.fn(),
  useThree: vi.fn(),
}));

// OrbitControls attaches DOM listeners on instantiation; mock to keep tests isolated.
vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    enableDamping: false,
    dampingFactor: 0,
    minPolarAngle: 0,
    maxPolarAngle: 0,
    enabled: true,
    update: vi.fn(),
    dispose: vi.fn(),
  })),
}));

import { Scene, snapPoint } from "./scene";

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
});
