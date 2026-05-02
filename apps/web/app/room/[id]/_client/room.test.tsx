import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { toWireBox, toWireCylinder, toWireSphere, fromWireBox, fromWireCylinder, fromWireSphere } from "./queries/wire-converters";
import type { PlacedBox, PlacedCylinder, PlacedSphere } from "./types";

// ─── Wire converters ────────────────────────────────────────────────────────────
// TODO: Critical: these serialize 3D object state for server round-trips.
// TODO: A bug here silently corrupts persisted geometry.

describe("toWireBox / fromWireBox", () => {
  const box: PlacedBox = {
    id: "box-1",
    center: new THREE.Vector3(1.5, 2.5, 3.5),
    width: 2,
    height: 3,
    depth: 4,
    color: "#ff0000",
  };

  it("toWireBox extracts center components and flattens the object", () => {
    const wire = toWireBox(box);
    expect(wire.id).toBe("box-1");
    expect(wire.cx).toBe(1.5);
    expect(wire.cy).toBe(2.5);
    expect(wire.cz).toBe(3.5);
    expect(wire.width).toBe(2);
    expect(wire.height).toBe(3);
    expect(wire.depth).toBe(4);
    expect(wire.color).toBe("#ff0000");
  });

  it("fromWireBox reconstructs the PlacedBox with a Vector3 center", () => {
    const reconstructed = fromWireBox(toWireBox(box));
    expect(reconstructed.id).toBe("box-1");
    expect(reconstructed.center).toBeInstanceOf(THREE.Vector3);
    expect(reconstructed.center.x).toBeCloseTo(1.5);
    expect(reconstructed.center.y).toBeCloseTo(2.5);
    expect(reconstructed.center.z).toBeCloseTo(3.5);
    expect(reconstructed.width).toBe(2);
    expect(reconstructed.height).toBe(3);
    expect(reconstructed.depth).toBe(4);
    expect(reconstructed.color).toBe("#ff0000");
  });

  it("round-trips with sub-centimeter precision", () => {
    const precise: PlacedBox = {
      id: "p",
      center: new THREE.Vector3(1.001, 2.999, 3.14159),
      width: 0.5,
      height: 0.5,
      depth: 0.5,
      color: null,
    };
    const wire = toWireBox(precise);
    const restored = fromWireBox(wire);
    expect(restored.center.x).toBeCloseTo(1.001, 3);
    expect(restored.center.y).toBeCloseTo(2.999, 3);
    expect(restored.center.z).toBeCloseTo(3.14159, 3);
  });
});

describe("toWireCylinder / fromWireCylinder", () => {
  const cylinder: PlacedCylinder = {
    id: "cyl-1",
    center: new THREE.Vector3(0, 1.5, 0),
    radius: 0.75,
    height: 3,
    color: "#00ff00",
  };

  it("toWireCylinder extracts center components", () => {
    const wire = toWireCylinder(cylinder);
    expect(wire.id).toBe("cyl-1");
    expect(wire.cx).toBe(0);
    expect(wire.cy).toBe(1.5);
    expect(wire.cz).toBe(0);
    expect(wire.radius).toBe(0.75);
    expect(wire.height).toBe(3);
    expect(wire.color).toBe("#00ff00");
  });

  it("fromWireCylinder reconstructs the Vector3 center", () => {
    const restored = fromWireCylinder(toWireCylinder(cylinder));
    expect(restored.id).toBe("cyl-1");
    expect(restored.center).toBeInstanceOf(THREE.Vector3);
    expect(restored.center.x).toBeCloseTo(0);
    expect(restored.center.y).toBeCloseTo(1.5);
    expect(restored.center.z).toBeCloseTo(0);
    expect(restored.radius).toBeCloseTo(0.75);
    expect(restored.height).toBe(3);
  });
});

