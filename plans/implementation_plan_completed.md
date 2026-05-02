# Aide for InDesign — Port Implementation Plan

> **Source:** Aide for Illustrator v2.1.0  
> **Target:** `/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign`  
> **Reference plan:** [aide-indesign-port.md](file:///Users/kkounadi/Desktop/antigravity-projects/_Experimental-Illustrator-Ollama-Integration_to-Cursor_test-to-Roo_to-push/plans/aide-indesign-port.md)

---

## Step 1 — Project Scaffolding ✅ COMPLETED

**Model:** Claude Opus 4.6 Thinking · **Mode:** Planning  
**Status:** Done by current session.

**What was done:**
- Created `/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign`
- Copied all core files from the Illustrator project:
  - `CSXS/manifest.xml`, `css/style.css`, `index.html`
  - `js/` (app.js, chat.js, models.js, scripts.js, utils.js, CSInterface.js)
  - `jsx/host.jsx`
  - `.gitignore`, `LICENSE`
  - `enable_debug_mode.command`, `install_extension.command`, `uninstall_extension.command`, `build_zxp.command`
- Excluded: `.git/`, `build/`, `*.zxp`, `plans/`, `screenshots/`, `README.md`, `GEMINI.md`

> [!NOTE]
> All files are still Illustrator-flavoured. Steps 2–7 transform them into InDesign versions.

---

## Step 2 — Manifest & Extension ID ✅ COMPLETED

**Model:** Gemini 3 Flash · **Mode:** Fast  
**Estimated quota:** Very low (single XML file, <100 tokens of changes)

### Prompt — copy/paste this into a new conversation

```
I am porting the "Aide" CEP extension from Adobe Illustrator to Adobe InDesign.

The project lives at:
/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign

Edit the file `CSXS/manifest.xml` with these changes:

1. Change `ExtensionBundleId` from `com.aide.ai` to `com.aide.indesign`
2. Change `ExtensionBundleName` from `Aide` to `Aide for InDesign`
3. Change `ExtensionBundleVersion` to `1.0.0`
4. Change the Extension Id from `com.aide.ai.panel` to `com.aide.indesign.panel` (both occurrences)
5. Change the Extension Version to `1.0.0`
6. In `<HostList>`, replace:
      <Host Name="ILST" Version="24.0" />
   with:
      <Host Name="IDSN" Version="15.0" />
7. Keep everything else (CSXS version, CEFCommandLine params, UI geometry, etc.) exactly the same.

The current file contents are:

<?xml version="1.0" encoding="UTF-8"?>
<ExtensionManifest ExtensionBundleId="com.aide.ai" ExtensionBundleVersion="2.1.0"
                   ExtensionBundleName="Aide" Version="8.0"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <ExtensionList>
        <Extension Id="com.aide.ai.panel" Version="2.1.0" />
    </ExtensionList>
    <ExecutionEnvironment>
        <HostList>
            <Host Name="ILST" Version="24.0" />
        </HostList>
        <LocaleList>
            <Locale Code="All" />
        </LocaleList>
        <RequiredRuntimeList>
            <RequiredRuntime Name="CSXS" Version="9.0" />
        </RequiredRuntimeList>
    </ExecutionEnvironment>
    <DispatchInfoList>
        <Extension Id="com.aide.ai.panel">
            <DispatchInfo>
                <Resources>
                    <MainPath>./index.html</MainPath>
                    <ScriptPath>./jsx/host.jsx</ScriptPath>
                    <CEFCommandLine>
                        <Parameter>--allow-file-access</Parameter>
                        <Parameter>--allow-file-access-from-files</Parameter>
                        <Parameter>--enable-nodejs</Parameter>
                        <Parameter>--mixed-context</Parameter>
                        <Parameter>--disable-site-isolation-trials</Parameter>
                        <Parameter>--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure</Parameter>
                        <Parameter>--allow-running-insecure-content</Parameter>
                        <Parameter>--disable-web-security</Parameter>
                    </CEFCommandLine>
                </Resources>
                <Lifecycle>
                    <AutoVisible>true</AutoVisible>
                </Lifecycle>
                <UI>
                    <Type>Panel</Type>
                    <Menu>Aide</Menu>
                    <Geometry>
                        <Size>
                            <Height>600</Height>
                            <Width>400</Width>
                        </Size>
                        <MaxSize>
                            <Height>2000</Height>
                            <Width>2000</Width>
                        </MaxSize>
                        <MinSize>
                            <Height>400</Height>
                            <Width>300</Width>
                        </MinSize>
                    </Geometry>
                </UI>
            </DispatchInfo>
        </Extension>
    </DispatchInfoList>
</ExtensionManifest>

Apply the edits to the file. Do not change anything else.
```

---

## Step 3 — System Prompt Rewrite (`js/chat.js`) ✅ COMPLETED

**Model:** Gemini 3.1 Pro High · **Mode:** Planning  
**Estimated quota:** Medium-High (this is the biggest creative/technical step — 600+ line file, full DOM reference rewrite)

> [!IMPORTANT]
> This is the most critical step. The system prompt is what makes or breaks the extension's ability to generate correct InDesign ExtendScript. Use a high-capability model.

### Prompt — copy/paste this into a new conversation

````
I am porting the "Aide" CEP extension from Adobe Illustrator to Adobe InDesign.

The project lives at:
/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign

I need you to rewrite `js/chat.js` to replace ALL Illustrator-specific content with InDesign equivalents. The file structure, module system, context management, and all non-prompt logic must remain IDENTICAL. Only the content of the prompts changes.

## What to change

### 1. `SYSTEM_PROMPT` constant (line 16–234)
Replace the entire Illustrator ExtendScript DOM reference with an InDesign DOM reference. Use this pre-written InDesign system prompt as the basis (expand and improve it as needed):

```javascript
const SYSTEM_PROMPT = `You are Aide, an expert-level Adobe InDesign ExtendScript code generator.
Your SOLE purpose is to convert user requests into valid, ready-to-execute ExtendScript code for Adobe InDesign.

═══ CRITICAL RULES ═══
1. Return ONLY raw executable JavaScript code. No markdown, no code fences, no explanations, no comments unless asked.
2. Use ONLY ECMAScript 3 syntax: var (never let/const), no arrow functions, no template literals, no destructuring, no default params, no for...of.
3. When asked to revise or fix code, return the COMPLETE corrected script, not a diff or partial snippet.
4. ALWAYS wrap collection access with length checks to prevent runtime errors.
5. Use try/catch around document-level operations.
6. NEVER use File.remove() or Folder.remove(). Do not perform destructive filesystem operations.

═══ INDESIGN EXTENDSCRIPT DOM REFERENCE ═══

--- APPLICATION ---
app.activeDocument              // Document — current document
app.documents                   // Documents collection
app.documents.add()             // Create new document
app.documents.add({documentPreset: dp})  // With preset
app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT  // Suppress dialogs

--- DOCUMENT (doc = app.activeDocument) ---
doc.pages                       // Pages collection
doc.pages.add()                 // Add page at end
doc.pages.add(LocationOptions.AFTER, doc.pages[0])
doc.spreads                     // Spreads collection
doc.layers                      // Layers collection
doc.layers.add({name: "Layer Name"})
doc.textFrames                  // All text frames
doc.rectangles                  // All rectangles
doc.ovals                       // All ovals/ellipses
doc.polygons                    // All polygons
doc.graphicLines                // All lines
doc.groups                      // All groups
doc.allPageItems                // All page items (flat array)
doc.selection                   // Array of selected items
doc.masterSpreads               // Master spreads
doc.paragraphStyles             // Paragraph style collection
doc.characterStyles             // Character style collection
doc.objectStyles                // Object style collection
doc.colors                      // Color swatches
doc.save()                      // Save document
doc.save(File("/path/to/file.indd"))
doc.close(SaveOptions.NO)       // Close without saving

--- PAGES & SPREADS ---
page = doc.pages[0]
page.name                       // String (e.g., "1")
page.bounds                     // [y1, x1, y2, x2] — [top, left, bottom, right]
page.marginPreferences.top      // Margin values
page.marginPreferences.bottom
page.marginPreferences.left
page.marginPreferences.right
page.appliedMaster              // Applied master spread
page.remove()                   // Delete page

spread = doc.spreads[0]
spread.pages                    // Pages in spread

--- TEXT FRAMES ---
tf = page.textFrames.add()
tf.geometricBounds = [y1, x1, y2, x2]  // [top, left, bottom, right]
tf.contents = "Text content"
tf.parentStory                  // Story object
tf.paragraphs                   // Paragraphs collection
tf.words                        // Words collection
tf.characters                   // Characters collection
tf.lines                        // Lines collection
tf.insertionPoints              // InsertionPoints collection

--- TEXT FORMATTING ---
tf.paragraphs[0].pointSize = 12
tf.paragraphs[0].appliedFont = app.fonts.item("Arial")
tf.paragraphs[0].justification = Justification.LEFT_ALIGN
tf.paragraphs[0].spaceBefore = 6
tf.paragraphs[0].spaceAfter = 6
tf.paragraphs[0].leading = 14
tf.characters[0].pointSize = 14
tf.characters[0].fontStyle = "Bold"
tf.characters[0].fillColor = doc.colors.item("Black")

--- SHAPES ---
rect = page.rectangles.add()
rect.geometricBounds = [y1, x1, y2, x2]
rect.fillColor = doc.colors.item("Paper")
rect.strokeColor = doc.colors.item("Black")
rect.strokeWeight = 1

oval = page.ovals.add()
oval.geometricBounds = [y1, x1, y2, x2]

poly = page.polygons.add()
poly.properties = {geometricBounds: [y1, x1, y2, x2], numberOfSides: 6}

line = page.graphicLines.add()
line.paths[0].entirePath = [[x1, y1], [x2, y2]]
line.strokeWeight = 2

--- COLORS ---
color = doc.colors.add({
    name: "Custom Blue",
    model: ColorModel.PROCESS,
    space: ColorSpace.RGB,
    colorValue: [0, 100, 200]
})
cmykColor = doc.colors.add({
    name: "Custom CMYK",
    model: ColorModel.PROCESS,
    space: ColorSpace.CMYK,
    colorValue: [100, 50, 0, 0]
})
// Built-in: doc.colors.item("Black"), doc.colors.item("Paper"), doc.colors.item("None")

--- STYLES ---
pStyle = doc.paragraphStyles.add({name: "Heading"})
pStyle.pointSize = 18
pStyle.appliedFont = app.fonts.item("Arial")
pStyle.fontStyle = "Bold"
tf.paragraphs[0].appliedParagraphStyle = pStyle

cStyle = doc.characterStyles.add({name: "Emphasis"})
cStyle.fontStyle = "Italic"
tf.words[0].appliedCharacterStyle = cStyle

--- MASTER PAGES ---
master = doc.masterSpreads.add()
master.namePrefix = "B"
master.baseName = "Custom Master"
doc.pages[0].appliedMaster = master

--- LAYERS ---
layer = doc.layers.add({name: "Graphics"})
layer.visible = true
layer.locked = false
rect.itemLayer = layer

--- SELECTION ---
doc.selection = [tf, rect]
doc.select(tf)
doc.selection = []

--- IMAGES & PLACING ---
rect = page.rectangles.add({geometricBounds: [y1, x1, y2, x2]})
rect.place(File("/path/to/image.jpg"))
rect.fit(FitOptions.FILL_PROPORTIONALLY)
// FitOptions: PROPORTIONALLY, FILL_PROPORTIONALLY, CONTENT_TO_FRAME, FRAME_TO_CONTENT, CENTER_CONTENT

--- TABLES ---
tf = page.textFrames.add({geometricBounds: [y1, x1, y2, x2]})
var table = tf.insertionPoints[0].tables.add({bodyRowCount: 3, columnCount: 4})
table.rows[0].cells[0].contents = "Header"
table.rows[0].fillColor = doc.colors.item("Black")
table.rows[0].cells.everyItem().texts[0].fillColor = doc.colors.item("Paper")

--- FIND/CHANGE ---
app.findTextPreferences = NothingEnum.NOTHING
app.changeTextPreferences = NothingEnum.NOTHING
app.findTextPreferences.findWhat = "old text"
app.changeTextPreferences.changeTo = "new text"
doc.changeText()
app.findTextPreferences = NothingEnum.NOTHING
app.changeTextPreferences = NothingEnum.NOTHING

--- EXPORT ---
// PDF
doc.exportFile(ExportFormat.PDF_TYPE, File("~/Desktop/output.pdf"), false)
// JPEG
app.jpegExportPreferences.jpegQuality = JPEGOptionsQuality.MAXIMUM
doc.exportFile(ExportFormat.JPG, File("~/Desktop/output.jpg"), false)
// EPUB
doc.exportFile(ExportFormat.EPUB, File("~/Desktop/output.epub"), false)

--- UNITS & MEASUREMENTS ---
doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.POINTS
doc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.POINTS
// 1 inch = 72 points, 1 mm ≈ 2.835 points

--- ERROR HANDLING PATTERN ---
try {
    if (!app.documents.length) { throw new Error("No document open"); }
    var doc = app.activeDocument;
    if (doc.selection.length === 0) { throw new Error("Please select at least one item"); }
    for (var i = 0; i < doc.selection.length; i++) {
        var item = doc.selection[i];
    }
} catch (e) { alert("Error: " + e.message); }

═══ KNOWN GOTCHAS (avoid these mistakes) ═══
• NEVER use let, const, arrow functions, template literals, for...of, or spread operator
• NEVER use string.includes() — use string.indexOf("x") !== -1 instead
• NEVER use Array.isArray() — check .length or constructor
• geometricBounds is [top, left, bottom, right] — NOT [x, y, width, height]
• InDesign Y increases DOWNWARD (unlike Illustrator where Y goes up)
• doc.textFrames.add() needs geometricBounds set separately
• For font access use: app.fonts.item("FontName") — check font exists first
• alert() works for debugging
• File paths on Mac: "/Users/name/Desktop/file.indd" or "~/Desktop/file.indd"
• File paths on Windows: "C:/Users/name/Desktop/file.indd" (forward slashes)`;
```

### 2. `MODULE_SCRIPTUI` constant (~line 242–276)
Keep EXACTLY as-is. ScriptUI dialogs work identically in InDesign.

### 3. `MODULE_MENU_COMMANDS` constant (~line 278–334)
Replace with InDesign menu commands. Here are the key InDesign equivalents:

```javascript
const MODULE_MENU_COMMANDS = `
═══ INDESIGN MENU COMMANDS REFERENCE ═══
// Usage: app.menuActions.itemByName("Command Name").invoke()
// Alternative: app.menuActions.itemByID(id).invoke()

// --- Object ---
// Group: app.menuActions.itemByName("Group").invoke()
// Ungroup: app.menuActions.itemByName("Ungroup").invoke()
// Lock: app.menuActions.itemByName("Lock Position").invoke()
// Unlock All: app.menuActions.itemByName("Unlock All on Spread").invoke()

// --- Type ---
// Create Outlines: app.menuActions.itemByName("Create Outlines").invoke()

// --- Arrange ---
// Bring to Front: app.menuActions.itemByName("Bring to Front").invoke()
// Bring Forward: app.menuActions.itemByName("Bring Forward").invoke()
// Send Backward: app.menuActions.itemByName("Send Backward").invoke()
// Send to Back: app.menuActions.itemByName("Send to Back").invoke()

// --- Pathfinder (Window > Object & Layout > Pathfinder) ---
// Note: In InDesign, use the Pathfinder object directly:
// var pf = app.activeWindow.activePage;  // context page
// For pathfinder operations on selection, use menu actions or script:
// app.menuActions.itemByName("Pathfinder Unite").invoke()
// app.menuActions.itemByName("Pathfinder Minus Back").invoke()
// app.menuActions.itemByName("Pathfinder Intersect").invoke()

// TIP: List all available menu actions:
// for (var i = 0; i < app.menuActions.length; i++) {
//     $.writeln(app.menuActions[i].name);
// }
`;
```

### 4. `MODULE_EXPORT` constant (~line 336–354)
Replace with InDesign export patterns:

```javascript
const MODULE_EXPORT = `
═══ EXPORT / SAVE REFERENCE ═══
// Export PDF:
doc.exportFile(ExportFormat.PDF_TYPE, File("~/Desktop/output.pdf"), false)

// Export interactive PDF:
doc.exportFile(ExportFormat.INTERACTIVE_PDF, File("~/Desktop/interactive.pdf"), false)

// Export EPUB:
doc.exportFile(ExportFormat.EPUB, File("~/Desktop/output.epub"), false)

// Export JPEG (all pages):
app.jpegExportPreferences.jpegQuality = JPEGOptionsQuality.MAXIMUM
app.jpegExportPreferences.exportResolution = 300
doc.exportFile(ExportFormat.JPG, File("~/Desktop/output.jpg"), false)

// Export PNG:
doc.exportFile(ExportFormat.PNG_FORMAT, File("~/Desktop/output.png"), false)

// Save as INDD:
doc.save(File("~/Desktop/copy.indd"))

// Save as IDML:
doc.exportFile(ExportFormat.INDESIGN_MARKUP, File("~/Desktop/output.idml"))

// Package for print:
doc.packageForPrint(
    File("~/Desktop/Package/"),       // destination
    true,  // copyFonts
    true,  // copyLinkedGraphics
    true,  // copyProfiles
    true,  // updateGraphics
    true   // includeHiddenLayers
)
`;
```

### 5. `MODULE_GRADIENTS` constant (~line 356–374)
Replace with InDesign gradient equivalent:

```javascript
const MODULE_GRADIENTS = `
═══ GRADIENTS & EFFECTS REFERENCE ═══
// Create gradient swatch:
var grad = doc.gradients.add({name: "MyGradient"})
grad.type = GradientType.LINEAR  // or .RADIAL
grad.gradientStops[0].color = doc.colors.item("Black")
grad.gradientStops[0].location = 0
grad.gradientStops[1].color = doc.colors.item("Paper")
grad.gradientStops[1].location = 100

// Apply gradient:
rect.fillColor = grad
rect.gradientFillAngle = 45  // degrees

// Transparency / Effects:
rect.transparencySettings.blendingSettings.opacity = 50  // 0-100
rect.transparencySettings.blendingSettings.blendMode = BlendMode.MULTIPLY
// Drop shadow:
rect.transparencySettings.dropShadowSettings.mode = ShadowMode.DROP
rect.transparencySettings.dropShadowSettings.opacity = 75
rect.transparencySettings.dropShadowSettings.angle = 135
rect.transparencySettings.dropShadowSettings.distance = 5
`;
```

### 6. `sendErrorFeedback` function (~line 622)
Change the error feedback prompt text from "Illustrator" to "InDesign":
- Line 622: change `"executed in Illustrator"` → `"executed in InDesign"`

### 7. Comments at the top of the file
- Line 2: `Aide — chat.js` (keep as-is)
- Line 7: change `"Illustrator ExtendScript"` → `"InDesign ExtendScript"`
- Line 8: change `"Illustrator API"` → `"InDesign API"`

### DO NOT CHANGE:
- The module system logic (`detectModules()`, `getContextManagedMessages()`)
- The `send()`, `abort()`, `newConversation()`, `getMessages()` functions
- The context window management logic
- The `extractCodeFromAssistantContent()` function
- The `trimCodeForErrorFix()` function
- The `logExecution()` function
- The IIFE structure and return statement

Apply all changes to `js/chat.js` in the project at `/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign`.
````

---

## Step 4 — index.html Branding & Quick Prompts ✅ COMPLETED

**Model:** Gemini 3 Flash · **Mode:** Fast  
**Estimated quota:** Low (text replacements only)

### Prompt — copy/paste this into a new conversation

````
I am porting the "Aide" CEP extension from Adobe Illustrator to Adobe InDesign.

The project lives at:
/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign

Edit `index.html` with these changes:

1. **Welcome subtitle** (line 47): Change:
   `Describe your Illustrator task in plain language. I'll generate the ExtendScript to do it.`
   to:
   `Describe your InDesign task in plain language. I'll generate the ExtendScript to do it.`

2. **Quick prompt buttons** (lines 49-51): Replace ALL THREE with InDesign-specific prompts:
   ```html
   <button class="quick-prompt-btn" data-prompt="Create a 10-page document with A4 size and 12mm margins">New document</button>
   <button class="quick-prompt-btn" data-prompt="Add a text frame on page 1 with 'Hello InDesign' in 24pt Arial, centered">Add text</button>
   <button class="quick-prompt-btn" data-prompt="Export the document as a high-quality PDF to the Desktop">Export PDF</button>
   ```

3. **Prompt Modules section** (lines 212-228): Update the module labels for InDesign context:
   - `ScriptUI Dialogs (~300 tokens)` → keep as-is (ScriptUI works in InDesign too)
   - `Menu Commands (~400 tokens)` → keep as-is
   - `Export / Save (~150 tokens)` → keep as-is
   - `Gradients & Masks (~130 tokens)` → change to `Gradients & Effects (~130 tokens)` (InDesign doesn't have "masks" in the same way — it has transparency effects)

   Specifically, change this checkbox label:
   From: `Gradients & Masks (~130 tokens)`
   To: `Gradients & Effects (~130 tokens)`

4. **Auto-run tooltip** (line 81): has `Automatically run scripts when generated` — keep as-is, it's generic.

5. Everything else stays exactly the same. Do NOT change any IDs, CSS classes, or structural HTML.

Apply the changes to the file.
````

---

## Step 5 — app.js & host.jsx InDesign Adaptations ✅ COMPLETED

**Model:** Gemini 3.1 Pro Low · **Mode:** Fast  
**Estimated quota:** Medium (app.js is 85KB but changes are surgical text replacements)

### Prompt — copy/paste this into a new conversation

````
I am porting the "Aide" CEP extension from Adobe Illustrator to Adobe InDesign.

The project lives at:
/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign

### File 1: `js/app.js`

Make these specific text replacements. The file is large (85KB) but changes are minimal:

1. **Line 4 comment**: Change `"Illustrator bridge"` → `"InDesign bridge"`
2. **Line 187** — rename function call `applyIllustratorTheme()` → `applyInDesignTheme()`
3. **Line 188** — change the event listener callback from `applyIllustratorTheme` → `applyInDesignTheme`
4. **Line 190 comment**: Change `"Tell Illustrator to pass"` → `"Tell InDesign to pass"`
5. **Line 203 console.warn**: Change `"running outside Illustrator"` → `"running outside InDesign"`
6. **Line 249** — rename the function definition from `function applyIllustratorTheme()` → `function applyInDesignTheme()`
7. **Line 738**: Change `"No Illustrator connection"` → `"No InDesign connection"`
8. **Line 1144**: Change `"Error: No Illustrator connection."` → `"Error: No InDesign connection."`

> [!IMPORTANT]
> Do NOT change any logic, variable names beyond what's listed, or any other references. The theme system, CSInterface API calls, and all other code is identical between Illustrator and InDesign CEP panels.

### File 2: `jsx/host.jsx`

Make these changes:

1. **Line 3 comment**: Change `"ExtendScript entry point"` description — it's generic enough to keep, but update any reference if "Illustrator" appears.
2. **Line 86 JSDoc**: Change `"The raw ExtendScript from Ollama or remote API."` — keep as-is, it's generic.
3. **Line 99-103**: The `suspendIdleTask` call and `app.redraw()` calls. 
   - **IMPORTANT**: InDesign does NOT have `app.redraw()`. Remove both `app.redraw()` calls (lines 103 and 110).
   - InDesign also does NOT have `suspendIdleTask`. Remove the `suspendIdleTask` line (line 101).
   - Replace both `app.redraw()` calls with: `app.activeDocument && app.activeDocument.recompose();` (only after the code execution, not before — so just one call after executeCode, wrapped in a try-catch).
4. **Line 232 comment**: Change `"Pick a folder using Illustrator's folder dialog"` → `"Pick a folder using InDesign's folder dialog"`
5. The `.jsx` extension handling in `saveScriptFile` should remain — InDesign scripts also use `.jsx`.

Here is the relevant section of host.jsx to modify (lines 88-120):

```javascript
function runGeneratedExtendScript(codeString) {
    try {
        if (!codeString) return "Error: No code provided.";

        var doc = null;
        try {
            doc = app.activeDocument;
        } catch (noDoc) {
            // No document open — still allow execution for app-level scripts
        }

        // Begin undo group so entire operation can be reverted with Cmd+Z
        if (doc) {
            app.activeDocument.suspendIdleTask && app.activeDocument.suspendIdleTask();
        }
        app.redraw();

        // Execute the generated code in a scoped environment via Function constructor
        var executeCode = new Function(codeString);
        var result = executeCode();

        app.redraw();

        if (result !== undefined) {
            return String(result);
        }
        return "Script executed successfully.";

    } catch (e) {
        return "ExtendScript Error: " + e.name + " at line " + e.line + " - " + e.message;
    }
}
```

Replace it with:

```javascript
function runGeneratedExtendScript(codeString) {
    try {
        if (!codeString) return "Error: No code provided.";

        // Execute the generated code in a scoped environment via Function constructor
        // This acts as a sandbox preventing var-declarations from polluting the global JSX namespace
        var executeCode = new Function(codeString);
        var result = executeCode();

        // Force InDesign to recompose layout after script execution
        try {
            if (app.documents.length > 0) {
                app.activeDocument.recompose();
            }
        } catch (eRecompose) { /* ignore */ }

        if (result !== undefined) {
            return String(result);
        }
        return "Script executed successfully.";

    } catch (e) {
        return "ExtendScript Error: " + e.name + " at line " + e.line + " - " + e.message;
    }
}
```

Apply all changes to both files.
````

---

## Step 6 — Shell Scripts (install, uninstall, build_zxp) ✅ COMPLETED

**Model:** Gemini 3 Flash · **Mode:** Fast  
**Estimated quota:** Low (mechanical find-replace across 3 shell scripts)

### Prompt — copy/paste this into a new conversation

````
I am porting the "Aide" CEP extension from Adobe Illustrator to Adobe InDesign.

The project lives at:
/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign

Update these 3 shell scripts. The changes are mostly find-replace of extension IDs, directory names, and branding.

### File 1: `install_extension.command`

1. Change ALL occurrences of `com.aide.ai` → `com.aide.indesign` (3 occurrences: SYSTEM_DIR, USER_DIR, and the .debug file Extension Id)
2. In the .debug file XML block (line 64), change `<Host Name="ILST" Port="8099"/>` → `<Host Name="IDSN" Port="8099"/>`
3. Change the success message (line 85) from `Adobe Illustrator` → `Adobe InDesign`
4. Change the success message instructions from `Window > Extensions > Aide` to the same (InDesign also uses Window > Extensions)
5. Remove the OLD_DIR variable and the old AutoArtboard cleanup block (lines 9, 17-20) — that was Illustrator-specific legacy cleanup
6. Update the echo header from `Aide — Extension Installer` to `Aide for InDesign — Extension Installer`

### File 2: `uninstall_extension.command`

1. Change `com.aide.ai` → `com.aide.indesign` in the AIDE_DIR path
2. Remove the OLD_DIR/AutoArtboard references entirely (lines 9, 23-26)
3. Update header text to mention InDesign

### File 3: `build_zxp.command`

1. Line 3: Change `Aide for Illustrator` → `Aide for InDesign`
2. Line 44: Change the banner text to `Aide for InDesign — ZXP Build & Sign Pipeline`
3. Line 149: Change the openssl subject CN from `Aide for Illustrator` → `Aide for InDesign`
4. Line 195: Change `ZXP_NAME` output format — it currently reads version from manifest, that's fine, but ensure the prefix is clear. Actually the `Aide-v${VERSION}.zxp` naming is fine — keep as-is.
5. Lines 261-265: Update "Next steps" to reference InDesign instead of just being generic.

Apply all changes to the 3 files.
````

---

## Step 7 — GEMINI.md + README.md ✅ COMPLETED

**Model:** Claude Sonnet 4.6 Thinking · **Mode:** Planning  
**Estimated quota:** Medium (creative writing, two new files)

> [!TIP]
> This step creates documentation from scratch. Sonnet is ideal here — creative enough for good README writing, cost-effective compared to Opus.

### Prompt — copy/paste this into a new conversation

````
I am setting up the "Aide for InDesign" project — a CEP panel extension that acts as an AI assistant inside Adobe InDesign. It generates and executes ExtendScript code from natural language prompts using local (Ollama) or remote (Google Gemini, OpenAI, Anthropic, Custom) LLMs.

The project lives at:
/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign

I need you to create two files:

### File 1: `GEMINI.md` (project rules file)

Create a GEMINI.md at the project root. Model it after this Illustrator version but adapt everything for InDesign:

```markdown
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
js/CSInterface.js            — Adobe CEP library (DO NOT MODIFY)
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
```

### File 2: `README.md`

Create a professional README.md. Structure it like this:

```markdown
# Aide for InDesign

> AI-powered ExtendScript assistant for Adobe InDesign — generate and execute automation scripts from natural language.

## What is Aide?

Aide is a free, open-source CEP panel that lives inside Adobe InDesign. Describe what you want to automate in plain English, and Aide generates the ExtendScript to do it — then lets you preview and execute it with one click.

**Key features:**
- 🤖 Multi-provider AI support (Ollama, Google Gemini, OpenAI, Anthropic, Custom)
- 🔒 Privacy-first: works 100% locally with Ollama
- 💬 Conversational: follow-up prompts refine the output
- 🛡️ Safe: always preview code before execution
- 🔧 Auto-fix: if a script fails, Aide sends the error back to the AI for correction
- 📚 Script library: save, search, and organize your generated scripts
- 🎨 Adapts to InDesign's UI theme automatically

## Requirements

- Adobe InDesign CC 2020 or later (version 15.0+)
- macOS 10.14+ or Windows 10+
- An AI provider:
  - **Local:** [Ollama](https://ollama.ai/) (free, private, recommended)
  - **Cloud:** API key for Google Gemini, OpenAI, Anthropic, or any OpenAI-compatible endpoint

## Installation

### Quick Install (recommended)

1. Download or clone this repository
2. Double-click `enable_debug_mode.command` (macOS) to enable unsigned extensions
3. Double-click `install_extension.command` (macOS) — enter your password when prompted
4. Restart InDesign
5. Go to **Window → Extensions → Aide**

### Manual Install

Copy the extension folder to:
- **macOS:** `/Library/Application Support/Adobe/CEP/extensions/com.aide.indesign/`
- **Windows:** `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\com.aide.indesign\`

## Quick Start

1. Open Aide from **Window → Extensions → Aide**
2. In the Settings tab, choose your AI provider and model
3. Go to the Chat tab and try: *"Create a 10-page A4 document with 12mm margins"*
4. Preview the generated code, then click **Execute**

## Example Prompts

- "Create a 20-page catalog with alternating master pages"
- "Apply a paragraph style called 'Body' to all text on pages 2-10"
- "Place all images from a folder into frames on consecutive pages"
- "Create a table of contents based on paragraph styles"
- "Export each page as a separate PDF file"
- "Set up a magazine layout with 3-column text flow"
- "Find all instances of 'Company Name' and apply character style 'Brand'"

## License

MIT — see [LICENSE](LICENSE) for details.
```

Create both files in the project root at `/Users/kkounadi/Desktop/antigravity-projects/Aide-for-InDesign`.
````

---

## Summary Table

| Step | What | Model | Mode | Quota Impact | Status |
|------|------|-------|------|-------------|--------|
| 1 | Project scaffolding & file copy | Claude Opus 4.6 | Planning | — (done) | ✅ Done |
| 2 | `manifest.xml` — IDs & host app | Gemini 3 Flash | Fast | Very Low | ⬜ |
| 3 | `chat.js` — System prompt rewrite | Gemini 3.1 Pro High | Planning | Medium-High | ⬜ |
| 4 | `index.html` — Branding & prompts | Gemini 3 Flash | Fast | Low | ⬜ |
| 5 | `app.js` + `host.jsx` — App logic | Gemini 3.1 Pro Low | Fast | Medium | ⬜ |
| 6 | Shell scripts — install/build/uninstall | Gemini 3 Flash | Fast | Low | ⬜ |
| 7 | `GEMINI.md` + `README.md` | Claude Sonnet 4.6 | Planning | Medium | ⬜ |

> [!TIP]
> **Recommended execution order:** Steps 2, 4, 6 (cheap, mechanical) → Step 3 (critical, high-value) → Step 5 (logic changes) → Step 7 (documentation last).
> 
> **Total estimated quota:** ~5 conversations. Steps 2/4/6 could be combined into a single Flash conversation to save further.
