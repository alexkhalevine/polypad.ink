"use client";

import * as THREE from "three";
import React, { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DrawState, DrawPhase, PlacedBox, PlacedCylinder, PlacedSphere, ToolType } from "./types";
import { GroundPlane } from "@/app/components/ground-plane";
import { HeightCapturePlane } from "@/app/components/height-capture-plane";
import { PreviewBox } from "@/app/components/preview-box";
import { PreviewCylinder } from "@/app/components/preview-cylinder";
import { PreviewSphere } from "@/app/components/preview-sphere";
import { PlacedBoxMesh } from "@/app/components/placed-box-mesh";
import { PlacedCylinderMesh } from "@/app/components/placed-cylinder-mesh";
import { PlacedSphereMesh } from "@/app/components/placed-sphere-mesh";

// ─── Context menu blocker ─────────────────────────────────────────────────────

function ContextMenuBlocker() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", prevent);
    return () => el.removeEventListener("contextmenu", prevent);
  }, [gl.domElement]);
  return null;
}

// ─── Orbit controls ───────────────────────────────────────────────────────────

function CameraControls({ phase }: { phase: DrawPhase }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl.domElement]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = phase === "idle";
    }
  }, [phase]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

// ─── Snap utility ─────────────────────────────────────────────────────────────

export function snapPoint(p: THREE.Vector3, enabled: boolean): THREE.Vector3 {
  if (!enabled) return p;
  return new THREE.Vector3(Math.round(p.x), p.y, Math.round(p.z));
}

// ─── Scene props ──────────────────────────────────────────────────────────────

interface SceneProps {
  selectedTool: ToolType | null;
  snapEnabled: boolean;
  drawState: DrawState;
  placedBoxes: PlacedBox[];
  placedCylinders: PlacedCylinder[];
  placedSpheres: PlacedSphere[];
  onGroundRightClick: (point: THREE.Vector3) => void;
  onGroundPointerMove: (point: THREE.Vector3) => void;
  onGroundClick: (point: THREE.Vector3) => void;
  onHeightPointerMove: (worldY: number) => void;
  onHeightClick: (worldY: number) => void;
}

// ─── Scene root ───────────────────────────────────────────────────────────────

function SceneContent({
  selectedTool,
  snapEnabled,
  drawState,
  placedBoxes,
  placedCylinders,
  placedSpheres,
  onGroundRightClick,
  onGroundPointerMove,
  onGroundClick,
  onHeightPointerMove,
  onHeightClick,
}: SceneProps) {
  const heightAnchorX =
    drawState.phase === "height"
      ? (drawState.start.x + drawState.end.x) / 2
      : 0;
  const heightAnchorZ =
    drawState.phase === "height"
      ? (drawState.start.z + drawState.end.z) / 2
      : 0;

  return (
    <>
      <ContextMenuBlocker />
      <CameraControls phase={drawState.phase} />

      <ambientLight intensity={Math.PI / 2} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        decay={0}
        intensity={Math.PI}
      />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />

      <primitive object={new THREE.GridHelper(20, 20, "#444", "#333")} />

      <GroundPlane
        phase={drawState.phase}
        toolActive={selectedTool !== null}
        onRightClick={(p) => onGroundRightClick(snapPoint(p, snapEnabled))}
        onPointerMove={(p) => onGroundPointerMove(snapPoint(p, snapEnabled))}
        onClick={(p) => onGroundClick(snapPoint(p, snapEnabled))}
      />

      <HeightCapturePlane
        active={drawState.phase === "height"}
        anchorX={heightAnchorX}
        anchorZ={heightAnchorZ}
        onPointerMove={onHeightPointerMove}
        onClick={onHeightClick}
      />

      {selectedTool === "box" && <PreviewBox drawState={drawState} />}
      {selectedTool === "cylinder" && <PreviewCylinder drawState={drawState} />}
      {selectedTool === "sphere" && <PreviewSphere drawState={drawState} />}

      {placedBoxes.map((box) => (
        <PlacedBoxMesh key={box.id} box={box} />
      ))}
      {placedCylinders.map((cylinder) => (
        <PlacedCylinderMesh key={cylinder.id} cylinder={cylinder} />
      ))}
      {placedSpheres.map((sphere) => (
        <PlacedSphereMesh key={sphere.id} sphere={sphere} />
      ))}
    </>
  );
}

// ─── Canvas wrapper ───────────────────────────────────────────────────────────

export function Scene(props: SceneProps) {
  const cursor = props.drawState.phase !== "idle" ? "crosshair" : "default";

  return (
    <div className="w-full h-full" style={{ cursor }}>
      <Canvas
        camera={{ position: [5, 5, 8], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
