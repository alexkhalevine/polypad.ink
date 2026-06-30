import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { computeMatePosition, faceAxis, faceSign } from "../mate-math";
import type { PlacedBox } from "../types";
import type { FaceKey } from "../types";

function box(x: number, y: number, z: number, w: number, h: number, d: number): PlacedBox {
  return { id: "x", position: new THREE.Vector3(x, y, z), rotation: { x: 0, y: 0, z: 0 }, width: w, height: h, depth: d, color: null };
}

describe("faceAxis / faceSign", () => {
  it("reads the axis and sign out of a FaceKey", () => {
    expect(faceAxis("+x")).toBe("x");
    expect(faceSign("+x")).toBe(1);
    expect(faceAxis("-y")).toBe("y");
    expect(faceSign("-y")).toBe(-1);
    expect(faceAxis("+z")).toBe("z");
    expect(faceSign("+z")).toBe(1);
  });
});

describe("computeMatePosition — Flush", () => {
  it("touches source's +x face to target's -x face", () => {
    const source = box(0, 0, 0, 2, 2, 2); // x:[0,2]
    const target = box(10, 0, 0, 2, 2, 2); // x:[10,12]
    const result = computeMatePosition(source, "box", "+x", target, "box", "-x", "flush", 0);
    expect(result).toEqual({ x: 8, y: 0, z: 0 });
  });

  it("touches source's -x face to target's +x face", () => {
    const source = box(20, 0, 0, 2, 2, 2); // x:[20,22]
    const target = box(0, 0, 0, 2, 2, 2); // x:[0,2]
    const result = computeMatePosition(source, "box", "-x", target, "box", "+x", "flush", 0);
    expect(result.x).toBe(2); // source's min-x face (20) moves to target's max-x (2)
  });

  it("stacks source's -y face onto target's +y face", () => {
    const source = box(5, 5, 5, 1, 1, 1); // y:[5,6]
    const target = box(0, 0, 0, 2, 2, 2); // y:[0,2]
    const result = computeMatePosition(source, "box", "-y", target, "box", "+y", "flush", 0);
    expect(result).toEqual({ x: 5, y: 2, z: 5 });
  });

  it("touches source's +z face to target's -z face", () => {
    const source = box(0, 0, 0, 2, 2, 2); // z:[0,2]
    const target = box(0, 0, 10, 2, 2, 2); // z:[10,12]
    const result = computeMatePosition(source, "box", "+z", target, "box", "-z", "flush", 0);
    expect(result.z).toBe(8);
  });
});

describe("computeMatePosition — Gap", () => {
  it("offsets further from the target along its outward normal", () => {
    const source = box(0, 0, 0, 2, 2, 2); // x:[0,2]
    const target = box(10, 0, 0, 2, 2, 2); // x:[10,12]
    const flush = computeMatePosition(source, "box", "+x", target, "box", "-x", "flush", 0);
    const gapped = computeMatePosition(source, "box", "+x", target, "box", "-x", "gap", 1.5);
    expect(flush.x).toBe(8);
    expect(gapped.x).toBe(6.5); // moved 1.5 further away from the target's -x face
  });

  it("offsets toward +y when the target face points up", () => {
    const source = box(0, 5, 0, 1, 1, 1);
    const target = box(0, 0, 0, 2, 2, 2); // y:[0,2]
    const result = computeMatePosition(source, "box", "-y", target, "box", "+y", "gap", 0.5);
    expect(result.y).toBe(2.5); // flush would be 2, gap pushes further along +y
  });
});

describe("computeMatePosition — Center", () => {
  it("flushes along the mate axis and centers the two in-plane axes on the target face", () => {
    const source = box(0, 0, 0, 2, 2, 2); // y:[0,2] z:[0,2] centers (1,1)
    const target = box(10, 5, 5, 2, 4, 6); // y:[5,9] center 7, z:[5,11] center 8
    const result = computeMatePosition(source, "box", "+x", target, "box", "-x", "center", 0);
    expect(result).toEqual({ x: 8, y: 6, z: 7 });
  });
});

describe("computeMatePosition — source-only translation", () => {
  it("never reads or returns a position for the target", () => {
    const source = box(0, 0, 0, 1, 1, 1);
    const target = box(10, 0, 0, 1, 1, 1);
    const targetPositionBefore = target.position.clone();
    computeMatePosition(source, "box", "+x", target, "box", "-x", "flush", 0);
    expect(target.position).toEqual(targetPositionBefore);
  });
});

describe("computeMatePosition — mismatched source/target axis", () => {
  it("falls back to the source side facing the target along the mate axis", () => {
    const source = box(0, 0, 0, 2, 2, 2);
    const target = box(10, 0, 0, 2, 2, 2);
    // Source face picked on Y, but the mate translation axis is X (target's face axis) —
    // falls back to the source's +x side, which is the side facing the target.
    const result = computeMatePosition(source, "box", "+y" as FaceKey, target, "box", "-x", "flush", 0);
    expect(result.x).toBe(8); // same as picking "+x" on the source
  });
});
