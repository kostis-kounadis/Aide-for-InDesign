# Aide for InDesign — Full Overhaul Implementation Plan

## Status: ✅ All Code Changes Complete — Awaiting Live InDesign Verification

---

## Session 1 Fixes (25 Apr 2026)

All 10 diagnosed bugs from the original audit have been resolved:

| # | Bug | File | Status |
|---|-----|------|--------|
| 1 | Missing CRUD API (`loadAll`, `getById`, `save`, `remove`, `update`, `toggleFavorite`, `descKeyLocal`, `descKeyAide`) | `scripts.js` | ✅ Fixed |
| 2 | `setScriptsSubtab` saved `'aide'` instead of `'favs'` | `scripts.js` | ✅ Fixed |
| 3 | `refreshScriptsList` / `renderLocalTreePanel` / `renderSetsPanel` / `renderFavsPanel` not defined | `app.js` | ✅ Fixed |
| 4 | `fetchLocalScriptTree` / `fetchAideSets` not defined | `app.js` | ✅ Fixed |
| 5 | `isAllowedLocalScriptPath` blocked auto-detected Scripts Panel path | `app.js` | ✅ Fixed |
| 6 | `syncShowHiddenBtn` called but not defined → ReferenceError on startup | `app.js` | ✅ Fixed |
| 7 | Compact/Detail view toggle icon wrong on boot | `app.js` | ✅ Fixed (resolved by Bug 3/4 fixes) |
| 8 | `%20` display in paths | `scripts.js` / `app.js` | ✅ Fixed (paths decoded in `cleanFileName` + `normalizeFsPath`) |
| 9 | `runGeneratedExtendScript` used `new Function()` — scope isolation broke InDesign globals | `host.jsx` | ✅ Fixed → switched to `eval()` |
| 10 | `saveAideSet` failed when no user folders (only auto-detected) | `app.js` | ✅ Fixed → falls back to `autoDetectedScriptsPanelPath` |

---

## Session 2 Fixes (this session)

Additional bugs found during secondary audit and resolved:

| # | Bug | File | Status |
|---|-----|------|--------|
| A | `evalScriptSafe` false-failed on empty string return (broke `pickScriptsFolder` cancel) | `app.js` | ✅ Fixed |
| B | Dead DOM refs: `dom.modMode`, `dom.addLocalFolderBtn`, `dom.scriptsSubtabAide`, `dom.autoFolderRow/Status/Label/OpenBtn/AddBtn` | `app.js` | ✅ Removed |
| C | `showAddToSetPrompt` used escaped `\\n` instead of real newlines | `app.js` | ✅ Fixed |
| D | Tree-run button incorrectly restored to `▶ Run` (should be `▶`) after execution | `app.js` | ✅ Fixed |
| E | `.btn-primary` class used on Set overlay Save button but never defined in CSS | `style.css` | ✅ Added |
| F | `.overlay` class (Set create/edit modal) missing position/flex/backdrop CSS | `style.css` | ✅ Added |
| G | `.btn-secondary` lacked `font-family`, `font-size`, `transition` polish | `style.css` | ✅ Fixed |

---

## Architecture Reference

### Data Flow
```
User prompt → Chat tab → LLM (Ollama/Gemini/OpenAI/Anthropic) → ExtendScript code
→ Code preview → User clicks Run → evalScriptSafe() → runGeneratedExtendScript() in host.jsx
→ eval(code) [InDesign globals in scope] → doc.recompose() → result back to panel
```

### Script Storage
- **Local scripts:** `.jsx` / `.js` files on disk, scanned via `scanScriptFolderJson()` in `host.jsx`
- **Sets:** `.aide-set.json` files in script folders, read via `readAideSetsJson()` in `host.jsx`
- **Favorites:** `localStorage['aide_local_script_favorites']` — array of fs paths
- **Saved-from-chat:** `localStorage['aide_scripts']` — array of `{id, name, code, favorite}` objects

