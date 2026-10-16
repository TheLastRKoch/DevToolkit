# Editing pages

All DevToolkit editing pages are session based: each page owns its state in the
browser and is addressed by a numeric session identifier, for example
`/template/1`, `/text-editor/1`, and `/markdown-editor/1`. Requesting a page
without an identifier (`/text-editor`) redirects to its first session
(`/text-editor/1`).

## Shared page header

`public/static/scripts/page-header.js` renders one header row below the navbar
containing the breadcrumb trail, the Options dropdown, and the page-name
textbox. A page only mounts the header and declares its own content:

```html
<div id="pageHeader"></div>
<script src="/static/scripts/browser-session.js"></script>
<script src="/static/scripts/page-header.js"></script>
<script src="/static/scripts/<page>.js"></script>
```

```js
DevToolkitPageHeader.init({
    mount: document.getElementById('pageHeader'),
    breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Template' }],
    pageName: session.name,
    onPageNameChange: (name) => store.save(sessionId, { name }),
    persisted: store.isPersisted(),
    options: [
        { id: 'new-session', label: 'New session', run: newSession },
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
| `pageName` | Stored page name shown in the textbox and used as `document.title`. |
| `onPageNameChange` | Called with the typed value on every page-name edit. |
| `persisted` | When `false`, the header states that changes will not be persisted. |

`init` returns `{ setPageName, warn, clearWarning, isOpen, close, element,
optionIds }`. The header owns the dropdown open/close behavior, so no page needs
Bootstrap's JavaScript bundle for it.

The page-name textbox updates `document.title` on every keystroke and falls back
to `Devtoolkit` when it is cleared.

## Page sessions

Every page stores its sessions through
`public/static/scripts/browser-session.js`:

```js
const store = DevToolkitSessions.openStore('template', DevToolkitSessions.browserStorage());
const session = store.ensure(sessionId, { text: '', variables: {} });
```

- One stored document per page type at `devtoolkit:sessions:<page type>`, so the
  template page, the text editor, and the markdown editor never share state, even
  when they use the same session identifier.
- Each record is `{ name, updatedAt, expiresAt, data }` and expires 30 days after
  its last change; editing a session restarts its lifetime, and an expired
  session opens as a fresh default session named `Devtoolkit`.
- `allocateId()` returns the next free identifier for that page (New session),
  and `save()` writes through to `localStorage` on every change.
- When storage is unavailable or a write fails, the change stays visible in the
  current page view, `store.isPersisted()` becomes `false`, and the header shows
  that changes will not be persisted.

## Template page

`/template/1` keeps the Template and Variables tabs and the rendered output. Its
breadcrumb ends in `Template`, and its options are **New session**, **Clear
variables**, and **Clear all**.

## Text editor page

`/text-editor/1` presents a Quill rich-text editor. Its breadcrumb ends in
`Text Editor` and it loads as `Text Editor` from the home page and from the
legacy `/editor` route, which redirects permanently. Its options are **New
session** and **Clear editor**; the stored content is imported through Quill's
clipboard conversion, which normalizes it as untrusted markup.

## Markdown editor page

`/markdown-editor/1` keeps the raw markdown pane and the rendered preview. Its
breadcrumb ends in `Markdown Editor`, and its options are **New session** and
**Clear editor**.

## Page sessions and the server API

Pages read and write only browser storage. The `/api/template/*` endpoints and
the server-side session `Map` are kept working for existing clients and tests,
but no page depends on them, so a page still shows its stored state when the
server API is unreachable.
