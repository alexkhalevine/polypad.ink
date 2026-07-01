import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { aabbOf, computeAlignedPosition, computeDistributed } from "../align-math";
import type { PlacedBox, PlacedCylinder, PlacedSphere, PlacedCone } from "../types";

function box(id: string, x: number, y: number, z: number, w = 1, h = 1, d = 1): PlacedBox {
  return { id, position: new THREE.Vector3(x, y, z), rotation: { x: 0, y: 0, z: 0 }, width: w, height: h, depth: d, color: null };
}

function cylinder(id: string, x: number, y: number, z: number, radius = 1, height = 2): PlacedCylinder {
  return { id, position: new THREE.Vector3(x, y, z), rotation: { x: 0, y: 0, z: 0 }, radius, height, color: null };
}

function cone(id: string, x: number, y: number, z: number, radius = 1, height = 2): PlacedCone {
  return { id, position: new THREE.Vector3(x, y, z), rotation: { x: 0, y: 0, z: 0 }, radius, height, color: null };
}

function sphere(id: string, x: number, y: number, z: number, radius = 1): PlacedSphere {
  return { id, position: new THREE.Vector3(x, y, z), rotation: { x: 0, y: 0, z: 0 }, radius, color: null };
}

describe("aabbOf", () => {
  it("computes box AABB from the bottom-min corner", () => {
    const b = box("b", 1, 0, 2, 4, 5, 6);
    expect(aabbOf(b, "box")).toEqual({ min: { x: 1, y: 0, z: 2 }, max: { x: 5, y: 5, z: 8 } });
  });

  it("computes cylinder AABB centered in X/Z from the base axis point", () => {
    const c = cylinder("c", 0, 0, 0, 2, 3);
    expect(aabbOf(c, "cylinder")).toEqual({ min: { x: -2, y: 0, z: -2 }, max: { x: 2, y: 3, z: 2 } });
  });

  it("computes sphere AABB from the bottom-contact point", () => {
    const s = sphere("s", 0, 0, 0, 1.5);
    expect(aabbOf(s, "sphere")).toEqual({ min: { x: -1.5, y: 0, z: -1.5 }, max: { x: 1.5, y: 3, z: 1.5 } });
  });
});

describe("computeAlignedPosition", () => {
  it("aligns a box's min X to the target's min X", () => {
    const source = box("s", 5, 0, 0);
    const target = box("t", 0, 0, 0, 2, 2, 2);
    const result = computeAlignedPosition(source, "box", target, "box", "min", null, null);
    expect(result).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("aligns a box's center X to the target's center X", () => {
    const source = box("s", 5, 0, 0, 2, 2, 2); // [5,7]
    const target = box("t", 0, 0, 0, 4, 2, 2); // [0,4], center 2
    const result = computeAlignedPosition(source, "box", target, "box", "center", null, null);
    expect(result.x).toBe(1); // source min so its [1,3] center is 2
  });

  it("aligns a box's max Y to the target's max Y", () => {
    const source = box("s", 0, 0, 0, 1, 3, 1); // y:[0,3]
    const target = box("t", 0, 5, 0, 1, 2, 1); // y:[5,7]
    const result = computeAlignedPosition(source, "box", target, "box", null, "max", null);
    expect(result.y).toBe(4); // source top moves to 7 -> base at 4
  });

  it("leaves untouched axes unchanged when side is null", () => {
    const source = box("s", 5, 6, 7);
    const target = box("t", 0, 0, 0, 2, 2, 2);
    const result = computeAlignedPosition(source, "box", target, "box", "min", null, null);
    expect(result.y).toBe(6);
    expect(result.z).toBe(7);
  });

  it("aligns a cylinder's center X to a box target's center X", () => {
    const source = cylinder("s", 10, 0, 0, 1, 2); // x:[9,11]
    const target = box("t", 0, 0, 0, 4, 2, 2); // x:[0,4], center 2
    const result = computeAlignedPosition(source, "cylinder", target, "box", "center", null, null);
    expect(result.x).toBe(2);
  });

  it("aligns a cone's max Z to a sphere target's max Z", () => {
    const source = cone("s", 0, 0, 0, 1, 2); // z:[-1,1]
    const target = sphere("t", 0, 0, 10, 2); // z:[8,12]
    const result = computeAlignedPosition(source, "cone", target, "sphere", null, null, "max");
    expect(result.z).toBe(11); // source max z moves to 12 -> base at 11
  });

  it("aligns a sphere's min Y to a cylinder target's min Y", () => {
    const source = sphere("s", 0, 5, 0, 1); // y:[4,6]
    const target = cylinder("t", 0, 0, 0, 1, 2); // y:[0,2]
    const result = computeAlignedPosition(source, "sphere", target, "cylinder", null, "min", null);
    expect(result.y).toBe(0);
  });
});

describe("computeDistributed", () => {
  it("returns no moves for fewer than 3 shapes", () => {
    const items = [
      { id: "a", shape: box("a", 0, 0, 0), type: "box" as const },
      { id: "b", shape: box("b", 10, 0, 0), type: "box" as const },
    ];
    expect(computeDistributed(items)).toEqual({});
  });

  it("evens the gap between three boxes along the auto-detected spread axis, keeping extremes fixed", () => {
    const items = [
      { id: "a", shape: box("a", 0, 0, 0), type: "box" as const },
      { id: "b", shape: box("b", 3, 0, 0), type: "box" as const },
      { id: "c", shape: box("c", 10, 0, 0), type: "box" as const },
    ];
    const result = computeDistributed(items);
    expect(result.a).toBeUndefined();
    expect(result.c).toBeUndefined();
    expect(result.b.x).toBe(5); // centers 0.5,?,10.5 evened to midpoint 5.5 minus half-width offset
  });

  it("evens gaps for 4 shapes with two interior shapes repositioned", () => {
    const items = [
      { id: "a", shape: box("a", 0, 0, 0), type: "box" as const },
      { id: "b", shape: box("b", 1, 0, 0), type: "box" as const },
      { id: "c", shape: box("c", 2, 0, 0), type: "box" as const },
      { id: "d", shape: box("d", 12, 0, 0), type: "box" as const },
    ];
    const result = computeDistributed(items);
    expect(result.a).toBeUndefined();
    expect(result.d).toBeUndefined();
    // Centers: a=0.5, b=1.5, c=2.5, d=12.5. Span 12, gap 4 -> target centers 4.5, 8.5
    expect(result.b.x).toBe(4);
    expect(result.c.x).toBe(8);
  });

  it("respects an explicit axis override even if it isn't the greatest spread", () => {
    const items = [
      { id: "a", shape: box("a", 0, 0, 0), type: "box" as const },
      { id: "b", shape: box("b", 1, 0, 5), type: "box" as const },
      { id: "c", shape: box("c", 100, 0, 10), type: "box" as const },
    ];
    const result = computeDistributed(items, "z");
    expect(result.b.z).toBe(5); // z centers: 0.5, 5.5, 10.5 -> b is already at the midpoint
    expect(result.b.x).toBe(1); // x untouched
  });

  it("only moves the spread axis, leaving the others as-is", () => {
    const items = [
      { id: "a", shape: box("a", 0, 1, 2), type: "box" as const },
      { id: "b", shape: box("b", 3, 7, 9), type: "box" as const },
      { id: "c", shape: box("c", 10, 4, 6), type: "box" as const },
    ];
    const result = computeDistributed(items, "x");
    expect(result.b.x).toBe(5);
    expect(result.b.y).toBe(7);
    expect(result.b.z).toBe(9);
  });
});