### Key Function Map
| UI action | JS function | ExtendScript call |
|-----------|-------------|-------------------|
| Switch to Local tab | `fetchLocalScriptTree(cb)` | `scanScriptFolderJson(foldersJson)` |
| Switch to Sets tab | `fetchAideSets(cb)` | `readAideSetsJson(foldersJson)` |
| Run a local script | `dispatchTreeOverflowAction('run')` | `runGeneratedExtendScript(code)` via `eval()` |
| Refresh | `runScriptsToolbarRefresh()` | triggers tree + sets scan |
| Add folder | delegated on `dom.localFoldersList` | `pickScriptsFolder()` |
| Save from chat | overlay → `saveScriptFile()` | writes `.jsx` to disk |
| Create set | `openSetOverlay()` → `saveAideSet()` | `writeAideSet(path, json)` |
| Delete set | `dispatchSetOverflowAction('delete')` | `deleteAideSet(path)` |

---

## Verification Plan (InDesign environment)

> All code changes are complete. The following steps require a live InDesign instance with the extension installed in debug mode.

### Quick Smoke Test (5 min)
1. Enable debug mode: run `enable_debug_mode.command`
2. Install extension: run `install_extension.command`
3. Open InDesign, open panel (Window → Extensions → Aide)
4. Verify no red console errors in `chrome://inspect` DevTools (port 8099)
5. Verify Scripts Panel folder is auto-detected in Settings → Script Folders

### Scripts Tab (10 min)
1. **Local tab:** Click Refresh → tree should populate with Scripts Panel contents
2. **Folder tree:** Expand folders → `<details>` open/close should animate
3. **Run script:** Click Run on any `.jsx` → should execute without scope error
4. **Favorite:** ⋯ → Favorite → script appears in Favs tab with star
5. **Hide:** ⋯ → Hide → script fades; Show Hidden toggle reveals it
6. **Favs tab:** Switch to Favs → only starred scripts shown

### Sets (5 min)
1. Click `+ Create New Set` → overlay appears centered with correct backdrop
2. Enter name, emoji, color → click Save (primary blue button)
3. Set card appears in Sets tab with correct left-border color
4. ⋯ on set → Rename, Change Color, Delete Set all work

### Chat + Execute (5 min)
1. Chat: type "create a rectangle on page 1" → Aide returns ExtendScript
2. Click Run → rectangle appears in InDesign
3. If error, Auto-fix button appears → click → corrected code generated

---

## Open Questions (Resolved)

**"Aide" saved-from-chat subtab:** There is no "Aide" subtab in the HTML. Saved-from-chat scripts live in localStorage but have no dedicated UI panel. They appear in the chat history only. If a user saves a script via the overlay, it saves to disk and shows in the Local tree. This is by design.

**Sets storage:** Sets are `.aide-set.json` files on disk in the first script folder. They do not appear as tree nodes in the Local tab — only in the Sets subtab. This is correct per the Overhaul Plan.


After a deep code audit of all files (`js/app.js` 2758 lines, `js/scripts.js` 505 lines, `js/models.js` 662 lines, `js/chat.js`, `jsx/host.jsx`, `css/style.css` 2223 lines, `index.html`), here is a precise diagnosis of every confirmed bug and the exact fixes needed.

---

## Confirmed Root-Cause Diagnoses

### 🔴 Bug 1: Missing `descKeyLocal` / `descKeyAide` / `loadAll` / `getById` / `remove` / `update` / `toggleFavorite` in `AideScripts`

`app.js` calls these methods (`AideScripts.descKeyLocal(path)`, `AideScripts.descKeyAide(id)`, `AideScripts.loadAll()`, `AideScripts.getById(id)`, `AideScripts.remove(id)`, `AideScripts.update(id, {})`, `AideScripts.toggleFavorite(id)`) — but **none of them exist** in `scripts.js`. The `return {}` at the bottom of `scripts.js` doesn't export them. This causes silent JS errors across the Scripts tab whenever these methods are invoked, breaking Sets, Favs, and "Aide" saved scripts entirely.

**Fix:** Add the complete CRUD API for the localStorage-persisted `aide_scripts` list, plus the two `descKey*` helper methods.

### 🔴 Bug 2: `setScriptsSubtab` saves 'aide' for 'favs'

