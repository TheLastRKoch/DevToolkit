/**
 * Shared page header for the DevToolkit editing pages.
 *
 * Renders one row containing the breadcrumb trail, the Options dropdown, and the
 * page-name textbox. Each page includes this script, mounts it once, and declares
 * only its own breadcrumb items, its own options, and its own page name.
 *
 * Loaded as a classic script in the browser (global `DevToolkitPageHeader`) and
 * exported for Node tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.DevToolkitPageHeader = api;
    }
}(typeof globalThis === 'object' ? globalThis : this, function () {
    const DEFAULT_TITLE = 'Devtoolkit';
    const MOUNT_ID = 'pageHeader';

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

    function renderBreadcrumb(doc, items) {
        const nav = create(doc, 'nav', { 'aria-label': 'breadcrumb' });
        const list = create(doc, 'ol', { class: 'breadcrumb' });
        for (const item of items || []) {
            const entry = create(doc, 'li', {
                class: item.href ? 'breadcrumb-item' : 'breadcrumb-item active',
                'aria-current': item.href ? null : 'page',
            });
            if (item.href) {
                entry.appendChild(create(doc, 'a', { href: item.href }, item.label));
            } else {
                entry.textContent = item.label;
            }
            list.appendChild(entry);
        }
        nav.appendChild(list);
        return nav;
    }

    function resolveMount(doc, mount) {
        if (mount && typeof mount.appendChild === 'function') {
            return mount;
        }
        return doc.getElementById(typeof mount === 'string' ? mount : MOUNT_ID);
    }

    function init(config) {
        const settings = config || {};
        const doc = settings.document || (typeof document === 'object' && document !== null ? document : null);
        if (!doc) {
            throw new Error('The page header requires a document');
        }
        const mount = resolveMount(doc, settings.mount);
        if (!mount) {
            throw new Error(`The page header requires a mount element (${MOUNT_ID})`);
        }

        const onPageNameChange = typeof settings.onPageNameChange === 'function' ? settings.onPageNameChange : null;
        const options = Array.isArray(settings.options) ? settings.options : [];

        const row = create(doc, 'div', { class: 'row mt-3', 'data-page-header': '' });
        const breadcrumbColumn = create(doc, 'div', { class: 'col-md-6' });
        const controlsColumn = create(doc, 'div', {
            class: 'col-md-6 d-flex justify-content-end align-items-center gap-2',
        });

        breadcrumbColumn.appendChild(renderBreadcrumb(doc, settings.breadcrumb));

        const nameInput = create(doc, 'input', {
            id: 'pageNameInput',
            class: 'form-control form-control-sm w-auto',
            type: 'text',
            placeholder: 'Page name',
            'aria-label': 'Page name',
        });

        const dropdown = create(doc, 'div', { class: 'dropdown' });
        const toggle = create(doc, 'button', {
            id: 'pageOptionsToggle',
            class: 'btn btn-outline-secondary btn-sm dropdown-toggle',
            type: 'button',
            'aria-haspopup': 'true',
            'aria-expanded': 'false',
        }, 'Options');
        const menu = create(doc, 'ul', { id: 'pageOptionsMenu', class: 'dropdown-menu' });
        menu.hidden = true;

        function setOpen(open) {
            menu.hidden = !open;
            if (open) {
                menu.classList.add('show');
            } else {
                menu.classList.remove('show');
            }
            toggle.setAttribute('aria-expanded', String(Boolean(open)));
        }

        for (const option of options) {
            const item = create(doc, 'li', {});
            const action = create(doc, 'button', {
                class: 'dropdown-item',
                type: 'button',
                'data-option-id': option.id,
            }, option.label);
            action.addEventListener('click', () => {
                setOpen(false);
                if (typeof option.run === 'function') {
                    option.run();
                }
            });
            item.appendChild(action);
            menu.appendChild(item);
        }

        toggle.addEventListener('click', (event) => {
            if (event && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }
            setOpen(Boolean(menu.hidden));
        });

        dropdown.appendChild(toggle);
        dropdown.appendChild(menu);
        controlsColumn.appendChild(nameInput);
        controlsColumn.appendChild(dropdown);
        row.appendChild(breadcrumbColumn);
        row.appendChild(controlsColumn);

        const statusColumn = create(doc, 'div', { class: 'col-12' });
        const status = create(doc, 'div', {
            id: 'pageHeaderStatus',
            class: 'alert alert-warning mt-2 mb-0',
            role: 'alert',
        });
        status.hidden = true;
        statusColumn.appendChild(status);
        row.appendChild(statusColumn);

        mount.appendChild(row);

        function applyTitle(name) {
            doc.title = name ? name : DEFAULT_TITLE;
        }

        function setPageName(name) {
            const value = typeof name === 'string' ? name : '';
            nameInput.value = value;
            applyTitle(value);
        }

        function warn(message) {
            status.textContent = message;
            status.hidden = false;
        }

        function clearWarning() {
            status.textContent = '';
            status.hidden = true;
        }

        nameInput.addEventListener('input', () => {
            const value = nameInput.value || '';
            applyTitle(value);
            if (onPageNameChange) {
                onPageNameChange(value);
            }
        });

        if (typeof doc.addEventListener === 'function') {
            doc.addEventListener('click', (event) => {
                if (menu.hidden) {
                    return;
                }
                const target = event && event.target;
                if (target === toggle) {
                    return;
                }
                if (typeof dropdown.contains === 'function' && target && dropdown.contains(target)) {
                    return;
                }
                setOpen(false);
            });
            doc.addEventListener('keydown', (event) => {
                if (menu.hidden) {
                    return;
                }
                if (event && event.key === 'Escape') {
                    setOpen(false);
                }
            });
        }

        setPageName(settings.pageName);

        if (settings.persisted === false) {
            warn('Changes on this page will not be persisted in this browser.');
        }

        return {
            setPageName,
            warn,
            clearWarning,
            isOpen: () => !menu.hidden,
            close: () => setOpen(false),
            element: row,
            optionIds: options.map((option) => option.id),
        };
    }

    return { init, DEFAULT_TITLE, MOUNT_ID };
}));
