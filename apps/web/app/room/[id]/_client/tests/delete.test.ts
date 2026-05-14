import { describe, it, expect, beforeEach } from "vitest";
import { useRoomStore } from "../room-store";

// ─── Lock guard ─────────────────────────────────────────────────────────────────
// Mirrors the guard inside handleDeleteObject in use-room-editor.ts.
// A locked object must only be deletable by the user who holds the lock — never
// by anyone else. This is the primary safety invariant for collaborative deletion.

describe("delete lock guard", () => {
  // Mirrors handleDeleteObject guard logic.
  const canDelete = (
    selectedObjectId: string | null,
    objectLocks: Record<string, string>,
    localUserId: string | null,
  ): boolean => {
    if (!selectedObjectId) return false;
    const lockHolder = objectLocks[selectedObjectId];
    if (lockHolder && lockHolder !== localUserId) return false;
    return true;
  };

  it("returns false when no object is selected", () => {
    expect(canDelete(null, {}, "user-1")).toBe(false);
  });

  it("returns true when object is selected and unlocked", () => {
    expect(canDelete("obj-1", {}, "user-1")).toBe(true);
  });

  it("returns true when the local user holds the lock", () => {
    expect(canDelete("obj-1", { "obj-1": "user-1" }, "user-1")).toBe(true);
  });

  it("returns false when another user holds the lock", () => {
    expect(canDelete("obj-1", { "obj-1": "user-2" }, "user-1")).toBe(false);
  });

  it("returns true when a different object is locked but selected one is not", () => {
    expect(canDelete("obj-1", { "obj-2": "user-2" }, "user-1")).toBe(true);
  });

  it("returns false when localUserId is null and object is locked", () => {
    expect(canDelete("obj-1", { "obj-1": "user-2" }, null)).toBe(false);
  });
});

// ─── resetEditorState after deletion ────────────────────────────────────────────
// handleDeleteObject calls resetEditorState on success. The store must clear
// selectedObjectId, selectedTool, and return selectionMode to "draw" — otherwise
// the UI is left showing controls for a shape that no longer exists.

describe("resetEditorState clears selection after delete", () => {
  beforeEach(() => {
    useRoomStore.setState({
      selectedObjectId: null,
      selectedTool: null,
      selectionMode: "draw",
    });
  });

  it("clears selectedObjectId", () => {
    useRoomStore.setState({ selectedObjectId: "obj-1" });
    useRoomStore.getState().resetEditorState();
    expect(useRoomStore.getState().selectedObjectId).toBeNull();
  });

  it("clears selectedTool", () => {
    useRoomStore.setState({ selectedTool: "move" });
    useRoomStore.getState().resetEditorState();
    expect(useRoomStore.getState().selectedTool).toBeNull();
  });

  it("resets selectionMode to draw", () => {
    useRoomStore.setState({ selectionMode: "select" });
    useRoomStore.getState().resetEditorState();
    expect(useRoomStore.getState().selectionMode).toBe("draw");
  });

  it("clears all three fields in one call", () => {
    useRoomStore.setState({ selectedObjectId: "obj-1", selectedTool: "move", selectionMode: "select" });
    useRoomStore.getState().resetEditorState();
    const { selectedObjectId, selectedTool, selectionMode } = useRoomStore.getState();
    expect(selectedObjectId).toBeNull();
    expect(selectedTool).toBeNull();
    expect(selectionMode).toBe("draw");
  });
});

// ─── Keyboard input guard ────────────────────────────────────────────────────────
// The Delete/Backspace handler must not fire when focus is inside a text input —
// otherwise typing in the dimension fields would delete the selected shape.

describe("keyboard delete input guard", () => {
  // Mirrors the tag check at the top of the keydown handler in use-room-editor.ts.
  const shouldSkip = (tagName: string | undefined): boolean =>
    tagName === "INPUT" || tagName === "TEXTAREA";

  it("skips when focus is in an INPUT", () => {
    expect(shouldSkip("INPUT")).toBe(true);
  });

  it("skips when focus is in a TEXTAREA", () => {
    expect(shouldSkip("TEXTAREA")).toBe(true);
  });

  it("does not skip for a DIV (canvas overlay)", () => {
    expect(shouldSkip("DIV")).toBe(false);
  });

  it("does not skip for a BUTTON", () => {
    expect(shouldSkip("BUTTON")).toBe(false);
  });

  it("does not skip when activeElement has no tag (undefined)", () => {
    expect(shouldSkip(undefined)).toBe(false);
  });
});

// ─── releaseRemoteLock store integrity ──────────────────────────────────────────
// The socket handler calls releaseRemoteLock when it receives object:deleted.
// It must remove only the target lock and leave others intact — otherwise an
// unrelated user's lock could silently vanish when any object is deleted.

describe("releaseRemoteLock removes only the target entry", () => {
  beforeEach(() => {
    useRoomStore.setState({ objectLocks: {} });
  });

  it("removes the specified lock", () => {
    useRoomStore.setState({ objectLocks: { "obj-1": "user-1" } });
    useRoomStore.getState().releaseRemoteLock("obj-1");
    expect(useRoomStore.getState().objectLocks["obj-1"]).toBeUndefined();
  });

  it("leaves other locks untouched", () => {
    useRoomStore.setState({ objectLocks: { "obj-1": "user-1", "obj-2": "user-2" } });
    useRoomStore.getState().releaseRemoteLock("obj-1");
    expect(useRoomStore.getState().objectLocks["obj-2"]).toBe("user-2");
  });

  it("is a no-op when the lock does not exist", () => {
    useRoomStore.setState({ objectLocks: { "obj-2": "user-2" } });
    useRoomStore.getState().releaseRemoteLock("obj-1");
    expect(useRoomStore.getState().objectLocks).toEqual({ "obj-2": "user-2" });
  });
});