`scripts.js` line 138: `localStorage.setItem(SCRIPTS_SUBTAB_KEY, (tab === 'local' || tab === 'sets') ? tab : 'aide')` — saves `'aide'` when the `favs` tab is selected. Then `getScriptsSubtab` at line 130 only returns `'sets'` or `'favs'` as valid values; `'aide'` becomes `'local'` on next load. Switching to Favs resets to Local on next session.

**Fix:** Change the ternary to properly allow `'favs'` as a saved value.

### 🔴 Bug 3: Sets tab shows Local scripts / crashes silently

`refreshScriptsList()` is called by `runScriptsToolbarRefresh()`. `refreshScriptsList` in `app.js` checks `scriptsSubTab` and routes to `renderLocalTreePanel()` or `renderSetsPanel()` or `renderFavsPanel()` — but **these functions do not exist** in `app.js`. The search for `renderLocalTreePanel` in `app.js` and `scripts.js` returns **no results**. The actual render calls go through `AideScripts.renderScriptTree(...)` (in `scripts.js`) and `fetchLocalScriptTree()` (in `app.js`). The routing function `refreshScriptsList` is **never defined**, making all tab switching render nothing (or keep stale content). The empty-state element and `localTreeData` are never inserted into the DOM.

**Fix:** Define the missing `refreshScriptsList()` function that routes between local tree, sets, and favs rendering.

### 🔴 Bug 4: `fetchLocalScriptTree` / `fetchAideSets` / `fetchLocalScriptList` — missing or stub

`app.js` calls `fetchLocalScriptTree(cb)`, `fetchAideSets(cb)`, `fetchLocalScriptList(cb)` in `runScriptsToolbarRefresh` and `setScriptsSubTab` — but searching `app.js` shows only `fetchLocalScriptList` is defined (as a flat-list scanner). `fetchLocalScriptTree` and `fetchAideSets` are called but never defined. This means clicking the ↻ Refresh button or switching tabs silently does nothing.

**Fix:** Implement `fetchLocalScriptTree(cb)` (calls `scanScriptFolderJson` via `evalScriptSafe`) and `fetchAideSets(cb)` (reads `*.aide-set.json` files).

### 🔴 Bug 5: `isAllowedLocalScriptPath` breaks external folders

`isAllowedLocalScriptPath` only checks against `AideScripts.getScriptFolders()`. But the auto-detected Scripts Panel path (`autoDetectedScriptsPanelPath`) is prepended to the display list in `renderLocalFoldersSettings()` but **never added** to the real stored folders array. So the auto-detected folder's scripts cannot be run (blocked by the path check).

**Fix:** Include `autoDetectedScriptsPanelPath` in the allowed roots check.

### 🔴 Bug 6: `syncShowHiddenBtn` function is called but never defined

`app.js` calls `syncShowHiddenBtn()` in the Settings init and in the show-hidden toggle listener, but this function is never defined in `app.js`. This throws a ReferenceError on startup and on toggle.

**Fix:** Define `syncShowHiddenBtn()`.

### 🟡 Bug 7: Compact/Detail view toggle icon wrong on boot

`syncViewToggleBtn` sets text correctly but `scriptsViewMode` may be `'expanded'` (default) while the button still shows the wrong icon if `setScriptsViewMode` hasn't been called. Works after one click. Cosmetic but visible.

**Fix:** Already calls `syncViewToggleBtn()` in `initSettings()` — just needs `syncViewToggleBtn` to be defined before `initSettings` runs (currently it is). No code change needed for this one; it will fix itself once Bug 4/3 above are resolved.

### 🟡 Bug 8: `%20` in path display

`renderLocalFoldersSettings()` in `app.js` uses `AideUtils.escapeHtml(p)` on raw filesystem paths returned from ExtendScript. The paths come back clean (not URL-encoded) from `host.jsx` — but the `renderTreeNodeHtml` in `scripts.js` does `encodeURIComponent(node.path)` for `data-enc-path` attributes and then correctly `decodeURIComponent()` when reading them back. **No `%20` should appear in visible text.** The actual source of visible `%20` is likely the folder label rendering in `renderLocalFoldersSettings` when `p` contains `%20` already (from a prior bad save). The fix is to always `decodeURIComponent` paths before storing them.

