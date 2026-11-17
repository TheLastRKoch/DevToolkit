/**
 * Code Editor – DevToolkit
 *
 * Handles:
 *  - The CodeMirror editing surface (created by code-editor-surface.js)
 *  - Browser-stored session content and title
 *  - The shared page header (options, title)
 *  - Automatic language detection and the status bar
 */

'use strict';

(function () {
    const KIND = 'code-editor';
    const DETECTION_DELAY = 150;

    const mount = document.getElementById('codeEditorMount');
    const languageButton = document.getElementById('languageButton');
    const languageMenu = document.getElementById('languageMenu');
    const charCountEl = document.getElementById('charCount');

    let started = false;
    let header = null;
    let store = null;
    let surface = null;
    let dirty = false;
    let manualLanguage = null;
    let detectedLanguage = 'plaintext';
    let detectionTimer = null;

    function languageLabel(id) {
        return DevToolkitCodeLanguage.languageLabel(id);
    }

    function currentValue() {
        return surface ? surface.getValue() : '';
    }

    function updateCharCount() {
        if (!charCountEl) {
            return;
        }
        charCountEl.textContent = String(surface ? surface.getLength() : 0);
    }

    function updateLanguageButton() {
        if (!languageButton) {
            return;
        }
        const label = languageLabel(manualLanguage || detectedLanguage);
        languageButton.textContent = manualLanguage ? label : `Auto: ${label}`;
    }

    function applyLanguage(id) {
        if (surface) {
            surface.setLanguage(id);
        }
        updateLanguageButton();
    }

    function setMenuOpen(open) {
        if (!languageMenu) {
            return;
        }
        languageMenu.hidden = !open;
        if (open) {
            languageMenu.classList.add('show');
        } else {
            languageMenu.classList.remove('show');
        }
        if (languageButton) {
            languageButton.setAttribute('aria-expanded', String(Boolean(open)));
        }
    }

    function selectLanguage(id) {
        manualLanguage = id === null ? null : id;
        if (manualLanguage) {
            applyLanguage(manualLanguage);
            return;
        }
        detectedLanguage = DevToolkitCodeLanguage.detectLanguage(currentValue());
        applyLanguage(detectedLanguage);
    }

    function buildLanguageMenu() {
        if (!languageMenu) {
            return;
        }
        const entries = [{ id: null, label: 'Auto' }].concat(DevToolkitCodeLanguage.LANGUAGES);
        for (const entry of entries) {
            const item = document.createElement('li');
            const action = document.createElement('button');
            action.setAttribute('type', 'button');
            action.setAttribute('class', 'dropdown-item');
            if (entry.id === null) {
                action.setAttribute('data-language', 'auto');
            } else {
                action.setAttribute('data-language', entry.id);
            }
            action.textContent = entry.label;
            action.addEventListener('click', () => {
                setMenuOpen(false);
                selectLanguage(entry.id);
            });
            item.appendChild(action);
            languageMenu.appendChild(item);
        }
    }

    /** Persists the edited content once the session is titled. */
    function persistContent(content) {
        dirty = true;
        store.save({ content });
    }

    function snapshot() {
        if (store.isTitled()) {
            store.snapshot();
        }
    }

    function updateSessionUrl(saved) {
        if (!saved || !saved.persisted || saved.id === null || saved.id === undefined) {
            return;
        }
        const path = DevToolkitSessions.pagePath(KIND, saved.id);
        if (window.location.pathname === path) {
            return;
        }
        if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState(null, '', path);
        }
    }

    function scheduleDetection(value) {
        if (manualLanguage) {
            return;
        }
        if (detectionTimer) {
            clearTimeout(detectionTimer);
        }
        detectionTimer = setTimeout(() => {
            detectionTimer = null;
            if (manualLanguage) {
                return;
            }
            detectedLanguage = DevToolkitCodeLanguage.detectLanguage(value);
            applyLanguage(detectedLanguage);
        }, DETECTION_DELAY);
    }

    function onContentChange(value) {
        persistContent(value);
        updateCharCount();
        scheduleDetection(value);
    }

    function onTitleChange(value) {
        dirty = true;
        const saved = store.save({ title: value });
        if (!store.isTitled()) {
            return;
        }
        snapshot();
        updateSessionUrl(saved);
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
        if (detectionTimer) {
            clearTimeout(detectionTimer);
            detectionTimer = null;
        }
        if (surface) {
            surface.setValue('', { silent: true });
        }
        persistContent('');
        dirty = false;
        updateCharCount();
        if (!manualLanguage) {
            detectedLanguage = 'plaintext';
            applyLanguage(detectedLanguage);
        }
    }

    function start() {
        if (started) {
            return;
        }
        started = true;

        const routeSessionId = DevToolkitSessions.sessionIdFromPath(window.location.pathname, KIND);
        store = DevToolkitSessions.openStore(KIND, DevToolkitSessions.browserStorage(), {
            sessionId: routeSessionId,
            onWriteError: () => {
                if (header) {
                    header.warn('Changes will not be persisted in this browser.');
                }
            },
        });
        const session = store.get();
        const stored = store.content();

        if (typeof DevToolkitCodeEditorSurface !== 'undefined' && DevToolkitCodeEditorSurface && mount) {
            try {
                surface = DevToolkitCodeEditorSurface.create({
                    parent: mount,
                    doc: stored.content,
                    onChange: onContentChange,
                    onError: () => {
                        if (header) {
                            header.warn('Syntax highlighting could not be loaded.');
                        }
                    },
                });
            } catch (error) {
                surface = null;
            }
        }

        header = DevToolkitPageHeader.initPageHeader({
            mount: document.getElementById('pageHeader'),
            title: session.title,
            persisted: store.isPersisted(),
            onTitleChange,
            options: [
                { id: 'clear-editor', label: 'Clear editor', run: clearEditor },
            ],
        });

        if (!surface) {
            header.warn('The code editor could not be loaded.');
        }

        buildLanguageMenu();
        updateCharCount();
        detectedLanguage = DevToolkitCodeLanguage.detectLanguage(stored.content);
        applyLanguage(detectedLanguage);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                snapshot();
            }
        });

        window.addEventListener('pagehide', snapshot);
        window.addEventListener('beforeunload', protectUnsavedWork);

        if (languageButton) {
            languageButton.addEventListener('click', (event) => {
                if (event && typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                setMenuOpen(Boolean(languageMenu && languageMenu.hidden));
            });
        }
        document.addEventListener('click', (event) => {
            if (!languageMenu || languageMenu.hidden) {
                return;
            }
            const target = event && event.target;
            if (target === languageButton) {
                return;
            }
            const dropdown = languageButton ? languageButton.parentNode : null;
            if (dropdown && target && dropdown.contains(target)) {
                return;
            }
            setMenuOpen(false);
        });
        document.addEventListener('keydown', (event) => {
            if (languageMenu && !languageMenu.hidden && event && event.key === 'Escape') {
                setMenuOpen(false);
            }
        });
    }

    window.DevToolkitCodeEditor = {
        start,
        clearEditor,
        selectLanguage,
        getLanguage: () => manualLanguage || detectedLanguage,
        isManualLanguage: () => Boolean(manualLanguage),
    };

    if (typeof DevToolkitCodeEditorSurface !== 'undefined' && DevToolkitCodeEditorSurface) {
        start();
    } else if (document.readyState === 'interactive' || document.readyState === 'complete') {
        start();
    } else {
        document.addEventListener('DOMContentLoaded', start);
    }
}());
