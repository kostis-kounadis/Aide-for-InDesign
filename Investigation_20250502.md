# Investigation — 2025-05-02

This document covers:

- Scripts UI issues (what was changed to address them)
- Investigations requested **without further coding/fixing**
  - Script Descriptions generator not working
  - Splitting `chat.js` prompt “mini SDK” + token efficiency
  - Assigning shortcuts to Scripts like native functionality

---

## Scripts UI — issues reported & current implementation notes

### Missing “side lines” on root folders in Scripts (Local)

- **Cause**: CSS only drew the vertical connector line for *nested* folders.
- **Now**: Connector styling is applied to all `.script-folder > .folder-children`, so root folders also show the line.

### Overly wide indentation for folder depth

- **Cause**: indentation used a fixed 14px-per-level multiplier in multiple places.
- **Now**: indentation uses a single token `--tree-indent` (set to 10px) so depth spacing is tighter and consistent.

### Eye icon sizing mismatch + no visible state switch

- **Cause**: the “show hidden” control had a single SVG and relied only on color changes.
- **Now**: the button contains **two SVGs** (eye-on / eye-off) and CSS swaps them based on `.active`. SVG size is normalized to match other toolbar icons.

### Root folders auto-collapse after actions (Run / Hide / Favorite / Add to Set)

- **Cause**: the tree rerenders after actions, and folder open state was not persisted; `<details>` defaults closed.
- **Now**: open/closed state is persisted in localStorage and restored on rerender. A delegated `toggle` handler records state for `.script-folder`.

### “Run” icon only visible on hover (Local tree) + Favs tab needs run icon too

- **Cause**: `.tree-run-btn` was `opacity: 0` by default; Favs had separate markup.
- **Now**: `.tree-run-btn` is visible by default (higher opacity) and still highlights on hover. Favs list uses the same SVG run icon style.

### Search bar needs an “X” clear button inside the field

- **Now**: the Scripts search input is wrapped in a positioned container with a right-side clear button that enables/disables based on whether text is present.

### Compact/Full view doesn’t work

- **Expected behavior**: toolbar toggle flips a persisted view mode and toggles `.scripts-list--expanded` on `#scripts-list`.
- **Implementation**: `syncViewToggleBtn()` applies the class and `setScriptsViewMode()` persists the mode then rerenders. If it still “doesn’t work” in practice, the next thing to verify is whether some other CSS is overriding the `--row-h/--row-pad-v` variables, or whether the rerendered content isn’t using the variables (e.g., non-tree list types).

### “Root folders should be in containers as with Sets”

- **Now**: root tree folders (`data-root="true"`) are styled with a card-like border/background and spacing.

---

## Investigation 1 (NO FIX): Why Script Descriptions generator “does not work”

### Where it’s implemented

- UI toggles and buttons live in `index.html` (Settings → “Script descriptions”).
- Logic is in `js/app.js`:
  - `collectMissingDescriptionJobs()`
  - `processDescriptionJobs(jobs)`
  - `runEnrichMissingDescriptions()`
  - wired by `#generate-descriptions-now` click handler.
- Summarization call is in `js/models.js`: `AideModels.ollamaSummarizeScriptCode(code)`

### What must be true for it to work

1. **InDesign connection is available** (`csInterface` exists).
  - Otherwise reading local files returns `Error: No InDesign connection.` and jobs are skipped.
2. **Script path is “allowed”** by `isAllowedLocalScriptPath(path)` in `js/app.js`.
  - If scripts are outside the configured roots (or auto-detected Scripts Panel path), reading returns `Error: Path not allowed.` and jobs are skipped.
3. **Ollama is reachable** at the configured host (default `http://localhost:11434`).
  - `ollamaSummarizeScriptCode()` first calls `${host}/api/tags` (with a 5s timeout). If this fails, it returns `''`.
4. **At least one model is installed** in Ollama.
  - If `/api/tags` returns an empty list, summaries return `''`.

### Most likely failure reasons (based on code paths)

- **Ollama not running / wrong host**: summary returns `''` silently, so it appears like “nothing happens”.
- **No models installed that match**: it tries a priority list, then falls back to first available model; still requires `/api/tags` to return models.
- **No InDesign connection (browser mode)**: file read fails, so no summaries can be generated.
- **Script roots mismatch**: if scripts are in a folder that isn’t in the “Script Folders” list (and the auto-detected scripts panel folder wasn’t found), reads fail as “not allowed”.

### UX/diagnostic gap (why it feels broken)

- The UI doesn’t surface “why” summaries are empty (unreachable Ollama vs file read blocked), because empty-string output is treated as “skip”.

---

## Investigation 2 (NO FIX): Can `chat.js` have the prompt part as a separate file? Can it be more token-efficient?

### Separation feasibility

- **Already done**: prompt content and modules are split into `js/system-prompt.js` (`AideChatModules`).
- `js/chat.js` consumes:
  - `AideChatModules.SYSTEM_PROMPT`
  - `AideChatModules.MODULE_`*

### Token-efficiency notes (what the current design already does)

- The older “auto-extracted DOM blob” was removed; `system-prompt.js` explicitly documents the token budget.
- Modules are **opt-out** via Settings (so users can reduce tokens if desired).
- Long conversations are trimmed (system + recent messages) when estimated tokens exceed a large threshold.

### Token-efficiency opportunities (conceptual, no changes made)

- **Make module injection conditional again** (instead of always-on) for smaller models; current behavior is “always-on unless opted-out”.
- **Replace large reference examples with 1–2 minimal patterns** and link to “rules” rather than repeating long samples.
- **Use stricter output constraints**: e.g., enforce “code only” + ban explanations (already mostly in place).
- **Move rarely-used guidance to an on-demand “help module”** (e.g., tables, GREP, XML import) so it’s injected only when detected in user intent.

---

## Investigation 3 (NO FIX): Can shortcuts be assigned to Scripts like native Scripts panel?

### What “native” InDesign offers

- InDesign’s Keyboard Shortcuts system assigns shortcuts to **menu commands** (and some panel actions), not arbitrary CEP UI buttons.
- Scripts inside the **Scripts Panel** can be invoked via menu/panel interactions, but direct per-script keyboard assignment is not a first-class feature in the same way menu actions are.

### Practical implications for this CEP Scripts launcher

- A CEP panel **cannot directly register global InDesign shortcuts** for arbitrary scripts the way native menu commands do.
- A potential workaround pattern (conceptual) is:
  - Create a menu action / script runner command in ExtendScript
  - Then the user assigns a shortcut to that command via InDesign’s Keyboard Shortcuts UI
  - That command would need to route to a specific script (or show a chooser)
- Whether this is feasible depends on how reliably we can:
  - create persistent menu entries
  - map menu actions → filesystem script paths
  - ensure it survives restarts and doesn’t pollute the UI

### Conclusion

- **Direct “assign shortcut to any script from the CEP list”** is not straightforward and likely not supported as a pure CEP feature.
- **Menu-command-based workaround** is the most plausible direction, but it’s a larger feature with UX/design considerations.

---

## Quick file pointers (for future debugging)

- Scripts tree rendering: `js/scripts.js` → `renderTreeNodeHtml()` / `renderScriptTree()`
- Scripts launcher wiring: `js/app.js` → `refreshScriptsList()`, click delegation, `loadLocalFileContent()`
- Descriptions summarizer: `js/models.js` → `ollamaSummarizeScriptCode()`
- Prompt content: `js/system-prompt.js`
- Chat engine: `js/chat.js`