**Fix:** Decode folder paths on save (`addScriptFolder`/`setScriptFolders`) and display.

### 🟡 Bug 9: `host.jsx` — `new Function()` scope isolation

`runGeneratedExtendScript` uses `new Function(codeString)()` which loses global scope in ExtendScript. InDesign globals like `app`, `Document`, etc. are not accessible. Must use `eval(codeString)` instead.

**Fix:** Change `new Function(...)` to `try { eval(codeString); } catch(e) { return 'ExtendScript Error: ' + e.message; }`.

### 🟡 Bug 10: `saveAideSet` points to `folders[0]` but may be auto-detected path

When creating a Set, `saveAideSet` picks `folders[0]` from `AideScripts.getScriptFolders()`. If only the auto-detected folder exists (not in the real stored list), `folders[0]` is undefined, and the alert fires. User never gets to create a Set.

**Fix:** Fall back to `autoDetectedScriptsPanelPath` when no user-added folders exist.

---

## Proposed Changes

### 1. `js/scripts.js` — Add missing CRUD API + fix `setScriptsSubtab`

#### [MODIFY] [scripts.js](file:///Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign/js/scripts.js)

Add the complete `aide_scripts` CRUD methods that `app.js` requires:

- `loadAll()` — loads from `localStorage['aide_scripts']`
- `getById(id)` — finds a script by id
- `save(script)` — adds a new script object
- `remove(id)` — deletes by id
- `update(id, delta)` — merges updates
- `toggleFavorite(id)` — toggles `favorite` flag on stored script
- `descKeyLocal(path)` — returns `'local:' + path`
- `descKeyAide(id)` — returns `'aide:' + id`

Fix `setScriptsSubtab` to properly persist `'favs'`:
```diff
- localStorage.setItem(SCRIPTS_SUBTAB_KEY, (tab === 'local' || tab === 'sets') ? tab : 'aide');
+ localStorage.setItem(SCRIPTS_SUBTAB_KEY, (tab === 'local' || tab === 'sets' || tab === 'favs') ? tab : 'local');
```

Update the `return {}` to export all new methods.

---

### 2. `js/app.js` — Fix all missing functions and wiring

#### [MODIFY] [app.js](file:///Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign/js/app.js)

**A. Define `syncShowHiddenBtn()`** (~5 lines) — shows/hides the button and sets its active state.

**B. Define `refreshScriptsList()`** — the central routing dispatcher:
```js
function refreshScriptsList() {
    updateScriptsEmptyState();
    const q = (dom.scriptsSearch.value || '').toLowerCase().trim();
    if (scriptsSubTab === 'local') {
        AideScripts.renderScriptTree(
            dom.scriptsList, dom.scriptsEmpty,
            localTreeData, q, scriptsStarFilter, showHiddenScripts
        );
    } else if (scriptsSubTab === 'favs') {
        AideScripts.renderScriptTree(
            dom.scriptsList, dom.scriptsEmpty,
            localTreeData, q, true, showHiddenScripts  // favOnly=true
        );
    } else if (scriptsSubTab === 'sets') {
        renderSetsPanel();
    }
}
```

**C. Define `fetchLocalScriptTree(cb)`** — calls `scanScriptFolderJson(foldersJson)` in `host.jsx` and populates `localTreeData`.

**D. Define `fetchAideSets(cb)`** — calls `scanAideSets(foldersJson)` in `host.jsx` and populates `localSetsData`.

**E. Fix `isAllowedLocalScriptPath`** to also check `autoDetectedScriptsPanelPath`:
```diff
  function isAllowedLocalScriptPath(fsPath) {
      const norm = normalizeFsPath(fsPath);
      const roots = AideScripts.getScriptFolders();
+     if (autoDetectedScriptsPanelPath) roots.push(autoDetectedScriptsPanelPath);
      for (let i = 0; i < roots.length; i++) {
```

