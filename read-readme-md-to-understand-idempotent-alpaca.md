# Error Handling — UI Toast System

## Context

The app currently surfaces no errors to the user. Mutation failures (place/move/color), query failures (loading objects), and setup form errors all fail silently. The goal is a top-right auto-dismissing toast stack using daisyUI `alert alert-error`, wired to every meaningful failure point in the app.

---

## Architecture

**New files:**
- `apps/web/app/error-store.ts` — global Zustand store (app-level, not room-scoped)
- `apps/web/app/components/error-stack.tsx` — fixed top-right stack of daisyUI alerts, auto-dismiss 5s
- `apps/web/app/room/[id]/_client/queries/api-error.ts` — `ApiError` class carrying HTTP `status`
- `apps/web/app/room/setup/room-setup-form.tsx` — extracted client form component with `useActionState`

**Modified files:**
- `apps/web/app/providers.tsx` — render `<ErrorStack />` inside `QueryClientProvider`
- `apps/web/app/room/setup/page.tsx` — replace inline `<form>` with `<RoomSetupForm token={token} />`
- `apps/web/app/room/setup/actions.ts` — return `{ error: string }` on failure; `redirect()` on success unchanged
- `apps/web/app/room/[id]/_client/queries/use-place-object.ts` — throw `ApiError`, add `onError`
- `apps/web/app/room/[id]/_client/queries/use-update-object-color.ts` — throw `ApiError`, add `onError`
- `apps/web/app/room/[id]/_client/queries/use-update-object-position.ts` — throw `ApiError`, add `onError`
- `apps/web/app/room/[id]/_client/queries/use-room-objects.ts` — throw `ApiError`
- `apps/web/app/room/[id]/_client/room.tsx` — add `useEffect` on `isError` from `useRoomObjects`

---

## Error messages

| Trigger | Condition | Message |
|---|---|---|
| `useRoomObjects` query fails | any | "Could not load 3D objects. Try refreshing the page." |
| `usePlaceObject` fails | 429 | "Too many requests. Please wait a moment and try again." |
| `usePlaceObject` fails | other | "Could not add object. Please try again." |
| `useUpdateObjectColor` fails | 429 | "Too many requests. Please wait a moment and try again." |
| `useUpdateObjectColor` fails | other | "Could not update color. Please try again." |
| `useUpdateObjectPosition` fails | 429 | "Too many requests. Please wait a moment and try again." |
| `useUpdateObjectPosition` fails | other | "Could not move object. Please try again." |
| Setup form — hCaptcha invalid | — | "Verification failed. Please try again from the home page." |
| Setup form — other failure | — | "Something went wrong. Please try again." |

---

## Step-by-step implementation

### Step 1 — `api-error.ts`

Create `apps/web/app/room/[id]/_client/queries/api-error.ts`:

```ts
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}
```

### Step 2 — Update fetch functions to throw `ApiError`

In each of the four query/mutation files, replace `throw new Error(...)` with `throw new ApiError(..., response.status)`:

- `use-room-objects.ts` → `throw new ApiError("Failed to fetch room objects", response.status)`
- `use-place-object.ts` → `throw new ApiError("Failed to place object", response.status)`
- `use-update-object-color.ts` → `throw new ApiError("Failed to update color", response.status)`
- `use-update-object-position.ts` → `throw new ApiError("Failed to update position", response.status)`

### Step 3 — `error-store.ts`

Create `apps/web/app/error-store.ts`:

```ts
import { create } from "zustand";

export interface AppError {
  id: string;
  message: string;
}

interface ErrorStore {
  errors: AppError[];
  addError: (message: string) => void;
  removeError: (id: string) => void;
}

export const useErrorStore = create<ErrorStore>((set) => ({
  errors: [],
  addError: (message) =>
    set((s) => ({
      errors: [...s.errors, { id: crypto.randomUUID(), message }],
    })),
  removeError: (id) =>
    set((s) => ({ errors: s.errors.filter((e) => e.id !== id) })),
}));
```

### Step 4 — `error-stack.tsx`

Create `apps/web/app/components/error-stack.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useErrorStore, AppError } from "../error-store";

const DISMISS_MS = 5000;

function ErrorAlert({ error }: { error: AppError }) {
  const removeError = useErrorStore((s) => s.removeError);

  useEffect(() => {
    const timer = setTimeout(() => removeError(error.id), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error.id, removeError]);

  return (
    <div role="alert" className="alert alert-error">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{error.message}</span>
    </div>
  );
}

export function ErrorStack() {
  const errors = useErrorStore((s) => s.errors);

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {errors.map((error) => (
        <ErrorAlert key={error.id} error={error} />
      ))}
    </div>
  );
}
```

### Step 5 — Update `providers.tsx`

Add `<ErrorStack />` as a sibling to `{children}` inside `QueryClientProvider`:

```tsx
import { ErrorStack } from "./components/error-stack";

// inside return:
<QueryClientProvider client={queryClient}>
  {children}
  <ErrorStack />
</QueryClientProvider>
```

### Step 6 — Add `onError` to mutation hooks

In each mutation hook, import `ApiError` and `useErrorStore`, add an `onError` callback:

