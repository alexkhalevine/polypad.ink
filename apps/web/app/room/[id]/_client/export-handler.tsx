"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { useRoomStore } from "./room-store";
import { useErrorStore } from "@/app/error-store";

export const PLACED_OBJECTS_GROUP = "placed-objects";

export function ExportHandler({ roomId }: { roomId: string }) {
  const { scene } = useThree();
  const exportRequested = useRoomStore((s) => s.exportRequested);
  const setExportRequested = useRoomStore((s) => s.setExportRequested);

  useEffect(() => {
    if (!exportRequested) return;
    setExportRequested(false);

    const group = scene.getObjectByName(PLACED_OBJECTS_GROUP);
    if (!group) return;

    try {
      const exporter = new STLExporter();
      // binary: true returns a DataView; extract the underlying ArrayBuffer for Blob
      const output = exporter.parse(group, { binary: true }) as unknown as DataView;
      const blob = new Blob([output.buffer as ArrayBuffer], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `polypad-${roomId}.stl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      useErrorStore.getState().addError("Export failed. Please try again.");
    }
  }, [exportRequested, scene, roomId, setExportRequested]);

  return null;
}
