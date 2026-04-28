import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import * as THREE from "three";
import React from "react";
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

// ─── Scene cursor ─────────────────────────────────────────────────────────────

describe("Scene cursor style", () => {
  const baseProps = {
    selectedTool: null,
    snapEnabled: false,
    drawState: { phase: "idle" as const },
    placedBoxes: [] as PlacedBox[],
    placedCylinders: [] as PlacedCylinder[],
    placedSpheres: [] as PlacedSphere[],
    onGroundRightClick: vi.fn(),
    onGroundPointerMove: vi.fn(),
    onGroundClick: vi.fn(),
    onHeightPointerMove: vi.fn(),
    onHeightClick: vi.fn(),
  };

  it("uses default cursor when idle", () => {
    const { container } = render(<Scene {...baseProps} />);
    expect((container.firstChild as HTMLElement).style.cursor).toBe("default");
  });

  it("uses crosshair cursor while drawing footprint", () => {
    const { container } = render(
      <Scene
        {...baseProps}
        drawState={{
          phase: "footprint",
          start: new THREE.Vector3(),
          end: new THREE.Vector3(),
        }}
      />
    );
    expect((container.firstChild as HTMLElement).style.cursor).toBe(
      "crosshair"
    );
  });

  it("uses crosshair cursor while setting height", () => {
    const { container } = render(
      <Scene
        {...baseProps}
        drawState={{
          phase: "height",
          start: new THREE.Vector3(),
          end: new THREE.Vector3(),
          currentHeight: 1,
        }}
      />
    );
    expect((container.firstChild as HTMLElement).style.cursor).toBe(
      "crosshair"
    );
  });
});