**`use-place-object.ts`:**
```ts
onError: (error: unknown) => {
  const status = error instanceof ApiError ? error.status : 0;
  const msg = status === 429
    ? "Too many requests. Please wait a moment and try again."
    : "Could not add object. Please try again.";
  useErrorStore.getState().addError(msg);
},
```

**`use-update-object-color.ts`:**
```ts
onError: (error: unknown) => {
  const status = error instanceof ApiError ? error.status : 0;
  const msg = status === 429
    ? "Too many requests. Please wait a moment and try again."
    : "Could not update color. Please try again.";
  useErrorStore.getState().addError(msg);
},
```

**`use-update-object-position.ts`:**
```ts
onError: (error: unknown) => {
  const status = error instanceof ApiError ? error.status : 0;
  const msg = status === 429
    ? "Too many requests. Please wait a moment and try again."
    : "Could not move object. Please try again.";
  useErrorStore.getState().addError(msg);
},
```

### Step 7 — Handle `useRoomObjects` error in `room.tsx`

`useQuery` in TanStack Query v5 has no `onError` option. Handle it via `useEffect` in `room.tsx`:

```tsx
const { data: serverObjects, isError: isObjectsError } = useRoomObjects(roomId);

useEffect(() => {
  if (isObjectsError) {
    useErrorStore.getState().addError(
      "Could not load 3D objects. Try refreshing the page."
    );
  }
}, [isObjectsError]);
```

Import `useErrorStore` from `"@/app/error-store"` in `room.tsx`.

### Step 8 — Modify `actions.ts` setup form action

Change `setupRoom` signature to accept `prevState` (required by `useActionState`) and return typed errors instead of redirecting silently:

```ts
export async function setupRoom(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const token = formData.get("token") as string;
  const roomName = formData.get("roomName") as string;

  if (!token || !roomName) {
    return { error: "Something went wrong. Please try again." };
  }

  const isValid = await verifyHcaptcha(token);
  if (!isValid) {
    return { error: "Verification failed. Please try again from the home page." };
  }

  redirect(`/room/${roomName}?name=${encodeURIComponent(roomName)}`);
}
```

Note: `redirect()` on success throws a special Next.js error caught by the framework — `useActionState` never sees the return value in that case.

### Step 9 — Create `room-setup-form.tsx`

Create `apps/web/app/room/setup/room-setup-form.tsx`:

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { setupRoom } from "./actions";
import { useErrorStore } from "@/app/error-store";

export function RoomSetupForm({ token }: { token: string }) {
  const [state, action, isPending] = useActionState(setupRoom, null);

  useEffect(() => {
    if (state?.error) {
      useErrorStore.getState().addError(state.error);
    }
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-6 items-center">
      <input type="hidden" name="token" value={token} />
      <input
        type="text"
        name="roomName"
        placeholder="room-name"
        className="input input-bordered w-full font-sans text-black"
        required
      />
      <button className="btn w-xs" type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Room"}
      </button>
    </form>
  );
}
```

### Step 10 — Update `room/setup/page.tsx`

Replace the inline `<form action={setupRoom}>` with `<RoomSetupForm token={token} />`:

```tsx
import { RoomSetupForm } from "./room-setup-form";

// replace:
<form action={setupRoom} className="flex flex-col gap-6 items-center">
  ...
</form>

// with:
<RoomSetupForm token={token} />
```

Remove the `setupRoom` import from the page (it's now only used in `room-setup-form.tsx`).

---

## Critical files

| File | Action |
|---|---|
| `apps/web/app/error-store.ts` | Create |
| `apps/web/app/components/error-stack.tsx` | Create |
| `apps/web/app/room/[id]/_client/queries/api-error.ts` | Create |
| `apps/web/app/room/setup/room-setup-form.tsx` | Create |
| `apps/web/app/providers.tsx` | Add `<ErrorStack />` |
| `apps/web/app/room/setup/page.tsx` | Use `<RoomSetupForm>` |
| `apps/web/app/room/setup/actions.ts` | Return errors instead of redirect |
| `apps/web/app/room/[id]/_client/queries/use-place-object.ts` | Throw `ApiError`, add `onError` |
| `apps/web/app/room/[id]/_client/queries/use-update-object-color.ts` | Throw `ApiError`, add `onError` |
| `apps/web/app/room/[id]/_client/queries/use-update-object-position.ts` | Throw `ApiError`, add `onError` |
| `apps/web/app/room/[id]/_client/queries/use-room-objects.ts` | Throw `ApiError` |
| `apps/web/app/room/[id]/_client/room.tsx` | Add `useEffect` on `isObjectsError` |

---

## Verification

1. `pnpm --filter web test --run` — all existing tests pass
2. `make dev` — app starts cleanly
3. Trigger a mutation error (e.g. stop the server, try placing an object) → red alert appears top-right and disappears after 5s
4. Trigger multiple errors quickly → they stack vertically
5. Stop the server before loading a room → "Could not load 3D objects" alert appears
6. Submit the setup form with the dev server's hCaptcha key set to an invalid value → "Verification failed" alert appears
