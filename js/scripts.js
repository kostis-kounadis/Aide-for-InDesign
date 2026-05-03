/**
 * Aide — scripts.js
 * Script persistence: save, load, search, delete, favorites.
 * Uses localStorage (CEP doesn't support IndexedDB reliably).
 */

const AideScripts = (() => {
    const STORAGE_KEY = 'aide_scripts';
    const FOLDER_KEY = 'aide_scripts_folder';
    const FOLDERS_KEY = 'aide_local_script_folders';
    const LOCAL_FAV_KEY = 'aide_local_script_favorites';
    const SCRIPTS_SUBTAB_KEY = 'aide_scripts_subtab';
    const SCRIPTS_STAR_FILTER_KEY = 'aide_scripts_star_filter';
    // Light version: compact view only; script descriptions feature removed.
    const DEFAULT_FOLDER = '~/Documents/Aide Scripts/';

    // ──────────────────────────────────────────────
    // CRUD — Aide-saved-from-chat scripts (localStorage)
    // ──────────────────────────────────────────────

    /**
     * Load all saved-from-chat scripts.
     * @returns {Array} array of script objects { id, name, code, favorite, createdAt }
     */
    function loadAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    }

    function _persist(arr) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || (e.message && e.message.indexOf('quota') !== -1)) {
                window.dispatchEvent(new CustomEvent('QUOTA_EXCEEDED', { detail: { source: 'scripts' } }));
            }
            console.warn('Could not save scripts:', e);
        }
    }

    /**
     * Find a script by id.
     * @param {string} id
     * @returns {object|null}
     */
    function getById(id) {
        return loadAll().find(s => s.id === id) || null;
    }

    /**
     * Save a new script. Generates a random id if not provided.
     * @param {object} script - { name, code, [id], [favorite] }
     * @returns {object} the saved script with id and createdAt
     */
    function save(script) {
        const arr = loadAll();
        const entry = Object.assign({
            id: 'aide_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            name: 'Untitled Script',
            code: '',
            favorite: false,
            createdAt: new Date().toISOString()
        }, script);
        arr.unshift(entry); // newest first
        _persist(arr);
        return entry;
    }

    /**
     * Remove a script by id.
     * @param {string} id
     */
    function remove(id) {
        const arr = loadAll().filter(s => s.id !== id);
        _persist(arr);
    }

    /**
     * Update fields on an existing script.
     * @param {string} id
     * @param {object} delta - partial fields to merge
     */
    function update(id, delta) {
        const arr = loadAll().map(s => s.id === id ? Object.assign({}, s, delta) : s);
        _persist(arr);
    }

    /**
     * Toggle the `favorite` flag on a saved-from-chat script.
     * @param {string} id
     * @returns {boolean} new favorite state
     */
    function toggleFavorite(id) {
        const script = getById(id);
        if (!script) return false;
        const newState = !script.favorite;
        update(id, { favorite: newState });
        return newState;
    }

    // ──────────────────────────────────────────────
    // Description key helpers — uniquely identify a script for descriptions map
    // ──────────────────────────────────────────────

    /** Key for a locally-stored disk script (by filesystem path) */
    function descKeyLocal(path) {
        return 'local:' + String(path || '');
    }

    /** Key for an Aide saved-from-chat script (by id) */
    function descKeyAide(id) {
        return 'aide:' + String(id || '');
    }

    function migrateFolderToArray() {
        try {
            if (localStorage.getItem(FOLDERS_KEY)) return;
            const legacy = localStorage.getItem(FOLDER_KEY);
            // Only migrate a real user-set legacy value, not the default
            if (legacy && legacy.trim() && legacy.trim() !== DEFAULT_FOLDER) {
                localStorage.setItem(FOLDERS_KEY, JSON.stringify([legacy.trim()]));
            } else {
                // Mark as migrated with an empty list — no phantom default folder
                localStorage.setItem(FOLDERS_KEY, JSON.stringify([]));
            }
        } catch (e) {
            console.warn('Folder migration:', e);
        }
    }

    // ──── Local script folders (export destination + Local tab roots) ────
    function getScriptFolders() {
        migrateFolderToArray();
        try {
            const raw = localStorage.getItem(FOLDERS_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.filter(Boolean) : [];
        } catch (e) {
            return [];
        }
    }

    function setScriptFolders(paths) {
        try {
            const clean = (paths || []).map(p => {
                const raw = String(p || '').trim();
                if (!raw) return '';
                try { return decodeURIComponent(raw); } catch (e) { return raw; }
            }).filter(Boolean);
            localStorage.setItem(FOLDERS_KEY, JSON.stringify(clean));
        } catch (e) {
            console.warn('Could not save folder list:', e);
        }
    }

    function addScriptFolder(path, insertAtIdx = -1) {
        let p = String(path || '').trim();
        try { p = decodeURIComponent(p); } catch (e) { /* keep raw */ }
        if (!p) return;
        const cur = getScriptFolders();
        if (cur.indexOf(p) !== -1) return;
        if (insertAtIdx >= 0 && insertAtIdx <= cur.length) {
            cur.splice(insertAtIdx, 0, p);
        } else {
            cur.push(p);
        }
        setScriptFolders(cur);
    }

    function removeScriptFolder(index) {
        const cur = getScriptFolders();
        if (index < 0 || index >= cur.length) return;
        cur.splice(index, 1);
        setScriptFolders(cur); // may become empty - that's valid
    }

    /** First folder: default export target */
    function getScriptsFolder() {
        const folders = getScriptFolders();
        return folders[0] || null;
    }

    function setScriptsFolder(path) {
        const p = String(path || '').trim();
        if (!p) return;
        const cur = getScriptFolders();
        if (cur.length === 0) {
            setScriptFolders([p]);
        } else {
            cur[0] = p;
            setScriptFolders(cur);
        }
    }

    // ──── Local disk script favorites (full fs path as id) ────
    function loadLocalFavorites() {
        try {
            const raw = localStorage.getItem(LOCAL_FAV_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    }

    function persistLocalFavorites(ids) {
        try {
            localStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(ids));
        } catch (e) {
            console.warn('Could not save local favorites:', e);
        }
    }

    function isLocalFavorite(path) {
        return loadLocalFavorites().indexOf(path) !== -1;
    }

    function toggleLocalFavorite(path) {
        const ids = loadLocalFavorites();
        const i = ids.indexOf(path);
        if (i === -1) ids.push(path);
        else ids.splice(i, 1);
        persistLocalFavorites(ids);
        return i === -1;
    }

    function getScriptsSubtab() {
        try {
            const v = localStorage.getItem(SCRIPTS_SUBTAB_KEY);
            return (v === 'sets' || v === 'favs') ? v : 'local';
        } catch (e) {
            return 'local';
        }
    }

    function setScriptsSubtab(tab) {
        try {
            const valid = (tab === 'local' || tab === 'sets' || tab === 'favs') ? tab : 'local';
            localStorage.setItem(SCRIPTS_SUBTAB_KEY, valid);
        } catch (e) { /* ignore */ }
    }

    function getScriptsStarFilter() {
        try {
            return localStorage.getItem(SCRIPTS_STAR_FILTER_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function setScriptsStarFilter(on) {
        try {
            localStorage.setItem(SCRIPTS_STAR_FILTER_KEY, on ? '1' : '0');
        } catch (e) { /* ignore */ }
    }

    // Script descriptions feature removed in light version.



    // ──────────────────────────────────────────────
    // STEP 5 — Hierarchical Script Tree
    // ──────────────────────────────────────────────

    const HIDDEN_KEY   = 'aide_tree_hidden_paths';
    const SHOW_HID_KEY = 'aide_tree_show_hidden';
    const OPEN_FOLDERS_KEY = 'aide_tree_open_folders';

    function loadOpenFolders() {
        try {
            const raw = localStorage.getItem(OPEN_FOLDERS_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }

    function persistOpenFolders(arr) {
        try { localStorage.setItem(OPEN_FOLDERS_KEY, JSON.stringify(arr || [])); }
        catch (e) { /* ignore */ }
    }

    function isFolderOpen(path) {
        return loadOpenFolders().indexOf(path) !== -1;
    }

    function setFolderOpen(path, open) {
        const p = String(path || '');
        if (!p) return;
        const arr = loadOpenFolders();
        const i = arr.indexOf(p);
        if (open && i === -1) arr.push(p);
        if (!open && i !== -1) arr.splice(i, 1);
        persistOpenFolders(arr);
    }

    function loadHiddenPaths() {
        try {
            const raw = localStorage.getItem(HIDDEN_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }

    function persistHiddenPaths(arr) {
        try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(arr)); }
        catch (e) { console.warn('Could not save hidden paths:', e); }
    }

    function isHiddenPath(path) {
        return loadHiddenPaths().indexOf(path) !== -1;
    }

    function toggleHiddenPath(path) {
        const arr = loadHiddenPaths();
        const i = arr.indexOf(path);
        if (i === -1) arr.push(path);
        else arr.splice(i, 1);
        persistHiddenPaths(arr);
        return i === -1; // true = now hidden
    }

    function getShowHidden() {
        try { return localStorage.getItem(SHOW_HID_KEY) === '1'; }
        catch (e) { return false; }
    }

    function setShowHidden(v) {
        try { localStorage.setItem(SHOW_HID_KEY, v ? '1' : '0'); }
        catch (e) { /* ignore */ }
    }

    /**
     * Count visible script files in a tree node (recursive).
     * Used for folder count badges.
     */
    function countVisibleFiles(node, showHidden) {
        if (!node) return 0;
        if (node.type === 'file') {
            if (!showHidden && isHiddenPath(node.path)) return 0;
            return 1;
        }
        // folder
        let count = 0;
        if (node.children) {
            node.children.forEach(c => { count += countVisibleFiles(c, showHidden); });
        }
        return count;
    }

    /**
     * Filter a tree node's children by search query (recursive).
     * Returns a copy of the node with matching descendants only.
     */
    function filterTreeNode(node, q, showHidden) {
        if (!node) return null;
        if (node.type === 'file') {
            if (!showHidden && isHiddenPath(node.path)) return null;
            if (!q) return node;
            const name = (node.name || '').toLowerCase();
            return name.indexOf(q) !== -1 ? node : null;
        }
        // folder — recurse
        const filteredChildren = [];
        if (node.children) {
            node.children.forEach(c => {
                const r = filterTreeNode(c, q, showHidden);
                if (r) filteredChildren.push(r);
            });
        }
        if (!q && filteredChildren.length === 0) return null; // empty folder hidden when no query
        if (q && filteredChildren.length === 0) {
            // Folder name itself matches
            const fname = (node.name || '').toLowerCase();
            if (fname.indexOf(q) === -1) return null;
        }
        return Object.assign({}, node, { children: filteredChildren });
    }

    /**
     * Recursively render a tree node into HTML string.
     * folder  → <details class="script-folder">
     * file    → <div class="script-row">
     */
    function renderTreeNodeHtml(node, depth, favPaths, showHidden, isRoot) {
        if (!node) return '';
        const esc = AideUtils.escapeHtml;
        const enc = p => encodeURIComponent(p);
        const decodeLabel = (value) => {
            const raw = String(value || '');
            try { return decodeURIComponent(raw); } catch (e) { return raw.replace(/%20/g, ' '); }
        };
        const folderChevronSvg = `<span class="folder-chevron icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg></span>`;
        const folderIconSvg = `<span class="folder-row-icon icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span>`;
        const fileIconSvg = `<span class="script-row-icon icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><polyline points="14 2 14 7 19 7"/></svg></span>`;
        const starIconSvg = `<span class="script-row-icon icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><polygon points="12 3.5 14.85 9.28 21.23 10.21 16.61 14.72 17.7 21.08 12 18.08 6.3 21.08 7.39 14.72 2.77 10.21 9.15 9.28 12 3.5"/></svg></span>`;
        const lockIconSvg = `<span class="script-row-icon icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" ry="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>`;
        const runIconSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="8 5 19 12 8 19 8 5"/></svg>`;

        if (node.type === 'file') {
            const isFav    = favPaths.indexOf(node.path) !== -1;
            const isHidden = isHiddenPath(node.path);
            const isBin    = !!node.binary;
            const ep       = enc(node.path);
            const hidStyle = isHidden ? ' tree-row--hidden' : '';
            const decodedPath = decodeLabel(node.path);
            const decodedName = decodeLabel(node.name || '');

            // Strip extension from display name
            let displayName = decodedName;
            const dotPos = displayName.lastIndexOf('.');
            const extDisp = dotPos !== -1 ? displayName.substring(dotPos) : '';
            if (dotPos !== -1) displayName = displayName.substring(0, dotPos);
            const iconHtml = isBin ? lockIconSvg : (isFav ? starIconSvg : fileIconSvg);

            return `<div class="script-row${hidStyle}${isFav ? ' script-row--fav' : ''}" data-path="${ep}" data-type="file" data-is-bin="${isBin ? 'true' : 'false'}" style="--tree-depth:${depth}" title="${esc(decodedPath)}">
  ${isBin ? '' : `<button type="button" class="tree-run-btn" data-action="tree-run" data-enc-path="${ep}" title="Run">${runIconSvg}</button>`}
  ${iconHtml}
  <span class="script-row-name">${esc(displayName)}</span><span class="script-row-ext">${esc(extDisp)}</span>
  <div class="script-row-right">
    <button type="button" class="tree-overflow-btn" data-action="tree-overflow" data-enc-path="${ep}" data-name="${esc(decodedName)}" data-is-fav="${isFav}" data-is-hidden="${isHidden}" data-is-bin="${isBin}" title="More options">⋯</button>
  </div>
</div>`;
        }

        // Folder node
        const childrenHtml = (node.children || []).map(c => renderTreeNodeHtml(c, depth + 1, favPaths, showHidden, false)).join('');
        const count = countVisibleFiles(node, showHidden);
        const countBadge = count > 0 ? `<span class="folder-count">${count}</span>` : '';
        const openAttr = isFolderOpen(node.path) ? ' open' : '';
        const rootAttr = isRoot ? ' data-root="true"' : '';
        const folderLabel = decodeLabel(node.name || '');

        return `<details class="script-folder" style="--tree-depth:${depth}"${openAttr}${rootAttr} data-folder-path="${encodeURIComponent(node.path)}">
  <summary class="folder-row">
    ${folderChevronSvg}
    ${folderIconSvg}
    <span class="folder-row-name">${esc(folderLabel)}</span>
    ${countBadge}
  </summary>
  <div class="folder-children">
${childrenHtml}
  </div>
</details>`;
    }

    /**
     * Render the full hierarchical tree for the Local tab.
     * @param {HTMLElement} container   — the scripts-list element
     * @param {HTMLElement} emptyEl     — the empty-state element
     * @param {Array}       trees       — array of root tree nodes from scanScriptFolderJson
     * @param {string}      searchQuery — filter string (may be empty)
     * @param {boolean}     favOnly     — if true, show only favorites
     * @param {boolean}     showHid     — if true, show hidden scripts
     */
    function renderScriptTree(container, emptyEl, trees, searchQuery, favOnly, showHid) {
        const q = (searchQuery || '').toLowerCase().trim();
        const favPaths = loadLocalFavorites();

        // Collect all file nodes to support favOnly filter
        function collectFiles(node) {
            if (!node) return [];
            if (node.type === 'file') return [node];
            let out = [];
            (node.children || []).forEach(c => { out = out.concat(collectFiles(c)); });
            return out;
        }

        // Apply filters to a tree
        let filtered = trees.map(root => {
            if (!root) return null;
            let r = root;
            if (favOnly) {
                // Keep only file nodes whose path is in favorites
                function keepFavs(n) {
                    if (!n) return null;
                    if (n.type === 'file') return favPaths.indexOf(n.path) !== -1 ? n : null;
                    const ch = (n.children || []).map(keepFavs).filter(Boolean);
                    return ch.length ? Object.assign({}, n, { children: ch }) : null;
                }
                r = keepFavs(r);
            }
            return r ? filterTreeNode(r, q, showHid) : null;
        }).filter(Boolean);

        const hasContent = filtered.some(root => {
            if (!root) return false;
            if (root.type === 'file') return true;
            return (root.children || []).length > 0;
        });

        if (!hasContent) {
            container.innerHTML = '';
            container.appendChild(emptyEl);
            emptyEl.classList.remove('hidden');
            return;
        }

        emptyEl.classList.add('hidden');
        container.innerHTML = filtered.map(root => renderTreeNodeHtml(root, 0, favPaths, showHid, true)).join('');
    }

    return {
        // ── Saved-from-chat scripts CRUD ──
        loadAll, getById, save, remove, update, toggleFavorite,
        // ── Description key helpers ──
        descKeyLocal, descKeyAide,
        // ── Local script folders ──
        getScriptsFolder, setScriptsFolder, getScriptFolders, setScriptFolders, addScriptFolder, removeScriptFolder,
        // ── Local disk favorites ──
        isLocalFavorite, toggleLocalFavorite, loadLocalFavorites,
        // ── UI persistence ──
        getScriptsSubtab, setScriptsSubtab, getScriptsStarFilter, setScriptsStarFilter,
        // Light version: view mode + descriptions removed.
        // ── Tree rendering (Step 5) ──
        renderScriptTree,
        isHiddenPath, toggleHiddenPath,
        getShowHidden, setShowHidden,
        // ── Tree open-state persistence ──
        setFolderOpen, isFolderOpen,
        DEFAULT_FOLDER
    };
})();

