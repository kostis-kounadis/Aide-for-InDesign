# Aide for InDesign — Complete Overhaul Plan

> **Status:** Approved for execution  
> **Last updated:** April 2026  
> **Scope:** Script Launcher overhaul, AI system prompt enrichment, bug fixes, settings export, Sets/Collections feature

---

## Design Decisions (All Finalized)

| Topic | Decision |
|:---|:---|
| **Aide subtab** | Scripts stay in memory until user clicks New Chat or Save Script. Aide subtab persists in Scripts panel as before. |
| **Tree structure** | Option A — single unified tree. Option B (tabbed per root) reserved for future if needed. |
| **Favorites** | Separate **Favorites subtab** inside the Scripts panel. Subject to manual UX testing. |
| **Hide trigger** | `⋯` **Overflow menu** per script row. |
| **Sets storage** | **Option C** — `.aide-set.json` files inside the Scripts Panel folder. Shared/portable. A future "hard create" (folder copy) mode is noted but not now. |
| **Run All** | **Removed entirely.** No Run All button. Sets are collections for organization, not batch execution. Sequential auto-run is an experimental distant-future feature. |
| **Settings export** | **Yes — export JSON** (excludes API keys; includes saved models, temperature, folders, etc.). May simplify format later. |

### Available Models

| Model | Mode | Best for |
|:---|:---|:---|
| **Gemini 3 Flash** | FAST | Quick code generation, simple fixes, boilerplate |
| **Gemini 3.1 Pro High** | PLANNING | Complex multi-file architecture, system prompt design, deep analysis |
| **Gemini 3.1 Pro Low** | PLANNING | Moderate complexity tasks, structured code generation with context |
| **Claude Sonnet 4.6 Thinking** | PLANNING | UI-heavy HTML/CSS work, nuanced bug fixes, careful refactoring |
| **Claude Opus 4.6 Thinking** | PLANNING | Highest-stakes tasks: system prompt rewrite, core architecture decisions |

| Topic | Decision |
|:---|:---|
| **API reference (webhelp)** | Contents exist at `_input_ignore/webhelp/` (1155 HTML files, InDesign 21 ExtendScript API). Parse and integrate into system prompt. |
| **Adobe scripting links** | Crawl and integrate relevant sub-links from `helpx.adobe.com/uk/indesign/using/scripting.html`. |
| **IdExtenso** | Study GitHub repo for patterns that may be useful as native ExtendScript equivalents. Do NOT add IdExtenso APIs to the system prompt. |
| **Toast messages** | No toast messages on script cards at all. Only meaningful UI feedback (e.g., a brief checkmark or inline status). |
| **SDK culprits** | Listed and included as minor/suggested fixes, not blockers. |

---

## Step 1 — API Reference Mining & System Prompt Enrichment

**Goal:** Build a dramatically richer, InDesign-specific ExtendScript system prompt using the local `webhelp/` API reference.

**Model:** `Gemini 3.1 Pro High` — **Planning**  
**Rationale:** Requires deep reading of 1155 HTML files, pattern extraction, and synthesis into a dense, authoritative system prompt. Highest-stakes content task in the entire project.

### 1.1 Parse `_input_ignore/webhelp/` HTML files

Write a Node.js script (`scripts/parse-webhelp.js`, git-ignored) that:
- Reads all `.html` files in the `webhelp/` directory
- Extracts: class name, description, all property rows (`property`, `type`, `access`, `description`), all method signatures
- Outputs a compact JSON: `_input_ignore/api-index.json`
- Target priority classes for depth extraction:
  - `Application`, `Document`, `Page`, `Spread`, `MasterSpread`
  - `TextFrame`, `Rectangle`, `Oval`, `Polygon`, `GraphicLine`, `Group`
  - `ParagraphStyle`, `CharacterStyle`, `ObjectStyle`, `TableStyle`, `CellStyle`
  - `Color`, `Swatch`, `Gradient`, `Tint`, `MixedInk`
  - `Layer`, `Story`, `Text`, `InsertionPoint`, `Paragraph`
  - `Table`, `Cell`, `Row`, `Column`
  - `PDF` (export), `EPubExportPreference`, `JPEGExportPreference`
  - `ScriptPreference`, `FindTextPreference`, `ChangeTextPreference`
  - `File`, `Folder`, `$` (ExtendScript globals)

