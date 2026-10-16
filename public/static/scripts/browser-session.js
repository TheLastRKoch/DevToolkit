/**
 * Browser-side session store for the DevToolkit pages.
 *
 * Every page type owns exactly one stored session at `devtoolkit:sessions:<kind>`
 * shaped `{ title, kind, versions }`, where `versions` keeps at most the last
 * three content snapshots (FIFO). The store keeps the current content of the page
 * in view until the page snapshots it, and a session is written to storage only
 * once the user provides a valid custom title.
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

    function emptySession(kind) {
        return { title: '', kind, versions: [] };
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

    function parseSession(kind, raw) {
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
            title: typeof parsed.title === 'string' ? parsed.title : '',
            kind,
            versions,
        };
    }

    function readStoredSession(storage, key, kind) {
        if (!storage) {
            return null;
        }
        let raw;
        try {
            raw = storage.getItem(key);
        } catch (error) {
            return null;
        }
        return raw ? parseSession(kind, raw) : null;
    }

    /**
     * Reads every stored session from `storage` and returns
     * `{ kind, title, latestDate }` per session, newest first. Untitled or
     * unreadable documents are skipped.
     */
    function listAll(storage) {
        const target = arguments.length === 0 ? browserStorage() : storage;
        const sessions = [];
        if (!target) {
            return sessions;
        }
        let keys = [];
        try {
            const length = Number(target.length) || 0;
            for (let index = 0; index < length; index += 1) {
                const key = target.key(index);
                if (typeof key === 'string') {
                    keys.push(key);
                }
            }
        } catch (error) {
            return sessions;
        }
        for (const key of keys) {
            if (!key.startsWith(STORAGE_PREFIX) || key === PROBE_KEY) {
                continue;
            }
            const kind = key.slice(STORAGE_PREFIX.length);
            if (kind === '') {
                continue;
            }
            const session = readStoredSession(target, key, kind);
            if (!session || !isValidTitle(session.title)) {
                continue;
            }
            const latest = session.versions[session.versions.length - 1];
            sessions.push({
                kind,
                title: session.title.trim(),
                latestDate: latest ? latest.updatedDate : '',
            });
        }
        sessions.sort((left, right) => {
            if (left.latestDate === right.latestDate) {
                return left.title.localeCompare(right.title);
            }
            if (left.latestDate === '') {
                return 1;
            }
            if (right.latestDate === '') {
                return -1;
            }
            return left.latestDate < right.latestDate ? 1 : -1;
        });
        return sessions;
    }

    function sessionKey(kind) {
        return STORAGE_PREFIX + String(kind);
    }

    function openStore(kind, storage, options) {
        const settings = options || {};
        const now = typeof settings.now === 'function' ? settings.now : () => Date.now();
        const onWriteError = typeof settings.onWriteError === 'function' ? settings.onWriteError : null;
        const key = sessionKey(kind);
        const backing = arguments.length < 2 ? browserStorage() : storage;
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

        function current() {
            if (!loaded) {
                state = readStoredSession(backing, key, kind) || emptySession(kind);
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
            if (persistent) {
                try {
                    removed = backing.getItem(key) !== null;
                    backing.removeItem(key);
                } catch (error) {
                    removed = false;
                }
            }
            state = emptySession(kind);
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
            key,
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
        DEFAULT_TITLE,
        TITLE_PLACEHOLDER,
        MAX_VERSIONS,
        STORAGE_PREFIX,
    };
}));
