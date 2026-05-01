import * as THREE from "three";
import type { PlacedBox, PlacedCylinder, PlacedSphere } from "../types";
import type { WireBox, WireCylinder, WireSphere } from "./wire-types";

export function toWireBox(box: PlacedBox): WireBox {
  return {
    id: box.id,
    cx: box.center.x,
    cy: box.center.y,
    cz: box.center.z,
    width: box.width,
    height: box.height,
    depth: box.depth,
    color: box.color,
  };
}

export function fromWireBox(wire: WireBox): PlacedBox {
  return {
    id: wire.id,
    center: new THREE.Vector3(wire.cx, wire.cy, wire.cz),
    width: wire.width,
    height: wire.height,
    depth: wire.depth,
    color: wire.color,
  };
}

export function toWireCylinder(cylinder: PlacedCylinder): WireCylinder {
  return {
    id: cylinder.id,
    cx: cylinder.center.x,
    cy: cylinder.center.y,
    cz: cylinder.center.z,
    radius: cylinder.radius,
    height: cylinder.height,
    color: cylinder.color,
  };
}

export function fromWireCylinder(wire: WireCylinder): PlacedCylinder {
  return {
    id: wire.id,
    center: new THREE.Vector3(wire.cx, wire.cy, wire.cz),
    radius: wire.radius,
    height: wire.height,
    color: wire.color,
  };
}

export function toWireSphere(sphere: PlacedSphere): WireSphere {
  return {
    id: sphere.id,
    cx: sphere.center.x,
    cy: sphere.center.y,
    cz: sphere.center.z,
    radius: sphere.radius,
    color: sphere.color,
  };
}

export function fromWireSphere(wire: WireSphere): PlacedSphere {
  return {
    id: wire.id,
    center: new THREE.Vector3(wire.cx, wire.cy, wire.cz),
    radius: wire.radius,
    color: wire.color,
  };
}