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

## AI Provider Setup

### Ollama (Local — Recommended)
1. Install [Ollama](https://ollama.ai/)
2. Pull a coding model: `ollama pull qwen2.5-coder:7b`
3. Aide auto-discovers models — no API key needed

**Recommended models:**
| Model | RAM Required | Notes |
|:------|:------------|:------|
| `qwen2.5-coder:7b` | 8GB | Good balance |
| `qwen2.5-coder:14b` | 16GB | Best local option |
| `deepseek-coder-v2:16b` | 16GB | Very capable |
| `codestral:22b` | 32GB | Most powerful |

### Cloud Providers
Select your provider in the **Settings** tab and paste your API key:
- **Google Gemini:** [Get key](https://aistudio.google.com/) — `gemini-2.0-flash` recommended (free tier)
- **OpenAI:** [Get key](https://platform.openai.com/) — `gpt-4o-mini` is cost-effective
- **Anthropic:** [Get key](https://console.anthropic.com/) — `claude-haiku-3-5` for speed

## How It Works

```
You type a prompt
       ↓
Aide builds a message with the InDesign ExtendScript DOM reference
       ↓
LLM generates valid ExtendScript code
       ↓
Code is displayed in a preview block with line numbers
       ↓
You click ▶ Run → CEP evalScript() sends it to InDesign
       ↓
InDesign executes the script, recomposes the layout
```

The built-in system prompt is a condensed InDesign DOM reference that trains any model — even small local ones — to produce correct `app.activeDocument`, `page.textFrames.add()`, `doc.paragraphStyles`, and other InDesign-specific API calls.

## Troubleshooting

**Panel not showing in Window → Extensions:**
- Make sure debug/unsigned mode is enabled: run `enable_debug_mode.command`
- Restart InDesign after installing

**"EvalScript error" when running code:**
- Check the ExtendScript Toolkit or Script Editor console for the actual error
- Use the **Auto-fix** button to send the error back to the AI

**Ollama models not appearing:**
- Ensure Ollama is running: `ollama serve` in Terminal
- Check that your Ollama host matches (default: `http://localhost:11434`)

**Script ran but nothing happened:**
- Make sure a document is open in InDesign
- Some scripts require a selection — check the generated code's error handling

## Uninstall

Double-click `uninstall_extension.command` (macOS) or manually remove:
`/Library/Application Support/Adobe/CEP/extensions/com.aide.indesign/`

## Contributing

Pull requests welcome. The key files to understand are:

- `js/chat.js` — The system prompt (InDesign DOM reference) and conversation engine
- `jsx/host.jsx` — ExtendScript executor running inside InDesign
- `js/app.js` — CEP bridge, theme detection, UI event wiring


## License

MIT — see [LICENSE](LICENSE) for details.
