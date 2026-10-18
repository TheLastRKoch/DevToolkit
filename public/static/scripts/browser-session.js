/**
 * Browser-side session store for the DevToolkit pages.
 *
 * Each page kind can store many titled sessions at
 * `devtoolkit:sessions:<kind>:<id>`, shaped `{ id, title, kind, versions }`,
 * where `versions` keeps at most the last three content snapshots (FIFO). The
 * next ID comes from `devtoolkit:session-counters:<kind>`. The store keeps the
 * current content of the page in view until the page snapshots it, and a session
 * is written to storage only once the user provides a valid custom title.
 *
 * Loaded as a classic script in the browser (global `DevToolkitSessions`) and
 * exported for Node tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.DevToolkitSessions = api;
    }
}(typeof globalThis === 'object' ? globalThis : this, function () {
    const STORAGE_PREFIX = 'devtoolkit:sessions:';
    const COUNTER_PREFIX = 'devtoolkit:session-counters:';
    const PROBE_KEY = `${STORAGE_PREFIX}__probe`;
    const MAX_VERSIONS = 3;
    const DEFAULT_TITLE = 'Devtoolkit';
    const TITLE_PLACEHOLDER = 'DevToolKit';
    const PLACEHOLDER_PATTERN = /^devtoolkit$/i;

    function browserStorage() {
        try {
            return typeof localStorage === 'object' && localStorage !== null ? localStorage : null;
        } catch (error) {
            return null;
        }
    }

    function memoryStorage() {
        const values = new Map();
        return {
            get length() {
                return values.size;
            },
            key: (index) => {
                const keys = Array.from(values.keys());
                return index >= 0 && index < keys.length ? keys[index] : null;
            },
            getItem: (key) => (values.has(String(key)) ? values.get(String(key)) : null),
            setItem: (key, value) => {
                values.set(String(key), String(value));
            },
            removeItem: (key) => {
                values.delete(String(key));
            },
        };
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

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function isPlainObject(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function normalizeVariables(value) {
        if (!isPlainObject(value)) {
            return null;
        }
        const variables = {};
        for (const [key, entry] of Object.entries(value)) {
            if (typeof entry === 'string') {
                variables[key] = entry;
            }
        }
        return variables;
    }

    function variablesSignature(value) {
        const variables = normalizeVariables(value);
        if (!variables) {
            return '';
        }
        return Object.keys(variables)
            .sort()
            .map((key) => `${key}=${variables[key]}`)
            .join('\n');
    }

    function samePayload(left, right) {
        if (!left || !right) {
            return false;
        }
        return left.content === right.content
            && variablesSignature(left.variables) === variablesSignature(right.variables);
    }

    function normalizeId(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }
        const id = Number(value);
        return Number.isSafeInteger(id) && id >= 1 ? id : null;
    }

    function emptySession(kind, id) {
        return { id: normalizeId(id), title: '', kind, versions: [] };
    }

    function sessionIdFromPath(pathname, kind) {
        if (typeof pathname !== 'string') {
            return null;
        }
        const prefix = `/${kind}/`;
        if (!pathname.startsWith(prefix)) {
            return null;
        }
        return normalizeId(pathname.slice(prefix.length));
    }

    function pagePath(kind, id) {
        const base = `/${kind}`;
        const normalized = normalizeId(id);
        return normalized === null ? base : `${base}/${normalized}`;
    }

    function normalizeVersion(raw) {
        if (!isPlainObject(raw) || typeof raw.content !== 'string') {
            return null;
        }
        const version = {
            updatedDate: typeof raw.updatedDate === 'string' ? raw.updatedDate : '',
            content: raw.content,
        };
        const variables = normalizeVariables(raw.variables);
        if (variables) {
            version.variables = variables;
        }
        return version;
    }

    function parseSession(kind, raw, id) {
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return null;
        }
        if (!isPlainObject(parsed) || !Array.isArray(parsed.versions)) {
            return null;
        }
        const versions = parsed.versions
            .map((version) => normalizeVersion(version))
            .filter((version) => version !== null)
            .slice(-MAX_VERSIONS);
        return {
            id: normalizeId(id),
            title: typeof parsed.title === 'string' ? parsed.title : '',
            kind,
            versions,
        };
    }

    function readStoredSession(storage, key, kind, id) {
        if (!storage) {
            return null;
        }
        let raw;
        try {
            raw = storage.getItem(key);
        } catch (error) {
            return null;
        }
        return raw ? parseSession(kind, raw, id) : null;
    }

    function storageKeys(storage) {
        const keys = [];
        if (!storage) {
            return keys;
        }
        try {
            const length = Number(storage.length) || 0;
            for (let index = 0; index < length; index += 1) {
                const key = storage.key(index);
                if (typeof key === 'string') {
                    keys.push(key);
                }
            }
        } catch (error) {
            return keys;
        }
        return keys;
    }

    function parseSessionKey(key) {
        if (!key.startsWith(STORAGE_PREFIX) || key === PROBE_KEY) {
            return null;
        }
        const rest = key.slice(STORAGE_PREFIX.length);
        const separator = rest.lastIndexOf(':');
        if (separator <= 0) {
            return null;
        }
        const kind = rest.slice(0, separator);
        const id = normalizeId(rest.slice(separator + 1));
        return id === null ? null : { kind, id };
    }

    function legacyKindFromKey(key) {
        if (!key.startsWith(STORAGE_PREFIX) || key === PROBE_KEY) {
            return null;
        }
        const rest = key.slice(STORAGE_PREFIX.length);
        return rest !== '' && !rest.includes(':') ? rest : null;
    }

    function readCounter(storage, kind) {
        if (!storage) {
            return null;
        }
        try {
            return normalizeId(storage.getItem(counterKey(kind)));
        } catch (error) {
            return null;
        }
    }

    function writeCounter(storage, kind, value) {
        if (!storage) {
            return false;
        }
        try {
            storage.setItem(counterKey(kind), String(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function bumpCounter(storage, kind, value) {
        const current = readCounter(storage, kind);
        if (current !== null && current >= value) {
            return;
        }
        writeCounter(storage, kind, value);
    }

    function nextFreeId(storage, kind, start) {
        let id = normalizeId(start) || 1;
        while (storage.getItem(sessionKey(kind, id)) !== null) {
            id += 1;
        }
        return id;
    }

    function maxExistingId(storage, kind) {
        let max = 0;
        for (const key of storageKeys(storage)) {
            const parsed = parseSessionKey(key);
            if (parsed && parsed.kind === kind && parsed.id > max) {
                max = parsed.id;
            }
        }
        return max;
    }

    function allocateId(storage, kind) {
        const counter = readCounter(storage, kind);
        const start = counter === null ? maxExistingId(storage, kind) + 1 : counter;
        const id = nextFreeId(storage, kind, start);
        writeCounter(storage, kind, id + 1);
        return id;
    }

    function migrateLegacySession(kind, storage) {
        const backing = arguments.length < 2 ? browserStorage() : storage;
        if (!backing) {
            return false;
        }
        try {
            const legacyKey = sessionKey(kind);
            const raw = backing.getItem(legacyKey);
            if (!raw) {
                return false;
            }
            const legacy = parseSession(kind, raw, null);
            if (!legacy || !isValidTitle(legacy.title)) {
                return false;
            }
            const counter = readCounter(backing, kind);
            const id = nextFreeId(backing, kind, counter === null ? 1 : counter);
            const migrated = { id, title: legacy.title, kind, versions: legacy.versions };
            backing.setItem(sessionKey(kind, id), JSON.stringify(migrated));
            bumpCounter(backing, kind, id + 1);
            backing.removeItem(legacyKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Reads every stored session from `storage` and returns
     * `{ id, kind, title, latestDate }` per session, newest first. Legacy
     * single-session documents are migrated before reading. Untitled or
     * unreadable documents are skipped.
     */
    function listAll(storage) {
        const target = arguments.length === 0 ? browserStorage() : storage;
        const sessions = [];
        if (!target) {
            return sessions;
        }
        for (const key of storageKeys(target)) {
            const legacyKind = legacyKindFromKey(key);
            if (legacyKind) {
                migrateLegacySession(legacyKind, target);
            }
        }
        for (const key of storageKeys(target)) {
            const parsed = parseSessionKey(key);
            if (!parsed) {
                continue;
            }
            const session = readStoredSession(target, key, parsed.kind, parsed.id);
            if (!session || !isValidTitle(session.title)) {
                continue;
            }
            const latest = session.versions[session.versions.length - 1];
            sessions.push({
                id: session.id,
                kind: parsed.kind,
                title: session.title.trim(),
                latestDate: latest ? latest.updatedDate : '',
            });
        }
        sessions.sort((left, right) => {
            if (left.latestDate !== right.latestDate) {
                if (left.latestDate === '') {
                    return 1;
                }
                if (right.latestDate === '') {
                    return -1;
                }
                return left.latestDate < right.latestDate ? 1 : -1;
            }
            const byTitle = left.title.localeCompare(right.title);
            if (byTitle !== 0) {
                return byTitle;
            }
            const byKind = left.kind.localeCompare(right.kind);
            return byKind !== 0 ? byKind : left.id - right.id;
        });
        return sessions;
    }

    function sessionKey(kind, id) {
        const base = STORAGE_PREFIX + String(kind);
        const normalized = normalizeId(id);
        return normalized === null ? base : `${base}:${normalized}`;
    }

    function counterKey(kind) {
        return COUNTER_PREFIX + String(kind);
    }

    function openStore(kind, storage, options) {
        const settings = options || {};
        const now = typeof settings.now === 'function' ? settings.now : () => Date.now();
        const onWriteError = typeof settings.onWriteError === 'function' ? settings.onWriteError : null;
        const backing = arguments.length < 2 ? browserStorage() : storage;
        let currentId = normalizeId(settings.sessionId);
        let key = currentId === null ? null : sessionKey(kind, currentId);
        let persistent = false;
        let lastWriteFailed = false;
        let loaded = false;
        let state = null;
        let staged = null;

        try {
            if (backing) {
                backing.setItem(PROBE_KEY, '1');
                persistent = backing.getItem(PROBE_KEY) === '1';
                backing.removeItem(PROBE_KEY);
            }
        } catch (error) {
            persistent = false;
        }

        migrateLegacySession(kind, backing);

        function current() {
            if (!loaded) {
                state = currentId === null
                    ? emptySession(kind, null)
                    : (readStoredSession(backing, key, kind, currentId) || emptySession(kind, currentId));
                loaded = true;
            }
            return state;
        }

        function isTitled() {
            return isValidTitle(current().title);
        }

        /**
         * Writes the session through to storage, but only when the session has a
         * valid title. Returns whether the write reached storage.
         */
        function write() {
            if (!persistent || !isTitled()) {
                return false;
            }
            if (currentId === null) {
                currentId = allocateId(backing, kind);
                key = sessionKey(kind, currentId);
                current().id = currentId;
            } else {
                bumpCounter(backing, kind, currentId + 1);
            }
            try {
                backing.setItem(key, JSON.stringify(current()));
                lastWriteFailed = false;
                return true;
            } catch (error) {
                lastWriteFailed = true;
                if (onWriteError) {
                    onWriteError(error);
                }
                return false;
            }
        }

        function latestVersion() {
            const versions = current().versions;
            return versions.length > 0 ? versions[versions.length - 1] : null;
        }

        function get() {
            return clone(current());
        }

        function getTitle() {
            return current().title;
        }

        /**
         * Stages the page's title and content. The title is stored when valid and
         * the content stays in view until `snapshot()` records it; nothing reaches
         * storage while the session is untitled.
         */
        function save(patch) {
            const changes = patch || {};
            if (changes.title !== undefined) {
                const value = typeof changes.title === 'string' ? changes.title : '';
                current().title = isValidTitle(value) ? value.trim() : value;
            }
            if (changes.content !== undefined) {
                const content = typeof changes.content === 'string' ? changes.content : '';
                const variables = normalizeVariables(changes.variables);
                staged = variables ? { content, variables } : { content };
            }
            const persisted = write();
            return {
                titled: isTitled(),
                persisted,
                title: current().title,
                id: currentId,
            };
        }

        /**
         * Records the staged content as a version when it differs from the most
         * recent snapshot, dropping the oldest version above three.
         */
        function snapshot() {
            const next = current();
            if (!isTitled() || !staged || samePayload(latestVersion(), staged)) {
                return false;
            }
            const version = {
                updatedDate: new Date(now()).toISOString(),
                content: staged.content,
            };
            if (staged.variables) {
                version.variables = clone(staged.variables);
            }
            next.versions.push(version);
            if (next.versions.length > MAX_VERSIONS) {
                next.versions.splice(0, next.versions.length - MAX_VERSIONS);
            }
            write();
            return true;
        }

        /** The staged content, falling back to the most recent snapshot. */
        function content() {
            const source = staged || latestVersion();
            if (!source) {
                return { content: '', variables: {} };
            }
            const view = { content: source.content };
            if (source.variables !== undefined) {
                view.variables = clone(source.variables);
            }
            return view;
        }

        /** Drops the session from storage and from the current page view. */
        function remove() {
            let removed = false;
            if (persistent && currentId !== null) {
                try {
                    removed = backing.getItem(key) !== null;
                    backing.removeItem(key);
                } catch (error) {
                    removed = false;
                }
            }
            currentId = null;
            key = null;
            state = emptySession(kind, null);
            loaded = true;
            staged = null;
            return removed;
        }

        function status() {
            return { persistent, lastWriteFailed };
        }

        function isPersisted() {
            return persistent && !lastWriteFailed;
        }

        return {
            kind,
            defaultTitle: DEFAULT_TITLE,
            maxVersions: MAX_VERSIONS,
            get key() {
                return key;
            },
            getId: () => currentId,
            get,
            getTitle,
            isTitled,
            save,
            snapshot,
            content,
            remove,
            listAll: () => listAll(backing),
            status,
            isPersisted,
        };
    }

    return {
        openStore,
        listAll,
        browserStorage,
        memoryStorage,
        isValidTitle,
        sessionKey,
        counterKey,
        migrateLegacySession,
        sessionIdFromPath,
        pagePath,
        DEFAULT_TITLE,
        TITLE_PLACEHOLDER,
        MAX_VERSIONS,
        STORAGE_PREFIX,
        COUNTER_PREFIX,
    };
}));
