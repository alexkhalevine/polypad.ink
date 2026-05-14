"use client";

import { useRoomStore } from "./room-store";

interface ExportModalProps {
  hasObjects: boolean;
  ref?: React.RefObject<HTMLDialogElement | null>;
}

export function ExportModal({ hasObjects, ref }: ExportModalProps) {
  const setExportRequested = useRoomStore((s) => s.setExportRequested);

  function handleDownloadSTL(e: React.MouseEvent) {
    e.preventDefault();
    setExportRequested(true);
    ref?.current?.close();
  }

    return (
      <dialog ref={ref} className="modal">
        <div className="modal-box bg-indigo-950 text-indigo-200 shadow-indigo-500 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Export</h3>

          <ul className="flex flex-col gap-2">
            <li className="flex items-center justify-between rounded-lg border border-indigo-800 px-4 py-3">
              <div>
                <p className="font-medium">STL</p>
                <p className="text-sm text-indigo-400">Binary STL — compatible with all 3D slicers</p>
              </div>
              <button
                onClick={handleDownloadSTL}
                disabled={!hasObjects}
                className="btn btn-sm bg-indigo-700 text-indigo-100 border-indigo-600 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed ml-4"
              >
                Download
              </button>
            </li>
          </ul>

          {!hasObjects && (
            <p className="text-sm text-indigo-400 mt-3">Add shapes to the scene to enable export.</p>
          )}

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-sm bg-indigo-800 text-indigo-200 border-indigo-700 hover:bg-indigo-700">
                Close
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    );
}
