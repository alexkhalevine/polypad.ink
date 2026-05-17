import * as THREE from "three";
import type { PlacedBox, PlacedCylinder, PlacedSphere, PlacedMesh } from "../types";
import type { WireBox, WireCylinder, WireSphere, WireMesh } from "./wire-types";

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

// ─── Mesh (boolean-operation result) ──────────────────────────────────────────
// Float32/Uint32 buffers are sent over the wire as base64-encoded raw bytes.
// btoa/atob work on binary-as-latin1 strings, which is exactly what we want here.

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return typeof btoa === "function" ? btoa(s) : Buffer.from(bytes).toString("base64");
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function float32ToBase64(arr: Float32Array): string {
  return bytesToBase64(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength));
}

function base64ToFloat32(b64: string): Float32Array {
  const bytes = base64ToBytes(b64);
  // Copy so the underlying buffer is aligned and detachable.
  const aligned = new Uint8Array(bytes.byteLength);
  aligned.set(bytes);
  return new Float32Array(aligned.buffer);
}

function uint32ToBase64(arr: Uint32Array): string {
  return bytesToBase64(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength));
}

function base64ToUint32(b64: string): Uint32Array {
  const bytes = base64ToBytes(b64);
  const aligned = new Uint8Array(bytes.byteLength);
  aligned.set(bytes);
  return new Uint32Array(aligned.buffer);
}

export function toWireMesh(mesh: PlacedMesh): WireMesh {
  return {
    id: mesh.id,
    cx: mesh.position.x,
    cy: mesh.position.y,
    cz: mesh.position.z,
    positions: float32ToBase64(mesh.positions),
    normals: float32ToBase64(mesh.normals),
    indices: mesh.indices ? uint32ToBase64(mesh.indices) : null,
    color: mesh.color,
  };
}

export function fromWireMesh(wire: WireMesh): PlacedMesh {
  return {
    id: wire.id,
    position: new THREE.Vector3(wire.cx, wire.cy, wire.cz),
    positions: base64ToFloat32(wire.positions),
    normals: base64ToFloat32(wire.normals),
    indices: wire.indices ? base64ToUint32(wire.indices) : null,
    color: wire.color,
  };
}
