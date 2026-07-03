import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { aabbOf } from "../align-math";
import {
  clampPointToFace,
  depthFromPoint,
  computeExtrusionBox,
  inPlaneAxes,
  FACE_OVERSHOOT,
} from "../extrude-math";
import type { PlacedBox, FaceKey } from "../types";

// A 4×2×3 box with its min corner at (1, 0, 2): x:[1,5] y:[0,2] z:[2,5].
function baseBox(): PlacedBox {
  return {
    id: "b",
    position: new THREE.Vector3(1, 0, 2),
    rotation: { x: 0, y: 0, z: 0 },
    width: 4,
    height: 2,
    depth: 3,
    color: null,
  };
}

const aabb = () => aabbOf(baseBox(), "box");

describe("inPlaneAxes", () => {
  it("returns the two axes orthogonal to the face normal", () => {
    expect(inPlaneAxes("+x")).toEqual(["y", "z"]);
    expect(inPlaneAxes("-y")).toEqual(["x", "z"]);
    expect(inPlaneAxes("+z")).toEqual(["x", "y"]);
  });
});

describe("clampPointToFace", () => {
  it("projects the point onto the face plane", () => {
    const p = clampPointToFace({ x: 9, y: 1, z: 3 }, aabb(), "+x");
    expect(p.x).toBe(5); // snapped to max-x plane
    expect(p.y).toBe(1);
    expect(p.z).toBe(3);
  });

  it("clamps in-plane coordinates inside the face rect", () => {
    const p = clampPointToFace({ x: 5, y: 99, z: -99 }, aabb(), "+x");
    expect(p.y).toBe(2); // clamped to y max
    expect(p.z).toBe(2); // clamped to z min
  });

  it("uses the min plane for negative faces", () => {
    const p = clampPointToFace({ x: 3, y: -5, z: 3 }, aabb(), "-y");
    expect(p.y).toBe(0);
    expect(p.x).toBe(3);
    expect(p.z).toBe(3);
  });
});

describe("depthFromPoint", () => {
  it("is positive outside the box along the outward normal", () => {
    expect(depthFromPoint({ x: 7, y: 1, z: 3 }, aabb(), "+x")).toBe(2);
  });

  it("is negative inside the box", () => {
    expect(depthFromPoint({ x: 4, y: 1, z: 3 }, aabb(), "+x")).toBe(-1);
  });

  it("respects the sign of negative faces (outward = -axis)", () => {
    expect(depthFromPoint({ x: 3, y: -1.5, z: 3 }, aabb(), "-y")).toBe(1.5);
    expect(depthFromPoint({ x: 3, y: 0.5, z: 3 }, aabb(), "-y")).toBe(-0.5);
  });
});

describe("computeExtrusionBox — outward (union)", () => {
  it("builds a tool box reaching out from the +x face with overshoot into the base", () => {
    const rectStart = { x: 5, y: 0.5, z: 2.5 };
    const rectEnd = { x: 5, y: 1.5, z: 4 };
    const tool = computeExtrusionBox(aabb(), "+x", rectStart, rectEnd, 1)!;
    expect(tool.position.x).toBeCloseTo(5 - FACE_OVERSHOOT);
    expect(tool.position.y).toBe(0.5);
    expect(tool.position.z).toBe(2.5);
    expect(tool.width).toBeCloseTo(1 + FACE_OVERSHOOT);
    expect(tool.height).toBeCloseTo(1);
    expect(tool.depth).toBeCloseTo(1.5);
  });

  it("builds an upward bump on the +y face", () => {
    const tool = computeExtrusionBox(aabb(), "+y", { x: 2, y: 2, z: 3 }, { x: 4, y: 2, z: 4 }, 0.5)!;
    expect(tool.position.y).toBeCloseTo(2 - FACE_OVERSHOOT);
    expect(tool.height).toBeCloseTo(0.5 + FACE_OVERSHOOT);
    expect(tool.position.x).toBe(2);
    expect(tool.width).toBeCloseTo(2);
  });
});

