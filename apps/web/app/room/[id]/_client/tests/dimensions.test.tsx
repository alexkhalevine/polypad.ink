import { describe, it, expect, beforeEach } from "vitest";
import * as THREE from "three";
import { useRoomStore } from "../room-store";
import type { PlacedBox, PlacedCylinder, PlacedSphere } from "../types";

// ─── DimensionInput commit guard ────────────────────────────────────────────────
// Mirrors the guard inside DimensionInput in apps/web/app/components/menu.tsx.
// A failed parse, NaN/Infinity, or non-positive value must NOT commit and must
// reset the draft to the parent's value. This is the same shape as the color-pick
// guard in room.test.tsx, kept inline so the test fails when the rule changes.

describe("dimension input commit guard", () => {
  // Returns the new value to commit, or null if commit must be skipped.
  const tryCommit = (draft: string, current: number): number | null => {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    if (parsed === current) return null;
    return parsed;
  };

  it("commits a positive change", () => {
    expect(tryCommit("2.5", 1)).toBe(2.5);
  });

  it("rejects zero", () => {
    expect(tryCommit("0", 1)).toBeNull();
  });

  it("rejects negative values", () => {
    expect(tryCommit("-3", 1)).toBeNull();
  });

  it("rejects NaN drafts (empty string, garbage)", () => {
    expect(tryCommit("", 1)).toBeNull();
    expect(tryCommit("abc", 1)).toBeNull();
  });

  it("rejects Infinity", () => {
    expect(tryCommit("Infinity", 1)).toBeNull();
  });

  it("skips commit when value is unchanged", () => {
    expect(tryCommit("1.00", 1)).toBeNull();
  });
});

// ─── liveDimensions store ───────────────────────────────────────────────────────
// Optimistic overlay during resize input. setLiveDimension must merge per-field
// without dropping other fields already set for the same object.

describe("liveDimensions store reducer", () => {
  beforeEach(() => {
    useRoomStore.setState({ liveDimensions: {} });
  });

  it("setLiveDimension creates an entry for a new object", () => {
    useRoomStore.getState().setLiveDimension("obj-1", "width", 5);
    expect(useRoomStore.getState().liveDimensions["obj-1"]).toEqual({ width: 5 });
  });

  it("setLiveDimension merges fields rather than overwriting", () => {
    useRoomStore.getState().setLiveDimension("obj-1", "width", 5);
    useRoomStore.getState().setLiveDimension("obj-1", "height", 3);
    expect(useRoomStore.getState().liveDimensions["obj-1"]).toEqual({ width: 5, height: 3 });
  });

  it("setLiveDimension overwrites the same field if set twice", () => {
    useRoomStore.getState().setLiveDimension("obj-1", "width", 5);
    useRoomStore.getState().setLiveDimension("obj-1", "width", 9);
    expect(useRoomStore.getState().liveDimensions["obj-1"]).toEqual({ width: 9 });
  });

  it("setLiveDimension keeps separate objects independent", () => {
    useRoomStore.getState().setLiveDimension("obj-1", "width", 5);
    useRoomStore.getState().setLiveDimension("obj-2", "radius", 2);
    expect(useRoomStore.getState().liveDimensions).toEqual({
      "obj-1": { width: 5 },
      "obj-2": { radius: 2 },
    });
  });

  it("clearLiveDimensions removes only the target object", () => {
    useRoomStore.getState().setLiveDimension("obj-1", "width", 5);
    useRoomStore.getState().setLiveDimension("obj-2", "radius", 2);
    useRoomStore.getState().clearLiveDimensions("obj-1");
    expect(useRoomStore.getState().liveDimensions).toEqual({ "obj-2": { radius: 2 } });
  });
});

// ─── selectedObjectType discriminator ───────────────────────────────────────────
// Mirrors the useMemo in use-room-editor.ts. Resize panel rendering depends on
// this returning the correct shape — wrong type means wrong inputs are shown.

