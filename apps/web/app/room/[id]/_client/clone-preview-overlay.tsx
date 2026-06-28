"use client";

import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { PlacedBox, PlacedCylinder, PlacedSphere, PlacedCone, PlacedMesh } from "./types";

type Source = PlacedBox | PlacedCylinder | PlacedSphere | PlacedCone | PlacedMesh;
type SourceType = "box" | "cylinder" | "sphere" | "cone" | "mesh";

const FALLBACK_COLOR = "#ffffff";

interface Props {
  source: Source;
  sourceType: SourceType;
  position: { x: number; y: number; z: number };
}

export function ClonePreviewOverlay({ source, sourceType, position }: Props) {
  const baseGeo = useMemo(() => {
    if (sourceType === "box") {
      const b = source as PlacedBox;
      return new THREE.BoxGeometry(b.width, b.height, b.depth);
    }
    if (sourceType === "cylinder") {
      const c = source as PlacedCylinder;
      return new THREE.CylinderGeometry(c.radius, c.radius, c.height, 32);
    }
    if (sourceType === "sphere") {
      const s = source as PlacedSphere;
      return new THREE.SphereGeometry(s.radius, 32, 16);
    }
    if (sourceType === "cone") {
      const c = source as PlacedCone;
      return new THREE.ConeGeometry(c.radius, c.height, 32);
    }
    const m = source as PlacedMesh;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(m.positions, 3));
    if (m.indices) g.setIndex(new THREE.BufferAttribute(m.indices, 1));
    return g;
  }, [source, sourceType]);

  const edges = useMemo(() => new THREE.EdgesGeometry(baseGeo), [baseGeo]);

  useEffect(() => () => {
    edges.dispose();
    baseGeo.dispose();
  }, [edges, baseGeo]);

  const offset = useMemo<[number, number, number]>(() => {
    if (sourceType === "box") {
      const b = source as PlacedBox;
      return [b.width / 2, b.height / 2, b.depth / 2];
    }
    if (sourceType === "cylinder") {
      const c = source as PlacedCylinder;
      return [0, c.height / 2, 0];
    }
    if (sourceType === "sphere") {
      const s = source as PlacedSphere;
      return [0, s.radius, 0];
    }
    if (sourceType === "cone") {
      const c = source as PlacedCone;
      return [0, c.height / 2, 0];
    }
    return [0, 0, 0];
  }, [source, sourceType]);

  const color = source.color ?? FALLBACK_COLOR;

  return (
    <lineSegments
      geometry={edges}
      position={[position.x + offset[0], position.y + offset[1], position.z + offset[2]]}
    >
      <lineBasicMaterial color={color} transparent opacity={0.8} depthTest={false} />
    </lineSegments>
  );
}