describe("computeExtrusionBox — inward (subtraction)", () => {
  it("builds a pocket reaching into the box with overshoot out of the face", () => {
    const tool = computeExtrusionBox(aabb(), "+x", { x: 5, y: 0.5, z: 2.5 }, { x: 5, y: 1.5, z: 4 }, -1)!;
    // Pocket spans x:[4, 5 + overshoot]
    expect(tool.position.x).toBeCloseTo(4);
    expect(tool.width).toBeCloseTo(1 + FACE_OVERSHOOT);
  });

  it("supports a through-hole deeper than the box", () => {
    const tool = computeExtrusionBox(aabb(), "+x", { x: 5, y: 0.5, z: 2.5 }, { x: 5, y: 1.5, z: 4 }, -10)!;
    expect(tool.position.x).toBeCloseTo(-5); // 5 - 10
    expect(tool.width).toBeCloseTo(10 + FACE_OVERSHOOT);
  });

  it("cuts downward from the top face", () => {
    const tool = computeExtrusionBox(aabb(), "+y", { x: 2, y: 2, z: 3 }, { x: 3, y: 2, z: 4 }, -1)!;
    expect(tool.position.y).toBeCloseTo(1); // 2 - 1
    expect(tool.height).toBeCloseTo(1 + FACE_OVERSHOOT);
  });

  it("cuts in the -z direction from the -z face", () => {
    const tool = computeExtrusionBox(aabb(), "-z", { x: 2, y: 0.5, z: 2 }, { x: 3, y: 1.5, z: 2 }, -0.5)!;
    // -z face plane is z=2, outward is -z, so a cut goes toward +z: z:[2 - overshoot, 2.5]
    expect(tool.position.z).toBeCloseTo(2 - FACE_OVERSHOOT);
    expect(tool.depth).toBeCloseTo(0.5 + FACE_OVERSHOOT);
  });
});

describe("computeExtrusionBox — degenerate inputs", () => {
  it("returns null for near-zero depth", () => {
    expect(computeExtrusionBox(aabb(), "+x", { x: 5, y: 0.5, z: 2.5 }, { x: 5, y: 1.5, z: 4 }, 0.001)).toBeNull();
  });

  it("returns null for a degenerate rect", () => {
    expect(computeExtrusionBox(aabb(), "+x", { x: 5, y: 1, z: 3 }, { x: 5, y: 1, z: 3 }, 1)).toBeNull();
  });

  it("clamps rect corners that wander off the face before measuring", () => {
    // End point far outside the face: clamped to the face rect first.
    const tool = computeExtrusionBox(aabb(), "+x", { x: 5, y: 0.5, z: 2.5 }, { x: 5, y: 99, z: 99 }, 1)!;
    expect(tool.position.y).toBe(0.5);
    expect(tool.height).toBeCloseTo(1.5); // clamped to y max = 2
    expect(tool.depth).toBeCloseTo(2.5); // clamped to z max = 5
  });
});

describe("computeExtrusionBox — every face key produces a valid box", () => {
  const cases: { key: FaceKey; rectA: { x: number; y: number; z: number }; rectB: { x: number; y: number; z: number } }[] = [
    { key: "+x", rectA: { x: 5, y: 0.5, z: 2.5 }, rectB: { x: 5, y: 1.5, z: 4 } },
    { key: "-x", rectA: { x: 1, y: 0.5, z: 2.5 }, rectB: { x: 1, y: 1.5, z: 4 } },
    { key: "+y", rectA: { x: 2, y: 2, z: 3 }, rectB: { x: 4, y: 2, z: 4 } },
    { key: "-y", rectA: { x: 2, y: 0, z: 3 }, rectB: { x: 4, y: 0, z: 4 } },
    { key: "+z", rectA: { x: 2, y: 0.5, z: 5 }, rectB: { x: 4, y: 1.5, z: 5 } },
    { key: "-z", rectA: { x: 2, y: 0.5, z: 2 }, rectB: { x: 4, y: 1.5, z: 2 } },
  ];

  for (const { key, rectA, rectB } of cases) {
    it(`face ${key}, both directions`, () => {
      for (const depth of [0.75, -0.75]) {
        const tool = computeExtrusionBox(aabb(), key, rectA, rectB, depth);
        expect(tool).not.toBeNull();
        expect(tool!.width).toBeGreaterThan(0);
        expect(tool!.height).toBeGreaterThan(0);
        expect(tool!.depth).toBeGreaterThan(0);
      }
    });
  }
});
