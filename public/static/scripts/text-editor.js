/**
 * Text Editor – DevToolkit
 *
 * Handles:
 *  - Quill rich-text editing surface
 *  - Browser-stored session content and page name
 *  - The shared page header (breadcrumb, options, page name)
 */

'use strict';

(function () {
    const sessionId = window.location.pathname.match(/^\/text-editor\/([1-9][0-9]*)$/)?.[1];
    if (!sessionId) {
        return;
    }

    const currentYearEl = document.getElementById('currentYear');

    let header = null;
    let dirty = false;

    const store = DevToolkitSessions.openStore('text-editor', DevToolkitSessions.browserStorage(), {
        onWriteError: () => {
            if (header) {
                header.warn('Changes will not be persisted in this browser.');
            }
        },
    });
    const session = store.ensure(sessionId, { html: '' });

    const quill = new Quill('#txtOutput', {
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                ['blockquote', 'code-block', 'link'], [{ 'align': [] }, { 'list': 'ordered' }, { 'list': 'bullet' }], ['clean']
            ],
        },
        placeholder: '',
        theme: 'snow',
    });

    function persist(patch) {
        dirty = true;
        store.save(sessionId, patch);
        dirty = !store.isPersisted();
    }

    function currentHtml() {
        return quill.root.innerHTML;
    }

    function emptyContents() {
        return quill.clipboard.convert({ html: '' });
    }

    function restore(html) {
        if (typeof html !== 'string' || html === '') {
            return;
        }
        // Stored content is untrusted input: Quill's clipboard matchers convert and
        // normalize the markup before anything is applied to the document.
        quill.setContents(quill.clipboard.convert({ html }), 'silent');
    }

    function clearEditor() {
        quill.setContents(emptyContents(), 'silent');
        persist({ data: { html: '' } });
    }

    function newSession() {
        window.open(`/text-editor/${store.allocateId()}`, '_blank', 'noopener');
    }

    header = DevToolkitPageHeader.init({
        mount: document.getElementById('pageHeader'),
        breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Text Editor' }],
        pageName: session.name,
        persisted: store.isPersisted(),
        onPageNameChange: (name) => persist({ name }),
        options: [
            { id: 'new-session', label: 'New session', run: newSession },
            { id: 'clear-editor', label: 'Clear editor', run: clearEditor },
        ],
    });

    restore(session.data.html);

    quill.on('text-change', (delta, oldDelta, source) => {
        if (source !== 'user') {
            return;
        }
        persist({ data: { html: currentHtml() } });
    });

    window.addEventListener('beforeunload', (event) => {
        if (!dirty) {
            return;
        }
        event.preventDefault();
        event.returnValue = '';
    });

    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }
}());
