# Design

## Context

The project is an Express server serving static HTML pages from `public/`. The existing template page has input and output areas plus clear actions, but the server has no session state or parameterized template route, and the client-side template script is not currently part of the tracked project tree. See `proposal.md` for the motivation and user-facing scope.

## Goals / Non-Goals

**Goals:**

- Introduce a small in-memory session store keyed by numeric template session IDs.
- Keep token parsing, variable CRUD, rendering, and dirty-state tracking deterministic and testable.
- Preserve the current static-page deployment model and provide progressive browser behavior without database infrastructure.
- Make session routing and new-tab creation explicit while keeping the initial `/template` entry point usable.

**Non-Goals:**

- Persistent storage, accounts, cross-device synchronization, or server-side session authentication.
- A custom replacement for the browser's native unload confirmation UI.
- Arbitrary template expression evaluation or support for token syntax outside the specified pattern.

## Decisions

- **Use a server-owned in-memory session map.** The Express process will own session records containing template text, title, and variables. This avoids a new persistence dependency and gives route requests a single source of truth, while accepting that state is lost on process restart.
- **Use numeric route allocation.** `/template` will resolve to an initial session and `/template/<id>` will address a specific numeric session. The next-session action will request or derive the next ID and open that route in a new tab. Invalid route values will be rejected rather than interpreted as filesystem paths.
- **Keep rendering semantics in one template-processing layer.** Token extraction, case-sensitive lookup, global replacement, and raw-token fallback will share the same token pattern and variable map so the visible variable list and output cannot diverge.
- **Synchronize client state through explicit events.** Input and variable edits will update the active session model, rerender output, and mark the session dirty. Clear actions will use the same state update path so dirty tracking and UI state remain consistent.
- **Use `beforeunload` only while dirty.** Register one handler that calls `preventDefault()` and sets `returnValue` when the dirty flag is true; remove or bypass the prompt when the session is clean. The browser controls the exact prompt wording.
- **Set `document.title` from the Title input.** The title field will be initialized from the active session and update the DOM title on each accepted edit; the server will retain the session value for same-process route revisits.

## Risks / Trade-offs

- **Process restart loses session state** → Document the in-memory lifetime and avoid implying persistence in the UI.
- **Multiple browser tabs can request the same next ID concurrently** → Allocate IDs atomically in the server-side session store or make the new-session endpoint perform allocation.
- **Native unload prompt wording varies by browser** → Assert the `beforeunload` contract and dirty conditions, not an exact browser-rendered string.
- **Unsaved state may be cleared without persistence** → Treat clear operations as explicit user edits and keep the dirty-state rules consistent with the session model.

## Migration Plan

1. Add the session store and parameterized template routes while retaining the existing `/template` route as an entry point.
2. Add the template client controller, header controls, variable editor, rendering output, and dirty-state handling.
3. Verify direct routes, multiple tabs, variable edge cases, clear actions, title updates, and unload behavior.
4. Roll back by removing the session route/controller changes; no data migration is required because state is non-persistent.
