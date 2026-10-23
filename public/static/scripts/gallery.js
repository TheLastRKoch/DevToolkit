/**
 * Home page session gallery – DevToolkit
 *
 * Reads every session saved in `localStorage` under `devtoolkit:sessions:<kind>:<id>`
 * and renders one card per session, with kind filters, title search, per-session
 * delete, and an empty state when nothing is saved.
 *
 * Loaded as a classic script in the browser (global `DevToolkitGallery`) and
 * exported for Node tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.DevToolkitGallery = api;
    }
}(typeof globalThis === 'object' ? globalThis : this, function () {
    const STORAGE_PREFIX = 'devtoolkit:sessions:';
    const KINDS = ['text-editor', 'markdown-editor', 'template', 'list-compare'];
    const ALL_KINDS = 'All';
    const PAGE_BY_KIND = {
        'text-editor': '/text-editor',
        'markdown-editor': '/markdown-editor',
        template: '/template',
        'list-compare': '/list-compare',
    };

    function pageHref(kind, id) {
        const base = PAGE_BY_KIND[kind];
        return base && id !== undefined && id !== null ? `${base}/${id}` : '/';
    }

    function create(doc, tag, attributes, text) {
        const node = doc.createElement(tag);
        if (attributes) {
            for (const [name, value] of Object.entries(attributes)) {
                if (value === undefined || value === null) {
                    continue;
                }
                node.setAttribute(name, String(value));
            }
        }
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    /** The saved date is shown as the calendar day of the ISO timestamp. */
    function formatDate(value) {
        return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : '';
    }

    function resolveSessions(settings) {
        if (settings.sessions) {
            return settings.sessions;
        }
        return typeof DevToolkitSessions === 'object' && DevToolkitSessions !== null ? DevToolkitSessions : null;
    }

    function init(config) {
        const settings = config || {};
        const doc = settings.document || (typeof document === 'object' && document !== null ? document : null);
        if (!doc) {
            return null;
        }
        const sessions = resolveSessions(settings);
        const storage = settings.storage !== undefined
            ? settings.storage
            : (sessions ? sessions.browserStorage() : null);

        const els = {
            filters: doc.getElementById('filters'),
            search: doc.getElementById('search'),
            gallery: doc.getElementById('gallery'),
            resultCount: doc.getElementById('resultCount'),
            emptyState: doc.getElementById('emptyState'),
            resetFilters: doc.getElementById('resetFilters'),
            currentYear: doc.getElementById('currentYear'),
        };
        if (!els.filters || !els.gallery || !els.emptyState) {
            return null;
        }

        const state = { kind: ALL_KINDS, query: '' };

        if (els.currentYear) {
            els.currentYear.textContent = String(new Date().getFullYear());
        }

        function listSessions() {
            if (!sessions || typeof sessions.listAll !== 'function') {
                return [];
            }
            try {
                return sessions.listAll(storage);
            } catch (error) {
                return [];
            }
        }

        function visibleSessions(all) {
            const query = state.query.trim().toLowerCase();
            return all.filter((session) => {
                if (state.kind !== ALL_KINDS && session.kind !== state.kind) {
                    return false;
                }
                if (!query) {
                    return true;
                }
                return session.title.toLowerCase().includes(query);
            });
        }

        function renderFilters() {
            const buttons = [ALL_KINDS].concat(KINDS).map((kind) => {
                const active = kind === state.kind;
                return create(doc, 'button', {
                    type: 'button',
                    class: `btn btn-sm rounded-pill ${active ? 'btn-primary' : 'btn-outline-secondary'}`,
                    'data-kind': kind,
                    'aria-pressed': String(active),
                }, kind);
            });
            els.filters.replaceChildren(...buttons);
        }

        function createCard(session) {
            const column = create(doc, 'div', { class: 'col' });
            const card = create(doc, 'article', { class: 'card session-card h-100', 'data-kind': session.kind });
            const body = create(doc, 'div', {
                class: 'card-body d-flex justify-content-between align-items-start gap-2',
            });
            const text = create(doc, 'div', {});
            const title = create(doc, 'h2', { class: 'h6 fw-semibold mb-1' });
            title.appendChild(create(doc, 'a', {
                class: 'link-body-emphasis text-decoration-none',
                href: pageHref(session.kind, session.id),
            }, session.title));
            text.appendChild(title);
            const date = formatDate(session.latestDate);
            text.appendChild(create(doc, 'p', { class: 'small text-body-secondary mb-0' }, date ? `${session.kind} · ${date}` : session.kind));

            const remove = create(doc, 'button', {
                type: 'button',
                class: 'btn btn-sm btn-danger remove-btn',
                'data-remove-kind': session.kind,
                'data-remove-id': session.id,
                'aria-label': `Remove ${session.title}`,
            }, '\u00d7');

            body.appendChild(text);
            body.appendChild(remove);
            card.appendChild(body);
            column.appendChild(card);
            return column;
        }

        function renderGallery() {
            const all = listSessions();
            const visible = visibleSessions(all);
            els.gallery.replaceChildren(...visible.map(createCard));

            if (els.resultCount) {
                els.resultCount.textContent = `${visible.length} ${visible.length === 1 ? 'session' : 'sessions'}`;
            }
            const empty = visible.length === 0;
            els.emptyState.classList.toggle('d-none', !empty);
            els.gallery.classList.toggle('d-none', empty);
        }

        /** Removes the session with the given kind and ID from storage. */
        function removeSession(kind, id) {
            const key = sessions && typeof sessions.sessionKey === 'function'
                ? sessions.sessionKey(kind, id)
                : `${STORAGE_PREFIX}${kind}:${id}`;
            if (storage && typeof storage.removeItem === 'function') {
                storage.removeItem(key);
            }
            renderGallery();
        }

        els.filters.addEventListener('click', (event) => {
            const button = event && typeof event.target.closest === 'function'
                ? event.target.closest('[data-kind]')
                : null;
            if (!button) {
                return;
            }
            state.kind = button.getAttribute('data-kind');
            renderFilters();
            renderGallery();
        });

        if (els.search) {
            els.search.addEventListener('input', (event) => {
                state.query = (event && event.target ? event.target.value : els.search.value) || '';
                renderGallery();
            });
        }

        if (els.resetFilters) {
            els.resetFilters.addEventListener('click', () => {
                state.kind = ALL_KINDS;
                state.query = '';
                if (els.search) {
                    els.search.value = '';
                }
                renderFilters();
                renderGallery();
            });
        }

        els.gallery.addEventListener('click', (event) => {
            const button = event && typeof event.target.closest === 'function'
                ? event.target.closest('[data-remove-kind]')
                : null;
            if (button) {
                removeSession(
                    button.getAttribute('data-remove-kind'),
                    button.getAttribute('data-remove-id'),
                );
            }
        });

        renderFilters();
        renderGallery();

        return { removeSession, state, renderGallery };
    }

    if (typeof document === 'object' && document !== null && typeof document.getElementById === 'function') {
        init();
    }

    return { init, formatDate, KINDS, STORAGE_PREFIX };
}));
