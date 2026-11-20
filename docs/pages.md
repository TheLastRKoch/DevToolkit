# Editing pages

All DevToolkit editing pages are session based. Each page kind can keep many
saved sessions: `/<kind>` starts a new untitled session and `/<kind>/<id>` opens
the saved session with that numeric ID. The legacy `/editor` route redirects
permanently to `/text-editor`, and `/editor/<id>` redirects to
`/text-editor/<id>`.

## Shared page header

`public/static/scripts/page-header.js` renders one header row below the navbar
containing the title textbox and the Options dropdown. On desktop viewports
(768 px and wider) the Options dropdown is centered in the row and the title
textbox is right-aligned; below 768 px the title and dropdown remain grouped at
the end of the row. A page only mounts the header and declares its own content:

```html
<div id="pageHeader"></div>
<script src="/static/scripts/browser-session.js"></script>
<script src="/static/scripts/page-header.js"></script>
<script src="/static/scripts/<page>.js"></script>
```

```js
DevToolkitPageHeader.initPageHeader({
    mount: document.getElementById('pageHeader'),
    title: session.title,
    persisted: store.isPersisted(),
    onTitleChange: (value) => persistTitle(value),
    options: [
        { id: 'clear-variables', label: 'Clear variables', run: clearVariables },
        { id: 'clear-all', label: 'Clear all', run: clearAll },
    ],
});
```

| Field | Meaning |
| --- | --- |
| `mount` | Element (or element id) receiving the header row. Defaults to `pageHeader`. |
| `options` | Ordered dropdown items, `{ id, label, run }`. Only these are rendered. |
| `title` | Stored session title. A valid title is shown disabled. |
| `onTitleChange` | Called with the typed value on every title edit that is not locked. |
| `persisted` | When `false`, the header states that changes will not be persisted. |
| `document` | Document to render into. Defaults to the global `document` (tests pass a mock). |

`initPageHeader` returns `{ setTitle, lockTitle, isTitleLocked, warn,
clearWarning, isOpen, close, element, optionIds }`. The header owns the dropdown
open/close behavior, so no page needs Bootstrap's JavaScript bundle for it.

### Title behavior

The title textbox shows the placeholder `DevToolKit`. A title is valid when it is
non-empty, not whitespace only, and not the placeholder (matched
case-insensitively). Typing a valid title sets `document.title` to it; an empty,
whitespace, or placeholder value falls back to `Devtoolkit`. The input stays
editable while focused, even after the value becomes valid, so the complete title
can be typed. When it loses focus with a valid title, the page calls
`lockTitle()`, which sets `disabled="true"` on the input so the session cannot be
renamed; a stored title is restored locked.

## Page sessions

Every page stores its session through
`public/static/scripts/browser-session.js`:

```js
const routeId = DevToolkitSessions.sessionIdFromPath(window.location.pathname, 'template');
const store = DevToolkitSessions.openStore('template', DevToolkitSessions.browserStorage(), {
    sessionId: routeId,
});
const session = store.get();
const stored = store.content();
```

- Each saved session is stored at `devtoolkit:sessions:<kind>:<id>` and shaped
  `{ id, title, kind, versions }`. A page kind can keep many sessions, and kinds
  never share state.
- The next numeric ID comes from `devtoolkit:session-counters:<kind>`. IDs are
  monotonic per kind and are not reused after a session is deleted.
- Opening a store without `sessionId` starts an untitled session. The first
  valid title save allocates the ID, writes the session, and the page replaces
  the URL with `/<kind>/<id>`.
- A legacy document at `devtoolkit:sessions:<kind>` is migrated to
  `devtoolkit:sessions:<kind>:1` on first access, and the legacy key is removed.
- `save({ title, content, variables })` stages the page's state in the session
  and writes to `localStorage` **only** when the session has a valid custom
  title. Untitled work stays in the page view.
- `snapshot()` records the staged content as a version when it differs from the
  most recent one; the page calls it when the user leaves the tab
  (`visibilitychange`, `pagehide`) or the window (`beforeunload`). `versions`
  keeps the last three snapshots (FIFO). Text editor, markdown editor, and code
  editor versions carry `{ updatedDate, content }`; template versions also
  carry `variables`.
