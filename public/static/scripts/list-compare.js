/**
 * List Compare – DevToolkit
 *
 * Handles:
 *  - Deduplication, differences, and intersections of two pasted lists
 *  - Case-insensitive and whitespace-trimming comparison toggles
 *  - Text replacement (plain string or regular expression) across both lists
 *  - Loading lists from text files and exporting categorized results
 *  - Browser-stored session content and title, and the shared page header
 */

'use strict';

(function () {
    const KIND = 'list-compare';
    const LINE_BREAK = /\r\n|\r|\n/;
    const DOWNLOAD_NAMES = {
        inA: 'list-a-deduped.txt',
        onlyA: 'only-in-list-a.txt',
        inB: 'list-b-deduped.txt',
        onlyB: 'only-in-list-b.txt',
        inBoth: 'in-both-lists.txt',
    };

    const inputA = document.getElementById('inputA');
    const inputB = document.getElementById('inputB');
    const badgeA = document.getElementById('badgeA');
    const badgeB = document.getElementById('badgeB');
    const compareBtn = document.getElementById('compareBtn');
    const caseInsensitiveToggle = document.getElementById('caseInsensitive');
    const trimWhitespaceToggle = document.getElementById('trimWhitespace');
    const replacementTool = document.getElementById('replacementTool');
    const replaceSearch = document.getElementById('replaceSearch');
    const replaceWith = document.getElementById('replaceWith');
    const replaceRegex = document.getElementById('replaceRegex');
    const replaceError = document.getElementById('replaceError');
    const resultsSection = document.getElementById('resultsSection');

    const resultsData = {
        inA: [],
        onlyA: [],
        inB: [],
        onlyB: [],
        inBoth: [],
    };

    let header = null;
    let dirty = false;

    const routeSessionId = DevToolkitSessions.sessionIdFromPath(window.location.pathname, KIND);
    const store = DevToolkitSessions.openStore(KIND, DevToolkitSessions.browserStorage(), {
        sessionId: routeSessionId,
        onWriteError: () => {
            if (header) {
                header.warn('Changes will not be persisted in this browser.');
            }
        },
    });
    const session = store.get();
    const stored = store.content();

    function byId(id) {
        return document.getElementById(id);
    }

    function setBadge(id, value) {
        const element = byId(id);
        if (element) {
            element.textContent = value;
        }
    }

    function setHidden(element, hidden) {
        if (element) {
            element.hidden = hidden;
        }
    }

    function updateInputCount(input, badgeId) {
        if (!input) {
            return;
        }
        const text = typeof input.value === 'string' ? input.value : '';
        const count = text.trim() === '' ? 0 : text.trim().split(LINE_BREAK).length;
        setBadge(badgeId, count.toLocaleString() + (count === 1 ? ' item' : ' items'));
    }

    function updateCounts() {
        updateInputCount(inputA, 'badgeA');
        updateInputCount(inputB, 'badgeB');
    }

    /** Splits text into trimmed, non-empty, deduplicated lines in input order. */
    function parseAndDeduplicate(text, trim) {
        if (typeof text !== 'string' || text.trim() === '') {
            return [];
        }
        const seen = new Set();
        const unique = [];
        for (const rawLine of text.split(LINE_BREAK)) {
            const line = trim ? rawLine.trim() : rawLine;
            if (line === '' || seen.has(line)) {
                continue;
            }
            seen.add(line);
            unique.push(line);
        }
        return unique;
    }

    /** Partitions two deduplicated lists into only-A, only-B, and both. */
    function partition(listA, listB, caseInsensitive) {
        const onlyA = [];
        const onlyB = [];
        const inBoth = [];

        if (caseInsensitive) {
            const setA = new Set(listA.map((item) => item.toLowerCase()));
            const setB = new Set(listB.map((item) => item.toLowerCase()));
            for (const item of listA) {
                (setB.has(item.toLowerCase()) ? inBoth : onlyA).push(item);
            }
            for (const item of listB) {
                if (!setA.has(item.toLowerCase())) {
                    onlyB.push(item);
                }
            }
        } else {
            const setA = new Set(listA);
            const setB = new Set(listB);
            for (const item of listA) {
                (setB.has(item) ? inBoth : onlyA).push(item);
            }
            for (const item of listB) {
                if (!setA.has(item)) {
                    onlyB.push(item);
                }
            }
        }

        return { onlyA, onlyB, inBoth };
    }

    function resetResults() {
        resultsData.inA = [];
        resultsData.onlyA = [];
        resultsData.inB = [];
        resultsData.onlyB = [];
        resultsData.inBoth = [];

        setHidden(resultsSection, true);
        for (const id of ['outputOnlyA', 'outputOnlyB', 'outputInBoth']) {
            const output = byId(id);
            if (output) {
                output.value = '';
            }
        }
        for (const id of ['countBadgeOnlyA', 'countBadgeOnlyB', 'countBadgeInBoth', 'statInA', 'statOnlyA', 'statInB', 'statOnlyB', 'statDiff', 'statInBoth']) {
            setBadge(id, '0');
        }
    }

    /** Compares both lists, replacing them with their deduplicated contents. */
    function compareLists() {
        const trim = trimWhitespaceToggle ? trimWhitespaceToggle.checked !== false : true;
        const ignoreCase = Boolean(caseInsensitiveToggle && caseInsensitiveToggle.checked);

        const listA = parseAndDeduplicate(inputA ? inputA.value : '', trim);
        const listB = parseAndDeduplicate(inputB ? inputB.value : '', trim);

        if (inputA) {
            inputA.value = listA.join('\n');
        }
        if (inputB) {
            inputB.value = listB.join('\n');
        }
        updateCounts();

        const { onlyA, onlyB, inBoth } = partition(listA, listB, ignoreCase);

        resultsData.inA = listA;
        resultsData.onlyA = onlyA;
        resultsData.inB = listB;
        resultsData.onlyB = onlyB;
        resultsData.inBoth = inBoth;

        setBadge('statInA', listA.length.toLocaleString());
        setBadge('statOnlyA', onlyA.length.toLocaleString());
        setBadge('statInB', listB.length.toLocaleString());
        setBadge('statOnlyB', onlyB.length.toLocaleString());
        setBadge('statDiff', (listA.length - listB.length).toLocaleString());
        setBadge('statInBoth', inBoth.length.toLocaleString());

        const outputOnlyA = byId('outputOnlyA');
        const outputOnlyB = byId('outputOnlyB');
        const outputInBoth = byId('outputInBoth');
        if (outputOnlyA) {
            outputOnlyA.value = onlyA.join('\n');
        }
        if (outputOnlyB) {
            outputOnlyB.value = onlyB.join('\n');
        }
        if (outputInBoth) {
            outputInBoth.value = inBoth.join('\n');
        }

        setBadge('countBadgeOnlyA', onlyA.length.toLocaleString());
        setBadge('countBadgeOnlyB', onlyB.length.toLocaleString());
        setBadge('countBadgeInBoth', inBoth.length.toLocaleString());

        setHidden(resultsSection, false);
        if (resultsSection && typeof resultsSection.scrollIntoView === 'function') {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        persistContent();
    }

    /** Returns the filename and text for one categorized result. */
    function categoryExport(category) {
        return {
            filename: DOWNLOAD_NAMES[category] || 'list.txt',
            content: (resultsData[category] || []).join('\n'),
        };
    }

    function downloadCategory(category) {
        const exported = categoryExport(category);
        if (typeof Blob !== 'function' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
            return;
        }
        const blob = new Blob([exported.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = exported.filename;
        if (document.body && typeof document.body.appendChild === 'function') {
            document.body.appendChild(anchor);
        }
        if (typeof anchor.click === 'function') {
            anchor.click();
        }
        if (document.body && typeof document.body.removeChild === 'function') {
            document.body.removeChild(anchor);
        }
        if (typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(url);
        }
    }

    function copyText(elementId, button) {
        const source = byId(elementId);
        if (!source) {
            return;
        }
        const clipboard = typeof navigator === 'object' && navigator !== null ? navigator.clipboard : null;
        if (!clipboard || typeof clipboard.writeText !== 'function') {
            return;
        }
        const original = button ? button.textContent : '';
        clipboard.writeText(source.value).then(() => {
            if (!button) {
                return;
            }
            button.textContent = 'Copied!';
            button.classList.add('btn-success');
            button.classList.remove('btn-outline-secondary');
            setTimeout(() => {
                button.textContent = original;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-secondary');
            }, 1500);
        }).catch(() => {
            // A denied clipboard permission leaves the source untouched.
        });
    }

    function loadFile(fileInput, target) {
        if (!fileInput || !fileInput.files || fileInput.files.length === 0 || !target) {
            return;
        }
        if (typeof FileReader !== 'function') {
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event && event.target ? event.target.result : '';
            target.value = typeof result === 'string' ? result : '';
            updateInputCount(target, target === inputA ? 'badgeA' : 'badgeB');
            persistContent();
        };
        reader.readAsText(fileInput.files[0]);
    }

    function toggleReplacementTool() {
        const toggle = byId('toggleReplacement');
        if (!replacementTool) {
            return;
        }
        const willShow = replacementTool.hidden;
        replacementTool.hidden = !willShow;
        if (toggle) {
            toggle.textContent = `${willShow ? '\u25be' : '\u25b8'} Text replacement tool`;
        }
    }

    function applyReplacement() {
        if (!replaceSearch) {
            return;
        }
        const search = replaceSearch.value;
        if (!search) {
            return;
        }
        const isRegex = Boolean(replaceRegex && replaceRegex.checked);
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let pattern;
        try {
            pattern = new RegExp(isRegex ? search : escaped, 'g');
        } catch (error) {
            if (replaceError) {
                replaceError.textContent = `Invalid regular expression: ${error.message}`;
                replaceError.hidden = false;
            }
            return;
        }
        if (replaceError) {
            replaceError.textContent = '';
            replaceError.hidden = true;
        }

        const replacement = replaceWith ? replaceWith.value : '';
        if (inputA) {
            inputA.value = inputA.value.replace(pattern, replacement);
        }
        if (inputB) {
            inputB.value = inputB.value.replace(pattern, replacement);
        }
        updateCounts();
        persistContent();
    }

    /** Serializes both lists into the session content payload. */
    function serializeContent() {
        return JSON.stringify({
            listA: inputA ? inputA.value : '',
            listB: inputB ? inputB.value : '',
        });
    }

    /** Reads a stored payload, falling back to empty lists when it is unreadable. */
    function deserializeContent(raw) {
        if (typeof raw !== 'string' || raw === '') {
            return { listA: '', listB: '' };
        }
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return {
                    listA: typeof parsed.listA === 'string' ? parsed.listA : '',
                    listB: typeof parsed.listB === 'string' ? parsed.listB : '',
                };
            }
        } catch (error) {
            return { listA: '', listB: '' };
        }
        return { listA: '', listB: '' };
    }

    /** Stages both lists in the session; a titled session writes through. */
    function persistContent() {
        dirty = true;
        store.save({ content: serializeContent() });
    }

    /** Records the current lists as a version when the content changed. */
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

    /** Clear all empties both lists and the results while keeping the title. */
    function clearAll() {
        if (inputA) {
            inputA.value = '';
        }
        if (inputB) {
            inputB.value = '';
        }
        for (const id of ['fileA', 'fileB']) {
            const file = byId(id);
            if (file) {
                file.value = '';
            }
        }
        resetResults();
        updateCounts();
        persistContent();
        dirty = false;
    }

    header = DevToolkitPageHeader.initPageHeader({
        mount: document.getElementById('pageHeader'),
        title: session.title,
        persisted: store.isPersisted(),
        onTitleChange,
        options: [
            { id: 'clear-all', label: 'Clear all', run: clearAll },
        ],
    });

    const restored = deserializeContent(stored.content);
    if (inputA) {
        inputA.value = restored.listA;
    }
    if (inputB) {
        inputB.value = restored.listB;
    }
    resetResults();
    updateCounts();

    if (inputA) {
        inputA.addEventListener('input', () => {
            updateInputCount(inputA, 'badgeA');
            persistContent();
        });
    }
    if (inputB) {
        inputB.addEventListener('input', () => {
            updateInputCount(inputB, 'badgeB');
            persistContent();
        });
    }

    if (compareBtn) {
        compareBtn.addEventListener('click', compareLists);
    }
    if (byId('toggleReplacement')) {
        byId('toggleReplacement').addEventListener('click', toggleReplacementTool);
    }
    if (byId('applyReplacement')) {
        byId('applyReplacement').addEventListener('click', applyReplacement);
    }

    for (const button of document.querySelectorAll ? document.querySelectorAll('[data-download]') : []) {
        button.addEventListener('click', () => downloadCategory(button.getAttribute('data-download')));
    }
    for (const button of document.querySelectorAll ? document.querySelectorAll('[data-copy]') : []) {
        button.addEventListener('click', () => copyText(button.getAttribute('data-copy'), button));
    }

    for (const [fileId, textarea] of [['fileA', inputA], ['fileB', inputB]]) {
        const fileInput = byId(fileId);
        if (fileInput) {
            fileInput.addEventListener('change', () => loadFile(fileInput, textarea));
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            snapshot();
        }
    });

    window.addEventListener('pagehide', snapshot);
    window.addEventListener('beforeunload', protectUnsavedWork);

    window.DevToolkitListCompare = {
        compareLists,
        clearAll,
        applyReplacement,
        categoryExport,
        parseAndDeduplicate,
        partition,
        serializeContent,
        deserializeContent,
        resultsData,
    };
}());
