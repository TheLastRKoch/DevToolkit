/**
 * Shared page header for the DevToolkit pages.
 *
 * Renders one row containing the title textbox and the Options dropdown. Each
 * page includes this script, mounts it once, and declares only its own options
 * and its own title.
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
    const TITLE_PLACEHOLDER = 'DevToolKit';
    const PLACEHOLDER_PATTERN = /^devtoolkit$/i;
    const MOUNT_ID = 'pageHeader';
    const TITLE_INPUT_ID = 'pageTitleInput';

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

    /**
     * A title is valid when it is non-empty, not whitespace only, and not the
     * default placeholder ("DevToolKit", matched case-insensitively).
     */
    function isValidTitle(value) {
        if (typeof value !== 'string') {
            return false;
        }
        const trimmed = value.trim();
        return trimmed !== '' && !PLACEHOLDER_PATTERN.test(trimmed);
    }

    function resolveMount(doc, mount) {
        if (mount && typeof mount.appendChild === 'function') {
            return mount;
        }
        return doc.getElementById(typeof mount === 'string' ? mount : MOUNT_ID);
    }

    function initPageHeader(config) {
        const settings = config || {};
        const doc = settings.document || (typeof document === 'object' && document !== null ? document : null);
        if (!doc) {
            throw new Error('The page header requires a document');
        }
        const mount = resolveMount(doc, settings.mount);
        if (!mount) {
            throw new Error(`The page header requires a mount element (${MOUNT_ID})`);
        }

        const onTitleChange = typeof settings.onTitleChange === 'function' ? settings.onTitleChange : null;
        const options = Array.isArray(settings.options) ? settings.options : [];
        const initialTitle = typeof settings.title === 'string' ? settings.title : '';
        let locked = false;

        const row = create(doc, 'div', { class: 'row mt-3 align-items-center', 'data-page-header': '' });
        const leadingColumn = create(doc, 'div', {
            class: 'd-none d-md-block col-md-4 order-md-1',
        });
        const dropdownColumn = create(doc, 'div', {
            class: 'col-auto col-md-4 order-2 order-md-2 d-flex justify-content-center',
        });
        const titleColumn = create(doc, 'div', {
            class: 'col-auto col-md-4 order-1 order-md-3 ms-auto ms-md-0 d-flex justify-content-md-end',
        });

        const titleInput = create(doc, 'input', {
            id: TITLE_INPUT_ID,
            class: 'form-control form-control-sm w-auto',
            type: 'text',
            placeholder: TITLE_PLACEHOLDER,
            'aria-label': 'Title',
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
        dropdownColumn.appendChild(dropdown);
        titleColumn.appendChild(titleInput);
        row.appendChild(leadingColumn);
        row.appendChild(dropdownColumn);
        row.appendChild(titleColumn);

        const statusColumn = create(doc, 'div', { class: 'col-12 order-3 order-md-4' });
        const status = create(doc, 'div', {
            id: 'pageHeaderStatus',
            class: 'alert alert-warning mt-2 mb-0',
            role: 'alert',
        });
        status.hidden = true;
        statusColumn.appendChild(status);
        row.appendChild(statusColumn);

        mount.appendChild(row);

        function applyDocumentTitle(value) {
            doc.title = isValidTitle(value) ? value.trim() : DEFAULT_TITLE;
        }

        /** Once focus is lost, the title is read-only for the lifetime of the session. */
        function lockTitle() {
            locked = true;
            titleInput.value = titleInput.value.trim();
            titleInput.disabled = true;
            titleInput.setAttribute('disabled', 'true');
            applyDocumentTitle(titleInput.value);
        }

        function setTitle(value) {
            const title = typeof value === 'string' ? value : '';
            titleInput.value = title;
            if (isValidTitle(title)) {
                lockTitle();
            } else {
                applyDocumentTitle('');
            }
        }

        function warn(message) {
            status.textContent = message;
            status.hidden = false;
        }

        function clearWarning() {
            status.textContent = '';
            status.hidden = true;
        }

        titleInput.addEventListener('input', () => {
            const value = titleInput.value || '';
            if (locked) {
                return;
            }
            applyDocumentTitle(value);
            if (onTitleChange) {
                onTitleChange(value);
            }
        });

        titleInput.addEventListener('blur', () => {
            if (locked) {
                return;
            }
            const entered = titleInput.value || '';
            const value = entered.trim();
            if (!isValidTitle(value)) {
                return;
            }
            titleInput.value = value;
            applyDocumentTitle(value);
            if (value !== entered && onTitleChange) {
                onTitleChange(value);
            }
            if (settings.persisted !== false) {
                lockTitle();
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

        if (isValidTitle(initialTitle)) {
            setTitle(initialTitle);
        } else {
            titleInput.value = '';
            applyDocumentTitle('');
        }

        if (settings.persisted === false) {
            warn('Changes on this page will not be persisted in this browser.');
        }

        return {
            setTitle,
            lockTitle,
            isTitleLocked: () => locked,
            warn,
            clearWarning,
            isOpen: () => !menu.hidden,
            close: () => setOpen(false),
            element: row,
            optionIds: options.map((option) => option.id),
        };
    }

    return {
        initPageHeader,
        isValidTitle,
        DEFAULT_TITLE,
        TITLE_PLACEHOLDER,
        TITLE_INPUT_ID,
        MOUNT_ID,
    };
}));