describe("toWireSphere / fromWireSphere", () => {
  const sphere: PlacedSphere = {
    id: "sph-1",
    center: new THREE.Vector3(-1, -2, -3),
    radius: 1.25,
    color: "#0000ff",
  };

  it("toWireSphere extracts center components", () => {
    const wire = toWireSphere(sphere);
    expect(wire.id).toBe("sph-1");
    expect(wire.cx).toBe(-1);
    expect(wire.cy).toBe(-2);
    expect(wire.cz).toBe(-3);
    expect(wire.radius).toBe(1.25);
    expect(wire.color).toBe("#0000ff");
  });

  it("fromWireSphere reconstructs the Vector3 center", () => {
    const restored = fromWireSphere(toWireSphere(sphere));
    expect(restored.id).toBe("sph-1");
    expect(restored.center).toBeInstanceOf(THREE.Vector3);
    expect(restored.center.x).toBeCloseTo(-1);
    expect(restored.center.y).toBeCloseTo(-2);
    expect(restored.center.z).toBeCloseTo(-3);
    expect(restored.radius).toBeCloseTo(1.25);
  });
});

// ─── Coordinate formatting ──────────────────────────────────────────────────────
// selectedObjectCoords is shown in the UI status bar.
// Format must be consistent: "X: 1.00, Y: 2.00, Z: 3.00"

describe("selectedObjectCoords formatting", () => {
  const formatCoords = (center: THREE.Vector3) =>
    `X: ${center.x.toFixed(2)}, Y: ${center.y.toFixed(2)}, Z: ${center.z.toFixed(2)}`;

  it("formats positive coordinates to 2 decimal places", () => {
    const c = new THREE.Vector3(1.5, 2.5, 3.5);
    expect(formatCoords(c)).toBe("X: 1.50, Y: 2.50, Z: 3.50");
  });

  it("formats negative coordinates correctly", () => {
    const c = new THREE.Vector3(-1.5, -2.5, -3.5);
    expect(formatCoords(c)).toBe("X: -1.50, Y: -2.50, Z: -3.50");
  });

  it("pads single decimal places with zero", () => {
    const c = new THREE.Vector3(1, 2, 3);
    expect(formatCoords(c)).toBe("X: 1.00, Y: 2.00, Z: 3.00");
  });

  it("handles sub-centimeter precision", () => {
    const c = new THREE.Vector3(1.001, 2.999, 3.14159);
    expect(formatCoords(c)).toBe("X: 1.00, Y: 3.00, Z: 3.14");
  });
});

// ─── Color pick guard ───────────────────────────────────────────────────────────
// onMouseUpColorPicked should NOT fire a mutation when the selected color
// is the same as the object's current color.

describe("color pick guard logic", () => {
  // Replicating the guard from Room.tsx — extract to a testable helper if this grows
  const shouldMutateColor = ({
    selectedObjectId,
    selectedObjectColor,
    selectedColor,
  }: {
    selectedObjectId: string | null;
    selectedObjectColor: string | undefined;
    selectedColor: string;
  }) => selectedObjectId && selectedObjectColor !== selectedColor;

  it("does not mutate when selectedObjectId is null", () => {
    // Returns null (falsy) because selectedObjectId is null — mutation is skipped
    expect(shouldMutateColor({ selectedObjectId: null, selectedObjectColor: "#ff0000", selectedColor: "#00ff00" })).toBeFalsy();
  });

  it("does not mutate when color is unchanged", () => {
    expect(shouldMutateColor({ selectedObjectId: "obj-1", selectedObjectColor: "#ff0000", selectedColor: "#ff0000" })).toBe(false);
  });

  it("mutates when color has changed", () => {
    expect(shouldMutateColor({ selectedObjectId: "obj-1", selectedObjectColor: "#ff0000", selectedColor: "#00ff00" })).toBe(true);
  });

  it("mutates when object has no prior color (undefined)", () => {
    expect(shouldMutateColor({ selectedObjectId: "obj-1", selectedObjectColor: undefined, selectedColor: "#00ff00" })).toBe(true);
  });
});
