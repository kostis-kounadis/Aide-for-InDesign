# Aide for InDesign

> AI assistant for Adobe InDesign — generate and execute ExtendScript from natural language using local (Ollama) or cloud AI providers.

Aide is a CEP panel that lives inside Adobe InDesign and acts as your AI scripting assistant and script manager. Describe what you want in plain English — Aide generates the ExtendScript code, previews it, and lets you execute it with one click. Save your scripts, organize them into sets, star your favorites, and easily run them from a compact library.

Works with local AI models (via [Ollama](https://ollama.com)), or cloud providers like Google Gemini, OpenAI, Anthropic, and any OpenAI-compatible endpoint.

## ✨ Features

### Core
- **Natural Language → ExtendScript**: Describe your task, get working code instantly.
- **Multi-Provider Support**: Ollama (local/private), Google Gemini, OpenAI, Anthropic, and Custom endpoints.
- **Code Preview & Safety**: All generated code is shown before execution; nothing runs without your approval.
- **Conversation Memory**: Context-aware follow-up prompts build on what was already created.
- **Auto-Fix on Error**: If a script errors, Aide can send the error message back to the AI to generate a fix.
- **Adaptive UI**: The panel follows InDesign's brightness theme (Light/Dark) automatically.

### Scripts Library
- **Aide tab**: Scripts saved from chat; search, star, and run.
- **Sets tab**: Organize your scripts into logical groups.
- **Favorites**: One-click access to your most-used automations.
- **Compact View**: Optimized for high-density script management.

## 📸 Screenshots
*(Coming soon — add your screenshots to the `/screenshots` folder and link them here)*

## 🚀 Getting Started

### Requirements
- Adobe InDesign CC 2020 or later (version 15.0+)
- macOS 10.14+ or Windows 10+
- For local AI: [Ollama](https://ollama.com) installed and running
- For cloud AI: An API key from your chosen provider

### Installation (macOS)
**Option A: Quick Install (Recommended)**
1. Download this repository.
2. Double-click `enable_debug_mode.command` to allow unsigned extensions.
3. Double-click `install_extension.command` (enter your password when prompted).

**Option B: Manual Install**
If you prefer not to use the `.command` scripts:
1. **Enable Debug Mode**: Open Terminal and run:
   ```bash
   defaults write com.adobe.CSXS.9 PlayerDebugMode 1
   defaults write com.adobe.CSXS.10 PlayerDebugMode 1
   defaults write com.adobe.CSXS.11 PlayerDebugMode 1
   defaults write com.adobe.CSXS.12 PlayerDebugMode 1
   ```
2. **Create Extension Folder**: 
   ```bash
   sudo mkdir -p "/Library/Application Support/Adobe/CEP/extensions/com.aide.indesign"
   ```
3. **Copy Files**: Copy `CSXS`, `css`, `js`, `jsx`, and `index.html` from this repo into the folder created above.
4. **Fix Permissions**:
   ```bash
   sudo xattr -cr "/Library/Application Support/Adobe/CEP/extensions/com.aide.indesign"
   sudo chmod -R 755 "/Library/Application Support/Adobe/CEP/extensions/com.aide.indesign"
   ```

5. Restart InDesign and go to **Window → Extensions → Aide**.

### Installation (Windows)
1. Enable Debug Mode: Run `regedit`, go to `HKEY_CURRENT_USER\Software\Adobe\CSXS.10` (or your version), and set `PlayerDebugMode` to `1`.
2. Copy the folder to: `C:\Users\<User>\AppData\Roaming\Adobe\CEP\extensions\com.aide.indesign`
3. Restart InDesign and find it under **Window → Extensions**.

## 🛠 Project Structure

```text
Aide/
├── CSXS/
│   └── manifest.xml         # CEP extension registration
├── css/
│   └── style.css            # Adaptive theme & layout
├── js/
│   ├── CSInterface.js       # Adobe CEP library (Internal)
│   ├── app.js               # App logic, theme, & UI wiring
│   ├── chat.js              # Conversation engine
│   ├── models.js            # AI Provider management
│   ├── scripts.js           # Library management (Aide, Sets, Favs)
│   ├── system-prompt.js     # InDesign DOM reference for the AI
│   └── utils.js             # Code formatting & helpers
├── jsx/
│   └── host.jsx             # ExtendScript executor bridge
├── index.html               # Main UI shell
├── install_extension.command # macOS installer
├── enable_debug_mode.command # macOS debug enabler
├── LICENSE
└── README.md
```

## 🔒 Privacy & Security
- **Local-first**: When using Ollama, all processing stays on your machine.
- **API Security**: Keys are stored locally in your browser's `localStorage` and are never sent to third parties (only to the provider's API).
- **No Telemetry**: Aide does not collect data or "phone home."

## 📜 License
MIT — see [LICENSE](LICENSE) for details.