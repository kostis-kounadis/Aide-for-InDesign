# Audit: Missing & Incomplete Tasks (25 Apr 2026)

This document outlines the tasks that were either not started or left incomplete by the previous model. It serves as a hand-off for the next model to ensure all user requirements are met.

## 🔴 Critical Functional Missing Items

### 1. Script List: Compact / Expanded View Fix
- **Status:** Incomplete.
- **Issue:** The toggle button only changes its icon/text but does not apply the corresponding CSS class to the container.
- **Required Fix:** In `js/app.js`, `syncViewToggleBtn()` must toggle the `.scripts-list--expanded` class on `dom.scriptsList`.

### 2. Script Execution: Double-Click
- **Status:** Not Started.
- **Issue:** User expects double-clicking a script row to execute it.
- **Required Fix:** Add a `dblclick` event listener to `dom.scriptsList` in `js/app.js` that extracts the path and calls the execution logic.

### 3. Path Display: `%20` Decoding
- **Status:** Incomplete.
- **Issue:** Spaces in file/folder names still appear as `%20` in the UI tree.
- **Required Fix:** In `js/scripts.js`, the `renderTreeNodeHtml` function must use `decodeURIComponent(node.name)` for the display labels.

## 🎨 UI/UX & Aesthetic Missing Items

### 4. Modern SVG Icons (Tree UI)
- **Status:** Not Started.
- **Issue:** The tree is still using emojis (`📄`, `📁`, `★`) instead of the premium SVG icons defined in `style.css`.
- **Required Fix:** Update `renderTreeNodeHtml` in `js/scripts.js` to emit the SVG structure (e.g., `<span class="icon-svg">...</span>`) for files, folders, and favorites.

### 5. Play Button Positioning
- **Status:** Not Started.
- **Issue:** The "Run" button is still on the far right of the row. User requested it on the **left side**.
- **Required Fix:** Move the `.tree-run-btn` HTML in `js/scripts.js` to be before the name/icon.

### 6. Tree Hierarchy Visuals (Side Lines)
- **Status:** Incomplete.
- **Issue:** The vertical connector lines and row shading are defined in CSS but not correctly supported by the HTML structure emitted by `scripts.js`.
- **Required Fix:** Ensure `renderTreeNodeHtml` correctly applies `data-root` to root folders and handles the `--tree-depth` variable consistently for both folders and files to align with the new CSS.

### 7. Folder State (Auto-Close)
- **Status:** Incomplete.
- **Issue:** Root folders are currently forced open (`open` attribute). User requested "auto close root folders".
- **Required Fix:** Update the `openAttr` logic in `js/scripts.js` to default to closed (or only open specific levels based on a tighter rule).

### 8. Overlay Transitions & Positioning
- **Status:** Incomplete.
- **Issue:** 
    - Overlays (like the Set creation modal) just fade in; user wants **bottom-to-top** animation.
    - The color picker in the Set overlay is reportedly hidden by the window bounds.
- **Required Fix:** 
    - Update `.overlay` and `.overlay-content` (or equivalent) in `style.css` to use a transform-based slide-in.
    - Adjust the Set overlay layout to ensure inputs are visible and not clipped by the panel edge.

### 9. Popup Menus to Overlays
- **Status:** Not Started.
- **Issue:** User wants "any popup menu" (likely the ⋯ overflow menus) to be "nice overlays" instead of basic absolute-positioned divs.
- **Required Fix:** Refactor `showTreeOverflowMenu` and `showSetOverflowMenu` to use a more robust overlay system or centered modal if appropriate.

## 🧠 LLM / Prompt Optimization

### 10. Prompt Extraction Verification
- **Status:** Completed (Code-wise), but needs verification.
- **Observation:** `chat.js` has been refactored to delegate to `system-prompt.js`. The token budget is reduced by ~1500 tokens. 
- **Next Step:** Ensure the `AideChatModules` object is globally available and correctly initialized in the production environment.

---
**Note to next model:** Do not assume the "✅ Fixed" status in previous plans is 100% accurate. The user's feedback indicates several regressions or "half-finished" implementations.
