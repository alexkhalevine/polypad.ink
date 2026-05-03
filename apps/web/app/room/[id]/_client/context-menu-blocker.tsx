"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export function ContextMenuBlocker() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", prevent);
    return () => el.removeEventListener("contextmenu", prevent);
  }, [gl.domElement]);
  return null;
}