- `content()` returns the staged content, falling back to the most recent
  snapshot, which is how a page restores its title and content on load.
- `listAll()` (also exported as `DevToolkitSessions.listAll(storage)`) returns
  `{ id, kind, title, latestDate }` per stored session for the home page gallery.
- `remove()` drops the current session from storage and the page view.
- When storage is unavailable or a write fails, the change stays visible in the
  current page view, `store.isPersisted()` becomes `false`, and the header shows
  that changes will not be persisted.
- An untitled session with modified content triggers the browser's native
  `beforeunload` confirmation. Titled sessions are versioned instead and do not
  prompt.

## Template page

`/template` starts a new template session; `/template/<id>` reopens a saved one.
It keeps the Template and Variables tabs and the rendered output. Its options are
**Clear variables** and **Clear all**.

The three editor pages share a **Toggle margins** option. It insets the editor
workspace by 200px on each side above 768px, and every page load starts with the
margins off; the setting is not stored.

## Text editor page

`/text-editor` presents a Quill rich-text editor and starts a new session;
`/text-editor/<id>` reopens a saved one. It is reached from the home page and
from the legacy `/editor` routes, which redirect permanently. Its options are
**Toggle margins** and **Clear editor**; the stored content is imported through
Quill's clipboard conversion, which normalizes it as untrusted markup.


## Markdown editor page

`/markdown-editor` starts a new session; `/markdown-editor/<id>` reopens a saved
one. It keeps the raw markdown pane and the rendered preview. Its options are
**Toggle margins** and **Clear editor**.

## Code editor page

`/code-editor` starts a new session; `/code-editor/<id>` reopens a saved one. It
replaces the rich-text surface with a CodeMirror 6 editor built from the basic
setup, so line numbers, undo/redo, bracket matching, and in-editor search are
available without configuration. CodeMirror 6 is ESM-only, so the page loads it
from `esm.sh` through a pinned import map in `code-editor.html`; the page
wire-up stays a classic, testable script.

Content is stored and restored as plain text, so indentation, tabs, and line
breaks round-trip exactly, and no rich-text formatting bar is present. Inside
the editor, `Tab` inserts a tab at the cursor or indents the selected lines, and
`Shift+Tab` removes one tab of indentation, so neither shortcut moves focus out
of the surface; outside the editor, `Tab` keeps its normal focus navigation. The
page detects the code language from the content and highlights it, covering
JavaScript, TypeScript, Python, Java, C#, C++, C, Go, Rust, PHP, Ruby, SQL,
Kotlin, Swift, Shell, HTML, CSS, JSON, XML, and Markdown, and falling back to
Plain Text when nothing is recognized.

The status bar under the editor shows the active language as a text label on its
left — `Auto: JSON` while detecting, or `JSON` after a manual choice — and the
live character count on the right. The label is not a language control.

Its options are **Change language format**, **Toggle margins**, and
**Clear editor**. `Change language
format` opens a modal dialog whose dropdown offers `Auto`, `Plain Text`, and the
20 supported languages, preselected to the current mode. Apply highlights the
chosen language immediately, `Auto` resumes detection, and Cancel, `Escape`, or a
backdrop click leave the language unchanged; editing the content keeps a manual
selection. **Clear editor** empties the content and keeps the title. If
CodeMirror or a language chunk cannot be loaded, the header shows a warning and
the rest of the page stays usable.

## Home page gallery

`/` lists every stored session as a card showing the session title and
`kind · latest updated date`. Each card's title links to `/<kind>/<id>`, which
restores that session's content — the editor text, the raw markdown, or the
template text and variables. Multiple sessions of one kind appear as separate
cards. The filter buttons offer All plus one button per session kind
(`text-editor`, `markdown-editor`, `code-editor`, `template`, `list-compare`),
the search box filters by title,
the × button deletes only that session's `devtoolkit:sessions:<kind>:<id>` key,
and an empty state is shown when nothing is saved. The New dropdown links to the
ID-less `/<kind>` routes, so it always starts a fresh session rather than opening
a saved one.

## Page sessions and the server API

Pages read and write only browser storage. The `/api/template/*` endpoints and
the server-side session `Map` are kept working for existing clients and tests,
but no page depends on them, so a page still shows its stored state when the
server API is unreachable.