**F. Fix `saveAideSet`** to fall back to `autoDetectedScriptsPanelPath` when no user-added folders exist.

**G. Define `renderSetsPanel()`** — renders `localSetsData` into the scripts list with a "+ New Set" button and overflow buttons per set.

---

### 3. `jsx/host.jsx` — Fix `new Function()` → `eval()`, add `scanScriptFolderJson`, `scanAideSets`

#### [MODIFY] [host.jsx](file:///Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign/jsx/host.jsx)

**A. Fix `runGeneratedExtendScript`:**
```diff
- var fn = new Function(codeString);
- fn();
+ eval(codeString);
```

**B. Verify `scanScriptFolderJson`** exists — this is the key ExtendScript function that recursively scans a folder and returns a JSON tree. If it doesn't exist or is broken, `fetchLocalScriptTree` silently gets nothing.

**C. Add `scanAideSets(foldersJson)`** — reads all `*.aide-set.json` files across the given folders and returns a JSON array.

---

### 4. `css/style.css` — Minor polish

#### [MODIFY] [style.css](file:///Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign/css/style.css)

- Add `.scripts-show-hidden-btn.active` state styling
- Ensure `.script-row--fav` has gold color
- Add Sets card styles (`set-card`, `set-card-header`, `set-card-scripts`) if not present

---

## Verification Plan

### Automated / Runtime
1. Open panel in browser (no InDesign): verify no JS errors in console on load
2. Verify all three subtabs (`Local`, `Sets`, `Favs`) render without errors
3. Create a Set → verify overlay opens and saves correctly
4. Star a script → verify it appears in Favs tab
5. Toggle compact/expanded → verify icon changes and layout updates

### In InDesign
1. Open panel → verify Scripts Panel folder auto-detected
2. Click ↻ Refresh → verify tree populates
3. Click ▶ Run on a `.jsx` → verify it executes (no scope error)
4. Add an external folder → verify it appears in tree and scripts are runnable
5. Create a Set, add scripts → verify Set persists across panel reload

---

## Execution Order

| Step | Task | File(s) | Priority |
|------|------|---------|----------|
| 1 | Add CRUD methods + fix `setScriptsSubtab` | `scripts.js` | 🔴 Critical |
| 2 | Define `syncShowHiddenBtn`, `refreshScriptsList`, `fetchLocalScriptTree`, `fetchAideSets`, `renderSetsPanel` | `app.js` | 🔴 Critical |
| 3 | Fix `isAllowedLocalScriptPath`, `saveAideSet` fallback | `app.js` | 🔴 Critical |
| 4 | Fix `new Function()` → `eval()` in `host.jsx` | `host.jsx` | 🟡 High |
| 5 | Verify/add `scanScriptFolderJson` + `scanAideSets` in `host.jsx` | `host.jsx` | 🟡 High |
| 6 | Fix path decoding for `%20` display | `scripts.js` / `app.js` | 🟡 Medium |
| 7 | CSS polish for Sets cards, show-hidden active state | `style.css` | 🟢 Low |

## Open Questions

> [!IMPORTANT]
> **`scanScriptFolderJson` in `host.jsx`:** The plan assumes this function already exists (it was referenced in the Overhaul Plan). Before implementing `fetchLocalScriptTree`, I need to confirm its exact signature and return format. Shall I view `host.jsx` lines 1-655 again to verify?

> [!NOTE]
> **Sets storage approach:** Currently Sets are stored as `.aide-set.json` files on disk (inside the first script folder). This is fine. The `scanAideSets` function will read them. Should Sets also show up as "special" nodes inside the folder tree in the Local tab, or only in the Sets subtab?

> [!NOTE]
> **"Aide" saved-from-chat scripts subtab:** The HTML has only 3 subtabs: `Local`, `Sets`, `Favs`. There is no "Aide" subtab anymore. But `refreshScriptsList` in the old plan referenced an "Aide" tab. The scripts saved from Chat are stored in `localStorage['aide_scripts']`. Where should they appear? Currently the code in `app.js` references an `aide` subtab that doesn't exist in the HTML. Should saved-from-chat scripts be shown in a 4th tab, or merged into Local?