### 1.2 Crawl Adobe Scripting Help Sub-Links

Fetch and extract content from:
- `https://helpx.adobe.com/uk/indesign/using/scripting.html` — main page
- Follow any sub-links related to: Scripts panel paths, script file locations, InDesign scripting guide
- `https://helpx.adobe.com/content/dam/help/en/indesign/using/scripting/adobe-introduction-to-scripting.pdf` - use pdf reader if needed

Extract path info, scripting conventions, and any documented gotchas for integration into the system prompt.

### 1.3 Study IdExtenso Patterns (Research Only)

Study the [IdExtenso GitHub repository](https://github.com/indiscripts/IdExtenso) only — not from any local project:
- Assess whether any patterns (e.g., safe unit handling, error-safe wrappers, string utilities) are broadly useful to InDesign scripters who do NOT have IdExtenso installed
- If useful patterns are identified, document them as native ExtendScript equivalents for inclusion in the system prompt
- **Do NOT add any IdExtenso-specific API references or import-style notes to the system prompt** — the system prompt must work for all users regardless of whether IdExtenso is installed

### 1.4 Rewrite `js/chat.js` — SYSTEM_PROMPT

Replace the current system prompt with a comprehensive, InDesign-specific version:

```
Sections:
1. Role definition (InDesign ExtendScript generator only — NOT Illustrator)
2. DOM hierarchy (Application → Document → Spread/MasterSpread → Page → Layer → PageItem)
3. Top 20 most-used properties per key class (from webhelp mining)
4. All major method signatures (create, export, find/change, etc.)
5. Color system (Process, Spot, RGB, CMYK, NothingEnum patterns)
6. Text & typography (ParagraphStyle, CharacterStyle, textFrames, stories)
7. Tables (Table, Row, Column, Cell creation & styling)
8. Find/Change (findText, changeText, findGrep, changeGrep)
9. Export patterns (PDF, JPEG, PNG, EPUB, IDML)
10. Coordinate system (Y increases downward; geometricBounds = [top, left, bottom, right])
11. ES3 rules (no let/const, no arrow functions, no .includes(), no .map(), no template literals)
12. Known gotchas (doc.recompose(), SaveOptions.NO, menuActions.itemByName(), fonts.item())
13. Error handling patterns (try/catch, userDidCancel detection)
14. Selection & iteration patterns
15. File/Folder I/O ($.getenv, File, Folder constructors)
```

**Files modified:** `js/chat.js`

---


## Step 3 — Critical Bug Fixes

**Goal:** Fix all known bugs before building new features on top of broken ground.

**Model:** `Claude Sonnet 4.6 Thinking` — **Planning**  
**Rationale:** Bug fixes require careful reasoning about scope isolation, error classification, and side effects across multiple files. Sonnet Thinking catches subtle regressions.

### Illustrator Project Comparison

Compared against `/Users/kkounadi/Desktop/antigravity-projects/_Experimental-Illustrator-Ollama-Integration_to-Cursor_test-to-Roo_pushed-2026-04-14`:

**Bug 3.1 — `new Function` scope (`host.jsx` L107):**  
✅ **Exists in Illustrator too.** The Illustrator `host.jsx` line 107 uses `var executeCode = new Function(codeString)` identically. However, Illustrator's global scope (`app`, `document`, `File`) is always implicit in ExtendScript, so scripts may appear to work despite the isolated scope. InDesign is more sensitive to this. **Fix applies to both projects.**

**Bug 3.4 — `%20` filename encoding:**  
✅ **Does NOT exist in Illustrator.** The Illustrator `host.jsx` uses `item.fsName` throughout (line 273, 277), which returns the native OS filesystem path without URL-encoding. The InDesign project may encode paths differently — verify in `host.jsx` whether `File.name` (which does URL-encode spaces) vs `File.fsName` (which does not) is being used. Fix: always use `.fsName` in ExtendScript and never expose `.name` to CEP for path display.

**Bug 3.6 — Pre-emptive guards:**  
✅ **Partially exists in Illustrator.** The Illustrator `evalScriptSafe` (line 222) calls `csInterface.evalScript()` directly WITHOUT a null-check on `csInterface` first. However, `executeCode()` (line 737) does check `if (!csInterface)` before calling `evalScriptSafe`. So the Illustrator pattern has inconsistent guarding — some call sites are protected, others are not. The InDesign port should enforce a consistent pattern: all `evalScript` calls must go through `evalScriptSafe`, and `evalScriptSafe` itself should guard against a null `csInterface`.

### 3.1 Fix `host.jsx` — Script Execution Scope (`new Function` → `eval`)

**File:** `jsx/host.jsx`  
**Problem:** `new Function(codeString)()` creates an isolated scope where InDesign globals (`app`, `doc`, `File`, etc.) may not be visible to the executed code.  
**Fix:** Replace with `eval(codeString)` inside a try/catch that properly distinguishes errors from user-cancellations.

```jsx
// Before
function runGeneratedExtendScript(code) {
  try {
    var fn = new Function(code);
    fn();
  } catch(e) { return 'ERROR: ' + e.message; }
}

// After
function runGeneratedExtendScript(code) {
  try {
    eval(code);
    return 'OK';
  } catch(e) {
    // Suppress user-cancel signals
    if (e.message && (
      e.message.indexOf('cancel') !== -1 ||
      e.message.indexOf('Cancel') !== -1 ||
      e.number === 65536
    )) {
      return 'OK'; // User cancelled a dialog — not a script error
    }
    return 'ERROR:' + e.message;
  }
}
```

### 3.2 Fix `js/models.js` — Description "for Illustrator" Hallucination

**File:** `js/models.js`, function `ollamaSummarizeScriptCode`  
**Problem:** System prompt says "Adobe Illustrator" — model hallucinates Illustrator-specific descriptions.  
**Fix:** Replace all Illustrator references with InDesign. Tighten prompt:

```js
// System prompt for description generation
"You are a helpful assistant that generates short, accurate descriptions of Adobe InDesign ExtendScript scripts. " +
"Respond with a single sentence (max 12 words) describing what the script does in InDesign. " +
"Do NOT mention Illustrator or InDesign or Adobe or any software name. Do NOT invent functionality not present in the code."
```

### 3.3 Fix Binary/Encoded Script Handling

**File:** `js/models.js`  
**Problem:** Binary or compiled `.jsxbin` files are sent to the LLM, causing garbage output or hallucinations.  
**Fix:** Before sending code to the LLM for summarization, detect binary content:

```js
function isBinaryOrEncoded(content) {
  // jsxbin header check
  if (content.substring(0, 6) === 'JSXBin') return true;
  // High density of non-printable chars
  var nonPrintable = content.replace(/[\x20-\x7E\r\n\t]/g, '').length;
  return nonPrintable / content.length > 0.1;
}
// If binary: set description to "Compiled script (binary — no preview available)"
```

### 3.4 Fix Spaces as `%20` in Script Names

**File:** `js/app.js` or wherever filenames are displayed  
**Problem:** Filenames with spaces appear URL-encoded (`My%20Script.jsx`).  
**Fix:** Apply `decodeURIComponent()` to all filenames received from `host.jsx` before displaying.

```js
function cleanFileName(name) {
  try { return decodeURIComponent(name); }
  catch(e) { return name; }
}
```

### 3.5 Remove Toast Messages from Script Cards

**File:** `js/app.js`, `css/style.css`  
**Problem:** Error and info toast messages surface inside script cards, creating visual noise.  
**Fix:** Remove all `.script-card` toast injection. Replace with:
- ✅ A brief CSS-animated checkmark overlay on success
- ❌ A red flash border on error (no text inside the card)
- All detailed error messages go to the **Chat panel** as a system message only

### 3.6 Pre-emptive Bug Fixes (Suggested)

The following are low-priority but clean-up worthy:

- **`app.js`:** Guard all `evalScript` calls with null-check on `csInterface` before use
- **`host.jsx`:** All `Folder.exists` and `File.exists` calls should have null-guards before property access
- **`js/utils.js`:** `stripCodeFence()` should handle triple-backtick with language tag on separate line
- **`js/chat.js`:** `buildHistory()` should cap context at last N messages to prevent token overflow
- **`js/models.js`:** Ollama model fetch should have a 5-second timeout with graceful fallback
- **`js/scripts.js`:** `localStorage.setItem` calls should be wrapped in try/catch (storage quota errors)

**Files modified:** `jsx/host.jsx`, `js/models.js`, `js/app.js`, `js/utils.js`, `js/chat.js`, `js/scripts.js`

---

## Step 4 — Scripts Panel Folder Auto-Detection

**Goal:** Auto-locate the InDesign Scripts Panel folder for the running InDesign version.

**Model:** `Gemini 3 Flash` — **FAST**  
**Rationale:** Path construction logic is deterministic and well-understood. No creative problem-solving needed.

### 4.1 `host.jsx` — `getDefaultScriptsPanelFolder()`

```jsx
function getDefaultScriptsPanelFolder() {
  // Construct path from InDesign version + HOME
  var majorVersion = parseInt(app.version.split('.')[0]);
  // InDesign CC versions: 2020=15, 2021=16, 2022=17, 2023=18, 2024=19, 2025=20
  var home = $.getenv('HOME'); // macOS
  if (!home || home === '') {
    home = $.getenv('USERPROFILE'); // Windows fallback
  }
  
  var paths = [];
  
  // macOS: ~/Library/Preferences/Adobe InDesign/Version X.0/en_US/Scripts/Scripts Panel
  paths.push(home + '/Library/Preferences/Adobe InDesign/Version ' + majorVersion + '.0/en_US/Scripts/Scripts Panel');
  paths.push(home + '/Library/Preferences/Adobe InDesign/Version ' + majorVersion + '.0/Scripts/Scripts Panel');
  
  // Windows: %APPDATA%\Adobe\InDesign\Version X.0\en_US\Scripts\Scripts Panel
  var appData = $.getenv('APPDATA');
  if (appData) {
    paths.push(appData + '\\Adobe\\InDesign\\Version ' + majorVersion + '.0\\en_US\\Scripts\\Scripts Panel');
  }
  
  for (var i = 0; i < paths.length; i++) {
    var f = new Folder(paths[i]);
    if (f.exists) return f.fsName;
  }
  return ''; // not found
}
```

### 4.2 Settings UI — Folder Display & Confirmation

In `index.html` Settings tab, add a "Script Folders" section:

```
┌─────────────────────────────────────────────────────┐
│ Script Folders                                        │
│                                                       │
│ ✅ Auto-detected                                      │
│    ~/Library/…/Scripts/Scripts Panel   [Open] [✕]   │
│                                                       │
│ + Add folder                                          │
└─────────────────────────────────────────────────────┘
```

- Auto-detected folder shown with green checkmark badge
- User can add additional root folders
- User can remove any folder (but not the auto-detected one without confirmation)
- "Open" button opens the folder in Finder/Explorer via `evalScript`

**Files modified:** `jsx/host.jsx`, `js/app.js`, `index.html`, `css/style.css`

---

## Step 5 — Hierarchical Script Tree UI

**Goal:** Replace flat script list with a live, collapsible file tree.

**Model:** `Claude Sonnet 4.6 Thinking` — **PLANNING**  
**Rationale:** Recursive tree rendering, event delegation, and the overflow menu system require careful component design to avoid state bugs.

### 5.1 `host.jsx` — `scanScriptFolder(rootPath)`

Returns a JSON tree:
```json
{
  "name": "Scripts Panel",
  "path": "/Users/.../Scripts Panel",
  "type": "folder",
  "children": [
    { "name": "My Script.jsx", "path": "...", "type": "file", "ext": "jsx" },
    {
      "name": "Utilities",
      "path": "...",
      "type": "folder",
      "children": [...]
    }
  ]
}
```

Rules:
- Recurse into subdirectories
- Filter visible files only: `.jsx`, `.js`, `.applescript`, `.scpt` (not `.jsxbin` display — load as binary)
- Skip hidden files (name starts with `.`)
- Skip `.aide-set.json` files from display (they are metadata)
- Max depth: 8 levels

### 5.2 Tree Renderer — `js/scripts.js`

Render using recursive `<details>/<summary>` elements:

```html
<details class="script-folder" open>
  <summary class="folder-row">
    <span class="folder-icon">📁</span>
    <span class="folder-name">Utilities</span>
    <span class="folder-count">12</span>
  </summary>
  <div class="folder-children">
    <!-- script rows or nested folders -->
  </div>
</details>

<div class="script-row" data-path="...">
  <span class="script-icon">📄</span>
  <span class="script-name">My Script</span>
  <span class="script-ext">.jsx</span>
  <button class="script-run-btn">▶</button>
  <button class="script-overflow-btn">⋯</button>
</div>
```

### 5.3 Overflow Menu (`⋯`) Per Script Row

Options:
- ▶ Run
- ★ Add to Favorites / ☆ Remove from Favorites
- 🙈 Hide / Show (toggles `.aide-hidden` metadata)
- 📋 Copy Path
- 🗂 Add to Set → (submenu of existing sets + "New Set…")
- 📝 Edit Description (opens inline text field)
- 🔍 Reveal in Finder

### 5.4 Visual Design Notes

- Folders: slightly indented, **bold** name, muted count badge (no italic)
- Script rows: clear typography, hover highlight
- Hidden scripts: shown with **50% opacity only** (no strikethrough) — visible only when "Show Hidden" toggle is on
- Favorites: gold star icon (★), shown in both tree and Favorites subtab
- Sets membership: small colored dot badge(s) on the script row
- Run button: primary accent color, subtle hover animation
- Smooth expand/collapse animation on `<details>` via CSS `max-height` transition

**Files modified:** `js/scripts.js`, `jsx/host.jsx`, `index.html`, `css/style.css`

---

## Step 6 — Sets / Collections (`.aide-set.json`)

**Goal:** Let users organize scripts into named workflow collections.

**Model:** `Gemini 3 Flash` — **FAST**  
**Rationale:** JSON schema definition and file CRUD are straightforward I/O operations.

### 6.1 `.aide-set.json` Format

Stored inside the Scripts Panel folder:
```json
{
  "name": "Print Preflight",
  "color": "#E8A838",
  "icon": "🖨",
  "scripts": [
    "/absolute/path/to/script1.jsx",
    "/absolute/path/to/script2.jsx"
  ],
  "created": "2026-04-15T00:00:00Z",
  "modified": "2026-04-15T00:00:00Z"
}
```

### 6.2 Sets Panel

A third subtab in the Scripts panel: **Sets**

```
┌─────────────────────────────────────┐
│  📦 Print Preflight         [⋯]    │
│     3 scripts                        │
│                                       │
│  📦 Text Cleanup            [⋯]    │
│     7 scripts                        │
│                                       │
│  + New Set                            │
└─────────────────────────────────────┘
```

- Each Set card shows name, color dot, icon, script count
- Clicking a Set expands it to show its scripts (inline list, not tree)
- `⋯` menu: Rename, Change color, Delete, Export as `.aide-set.json`
- Scripts in a Set: can be run individually; no "Run All"

### 6.3 `host.jsx` — Set CRUD functions

- `readAideSets(folderPath)` — scans for `.aide-set.json` files, returns array
- `writeAideSet(folderPath, setJson)` — writes/overwrites one `.aide-set.json`
- `deleteAideSet(filePath)` — removes a `.aide-set.json`

**Files modified:** `jsx/host.jsx`, `js/scripts.js`, `index.html`, `css/style.css`

---

## Step 7 — Favorites Subtab

**Goal:** Dedicated Favorites subtab inside the Scripts panel.

**Model:** `Gemini 3 Flash` — **FAST**  
**Rationale:** Simple localStorage-backed list with a flat UI component.

### 7.1 Storage

Favorites stored in `localStorage` as an array of absolute paths:
```js
localStorage.setItem('aide-favorites', JSON.stringify(['/path/to/script.jsx', ...]));
```

### 7.2 Favorites Subtab UI

- List view (not tree — favorites are typically a small flat list)
- Same script row component as the tree: name, run button, `⋯` overflow
- Empty state: "★ No favorites yet. Star any script from the overflow menu."
- Order: drag-to-reorder (if feasible), otherwise alphabetical

**Files modified:** `js/scripts.js`, `index.html`, `css/style.css`

---

## Step 8 — Settings Panel Overhaul

**Goal:** Complete settings panel including new folder management UI and JSON export.

**Model:** `Claude Sonnet 4.6 Thinking` — **PLANNING**  
**Rationale:** Settings panel restructuring touches multiple existing sections. Thinking mode prevents breaking existing provider/model UI.

### 8.1 New Settings Sections

```
Settings
├── Script Folders          ← NEW
│   ├── Auto-detected path (read-only with badge)
│   └── Additional folders (add/remove)
├── AI Provider             ← existing (keep)
├── Model & Parameters      ← existing (keep)
├── Appearance              ← existing (keep)
└── Import / Export         ← NEW
    ├── Export Settings (JSON) — excludes API keys
    └── Import Settings (JSON)
```

### 8.2 Export JSON Format

```json
{
  "version": "1.0",
  "exportedAt": "2026-04-15T...",
  "provider": "ollama",
  "model": "qwen2.5-coder:14b",
  "temperature": 0.3,
  "additionalFolders": ["/path/to/extra/scripts"],
  "showHidden": false,
  "theme": "auto"
}
```

API keys are explicitly excluded. A comment note in the UI: "API keys are never exported."

### 8.3 Script Folder UI Detail

- Auto-detected folder: shows full path, green ✅ badge, "Open in Finder" button
- If not found: amber ⚠️ badge + "Browse…" button to manually locate
- Additional folders: `+` button, each folder shown with path + `[Open] [✕]` controls
- Folder changes trigger a script tree refresh

**Files modified:** `js/app.js`, `index.html`, `css/style.css`

---

## Step 9 — Final Polish & Visual Design

**Goal:** Premium, cohesive visual design consistent across all new UI components.

**Model:** `Claude Sonnet 4.6 Thinking` — **PLANNING**  
**Rationale:** Coherent design system requires cross-component reasoning. Thinking mode ensures tokens, animations, and responsive rules don't conflict.

### 9.1 Design System Tokens (in `css/style.css`)

```css
:root {
  --aide-accent:        hsl(217, 91%, 60%);
  --aide-accent-hover:  hsl(217, 91%, 50%);
  --aide-gold:          hsl(40, 85%, 58%);   /* favorites */
  --aide-success:       hsl(142, 70%, 45%);
  --aide-danger:        hsl(0, 72%, 55%);
  --aide-muted:         hsl(220, 9%, 55%);
  --aide-radius:        6px;
  --aide-radius-lg:     10px;
  --aide-transition:    0.18s ease;
}
```

### 9.2 Micro-animations

- Script row hover: `translateX(2px)` + accent left border flash
- ▶ Run button: scale pulse on click
- `<details>` expand/collapse: CSS `max-height` transition (0.2s)
- Tab switch: horizontal slide (0.15s)
- Overflow menu: fade + scale from origin point
- Set card expand: smooth height reveal

### 9.3 Responsive Behavior

- Panel width: 220px–500px (CEP panels resize)
- Script names: `text-overflow: ellipsis` with full path in tooltip
- Folder counts: hide if panel is narrow (`< 280px`)

### 9.4 Adaptive Theme

The existing `CSInterface.getHostEnvironment().appSkinInfo` brightness detection is kept. All new components follow the same `data-theme="dark"|"light"` attribute system.

**Files modified:** `css/style.css`, `index.html`

---

## Step 10 — QA, Browser Testing & Verification

**Goal:** Verify all features work in InDesign and confirm no regressions.

**Model:** `Gemini 3 Flash` — **FAST**  
**Rationale:** UI verification is mechanical click-and-check work, not reasoning-intensive.

### 10.1 InDesign Test Checklist

- [ ] Script tree renders correctly with mock folder structure
- [ ] Folders expand/collapse smoothly
- [ ] Script run button triggers mock execution
- [ ] Overflow menu appears and all options are clickable
- [ ] Favorites add/remove works; Favorites subtab updates
- [ ] Sets tab shows mock sets; expand/collapse works
- [ ] Settings panel shows auto-detected folder (mocked)
- [ ] Add/remove additional folders works
- [ ] Export settings button downloads a JSON file
- [ ] Theme toggle (dark/light) updates all components
- [ ] Chat tab still works (mock AI response)
- [ ] Hidden scripts hidden by default; "Show Hidden" toggle reveals them
- [ ] Aide subtab in Scripts shows in-memory unsaved scripts from chat

### 10.2 CEP Smoke Test (in InDesign)

After browser tests pass:
- Install extension via `install_extension.command`
- Open Scripts tab → verify tree renders actual files
- Run one script → verify no scope errors
- Save a generated script → verify it appears in tree
- Add to Set → verify `.aide-set.json` created on disk

---

## Execution Order & Model Assignments

| # | Step | Task | Model | Mode |
|:--|:-----|:-----|:------|:-----|
| 1 | Step 1 | Parse webhelp HTML → `api-index.json` | `Gemini 3.1 Pro High` | PLANNING |
| 2 | Step 1 | Crawl Adobe scripting sub-links | `Gemini 3 Flash` | FAST |
| 3 | Step 1 | Rewrite `chat.js` SYSTEM_PROMPT | `Claude Opus 4.6 Thinking` | PLANNING |
| 4 | Step 2 | (Removed UI Test Harness) | `Gemini 3 Flash` | FAST |
| 5 | Step 2 | Update `.gitignore` | `Gemini 3 Flash` | FAST |
| 6 | Step 3 | Fix `host.jsx` eval scope + cancel detection | `Claude Sonnet 4.6 Thinking` | PLANNING |
| 7 | Step 3 | Fix description hallucination in `models.js` | `Claude Sonnet 4.6 Thinking` | PLANNING |
| 8 | Step 3 | Fix binary detection, %20 filenames, card toasts | `Claude Sonnet 4.6 Thinking` | PLANNING |
| 9 | Step 3 | Apply pre-emptive bug fixes (all files) | `Gemini 3.1 Pro Low` | PLANNING |
| 10 | Step 4 | `host.jsx` folder auto-detection | `Gemini 3 Flash` | FAST |
| 11 | Step 4 | Settings UI folder section | `Claude Sonnet 4.6 Thinking` | PLANNING |
| 12 | Step 5 | `host.jsx` `scanScriptFolder()` | `Gemini 3 Flash` | FAST |
| 13 | Step 5 | Tree renderer + script row component | `Claude Sonnet 4.6 Thinking` | PLANNING |
| 14 | Step 5 | Overflow menu per row | `Claude Sonnet 4.6 Thinking` | PLANNING |
| 15 | Step 6 | `.aide-set.json` CRUD in `host.jsx` | `Gemini 3 Flash` | FAST |
| 16 | Step 6 | Sets subtab UI | `Claude Sonnet 4.6 Thinking` | PLANNING |
| 17 | Step 7 | Favorites subtab UI | `Gemini 3 Flash` | FAST |
| 18 | Step 8 | Settings panel overhaul + export | `Claude Sonnet 4.6 Thinking` | PLANNING |
| 19 | Step 9 | Design system tokens + micro-animations | `Claude Sonnet 4.6 Thinking` | PLANNING |
| 20 | Step 10 | QA pass in InDesign | `Gemini 3 Flash` | FAST |

---

## Notes for Future Phases

- **Symlinks on Windows:** Windows has no real symlinks (only shortcuts, which InDesign ignores). Any cross-folder reference feature must use `.aide-set.json` paths only — not filesystem links.
- **"Hard Create" Sets mode:** A future feature where Aide physically copies scripts into a dedicated folder. Not in scope now.
- **Run All / Batch execution:** Explicitly deferred. Many scripts have GUIs or require multiple runs. Experimental future feature only.
- **Tree view vs. tabbed roots (Option B):** May add a user preference toggle for Option B if users request it after Option A ships.
