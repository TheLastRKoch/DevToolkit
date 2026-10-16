/**
 * Text Editor – DevToolkit
 *
 * Handles:
 *  - Quill rich-text editing surface
 *  - Browser-stored session content and title
 *  - The shared page header (breadcrumb, options, title)
 */

'use strict';

(function () {
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
    const session = store.get();
    const stored = store.content();

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

    /** Stages the edited content in the session; a titled session writes through. */
    function persistContent(html) {
        dirty = true;
        store.save({ content: html });
    }

    /** Records the current content as a version when it changed. */
    function snapshot() {
        if (store.isTitled()) {
            store.snapshot();
        }
    }

    function onTitleChange(value) {
        dirty = true;
        store.save({ title: value });
        if (!store.isTitled()) {
            return;
        }
        snapshot();
        if (store.isPersisted()) {
            header.lockTitle();
        }
    }

    function protectUnsavedWork(event) {
        if (store.isTitled()) {
            snapshot();
            if (store.isPersisted()) {
                return;
            }
        } else if (!dirty) {
            return;
        }
        if (event) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    /** Clear editor empties the content only; the title stays. */
    function clearEditor() {
        quill.setContents(emptyContents(), 'silent');
        persistContent('');
        dirty = false;
    }

    header = DevToolkitPageHeader.initPageHeader({
        mount: document.getElementById('pageHeader'),
        breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Text Editor' }],
        title: session.title,
        persisted: store.isPersisted(),
        onTitleChange,
        options: [
            { id: 'clear-editor', label: 'Clear editor', run: clearEditor },
        ],
    });

    restore(stored.content);

    quill.on('text-change', (delta, oldDelta, source) => {
        if (source !== 'user') {
            return;
        }
        persistContent(currentHtml());
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            snapshot();
        }
    });

    window.addEventListener('pagehide', snapshot);
    window.addEventListener('beforeunload', protectUnsavedWork);

    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }
}());
