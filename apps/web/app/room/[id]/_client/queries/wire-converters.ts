import * as THREE from "three";
import type { PlacedBox, PlacedCylinder, PlacedSphere } from "../types";
import type { WireBox, WireCylinder, WireSphere } from "./wire-types";

// Wire fields cx/cy/cz are kept for backward compatibility with the server schema,
// but they now carry the bottom-anchor (corner / base), not the geometric center.

export function toWireBox(box: PlacedBox): WireBox {
  return {
    id: box.id,
    cx: box.position.x,
    cy: box.position.y,
    cz: box.position.z,
    width: box.width,
    height: box.height,
    depth: box.depth,
    color: box.color,
  };
}

export function fromWireBox(wire: WireBox): PlacedBox {
  return {
    id: wire.id,
    position: new THREE.Vector3(wire.cx, wire.cy, wire.cz),
    width: wire.width,
    height: wire.height,
    depth: wire.depth,
    color: wire.color,
  };
}

export function toWireCylinder(cylinder: PlacedCylinder): WireCylinder {
  return {
    id: cylinder.id,
    cx: cylinder.position.x,
    cy: cylinder.position.y,
    cz: cylinder.position.z,
    radius: cylinder.radius,
    height: cylinder.height,
    color: cylinder.color,
  };
}

export function fromWireCylinder(wire: WireCylinder): PlacedCylinder {
  return {
    id: wire.id,
    position: new THREE.Vector3(wire.cx, wire.cy, wire.cz),
    radius: wire.radius,
    height: wire.height,
    color: wire.color,
  };
}

export function toWireSphere(sphere: PlacedSphere): WireSphere {
  return {
    id: sphere.id,
    cx: sphere.position.x,
    cy: sphere.position.y,
    cz: sphere.position.z,
    radius: sphere.radius,
    color: sphere.color,
  };
}

export function fromWireSphere(wire: WireSphere): PlacedSphere {
  return {
    id: wire.id,
    position: new THREE.Vector3(wire.cx, wire.cy, wire.cz),
    radius: wire.radius,
    color: wire.color,
  };
}
