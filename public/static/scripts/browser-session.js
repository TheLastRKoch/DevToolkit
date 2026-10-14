/**
 * Browser-side session store for the DevToolkit editing pages.
 *
 * Every page type owns one stored document at `devtoolkit:sessions:<pageType>`
 * shaped `{ version, nextId, sessions }`, where each session record is
 * `{ name, updatedAt, expiresAt, data }` and expires 30 days after its last
 * change. The document is the page view's own state; the underlying storage is
 * written through on every change, so a change stays visible in the current page
 * view even when it cannot be persisted.
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
    const DOCUMENT_VERSION = 1;
    const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
    const DEFAULT_NAME = 'Devtoolkit';

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
            getItem: (key) => (values.has(key) ? values.get(key) : null),
            setItem: (key, value) => {
                values.set(key, String(value));
            },
            removeItem: (key) => {
                values.delete(key);
            },
        };
    }

    function emptyDocument() {
        return { version: DOCUMENT_VERSION, nextId: 1, sessions: {} };
    }

    function clone(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function sessionKey(sessionId) {
        const key = String(sessionId);
        return /^[1-9][0-9]*$/.test(key) ? key : null;
    }

    function openStore(pageType, storage, options) {
        const settings = options || {};
        const now = typeof settings.now === 'function' ? settings.now : () => Date.now();
        const onWriteError = typeof settings.onWriteError === 'function' ? settings.onWriteError : null;
        const documentKey = STORAGE_PREFIX + pageType;
        const backing = arguments.length < 2 ? browserStorage() : storage;
        let persistent = false;
        let lastWriteFailed = false;
        let loaded = false;
        let documentState = null;

        try {
            if (backing) {
                backing.setItem(PROBE_KEY, '1');
                persistent = backing.getItem(PROBE_KEY) === '1';
                backing.removeItem(PROBE_KEY);
            }
        } catch (error) {
            persistent = false;
        }

        function readDocument() {
            if (!persistent) {
                return emptyDocument();
            }
            let raw;
            try {
                raw = backing.getItem(documentKey);
            } catch (error) {
                persistent = false;
                return emptyDocument();
            }
            if (!raw) {
                return emptyDocument();
            }
            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch (error) {
                return emptyDocument();
            }
            if (!parsed || typeof parsed !== 'object' || !parsed.sessions || typeof parsed.sessions !== 'object') {
                return emptyDocument();
            }
            const nextId = Number.isSafeInteger(parsed.nextId) && parsed.nextId > 0 ? parsed.nextId : 1;
            return { version: DOCUMENT_VERSION, nextId, sessions: parsed.sessions };
        }

        function writeDocument(nextDocument) {
            if (!persistent) {
                return false;
            }
            try {
                backing.setItem(documentKey, JSON.stringify(nextDocument));
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

        function state() {
            if (!loaded) {
                documentState = readDocument();
                loaded = true;
            }
            return documentState;
        }

        function isExpired(record, at) {
            return !record || typeof record.expiresAt !== 'number' || record.expiresAt < at;
        }

        function pruneExpired(target, at) {
            for (const key of Object.keys(target.sessions)) {
                if (isExpired(target.sessions[key], at)) {
                    delete target.sessions[key];
                }
            }
        }

        function createRecord(at) {
            return { name: DEFAULT_NAME, updatedAt: at, expiresAt: at + EXPIRY_MS, data: {} };
        }

        function get(sessionId) {
            const key = sessionKey(sessionId);
            if (key === null) {
                return null;
            }
            const current = state();
            const record = current.sessions[key];
            const at = now();
            if (isExpired(record, at)) {
                if (record) {
                    delete current.sessions[key];
                    writeDocument(current);
                }
                return null;
            }
            return clone(record);
        }

        function ensure(sessionId, defaultData) {
            const existing = get(sessionId);
            if (existing) {
                return existing;
            }
            const key = sessionKey(sessionId);
            if (key === null) {
                return null;
            }
            const at = now();
            const created = createRecord(at);
            if (defaultData !== undefined) {
                created.data = clone(defaultData) || {};
            }
            const current = state();
            current.sessions[key] = created;
            writeDocument(current);
            return clone(created);
        }

        function save(sessionId, patch) {
            const key = sessionKey(sessionId);
            if (key === null) {
                return null;
            }
            const current = state();
            const at = now();
            const stored = current.sessions[key];
            const record = isExpired(stored, at) ? createRecord(at) : stored;
            if (patch && typeof patch.name === 'string') {
                record.name = patch.name;
            }
            if (patch && patch.data !== undefined) {
                record.data = clone(patch.data) || {};
            }
            record.updatedAt = at;
            record.expiresAt = at + EXPIRY_MS;
            current.sessions[key] = record;
            pruneExpired(current, at);
            writeDocument(current);
            return clone(record);
        }

        function allocateId() {
            const current = state();
            const at = now();
            pruneExpired(current, at);
            let highest = 0;
            for (const key of Object.keys(current.sessions)) {
                const value = Number(key);
                if (Number.isSafeInteger(value) && value > highest) {
                    highest = value;
                }
            }
            const nextId = Math.max(current.nextId, highest + 1);
            current.nextId = nextId + 1;
            writeDocument(current);
            return nextId;
        }

        function remove(sessionId) {
            const key = sessionKey(sessionId);
            if (key === null) {
                return false;
            }
            const current = state();
            if (!Object.prototype.hasOwnProperty.call(current.sessions, key)) {
                return false;
            }
            delete current.sessions[key];
            writeDocument(current);
            return true;
        }

        function listIds() {
            const current = state();
            pruneExpired(current, now());
            return Object.keys(current.sessions)
                .map((key) => Number(key))
                .sort((a, b) => a - b);
        }

        function status() {
            return { persistent, lastWriteFailed };
        }

        function isPersisted() {
            return persistent && !lastWriteFailed;
        }

        return {
            pageType,
            defaultName: DEFAULT_NAME,
            expiryMs: EXPIRY_MS,
            get,
            ensure,
            save,
            allocateId,
            remove,
            listIds,
            status,
            isPersisted,
        };
    }

    return {
        openStore,
        browserStorage,
        memoryStorage,
        DEFAULT_NAME,
        EXPIRY_MS,
        DOCUMENT_VERSION,
        STORAGE_PREFIX,
    };
}));
