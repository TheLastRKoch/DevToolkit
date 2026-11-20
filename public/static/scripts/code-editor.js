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
    const workspace = document.getElementById('codeEditorWorkspace');
    const marginOption = DevToolkitEditorMargins.createMarginToggle(workspace);
    const languageLabelEl = document.getElementById('languageLabel');
    const charCountEl = document.getElementById('charCount');
    const languageDialog = document.getElementById('languageDialog');
    const languageSelect = document.getElementById('languageSelect');
    const languageApply = document.getElementById('languageApply');
    const languageCancel = document.getElementById('languageCancel');

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

    /** The status bar shows the language as a label, never as a control. */
    function updateLanguageLabel() {
        if (!languageLabelEl) {
            return;
        }
        const label = languageLabel(manualLanguage || detectedLanguage);
        languageLabelEl.textContent = manualLanguage ? label : `Auto: ${label}`;
    }

    function applyLanguage(id) {
        if (surface) {
            surface.setLanguage(id);
        }
        updateLanguageLabel();
    }

    function isDialogOpen() {
        return Boolean(languageDialog) && !languageDialog.hidden;
    }

    function buildLanguageSelect() {
        if (!languageSelect) {
            return;
        }
        const entries = [{ id: 'auto', label: 'Auto' }].concat(DevToolkitCodeLanguage.LANGUAGES);
        for (const entry of entries) {
            const option = document.createElement('option');
            option.setAttribute('value', entry.id);
            option.value = entry.id;
            option.textContent = entry.label;
            languageSelect.appendChild(option);
        }
    }

    function setDialogOpen(open) {
        if (!languageDialog) {
            return;
        }
        languageDialog.hidden = !open;
        if (!open) {
            return;
        }
        if (languageSelect) {
            languageSelect.value = manualLanguage || 'auto';
            if (typeof languageSelect.focus === 'function') {
                languageSelect.focus();
            }
        }
    }

    function openLanguageDialog() {
        setDialogOpen(true);
    }

    function closeLanguageDialog() {
        setDialogOpen(false);
    }

    /** `Auto` resumes detection; any other value pins that language. */
    function applyLanguageChoice() {
        const choice = languageSelect ? languageSelect.value : 'auto';
        setDialogOpen(false);
        if (detectionTimer) {
            clearTimeout(detectionTimer);
            detectionTimer = null;
        }
        if (!choice || choice === 'auto') {
            manualLanguage = null;
            detectedLanguage = DevToolkitCodeLanguage.detectLanguage(currentValue());
            applyLanguage(detectedLanguage);
            return;
        }
        manualLanguage = choice;
        applyLanguage(manualLanguage);
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
                { id: 'change-language', label: 'Change language format', run: openLanguageDialog },
                ...(marginOption ? [{ id: 'toggle-margins', label: 'Toggle margins', run: marginOption.run }] : []),
                { id: 'clear-editor', label: 'Clear editor', run: clearEditor },
            ],
        });

        if (!surface) {
            header.warn('The code editor could not be loaded.');
        }

        buildLanguageSelect();
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

        if (languageApply) {
            languageApply.addEventListener('click', applyLanguageChoice);
        }
        if (languageCancel) {
            languageCancel.addEventListener('click', closeLanguageDialog);
        }
        if (languageDialog) {
            languageDialog.addEventListener('click', (event) => {
                if (event && event.target === languageDialog) {
                    closeLanguageDialog();
                }
            });
        }
        document.addEventListener('keydown', (event) => {
            if (isDialogOpen() && event && event.key === 'Escape') {
                closeLanguageDialog();
            }
        });
    }

    window.DevToolkitCodeEditor = {
        start,
        clearEditor,
        openLanguageDialog,
        closeLanguageDialog,
        applyLanguageChoice,
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
