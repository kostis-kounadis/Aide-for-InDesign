# SYSTEM DIRECTIVE: Aide — InDesign AI Assistant (CEP Panel)

## Context & Role
You are an expert full-stack developer specializing in Adobe Creative Cloud extensibility (CEP/UXP frameworks), Adobe ExtendScript (.jsx), and local LLM integrations via Ollama.

**Aide** is a CEP panel inside Adobe InDesign that acts as the user's AI right-hand assistant. It generates and executes ExtendScript code from natural language prompts using local (Ollama) or remote (Google Gemini, OpenAI, Anthropic, Custom) LLMs.

**Important:** The LLM is strictly acting as an on-the-fly ExtendScript generator — not an image generator.

---

## Architecture (v1.0)

### Data Flow
1. **User Interface:** Tab-based panel (Chat / Scripts / Settings) inside InDesign
2. **Chat Engine:** Maintains conversation history via `/api/chat` endpoint (Ollama) or equivalent
3. **Network:** HTTP POST to Ollama (`localhost:11434`), Google Gemini, OpenAI, Anthropic, or any Custom OpenAI-compatible endpoint
4. **Execution:** Generated ExtendScript is previewed → user clicks Execute → `evalScript()` runs it

### File Structure
```
CSXS/manifest.xml          — CEP registration (com.aide.indesign)
index.html                  — Tab-based SPA shell
css/style.css               — Adaptive theme (follows InDesign's brightness)
js/app.js                   — App init, theme detection, tab routing, event wiring
js/chat.js                  — Conversation engine with comprehensive InDesign ExtendScript system prompt
js/models.js                — Provider management (Ollama/Google/OpenAI/Anthropic/Custom)
js/scripts.js               — Script save/load/search/favorites (localStorage)
js/utils.js                 — Code fence stripping, validation, helpers
js/CSInterface.js           — Adobe CEP library (DO NOT MODIFY)
jsx/host.jsx                — ExtendScript executor with recompose after execution
```

### System Prompt (The "Always-On Skill")
The system prompt in `js/chat.js` is a condensed InDesign ExtendScript DOM reference that teaches ANY model the correct InDesign API. It includes:
- Complete DOM hierarchy (Application → Document → Page/Spread/Layer/TextFrame/Rectangle)
- Color creation patterns (RGB, CMYK, Process, Spot)
- Shape creation methods (rectangles, ovals, polygons, graphic lines)
- Text frame and typography (paragraph styles, character styles, fonts)
- Master pages and spreads
- Tables
- Find/Change text
- Image placement and fitting
- Export patterns (PDF, JPEG, EPUB, IDML, Package)
- Selection & iteration patterns
- Known ES3 gotchas (no let/const, no arrow functions, no .includes(), no .map())
- Coordinate system notes (Y increases downward, bounds = [top, left, bottom, right])

### Theme System
The panel adapts to InDesign's current UI brightness using `CSInterface.getHostEnvironment().appSkinInfo`.

---

## Provider Support
| Provider | Auth | Models | Notes |
|:---|:---|:---|:---|
| Ollama (Local) | None | Auto-discovered via `/api/tags` | Default. 100% private. |
| Google Gemini | API Key | gemini-2.0-flash, gemini-1.5-pro, etc. | Free tier available |
| OpenAI | API Key | gpt-4o-mini, gpt-4o, etc. | |
| Anthropic | API Key | claude-sonnet, claude-haiku, etc. | |
| Custom | Optional API Key | User-specified | Any OpenAI-compatible endpoint |

## Safety Constraints
1. **Code Preview:** Generated code is ALWAYS shown before execution
2. **Manual Execute:** User must click Execute — no auto-execution
3. **Error Feedback:** Failed scripts offer an "Auto-fix" button that sends the error + failing code back to the LLM
4. **Recompose:** `host.jsx` calls `doc.recompose()` after execution to refresh layout

## Model Recommendations
For best ExtendScript compatibility with Ollama:
- `qwen2.5-coder:14b` (best balance, 16GB+ RAM)
- `qwen2.5-coder:7b` (good for 8GB RAM)
- `deepseek-coder-v2:16b` (strong, 16GB+)
- `codestral:22b` (very capable, 32GB+)

---

## Development Notes

### InDesign-Specific Gotchas
- **No `app.redraw()`** — InDesign uses `doc.recompose()` instead
- **No `suspendIdleTask`** — removed from `host.jsx`; InDesign doesn't support it
- **Coordinate system:** `geometricBounds` is `[top, left, bottom, right]` (Y increases downward)
- **Menu actions:** Use `app.menuActions.itemByName("Action Name").invoke()` — NOT `app.executeMenuCommand()`
- **Font access:** `app.fonts.item("FontName")` — NOT `app.textFonts.getByName()`
- **Document close:** `doc.close(SaveOptions.NO)` — NOT `SaveOptions.DONOTSAVECHANGES`

### CEP Extension Registration
- **Bundle ID:** `com.aide.indesign`
- **Host:** `IDSN` (InDesign)
- **Min version:** `15.0` (InDesign CC 2020)
- **Debug port:** `8099`

### Running in Browser (Dev Mode)
The panel can be previewed in a browser without InDesign. The `CSInterface` constructor call is wrapped in a try/catch so the UI loads gracefully even without the CEP runtime. Theme will default to dark mode.

### Installation
Use `install_extension.command` on macOS. It copies the extension to:
- **System-wide:** `/Library/Application Support/Adobe/CEP/extensions/com.aide.indesign/`
- **User-only (fallback):** `~/Library/Application Support/Adobe/CEP/extensions/com.aide.indesign/`

Debug mode (unsigned extensions) must be enabled first via `enable_debug_mode.command`.