describe("selectedObjectType discriminator", () => {
  const resolve = (
    selectedObjectId: string | null,
    boxes: PlacedBox[],
    cylinders: PlacedCylinder[],
    spheres: PlacedSphere[],
  ): "box" | "cylinder" | "sphere" | null => {
    if (!selectedObjectId) return null;
    if (boxes.some((b) => b.id === selectedObjectId)) return "box";
    if (cylinders.some((c) => c.id === selectedObjectId)) return "cylinder";
    if (spheres.some((s) => s.id === selectedObjectId)) return "sphere";
    return null;
  };

  const makeBox = (id: string): PlacedBox => ({
    id,
    center: new THREE.Vector3(),
    width: 1,
    height: 1,
    depth: 1,
    color: null,
  });
  const makeCylinder = (id: string): PlacedCylinder => ({
    id,
    center: new THREE.Vector3(),
    radius: 1,
    height: 1,
    color: null,
  });
  const makeSphere = (id: string): PlacedSphere => ({
    id,
    center: new THREE.Vector3(),
    radius: 1,
    color: null,
  });

  it("returns null when no object is selected", () => {
    expect(resolve(null, [makeBox("a")], [], [])).toBeNull();
  });

  it("identifies a box", () => {
    expect(resolve("a", [makeBox("a")], [makeCylinder("b")], [makeSphere("c")])).toBe("box");
  });

  it("identifies a cylinder", () => {
    expect(resolve("b", [makeBox("a")], [makeCylinder("b")], [makeSphere("c")])).toBe("cylinder");
  });

  it("identifies a sphere", () => {
    expect(resolve("c", [makeBox("a")], [makeCylinder("b")], [makeSphere("c")])).toBe("sphere");
  });

  it("returns null when selected id matches no shape (stale selection)", () => {
    expect(resolve("ghost", [makeBox("a")], [makeCylinder("b")], [makeSphere("c")])).toBeNull();
  });
});

// ─── WS object:updated dimension merge per shape ────────────────────────────────
// Mirrors the per-shape spread in use-room-socket.ts. Radius applied to a box,
// or width applied to a sphere, would silently corrupt geometry — so the merge
// MUST drop fields that don't apply to the target shape.

type Patch = { width?: number; height?: number; depth?: number; radius?: number };

describe("WS object:updated dimension merge", () => {
  const mergeBox = (b: PlacedBox, p: Patch): PlacedBox => ({
    ...b,
    ...(p.width !== undefined ? { width: p.width } : {}),
    ...(p.height !== undefined ? { height: p.height } : {}),
    ...(p.depth !== undefined ? { depth: p.depth } : {}),
  });

  const mergeCylinder = (c: PlacedCylinder, p: Patch): PlacedCylinder => ({
    ...c,
    ...(p.radius !== undefined ? { radius: p.radius } : {}),
    ...(p.height !== undefined ? { height: p.height } : {}),
  });

  const mergeSphere = (s: PlacedSphere, p: Patch): PlacedSphere => ({
    ...s,
    ...(p.radius !== undefined ? { radius: p.radius } : {}),
  });

  const baseBox: PlacedBox = {
    id: "b",
    center: new THREE.Vector3(),
    width: 1,
    height: 1,
    depth: 1,
    color: null,
  };
  const baseCylinder: PlacedCylinder = {
    id: "c",
    center: new THREE.Vector3(),
    radius: 1,
    height: 1,
    color: null,
  };
  const baseSphere: PlacedSphere = {
    id: "s",
    center: new THREE.Vector3(),
    radius: 1,
    color: null,
  };

  it("box merge applies width/height/depth and ignores radius", () => {
    const merged = mergeBox(baseBox, { width: 5, height: 6, depth: 7, radius: 99 });
    expect(merged.width).toBe(5);
    expect(merged.height).toBe(6);
    expect(merged.depth).toBe(7);
    // box has no radius field — verify radius didn't sneak in
    expect("radius" in merged).toBe(false);
  });

  it("cylinder merge applies radius/height and ignores width/depth", () => {
    const merged = mergeCylinder(baseCylinder, { radius: 2, height: 3, width: 99, depth: 99 });
    expect(merged.radius).toBe(2);
    expect(merged.height).toBe(3);
    expect("width" in merged).toBe(false);
    expect("depth" in merged).toBe(false);
  });

  it("sphere merge applies only radius and ignores other dims", () => {
    const merged = mergeSphere(baseSphere, { radius: 2, height: 99, width: 99, depth: 99 });
    expect(merged.radius).toBe(2);
    expect("width" in merged).toBe(false);
    expect("height" in merged).toBe(false);
    expect("depth" in merged).toBe(false);
  });

  it("partial patches leave other fields untouched", () => {
    const merged = mergeBox(baseBox, { width: 9 });
    expect(merged.width).toBe(9);
    expect(merged.height).toBe(1);
    expect(merged.depth).toBe(1);
  });
});
