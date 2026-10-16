# Editing pages

All DevToolkit editing pages are session based: each page owns exactly one
session in the browser at `/template`, `/text-editor`, and `/markdown-editor`.
No session identifier is part of the URL; the legacy `/editor` route redirects
permanently to `/text-editor`.

## Shared page header

`public/static/scripts/page-header.js` renders one header row below the navbar
containing the breadcrumb trail, the title textbox, and the Options dropdown. A
page only mounts the header and declares its own content:

```html
<div id="pageHeader"></div>
<script src="/static/scripts/browser-session.js"></script>
<script src="/static/scripts/page-header.js"></script>
<script src="/static/scripts/<page>.js"></script>
```

```js
DevToolkitPageHeader.initPageHeader({
    mount: document.getElementById('pageHeader'),
    breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Template' }],
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
| `breadcrumb` | Ordered items, `{ label, href }`. The last item without `href` is the current page. |
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
whitespace, or placeholder value falls back to `Devtoolkit`. Once a valid title
has been saved, the page calls `lockTitle()`, which sets `disabled="true"` on the
input so the session cannot be renamed; a stored title is restored locked.

## Page sessions

Every page stores its session through
`public/static/scripts/browser-session.js`:

```js
const store = DevToolkitSessions.openStore('template', DevToolkitSessions.browserStorage());
const session = store.get();
const stored = store.content();
```

- One stored document per page type at `devtoolkit:sessions:<kind>`, shaped
  `{ title, kind, versions }`, so the template page, the text editor, and the
  markdown editor never share state.
- `save({ title, content, variables })` stages the page's state in the session
  and writes to `localStorage` **only** when the session has a valid custom
  title. Untitled work stays in the page view.
- `snapshot()` records the staged content as a version when it differs from the
  most recent one; the page calls it when the user leaves the tab
  (`visibilitychange`, `pagehide`) or the window (`beforeunload`). `versions`
  keeps the last three snapshots (FIFO). Text editor and markdown versions carry
  `{ updatedDate, content }`; template versions also carry `variables`.
- `content()` returns the staged content, falling back to the most recent
  snapshot, which is how a page restores its title and content on load.
- `listAll()` (also exported as `DevtoolkitSessions.listAll(storage)`) returns
  `{ kind, title, latestDate }` per stored session for the home page gallery.
- `remove()` drops the session from storage and the page view.
- When storage is unavailable or a write fails, the change stays visible in the
  current page view, `store.isPersisted()` becomes `false`, and the header shows
  that changes will not be persisted.
- An untitled session with modified content triggers the browser's native
  `beforeunload` confirmation. Titled sessions are versioned instead and do not
  prompt.

## Template page

`/template` keeps the Template and Variables tabs and the rendered output. Its
breadcrumb ends in `Template`, and its options are **Clear variables** and
**Clear all**.

## Text editor page

`/text-editor` presents a Quill rich-text editor. Its breadcrumb ends in
`Text Editor` and it is reached from the home page and from the legacy `/editor`
route, which redirects permanently. Its only option is **Clear editor**; the
stored content is imported through Quill's clipboard conversion, which
normalizes it as untrusted markup.

## Markdown editor page

`/markdown-editor` keeps the raw markdown pane and the rendered preview. Its
breadcrumb ends in `Markdown Editor`, and its only option is **Clear editor**.

## Home page gallery

`/` lists every stored session as a card showing the session title and
`kind · latest updated date`. The filter buttons offer All plus one button per
session kind (`text-editor`, `markdown-editor`, `template`), the search box
filters by title, the × button deletes that session from `localStorage`, and an
empty state is shown when nothing is saved.

## Page sessions and the server API

Pages read and write only browser storage. The `/api/template/*` endpoints and
the server-side session `Map` are kept working for existing clients and tests,
but no page depends on them, so a page still shows its stored state when the
server API is unreachable.
