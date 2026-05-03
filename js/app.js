/**
 * Aide — app.js
 * Main application: theme detection, tab routing, event wiring,
 * and InDesign bridge (CSInterface).
 */

document.addEventListener('DOMContentLoaded', () => {
    // ──────────────── DOM Refs ────────────────
    const $id = id => document.getElementById(id);

    const CHAT_DRAFT_KEY = 'aide_chat_input_draft';

    const dom = {
        tabBar:             $id('tab-bar'),
        chatMessages:       $id('chat-messages'),
        chatWelcome:        $id('chat-welcome'),
        promptInput:        $id('prompt-input'),
        sendBtn:            $id('send-btn'),
        newChatBtn:         $id('new-chat-btn'),
        attachBtn:          $id('attach-btn'),
        fileInput:          $id('file-input'),
        attachedFile:       $id('attached-file'),
        attachedFileName:   $id('attached-file-name'),
        removeAttachment:   $id('remove-attachment'),
        scriptsSearch:      $id('scripts-search'),
        scriptsSearchClear: $id('scripts-search-clear'),
        scriptsList:        $id('scripts-list'),
        scriptsEmpty:       $id('scripts-empty'),
        providerSelect:     $id('provider-select'),
        ollamaHostRow:      $id('ollama-host-row'),
        ollamaHost:         $id('ollama-host'),
        customEndpointRow:  $id('custom-endpoint-row'),
        customEndpoint:     $id('custom-endpoint'),
        apiKeyRow:          $id('api-key-row'),
        apiKey:             $id('api-key'),
        providerHint:       $id('provider-hint'),
        toggleKeyVis:       $id('toggle-key-vis'),
        modelSelect:        $id('model-select'),
        modelCustom:        $id('model-custom'),
        modelCustomRow:     $id('model-custom-row'),
        clearCustomModel:   $id('clear-custom-model'),
        clearCustomModelsListBtn: $id('clear-custom-models-list-btn'),
        refreshModels:      $id('refresh-models-btn'),
        tempSlider:         $id('temperature-slider'),
        tempValue:          $id('temperature-value'),
        modScriptui:        $id('mod-scriptui'),
        modMenu:            $id('mod-menu'),
        modExport:          $id('mod-export'),
        modGradients:       $id('mod-gradients'),
        modTokensLive:      $id('module-tokens-live'),
        debugToggle:        $id('debug-toggle'),
        debugActions:       $id('debug-actions'),
        exportDebugBtn:     $id('export-debug-btn'),
        clearDebugBtn:      $id('clear-debug-btn'),
        testConnBtn:        $id('test-connection-btn'),
        testResult:         $id('test-result'),
        localFoldersList:   $id('local-scripts-folders-list'),
        regenerateDescBtn:  $id('regenerate-script-descriptions-btn'),
        descriptionsToggle: $id('descriptions-toggle'),
        generateDescNowBtn: $id('generate-descriptions-now'),
        exportDescCsvBtn:   $id('export-descriptions-csv'),
        importDescCsvBtn:   $id('import-descriptions-csv'),
        importDescFile:     $id('import-descriptions-file'),
        summaryModelSelect: $id('summary-model-select'),
        scriptsSubtabLocal: $id('scripts-subtab-local'),
        scriptsSubtabSets:  $id('scripts-subtab-sets'),
        scriptsSubtabFavs:  $id('scripts-subtab-favs'),
        scriptsStarFilterBtn: $id('scripts-star-filter-btn'),
        scriptsShowHiddenBtn: $id('scripts-show-hidden-btn'),
        scriptsViewToggleBtn: $id('scripts-view-toggle-btn'),
        scriptsRefreshBtn:  $id('scripts-refresh-btn'),
        autoRunCheckbox:    $id('auto-run-checkbox'),
        // Step 5: Tree overflow menu
        treeOverflowMenu:    $id('tree-overflow-menu'),
        // Step 6: Sets overlay and overflow
        setOverflowMenu:     $id('set-overflow-menu'),
        setOverlay:          $id('set-overlay'),
        setOverlayTitle:     $id('set-overlay-title'),
        setOverlayName:      $id('set-overlay-name'),
        setOverlayIcon:      $id('set-overlay-icon'),
        setOverlayColor:     $id('set-overlay-color'),
        setOverlaySave:      $id('set-overlay-save'),
        setOverlayCancel:    $id('set-overlay-cancel'),
        // Overlay
        aideOverlay:         $id('aide-overlay'),
        overlayCloseBtn:     $id('overlay-close-btn'),
        overlayNativeBtn:    $id('overlay-native-btn'),
        overlayFolders:      $id('overlay-folders'),
        overlayScriptName:   $id('overlay-script-name'),
        // Step 8: Import / Export
        exportSettingsBtn:   $id('export-settings-btn'),
        importSettingsBtn:   $id('import-settings-btn'),
        importSettingsFile:  $id('import-settings-file'),
        importExportStatus:  $id('import-export-status'),
    };

    // Current file attachment
    let currentAttachment = null;

    // Step 4: Cached auto-detected Scripts Panel path (empty = not found / not yet detected)
    let autoDetectedScriptsPanelPath = '';

    // Step 5: Cached tree data from scanScriptFolderJson
    let localTreeData = [];
    // Step 6: Cached sets data
    let localSetsData = [];
    // Step 5: Show hidden scripts toggle
    let showHiddenScripts = AideScripts.getShowHidden();

    let scriptsSubTab = AideScripts.getScriptsSubtab();
    let scriptsStarFilter = AideScripts.getScriptsStarFilter();
    let scriptsViewMode = AideScripts.getScriptsViewMode();

    const AUTO_RUN_KEY = 'aide_auto_run_enabled';
    let autoRunEnabled = false;
    try {
        autoRunEnabled = localStorage.getItem(AUTO_RUN_KEY) === 'true';
    } catch (e) { /* ignore */ }

    // Auto-descriptions toggle state
    let autoDescEnabled = AideScripts.getAutoDescriptions();
    
    // Persistent custom models list per provider (2.3.1.1 fix)
    // Structure: { ollama: [...], google: [...], openai: [...], anthropic: [...], openrouter: [...], custom: [...] }
    let savedCustomModels = {};
    try {
        const stored = localStorage.getItem('aide_custom_models');
        if (stored) {
            const parsed = JSON.parse(stored);
            // Migration: if old format was a plain array, convert to per-provider object
            if (Array.isArray(parsed)) {
                savedCustomModels = { __legacy: parsed };
            } else {
                savedCustomModels = parsed;
            }
        }
    } catch (e) {}

    function getCustomModelsForProvider(provider) {
        return savedCustomModels[provider] || [];
    }

    function addCustomModelForProvider(provider, model) {
        if (!savedCustomModels[provider]) savedCustomModels[provider] = [];
        if (savedCustomModels[provider].indexOf(model) === -1) {
            savedCustomModels[provider].push(model);
            try { localStorage.setItem('aide_custom_models', JSON.stringify(savedCustomModels)); }
            catch (e) { /* quota – ignore */ }
        }
    }

    function removeCustomModelForProvider(provider, model) {
        if (savedCustomModels[provider]) {
            savedCustomModels[provider] = savedCustomModels[provider].filter(function(m) { return m !== model; });
            try { localStorage.setItem('aide_custom_models', JSON.stringify(savedCustomModels)); }
            catch (e) { /* quota – ignore */ }
        }
    }

    function clearAllCustomModels() {
        savedCustomModels = {};
        localStorage.removeItem('aide_custom_models');
    }

    if (dom.descriptionsToggle) {
        dom.descriptionsToggle.checked = autoDescEnabled;
        dom.descriptionsToggle.addEventListener('change', () => {
            autoDescEnabled = dom.descriptionsToggle.checked;
            AideScripts.setAutoDescriptions(autoDescEnabled);
        });
    }

    if (dom.autoRunCheckbox) {
        dom.autoRunCheckbox.checked = autoRunEnabled;
        dom.autoRunCheckbox.addEventListener('change', () => {
            autoRunEnabled = dom.autoRunCheckbox.checked;
            try {
                localStorage.setItem(AUTO_RUN_KEY, autoRunEnabled);
            } catch (e) { /* ignore */ }
        });
    }

    function persistChatDraft(text) {
        try {
            localStorage.setItem(CHAT_DRAFT_KEY, text == null ? '' : String(text));
        } catch (e) { /* ignore */ }
    }

    function restoreChatDraft() {
        try {
            const t = localStorage.getItem(CHAT_DRAFT_KEY);
            if (t != null) {
                dom.promptInput.value = t;
                dom.promptInput.style.height = 'auto';
                dom.promptInput.style.height = Math.min(dom.promptInput.scrollHeight, 100) + 'px';
            }
        } catch (e) { /* ignore */ }
    }
    let localScriptEntries = [];
    const localScriptContentCache = {};

    function clearLocalScriptContentCache() {
        Object.keys(localScriptContentCache).forEach(k => delete localScriptContentCache[k]);
    }

    /** True when user has not set up any local folders */
    function hasNoLocalFolders() {
        const folders = AideScripts.getScriptFolders();
        return !folders || folders.length === 0;
    }

    // ──────────────── CSInterface + Theme ────────────────
    let csInterface = null;
    try {
        csInterface = new CSInterface();
        applyInDesignTheme();
        csInterface.addEventListener('com.adobe.csxs.events.ThemeColorChanged', applyInDesignTheme);

        // Tell InDesign to pass Cmd+Z and Cmd+Shift+Z (Undo/Redo) to the panel
        // KeyCode 90 = 'Z'. This allows native browser shortcuts to fire inside the panel.
        const shortcuts = [
            { "keyCode": 90, "metaKey": true },               // Cmd+Z
            { "keyCode": 90, "metaKey": true, "shiftKey": true }   // Cmd+Shift+Z
        ];
        // For Windows support, also register Ctrl equivalents
        if (navigator.platform.indexOf('Win') > -1) {
            shortcuts.push({ "keyCode": 90, "ctrlKey": true });
            shortcuts.push({ "keyCode": 90, "ctrlKey": true, "shiftKey": true });
        }
        csInterface.registerKeyEventsInterest(JSON.stringify(shortcuts));
    } catch (e) {
        console.warn('CSInterface unavailable — running outside InDesign');
    }

    // ──────────────── evalScriptSafe ────────────────
    /**
     * Unified CEP → ExtendScript bridge wrapper.
     * Normalises every known failure mode into a consistent result object:
     *   { success: true,  result: string }   — script ran without error
     *   { success: false, error:  string }   — any kind of failure
     *
     * Failure modes caught:
     *   • null / undefined / 'undefined'     — runtime crash with no return value
     *   • 'EvalScript error.'                — CSInterface-level eval failure (CEP constant)
     *   • starts with 'ExtendScript Error'   — error string returned by host.jsx catch block
     *   • empty string                       — silent host-level failure
     *
     * @param {string}   script  — the ExtendScript expression to evaluate
     * @param {function} cb      — callback receiving {success, result?, error?}
     */
    function evalScriptSafe(script, cb) {
        // 3.6: Guard against null csInterface before calling evalScript
        if (!csInterface) {
            cb({ success: false, error: 'No InDesign connection (CSInterface unavailable).' });
            return;
        }
        csInterface.evalScript(script, function(raw) {
            // Normalise missing/undefined
            var result = (raw == null || raw === 'undefined') ? '' : String(raw);

            // CEP-level eval failure (matches CSInterface.js constant)
            if (result === 'EvalScript error.' || result === EvalScript_ErrMessage) {
                cb({ success: false, error: 'EvalScript failed at CEP level — check host.jsx syntax.' });
                return;
            }

            // Error string prefix set by host.jsx catch block
            if (result.indexOf('ExtendScript Error') === 0) {
                cb({ success: false, error: result });
                return;
            }

            // Note: empty string IS a valid return (e.g. pickScriptsFolder cancelled = '')
            // Callers must check result content themselves if relevant.
            cb({ success: true, result: result });
        });
    }

    function applyInDesignTheme() {
        if (!csInterface) return;
        try {
            const skinInfo = csInterface.getHostEnvironment().appSkinInfo;
            const bg = skinInfo.panelBackgroundColor.color;
            const brightness = (bg.red + bg.green + bg.blue) / 3;

            const bgHex = rgbToHex(bg.red, bg.green, bg.blue);
            document.documentElement.style.setProperty('--bg-primary', bgHex);

            if (brightness < 80) {
                document.body.classList.remove('theme-light');
                document.documentElement.style.setProperty('--bg-secondary', lighten(bg, 12));
                document.documentElement.style.setProperty('--bg-tertiary', darken(bg, 10));
            } else if (brightness < 130) {
                document.body.classList.remove('theme-light');
                document.documentElement.style.setProperty('--bg-secondary', lighten(bg, 8));
                document.documentElement.style.setProperty('--bg-tertiary', darken(bg, 12));
            } else {
                document.body.classList.add('theme-light');
                document.documentElement.style.setProperty('--bg-secondary', darken(bg, 6));
                document.documentElement.style.setProperty('--bg-tertiary', darken(bg, 12));
            }
        } catch (e) {
            console.warn('Could not read theme:', e);
        }
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(v => {
            const hex = Math.round(Math.max(0, Math.min(255, v))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    function lighten(color, amount) {
        return rgbToHex(color.red + amount, color.green + amount, color.blue + amount);
    }
    function darken(color, amount) {
        return rgbToHex(color.red - amount, color.green - amount, color.blue - amount);
    }

    async function checkConnection() {
        const dot = $id('chat-connection-dot');
        const textArea = $id('chat-model-indicator');
        if (!dot || !textArea) return;
        
        const cfg = AideModels.getConfig();
        textArea.textContent = cfg.model || 'No model';
        dot.className = 'connection-dot';
        dot.title = 'Checking connection...';

        let result;
        if (cfg.provider === 'ollama') {
            result = await AideModels.checkOllamaConnection();
        } else {
            result = await AideModels.testRemoteConnection();
        }

        if (result.ok) {
            dot.className = 'connection-dot ok';
            dot.title = 'Connected';
        } else {
            dot.className = 'connection-dot err';
            dot.title = result.error || 'Connection Failed';
            textArea.textContent = 'Error';
            if (cfg.provider !== 'ollama') {
               textArea.textContent = 'Auth Error'; 
            }
        }
    }

    // ──────────────── Tab Routing ────────────────
    dom.tabBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const tab = btn.dataset.tab;

        persistChatDraft(dom.promptInput.value);

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(v => v.classList.remove('active'));

        btn.classList.add('active');
        const view = $id('view-' + tab);
        if (view) view.classList.add('active');

        if (tab === 'chat') {
            restoreChatDraft();
        }

        if (tab === 'scripts') {
            runScriptsToolbarRefresh();
        }
    });

    // ──────────────── File Attachment ────────────────
    if (dom.attachBtn) {
        dom.attachBtn.addEventListener('click', () => dom.fileInput.click());
    }

    if (dom.fileInput) {
        dom.fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                currentAttachment = await AideUtils.readTextFile(file);
                dom.attachedFileName.textContent = currentAttachment.name;
                dom.attachedFile.classList.remove('hidden');
                AideModels.log('attachment', { name: file.name, type: currentAttachment.type, size: file.size });
            } catch (err) {
                currentAttachment = null;
                console.error('Failed to read file:', err);
            }
            dom.fileInput.value = '';
        });
    }

    if (dom.removeAttachment) {
        dom.removeAttachment.addEventListener('click', () => {
            currentAttachment = null;
            dom.attachedFile.classList.add('hidden');
            dom.attachedFileName.textContent = '';
        });
    }

    // ──────────────── Chat ────────────────

    // Track original code for undo feature
    const originalCodeMap = {};

    function renderChatMessages() {
        const msgs = AideChat.getMessages();
        dom.chatMessages.innerHTML = '';

        if (msgs.length === 0) {
            dom.chatMessages.appendChild(dom.chatWelcome);
            dom.chatWelcome.style.display = '';
            return;
        }

        dom.chatWelcome.style.display = 'none';

        msgs.forEach((msg, idx) => {
            const el = document.createElement('div');
            el.className = `chat-msg ${msg.role}`;

            if (msg.role === 'user') {
                el.innerHTML = `
                    <span class="msg-role">You</span>
                    <div class="msg-body">${AideUtils.escapeHtml(msg.content)}</div>
                `;
            } else if (msg.role === 'assistant') {
                const hasCode = msg.content.trim().length > 0;
                const codeId = 'code-' + idx;
                const lineNumsHtml = AideUtils.generateLineNumbersHtml(msg.content);

                // Store original code for undo
                originalCodeMap[codeId] = msg.content;

                el.innerHTML = `
                    <span class="msg-role">Aide</span>
                    ${hasCode ? `
                    <div class="msg-code-block">
                        <div class="msg-code-header">
                            <span class="msg-code-label">ExtendScript</span>
                            <div class="msg-code-actions">
                                <button class="undo-edit-btn" data-action="undo-edit" data-code-id="${codeId}" title="Undo edits">↩ Undo</button>
                                <button class="code-action-btn" data-action="copy" data-code-id="${codeId}">Copy</button>
                                <button class="code-action-btn save-btn" data-action="save" data-code-id="${codeId}">Save</button>
                                <button class="code-action-btn execute-btn" data-action="execute" data-code-id="${codeId}">▶ Run</button>
                            </div>
                        </div>
                        <div class="msg-code-editor">
                            <div class="line-numbers-col" aria-hidden="true">${lineNumsHtml}</div>
                            <pre class="msg-code-pre" id="${codeId}" contenteditable="true" spellcheck="false" autocomplete="off">${AideUtils.escapeHtml(msg.content)}</pre>
                        </div>
                    </div>
                    ` : `<div class="msg-body">${AideUtils.escapeHtml(msg.content)}</div>`}
                `;
            }
            dom.chatMessages.appendChild(el);
        });

        dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    }

    // Detect user edits in code blocks → activate undo button + re-render line numbers
    let _lineNumTimer = null;
    dom.chatMessages.addEventListener('input', (e) => {
        const pre = e.target.closest('.msg-code-pre[contenteditable]');
        if (!pre) return;

        // Activate undo button
        const codeId = pre.id;
        const undoBtn = dom.chatMessages.querySelector(`.undo-edit-btn[data-code-id="${codeId}"]`);
        if (undoBtn) undoBtn.classList.add('active');

        // Debounce line-number rebuild (avoids per-keystroke re-render)
        clearTimeout(_lineNumTimer);
        _lineNumTimer = setTimeout(() => {
            rebuildLineNumbers(pre);
        }, 300);
    });

    /**
     * Re-renders the line-number sidebar to match the code box newline count.
     * Prevents contenteditable DOM corruption by targeting the sibling element.
     */
    function rebuildLineNumbers(pre) {
        const text = getCodeFromElement(pre);
        const lines = text.split('\n').length;
        
        let html = '';
        for (let i = 1; i <= lines; i++) {
            html += `<span class="line-num" data-line="${i}"></span>\n`;
        }
        
        const col = pre.previousElementSibling;
        if (col && col.classList.contains('line-numbers-col')) {
            col.innerHTML = html;
        }
    }

    function showTypingIndicator() {
        const el = document.createElement('div');
        el.className = 'chat-msg assistant';
        el.id = 'typing-indicator';
        el.innerHTML = `
            <span class="msg-role">Aide</span>
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        dom.chatMessages.appendChild(el);
        dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const el = $id('typing-indicator');
        if (el) el.remove();
    }

    // ──────────────── Send / Stop button helpers ────────────────
    const SEND_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    const STOP_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" fill="currentColor" stroke="none"/></svg>';

    function setSendState() {
        dom.sendBtn.innerHTML = SEND_SVG;
        dom.sendBtn.classList.remove('stop');
        dom.sendBtn.title = 'Send (⌘+Enter)';
        dom.sendBtn.disabled = false;
    }

    function setStopState() {
        dom.sendBtn.innerHTML = STOP_SVG;
        dom.sendBtn.classList.add('stop');
        dom.sendBtn.title = 'Stop generation';
        dom.sendBtn.disabled = false;
    }

    // Initialise the icon (replaces the static paper-plane SVG in HTML)
    setSendState();

    async function handleSend() {
        const userFacingPrompt = dom.promptInput.value.trim();
        if (!userFacingPrompt) return;

        // If already generating, act as a Stop button
        if (AideChat.getIsGenerating()) {
            AideChat.abort();
            return;
        }

        let text = userFacingPrompt;
        const attachmentSnapshot = currentAttachment;
        if (attachmentSnapshot) {
            text = `[Attached file: ${attachmentSnapshot.name}]\n\nFile contents:\n${attachmentSnapshot.content}\n\n---\n\nUser request: ${userFacingPrompt}`;
        }

        setStopState();
        dom.promptInput.disabled = true;
        dom.promptInput.classList.add('generating');

        renderChatMessages();
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-msg user';
        userDiv.innerHTML = `
            <span class="msg-role">You</span>
            <div class="msg-body">${AideUtils.escapeHtml(text)}</div>
        `;
        dom.chatMessages.appendChild(userDiv);
        showTypingIndicator();

        await AideChat.send(text, (update) => {
            if (update.type === 'done' || update.type === 'error' || update.type === 'aborted') {
                removeTypingIndicator();
                setSendState();
                dom.promptInput.disabled = false;
                dom.promptInput.classList.remove('generating');

                if (update.type === 'done') {
                    renderChatMessages();
                    dom.promptInput.value = '';
                    dom.promptInput.style.height = 'auto';
                    persistChatDraft('');
                    if (attachmentSnapshot) {
                        currentAttachment = null;
                        dom.attachedFile.classList.add('hidden');
                        dom.attachedFileName.textContent = '';
                    }

                    // Auto-run if enabled and code exists
                    if (autoRunEnabled && update.text && update.text.trim()) {
                        setTimeout(() => {
                            const runBtns = dom.chatMessages.querySelectorAll('.execute-btn');
                            if (runBtns.length > 0) {
                                runBtns[runBtns.length - 1].click();
                            }
                        }, 50); // Small delay to ensure DOM is fully ready
                    }
                } else if (update.type === 'aborted') {
                    // Generation was stopped — leave the prompt intact so the user can retry
                    renderChatMessages();
                } else {
                    renderChatMessages();
                    dom.promptInput.value = userFacingPrompt;
                    dom.promptInput.style.height = 'auto';
                    dom.promptInput.style.height = Math.min(dom.promptInput.scrollHeight, 100) + 'px';
                    persistChatDraft(userFacingPrompt);
                    const errDiv = document.createElement('div');
                    errDiv.className = 'msg-exec-result error';
                    errDiv.textContent = '\u26a0 ' + update.text;
                    dom.chatMessages.appendChild(errDiv);
                    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
                }

                dom.promptInput.disabled = false;
                dom.promptInput.classList.remove('generating');
                dom.promptInput.focus();
            }
        });
    }

    dom.sendBtn.addEventListener('click', handleSend);

    // —— Scoped undo/redo stack for chat textarea ——
    const undoStack = [''];
    let redoStack = [];
    let undoDebounce = null;

    dom.promptInput.addEventListener('input', () => {
        dom.promptInput.style.height = 'auto';
        dom.promptInput.style.height = Math.min(dom.promptInput.scrollHeight, 100) + 'px';
        persistChatDraft(dom.promptInput.value);

        // Snapshot state for custom undo (debounced to avoid per-character entries)
        clearTimeout(undoDebounce);
        undoDebounce = setTimeout(() => {
            const currentVal = dom.promptInput.value;
            if (undoStack[undoStack.length - 1] !== currentVal) {
                undoStack.push(currentVal);
                redoStack = [];
                if (undoStack.length > 50) undoStack.shift(); 
            }
        }, 300);
    });

    dom.promptInput.addEventListener('keydown', (e) => {
        // Cmd+Enter or Ctrl+Enter to send
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSend();
            return;
        }

        // Custom Cmd+Z / Ctrl+Z (Undo)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                // Redo
                if (redoStack.length > 0) {
                    undoStack.push(dom.promptInput.value);
                    dom.promptInput.value = redoStack.pop();
                    dom.promptInput.dispatchEvent(new Event('input'));
                }
            } else {
                // Undo
                if (undoStack.length > 1) {
                    redoStack.push(undoStack.pop());
                    dom.promptInput.value = undoStack[undoStack.length - 1];
                    dom.promptInput.dispatchEvent(new Event('input'));
                }
            }
        }
    });

    document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            dom.promptInput.value = btn.dataset.prompt;
            dom.promptInput.dispatchEvent(new Event('input'));
            dom.promptInput.focus();
        });
    });

    dom.newChatBtn.addEventListener('click', () => {
        AideChat.newConversation();
        dom.promptInput.value = '';
        dom.promptInput.style.height = 'auto';
        persistChatDraft('');
        renderChatMessages();
    });

    // Code action buttons (delegated)
    dom.chatMessages.addEventListener('click', (e) => {
        const btn = e.target.closest('.code-action-btn, .undo-edit-btn');
        if (!btn) return;

        const codeId = btn.dataset.codeId;
        const codeEl = $id(codeId);
        if (!codeEl) return;

        const code = getCodeFromElement(codeEl);
        const action = btn.dataset.action;

        if (action === 'copy') {
            copyToClipboard(code);
            btn.textContent = '✓';
            setTimeout(() => btn.textContent = 'Copy', 1500);
        }
        if (action === 'save') {
            const name = prompt('Script name:', 'Untitled Script');
            if (name !== null) {
                if (csInterface && autoDetectedScriptsPanelPath) {
                    const savePath = autoDetectedScriptsPanelPath + '/Aide-Scripts';
                    evalScriptSafe(`saveScriptFile(${JSON.stringify(savePath)}, ${JSON.stringify(name)}, ${JSON.stringify(code)})`, () => {
                        AideScripts.addScriptFolder(autoDetectedScriptsPanelPath);
                        clearLocalScriptContentCache();
                        if (scriptsSubTab === 'local') runScriptsToolbarRefresh();
                        btn.textContent = '✓ Saved';
                        setTimeout(() => btn.textContent = 'Save', 1500);
                    });
                } else {
                    btn.textContent = '✓ Saved (Mock)';
                    setTimeout(() => btn.textContent = 'Save', 1500);
                }
            }
        }
        if (action === 'execute') {
            executeCode(code, btn);
        }
        if (action === 'undo-edit') {
            const original = originalCodeMap[codeId];
            if (original) {
                codeEl.innerText = original;
                rebuildLineNumbers(codeEl);
                btn.classList.remove('active');
            }
        }
    });

    /**
     * Extract raw code from a code element.
     */
    function getCodeFromElement(el) {
        return el.innerText || el.textContent;
    }

    /**
     * Clipboard helper — works in both browser and CEP contexts.
     */
    function copyToClipboard(text) {
        // Try modern API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
    }

    // ──────────────── Execute ────────────────
    /**
     * @param {object} [opts]
     * @param {string} [opts.failedCode] script text for auto-fix when not from chat
     * @param {HTMLElement} [opts.launcherCard] script-card for launcher inline toast
     */
    function executeCode(code, triggerBtn, opts) {
        opts = opts || {};
        if (!csInterface) {
            showExecResult(triggerBtn, false, 'No InDesign connection', opts.launcherCard);
            return;
        }

        const scriptCall = `runGeneratedExtendScript(${JSON.stringify(code)})`;

        if (triggerBtn) {
            triggerBtn.textContent = '⏳';
            triggerBtn.disabled = true;
        }

        evalScriptSafe(scriptCall, ({ success, result, error }) => {
            const isError = !success;
            const message = success ? result : error;
            AideChat.logExecution(code, message, isError);

            if (triggerBtn) {
                triggerBtn.disabled = false;
                triggerBtn.textContent = isError ? '✕ Failed' : '✓ Done';
                // Restore correct label — tree-run-btn uses '▶', chat buttons use '▶ Run'
                const origLabel = triggerBtn.classList.contains('tree-run-btn') ? '▶' : '▶ Run';
                setTimeout(() => { triggerBtn.textContent = origLabel; }, 2000);
            }

            showExecResult(triggerBtn, !isError, message, opts.launcherCard);

            if (isError) {
                offerAutoFix(message, opts.failedCode != null ? opts.failedCode : code);
            }
        });
    }

    // 3.4: Decode %20 and other URL-encoded characters in filenames
    function cleanFileName(name) {
        try { return decodeURIComponent(name); }
        catch(e) { return name; }
    }

    // 3.5: Replace toast injection in script cards with CSS flash feedback.
    // Error details are sent to the Chat panel as a system message.
    function showExecResult(nearEl, success, message, launcherCard) {
        if (launcherCard) {
            // Remove any old toasts (legacy cleanup)
            const prev = launcherCard.querySelector('.script-exec-toast');
            if (prev) prev.remove();

            if (success) {
                // Brief green border flash on success
                launcherCard.classList.add('exec-flash-success');
                setTimeout(() => launcherCard.classList.remove('exec-flash-success'), 1200);
            } else {
                // Brief red border flash on error
                launcherCard.classList.add('exec-flash-error');
                setTimeout(() => launcherCard.classList.remove('exec-flash-error'), 1800);
                // Send detailed error to Chat panel as a system message
                appendSystemErrorToChat(message);
            }
            return;
        }

        const codeBlock = nearEl ? nearEl.closest('.msg-code-block') : null;
        if (!codeBlock) return;

        const prev = codeBlock.parentElement.querySelector('.msg-exec-result');
        if (prev) prev.remove();

        const resultEl = document.createElement('div');
        resultEl.className = `msg-exec-result ${success ? 'success' : 'error'}`;
        resultEl.textContent = success
            ? '✓ Script executed successfully'
            : `✕ ${message}`;
        codeBlock.parentElement.appendChild(resultEl);
        dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    }

    // 3.5: Display script errors in the Chat panel instead of inline toasts
    function appendSystemErrorToChat(message) {
        const errDiv = document.createElement('div');
        errDiv.className = 'msg-exec-result error';
        errDiv.textContent = `✕ Script error: ${message}`;
        dom.chatMessages.appendChild(errDiv);
        dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    }

    function offerAutoFix(errorMsg, failedCode) {
        const fixDiv = document.createElement('div');
        fixDiv.className = 'chat-msg assistant';
        fixDiv.innerHTML = `
            <div class="msg-body" style="display:flex;align-items:center;gap:6px;">
                <span>Script failed. Want me to try fixing it?</span>
                <button class="code-action-btn" id="auto-fix-btn" style="color:var(--accent);border-color:var(--accent);">Auto-fix</button>
            </div>
        `;
        dom.chatMessages.appendChild(fixDiv);
        dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

        $id('auto-fix-btn')?.addEventListener('click', async () => {
            fixDiv.remove();
            showTypingIndicator();
            dom.sendBtn.disabled = true;

            await AideChat.sendErrorFeedback(errorMsg, (update) => {
                if (update.type === 'done' || update.type === 'error') {
                    removeTypingIndicator();
                    renderChatMessages();
                    dom.sendBtn.disabled = false;
                }
            }, failedCode);
        });
    }

    // ──────────────── Scripts launcher (Aide | Local) ────────────────
    function normalizeFsPath(p) {
        return String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    }

    function isAllowedLocalScriptPath(fsPath) {
        const norm = normalizeFsPath(fsPath);
        const roots = AideScripts.getScriptFolders().slice(); // copy
        // Always include the auto-detected Scripts Panel path even if not saved by user
        if (autoDetectedScriptsPanelPath && roots.indexOf(autoDetectedScriptsPanelPath) === -1) {
            roots.push(autoDetectedScriptsPanelPath);
        }
        for (let i = 0; i < roots.length; i++) {
            const base = normalizeFsPath(roots[i]);
            if (!base) continue;
            if (norm === base || norm.indexOf(base + '/') === 0) return true;
        }
        return false;
    }

    function syncScriptsSubtabUI() {
        if (dom.scriptsSubtabLocal) dom.scriptsSubtabLocal.classList.toggle('active', scriptsSubTab === 'local');
        if (dom.scriptsSubtabSets) dom.scriptsSubtabSets.classList.toggle('active', scriptsSubTab === 'sets');
        if (dom.scriptsSubtabFavs) dom.scriptsSubtabFavs.classList.toggle('active', scriptsSubTab === 'favs');
    }

    function syncViewToggleBtn() {
        if (!dom.scriptsViewToggleBtn) return;
        const compact = scriptsViewMode === 'compact';
        dom.scriptsViewToggleBtn.textContent = compact ? '⊞' : '☰';
        dom.scriptsViewToggleBtn.title = compact ? 'Switch to expanded view' : 'Switch to compact view';
        if (dom.scriptsList) {
            dom.scriptsList.classList.toggle('scripts-list--expanded', !compact);
        }
    }

    function setScriptsViewMode(mode) {
        scriptsViewMode = mode === 'compact' ? 'compact' : 'expanded';
        AideScripts.setScriptsViewMode(scriptsViewMode);
        syncViewToggleBtn();
        refreshScriptsList();
    }

    function collectMissingDescriptionJobs() {
        const jobs = [];
        const q = (dom.scriptsSearch.value || '').toLowerCase().trim();
        if (scriptsSubTab === 'local' || scriptsSubTab === 'favs' || scriptsSubTab === 'sets') {
            let entries = localScriptEntries.slice();
            if (scriptsStarFilter) {
                entries = entries.filter(e => AideScripts.isLocalFavorite(e.path));
            }
            if (q) {
                entries = entries.filter(e =>
                    (e.name && e.name.toLowerCase().indexOf(q) !== -1) ||
                    (e.relPath && e.relPath.toLowerCase().indexOf(q) !== -1) ||
                    (e.folderRoot && e.folderRoot.toLowerCase().indexOf(q) !== -1)
                );
            }
            entries.forEach(e => {
                const k = AideScripts.descKeyLocal(e.path);
                if (!AideScripts.getScriptDescription(k)) {
                    jobs.push({ key: k, path: e.path });
                }
            });
        }
        return jobs;
    }

    async function processDescriptionJobs(jobs) {
        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            let code = job.code;
            if (code == null && job.path) {
                code = await new Promise(resolve => {
                    loadLocalFileContent(job.path, resolve);
                });
                if (!code || String(code).indexOf('Error') === 0) continue;
            }
            if (!code) continue;
            const txt = await AideModels.ollamaSummarizeScriptCode(code);
            if (txt) AideScripts.setScriptDescription(job.key, txt);
            refreshScriptsList();
        }
    }

    async function runScriptsToolbarRefresh() {
        if (dom.scriptsRefreshBtn) {
            dom.scriptsRefreshBtn.disabled = true;
            dom.scriptsRefreshBtn.textContent = '…';
        }
        try {
            if (scriptsSubTab === 'local') {
                clearLocalScriptContentCache();
                await new Promise(resolve => {
                    // Step 5: use tree scanner instead of flat list
                    fetchLocalScriptTree(() => {
                        // Also refresh flat list for enrichment jobs
                        fetchLocalScriptList(() => resolve());
                    });
                });
            } else if (scriptsSubTab === 'sets') {
                await new Promise(resolve => fetchAideSets(resolve));
            }
            refreshScriptsList();
            // Auto-enrich if toggle is ON
            if (autoDescEnabled) {
                runEnrichMissingDescriptions();
            }
        } finally {
            if (dom.scriptsRefreshBtn) {
                dom.scriptsRefreshBtn.disabled = false;
                dom.scriptsRefreshBtn.textContent = '↻';
            }
        }
    }


    async function runEnrichMissingDescriptions() {
        const jobs = collectMissingDescriptionJobs();
        if (jobs.length > 0) {
            await processDescriptionJobs(jobs);
        }
    }

    async function runRegenerateAllDescriptions() {
        if (!dom.regenerateDescBtn) return;
        dom.regenerateDescBtn.disabled = true;
        const prev = dom.regenerateDescBtn.textContent;
        dom.regenerateDescBtn.textContent = '…';
        try {
            AideScripts.clearAllScriptDescriptions();
            const aideList = AideScripts.loadAll();
            for (let i = 0; i < aideList.length; i++) {
                const s = aideList[i];
                const txt = await AideModels.ollamaSummarizeScriptCode(s.code);
                if (txt) AideScripts.setScriptDescription(AideScripts.descKeyAide(s.id), txt);
            }
            clearLocalScriptContentCache();
            await new Promise(resolve => {
                fetchLocalScriptList(() => resolve());
            });
            for (let j = 0; j < localScriptEntries.length; j++) {
                const e = localScriptEntries[j];
                const code = await new Promise(resolve => loadLocalFileContent(e.path, resolve));
                if (!code || String(code).indexOf('Error') === 0) continue;
                const txt = await AideModels.ollamaSummarizeScriptCode(code);
                if (txt) AideScripts.setScriptDescription(AideScripts.descKeyLocal(e.path), txt);
            }
            refreshScriptsList();
        } finally {
            dom.regenerateDescBtn.disabled = false;
            dom.regenerateDescBtn.textContent = prev;
        }
    }

    function syncStarFilterBtn() {
        if (!dom.scriptsStarFilterBtn) return;
        dom.scriptsStarFilterBtn.classList.toggle('active', scriptsStarFilter);
        dom.scriptsStarFilterBtn.classList.toggle('starred', scriptsStarFilter);
        dom.scriptsStarFilterBtn.textContent = scriptsStarFilter ? '★' : '☆';
        dom.scriptsStarFilterBtn.title = scriptsStarFilter ? 'Show all scripts' : 'Show starred only';
    }

    function setScriptsSubTab(tab) {
        if (['local', 'sets', 'favs'].indexOf(tab) >= 0) {
            scriptsSubTab = tab;
        } else {
            scriptsSubTab = 'local';
        }
        AideScripts.setScriptsSubtab(scriptsSubTab);
        syncScriptsSubtabUI();
        if (scriptsSubTab === 'local' || scriptsSubTab === 'favs') {
            fetchLocalScriptTree(() => {
                fetchLocalScriptList(() => refreshScriptsList());
            });
        } else if (scriptsSubTab === 'sets') {
            fetchAideSets(() => refreshScriptsList());
        } else {
            refreshScriptsList();
        }
    }

    function setScriptsStarFilter(on) {
        scriptsStarFilter = !!on;
        AideScripts.setScriptsStarFilter(scriptsStarFilter);
        syncStarFilterBtn();
        refreshScriptsList();
    }

    function updateScriptsEmptyState() {
        const title = dom.scriptsEmpty.querySelector('.scripts-empty-title');
        const hint = dom.scriptsEmpty.querySelector('.scripts-empty-hint');
        if (scriptsSubTab === 'local') {
            if (title) title.textContent = 'No local scripts found';
            if (hint) {
                hint.textContent = 'Scripts Panel folder is empty.';
            }
        } else if (scriptsSubTab === 'sets') {
            if (title) title.textContent = 'No sets found';
            if (hint) {
                hint.textContent = 'Create a Set with the + New Set button below.';
            }
        } else if (scriptsSubTab === 'favs') {
            if (title) title.textContent = 'No favorites yet';
            if (hint) {
                hint.textContent = 'Star (★) any script to add it here.';
            }
        }
    }

    function refreshScriptsList() {
        syncScriptsSubtabUI();
        syncStarFilterBtn();
        syncViewToggleBtn();
        syncShowHiddenBtn();
        updateScriptsEmptyState();
        if (scriptsSubTab === 'local') {
            renderLocalTreePanel();
        } else if (scriptsSubTab === 'favs') {
            renderFavsPanel();
        } else if (scriptsSubTab === 'sets') {
            renderSetsPanel();
        }
    }

    // ── Step 5: Fetch tree data via scanScriptFolderJson ──
    function fetchLocalScriptTree(cb) {
        let folders = AideScripts.getScriptFolders();
        if (autoDetectedScriptsPanelPath && !folders.includes(autoDetectedScriptsPanelPath)) {
            folders.unshift(autoDetectedScriptsPanelPath);
        }
        if (!folders.length) {
            localTreeData = [];
            cb([]);
            return;
        }
        if (!csInterface) {
            // Browser mode: use mock tree from getMockTreeData()
            localTreeData = getMockTreeData();
            cb(localTreeData);
            return;
        }
        const payload = JSON.stringify(folders);
        evalScriptSafe(`scanScriptFolderJson(${payload})`, ({ success, result }) => {
            if (!success) { localTreeData = []; cb([]); return; }
            try {
                const parsed = result ? JSON.parse(result) : [];
                localTreeData = Array.isArray(parsed) ? parsed : [];
            } catch (err) {
                localTreeData = [];
            }
            cb(localTreeData);
        });
    }

    // Backwards-compat: flat list fetch still used by enrichment / save functions.
    function fetchLocalScriptList(cb) {
        let folders = AideScripts.getScriptFolders();
        if (autoDetectedScriptsPanelPath && !folders.includes(autoDetectedScriptsPanelPath)) {
            folders.unshift(autoDetectedScriptsPanelPath);
        }
        if (!csInterface || !folders.length) {
            localScriptEntries = [];
            cb([]);
            return;
        }
        const payload = JSON.stringify(folders);
        evalScriptSafe(`listLocalScriptsFoldersJson(${payload})`, ({ success, result }) => {
            if (!success) {
                localScriptEntries = [];
                cb([]);
                return;
            }
            try {
                const parsed = result ? JSON.parse(result) : [];
                localScriptEntries = Array.isArray(parsed) ? parsed : [];
            } catch (err) {
                localScriptEntries = [];
            }
            cb(localScriptEntries);
        });
    }

    // ── Step 6: Fetch Sets data via readAideSetsJson ──
    function fetchAideSets(cb) {
        let folders = AideScripts.getScriptFolders();
        if (autoDetectedScriptsPanelPath && !folders.includes(autoDetectedScriptsPanelPath)) {
            folders.unshift(autoDetectedScriptsPanelPath);
        }
        if (!folders.length) {
            localSetsData = [];
            cb([]);
            return;
        }
        if (!csInterface) {
            localSetsData = [{ _path: '/mock/set.aide-set.json', name: 'Mock Set', color: '#E8A838', icon: '📦', scripts: [] }];
            cb(localSetsData);
            return;
        }
        const payload = JSON.stringify(folders);
        evalScriptSafe(`readAideSetsJson(${payload})`, ({ success, result }) => {
            if (!success) { localSetsData = []; cb([]); return; }
            try {
                const parsed = result ? JSON.parse(result) : [];
                localSetsData = Array.isArray(parsed) ? parsed : [];
            } catch (err) {
                localSetsData = [];
            }
            cb(localSetsData);
        });
    }

    // ── Step 6: Render the Sets panel ──
    function renderSetsPanel() {
        const enc = p => encodeURIComponent(p);
        const esc = AideUtils.escapeHtml;
        const runIconSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="8 5 19 12 8 19 8 5"/></svg>`;
        const decodeLabel = (value) => {
            const raw = String(value || '');
            try { return decodeURIComponent(raw); } catch (e) { return raw.replace(/%20/g, ' '); }
        };
        const q     = (dom.scriptsSearch.value || '').toLowerCase().trim();

        if (localSetsData.length === 0 && !q) {
            dom.scriptsList.innerHTML = `<button class="create-set-full-btn" id="create-new-set-btn" style="margin-top:20px">+ Create New Set</button>`;
            return;
        }

        let filteredSets = localSetsData.slice();
        if (q) {
            filteredSets = filteredSets.filter(s => (s.name || '').toLowerCase().indexOf(q) !== -1);
        }

        dom.scriptsList.innerHTML = `
            <div class="sets-container">
                ${filteredSets.map(s => {
                    // Extract filenames for scripts array
                    const scriptRows = (s.scripts || []).map(p => {
                        const name = decodeLabel(p.split('/').pop().split('\\').pop());
                        return `<div class="set-script-row">
                            <button type="button" class="tree-run-btn" data-action="run-local" data-enc-path="${enc(p)}" title="Run">${runIconSvg}</button>
                            <span>📄 ${esc(name)}</span>
                        </div>`;
                    }).join('');

                    return `<details class="set-card" style="border-left-color: ${esc(s.color || '#fff')};">
                        <summary class="set-card-header">
                            <span class="set-icon">${esc(s.icon || '📦')}</span>
                            <span class="set-name">${esc(s.name)}</span>
                            <span class="set-count">${(s.scripts || []).length} scripts</span>
                            <button class="tree-overflow-btn" data-action="set-overflow" data-path="${enc(s._path)}" title="Set options">⋯</button>
                        </summary>
                        <div class="set-card-scripts">${scriptRows}</div>
                    </details>`;
                }).join('')}
            </div>
            <button class="create-set-full-btn" id="create-new-set-btn">+ Create New Set</button>
        `;
    }

    // ── Step 9: Smooth accordion for set-card <details> ──
    // Delegated on scriptsList so it re-attaches automatically after re-renders.
    if (dom.scriptsList) {
        dom.scriptsList.addEventListener('toggle', (e) => {
            const t = e.target;
            if (!(t instanceof HTMLDetailsElement)) return;

            // Sets card accordion animation
            const setCard = t.closest('.set-card');
            if (setCard) {
                const body = setCard.querySelector('.set-card-scripts');
                if (!body) return;

                if (setCard.open) {
                    // Expanding: animate from 0 → scrollHeight
                    body.style.maxHeight = '0';
                    body.style.overflow  = 'hidden';
                    body.style.transition = 'max-height 0.22s cubic-bezier(0.22, 1, 0.36, 1)';
                    requestAnimationFrame(() => {
                        body.style.maxHeight = body.scrollHeight + 'px';
                    });
                    body.addEventListener('transitionend', function once() {
                        body.style.maxHeight = '';
                        body.style.overflow  = '';
                        body.style.transition = '';
                        body.removeEventListener('transitionend', once);
                    }, { once: true });
                } else {
                    // Collapsing: animate from current height → 0
                    body.style.maxHeight = body.scrollHeight + 'px';
                    body.style.overflow  = 'hidden';
                    body.style.transition = 'max-height 0.18s ease-in';
                    requestAnimationFrame(() => {
                        body.style.maxHeight = '0';
                    });
                }
                return;
            }

            // Scripts tree: persist open/closed state so rerenders don't collapse folders
            const folder = t.closest('.script-folder');
            if (folder) {
                const encPath = folder.getAttribute('data-folder-path') || '';
                let path = '';
                try { path = decodeURIComponent(encPath); } catch (e2) { path = encPath; }
                AideScripts.setFolderOpen(path, folder.open);
            }
        }, true /* capture to beat default toggle behaviour */);
    }

    // ── Step 7: Render the Favs panel ──
    function renderFavsPanel() {
        const enc = p => encodeURIComponent(p);
        const esc = AideUtils.escapeHtml;
        const q     = (dom.scriptsSearch.value || '').toLowerCase().trim();
        const favs = AideScripts.loadLocalFavorites();
        const runIconSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="8 5 19 12 8 19 8 5"/></svg>`;

        if (favs.length === 0 && !q) {
            dom.scriptsList.innerHTML = '';
            dom.scriptsList.appendChild(dom.scriptsEmpty);
            return;
        }

        let filteredFavs = favs.slice().sort((a,b) => {
            const nameA = a.split('/').pop().split('\\').pop().toLowerCase();
            const nameB = b.split('/').pop().split('\\').pop().toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        if (q) {
            filteredFavs = filteredFavs.filter(p => {
                const name = p.split('/').pop().split('\\').pop();
                return name.toLowerCase().indexOf(q) !== -1;
            });
        }

        dom.scriptsList.innerHTML = `
            <div class="favs-container" style="padding-top: 4px;">
                ${filteredFavs.map(p => {
                    const name = p.split('/').pop().split('\\').pop();
                    const isBin = name.toLowerCase().endsWith('.jsxbin') || name.toLowerCase().endsWith('.bin');
                    return `<div class="tree-row">
                        <span class="tree-label">📄 ${esc(name)}</span>
                        <div class="tree-actions">
                            ${!isBin ? `<button type="button" class="tree-run-btn" data-action="tree-run" data-enc-path="${enc(p)}" title="Run script">${runIconSvg}</button>` : ''}
                            <button type="button" class="tree-overflow-btn" data-action="tree-overflow" data-enc-path="${enc(p)}" data-name="${esc(name)}" data-is-fav="true" data-is-hidden="false" data-is-bin="${isBin}">⋯</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    }

    // ── Step 5: Render the hierarchical tree for the Local subtab ──
    function renderLocalTreePanel() {
        const q     = (dom.scriptsSearch.value || '').toLowerCase().trim();
        AideScripts.renderScriptTree(
            dom.scriptsList,
            dom.scriptsEmpty,
            localTreeData,
            q,
            scriptsStarFilter,
            showHiddenScripts
        );
    }

    // Show-hidden button sync
    function syncShowHiddenBtn() {
        if (!dom.scriptsShowHiddenBtn) return;
        // Only visible on Local sub-tab
        dom.scriptsShowHiddenBtn.classList.toggle('hidden', scriptsSubTab !== 'local');
        dom.scriptsShowHiddenBtn.classList.toggle('active', showHiddenScripts);
        dom.scriptsShowHiddenBtn.title = showHiddenScripts ? 'Hide hidden scripts' : 'Show hidden scripts';
    }

    // ── Step 5: Overflow menu controller ──
    let overflowTarget = null; // { path, name, isFav, isHidden, isBin }
    let menuOverlayBackdrop = null;

    function ensureMenuOverlayBackdrop() {
        if (menuOverlayBackdrop) return menuOverlayBackdrop;
        const backdrop = document.createElement('div');
        backdrop.className = 'menu-overlay-backdrop hidden';
        backdrop.addEventListener('click', () => {
            hideTreeOverflowMenu();
            hideSetOverflowMenu();
        });
        document.body.appendChild(backdrop);
        menuOverlayBackdrop = backdrop;
        return backdrop;
    }

    function syncMenuOverlayBackdrop() {
        if (!menuOverlayBackdrop) return;
        const treeOpen = dom.treeOverflowMenu && !dom.treeOverflowMenu.classList.contains('hidden');
        const setOpen = dom.setOverflowMenu && !dom.setOverflowMenu.classList.contains('hidden');
        menuOverlayBackdrop.classList.toggle('hidden', !(treeOpen || setOpen));
    }

    function showMenuAsOverlay(menuEl) {
        if (!menuEl) return;
        ensureMenuOverlayBackdrop().classList.remove('hidden');
        menuEl.classList.add('menu-overlay-sheet');
        menuEl.classList.remove('hidden');
    }

    function showTreeOverflowMenu(btn, encPath, name, isFav, isHidden, isBin) {
        const menu = dom.treeOverflowMenu;
        if (!menu) return;
        hideSetOverflowMenu();
        overflowTarget = {
            path: decodeURIComponent(encPath),
            name,
            isFav: isFav === 'true',
            isHidden: isHidden === 'true',
            isBin: isBin === 'true'
        };
        // Update menu item labels based on current state
        const tomFav  = $id('tom-fav');
        const tomHide = $id('tom-hide');
        const tomRun  = $id('tom-run');
        if (tomFav)  tomFav.textContent  = overflowTarget.isFav    ? '☆ Unfavorite' : '★ Favorite';
        if (tomHide) tomHide.textContent = overflowTarget.isHidden ? '👁 Unhide'     : '🙈 Hide';
        if (tomRun)  tomRun.style.display = overflowTarget.isBin   ? 'none'         : '';
        showMenuAsOverlay(menu);
        // Focus first item for accessibility
        const first = menu.querySelector('.tree-overflow-item:not([style*="none"])');
        if (first) first.focus();
    }

    function hideTreeOverflowMenu() {
        if (dom.treeOverflowMenu) {
            dom.treeOverflowMenu.classList.add('hidden');
            dom.treeOverflowMenu.classList.remove('menu-overlay-sheet');
        }
        overflowTarget = null;
        syncMenuOverlayBackdrop();
    }

    function dispatchTreeOverflowAction(action) {
        if (!overflowTarget) return;
        const { path, name, isFav, isHidden, isBin } = overflowTarget;
        hideTreeOverflowMenu();

        if (action === 'run') {
            if (isBin) return;
            if (!isAllowedLocalScriptPath(path)) return;
            loadLocalFileContent(path, (code) => {
                if (code.indexOf('Error') === 0) { alert(code); return; }
                executeCode(code, null, { failedCode: code });
            });
        }
        if (action === 'fav') {
            AideScripts.toggleLocalFavorite(path);
            runScriptsToolbarRefresh();
        }
        if (action === 'hide') {
            AideScripts.toggleHiddenPath(path);
            runScriptsToolbarRefresh();
        }
        if (action === 'copy-path') {
            try { navigator.clipboard.writeText(path); } catch (e) { /* ignore */ }
        }
        if (action === 'reveal') {
            if (csInterface) {
                evalScriptSafe(`revealLocalFileInFinder(${JSON.stringify(path)})`, () => {});
            }
        }
        if (action === 'edit-desc') {
            const dkey = AideScripts.descKeyLocal(path);
            const cur  = AideScripts.getScriptDescription(dkey);
            const newDesc = prompt('Description for\n' + name + ':', cur);
            if (newDesc !== null) {
                AideScripts.setScriptDescription(dkey, newDesc.trim());
                // No re-render needed — description not shown in tree rows
            }
        }
        if (action === 'add-to-set') {
            showAddToSetPrompt(path, name);
        }
    }

    // ── Browser mode: mock tree data ──
    function getMockTreeData() {
        return [
            {
                name: 'Scripts Panel',
                path: '/Users/MockUser/Library/Preferences/Adobe InDesign/Version 20.0/en_US/Scripts/Scripts Panel',
                type: 'folder',
                children: [
                    {
                        name: 'Utilities',
                        path: '/Users/MockUser/Library/Preferences/Adobe InDesign/Version 20.0/en_US/Scripts/Scripts Panel/Utilities',
                        type: 'folder',
                        children: [
                            { name: 'Hello World.jsx', path: '/Users/MockUser/.../Hello World.jsx', type: 'file', ext: '.jsx' },
                            { name: 'Auto-flow text.jsx', path: '/Users/MockUser/.../Auto-flow text.jsx', type: 'file', ext: '.jsx' }
                        ]
                    },
                    { name: 'Export All.jsx', path: '/Users/MockUser/.../Export All.jsx', type: 'file', ext: '.jsx' },
                    { name: 'Make Grid.jsx',  path: '/Users/MockUser/.../Make Grid.jsx',  type: 'file', ext: '.jsx' }
                ]
            }
        ];
    }

    function getDecodedPath(encPath) {
        try {
            return decodeURIComponent(encPath);
        } catch (e) {
            return '';
        }
    }

    function loadLocalFileContent(path, cb) {
        if (!isAllowedLocalScriptPath(path)) {
            cb('Error: Path not allowed.');
            return;
        }
        if (localScriptContentCache[path]) {
            cb(localScriptContentCache[path]);
            return;
        }
        if (!csInterface) {
            cb('Error: No InDesign connection.');
            return;
        }
        // 3.6: Route through evalScriptSafe for consistent error handling
        evalScriptSafe(`readLocalScriptFile(${JSON.stringify(path)})`, ({ success, result, error }) => {
            if (!success) {
                cb('Error: ' + (error || 'Failed to read file'));
                return;
            }
            if (result && result.indexOf('Error') === 0) {
                cb(result);
                return;
            }
            localScriptContentCache[path] = result;
            cb(result);
        });
    }


    if (dom.scriptsSubtabLocal) {
        dom.scriptsSubtabLocal.addEventListener('click', () => setScriptsSubTab('local'));
    }
    if (dom.scriptsSubtabSets) {
        dom.scriptsSubtabSets.addEventListener('click', () => setScriptsSubTab('sets'));
    }
    if (dom.scriptsSubtabFavs) {
        dom.scriptsSubtabFavs.addEventListener('click', () => setScriptsSubTab('favs'));
    }
    if (dom.scriptsStarFilterBtn) {
        dom.scriptsStarFilterBtn.addEventListener('click', () => setScriptsStarFilter(!scriptsStarFilter));
    }
    if (dom.scriptsViewToggleBtn) {
        dom.scriptsViewToggleBtn.addEventListener('click', () => {
            setScriptsViewMode(scriptsViewMode === 'compact' ? 'expanded' : 'compact');
        });
    }

    if (dom.scriptsRefreshBtn) {
        dom.scriptsRefreshBtn.addEventListener('click', () => {
            runScriptsToolbarRefresh();
        });
    }

    // Step 5: Show Hidden toggle
    if (dom.scriptsShowHiddenBtn) {
        dom.scriptsShowHiddenBtn.addEventListener('click', () => {
            showHiddenScripts = !showHiddenScripts;
            AideScripts.setShowHidden(showHiddenScripts);
            syncShowHiddenBtn();
            renderLocalTreePanel();
        });
    }

    function syncScriptsSearchClear() {
        if (!dom.scriptsSearchClear) return;
        const has = !!(dom.scriptsSearch && dom.scriptsSearch.value && dom.scriptsSearch.value.trim());
        dom.scriptsSearchClear.disabled = !has;
    }

    dom.scriptsSearch.addEventListener('input', () => {
        syncScriptsSearchClear();
        refreshScriptsList();
    });
    if (dom.scriptsSearchClear) {
        dom.scriptsSearchClear.addEventListener('click', () => {
            dom.scriptsSearch.value = '';
            syncScriptsSearchClear();
            refreshScriptsList();
            try { dom.scriptsSearch.focus(); } catch (e) { /* ignore */ }
        });
        syncScriptsSearchClear();
    }

    // ── Step 5: Script list click delegation (tree-run + tree-overflow) ──
    if (dom.scriptsList) {
        dom.scriptsList.addEventListener('click', (e) => {
            hideTreeOverflowMenu();

            const runBtn = e.target.closest('[data-action="tree-run"]');
            if (runBtn) {
                const encPath = runBtn.dataset.encPath;
                if (!encPath) return;
                const path = decodeURIComponent(encPath);
                if (!isAllowedLocalScriptPath(path)) return;
                // Step 9: pulse animation
                runBtn.classList.add('pulse');
                setTimeout(() => runBtn.classList.remove('pulse'), 300);
                loadLocalFileContent(path, (code) => {
                    if (code.indexOf('Error') === 0) { alert(code); return; }
                    executeCode(code, runBtn, { failedCode: code });
                });
                return;
            }

            const ovfBtn = e.target.closest('[data-action="tree-overflow"]');
            if (ovfBtn) {
                e.stopPropagation();
                const ep       = ovfBtn.dataset.encPath || '';
                const name     = ovfBtn.dataset.name || '';
                const isFav    = ovfBtn.dataset.isFav || 'false';
                const isHidden = ovfBtn.dataset.isHidden || 'false';
                const isBin    = ovfBtn.dataset.isBin || 'false';
                showTreeOverflowMenu(ovfBtn, ep, name, isFav, isHidden, isBin);
                return;
            }
        });
    }

    // Double-click local tree row → execute script
    if (dom.scriptsList) {
        dom.scriptsList.addEventListener('dblclick', (e) => {
            const row = e.target.closest('.script-row');
            if (!row) return;
            if (e.target.closest('.tree-run-btn') || e.target.closest('.tree-overflow-btn')) return;
            if (row.dataset.isBin === 'true') return;
            const encPath = row.dataset.path || '';
            const path = getDecodedPath(encPath);
            if (!path || !isAllowedLocalScriptPath(path)) return;
            loadLocalFileContent(path, (code) => {
                if (code.indexOf('Error') === 0) { alert(code); return; }
                executeCode(code, null, { failedCode: code });
            });
        });
    }

    // ── Step 5: Overflow menu item click ──
    if (dom.treeOverflowMenu) {
        dom.treeOverflowMenu.addEventListener('click', (e) => {
            const item = e.target.closest('[data-overflow-action]');
            if (!item) return;
            dispatchTreeOverflowAction(item.dataset.overflowAction);
        });
        // Keyboard dismiss
        dom.treeOverflowMenu.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideTreeOverflowMenu();
        });
    }

    // Click outside overflow menu → dismiss
    document.addEventListener('click', (e) => {
        if (dom.treeOverflowMenu && !dom.treeOverflowMenu.classList.contains('hidden')) {
            if (!dom.treeOverflowMenu.contains(e.target) && !e.target.closest('[data-action="tree-overflow"]')) {
                hideTreeOverflowMenu();
            }
        }
        if (dom.setOverflowMenu && !dom.setOverflowMenu.classList.contains('hidden')) {
            if (!dom.setOverflowMenu.contains(e.target) && !e.target.closest('[data-action="set-overflow"]')) {
                hideSetOverflowMenu();
            }
        }
    });

    // ── Step 6: Sets Overflow & Overlay logic ──
    let setOverflowTarget = null; // enc path

    function showSetOverflowMenu(btn, encPath) {
        const menu = dom.setOverflowMenu;
        if (!menu) return;
        hideTreeOverflowMenu();
        setOverflowTarget = encPath;
        showMenuAsOverlay(menu);
        const first = menu.querySelector('.tree-overflow-item');
        if (first) first.focus();
    }

    function hideSetOverflowMenu() {
        if (dom.setOverflowMenu) {
            dom.setOverflowMenu.classList.add('hidden');
            dom.setOverflowMenu.classList.remove('menu-overlay-sheet');
        }
        setOverflowTarget = null;
        syncMenuOverlayBackdrop();
    }

    // Set Edit State
    let editingSetPath = null;
    
    function showSetOverlay(existingSet) {
        if (!dom.setOverlay) return;
        function normalizeHex(v) {
            const s = String(v || '').trim();
            if (!s) return '';
            const up = s.charAt(0) === '#' ? s.toUpperCase() : ('#' + s.toUpperCase());
            return /^#[0-9A-F]{6}$/.test(up) ? up : '';
        }
        function syncSetSwatches(color) {
            const wrap = document.getElementById('set-color-swatches');
            if (!wrap) return;
            const btns = Array.prototype.slice.call(wrap.querySelectorAll('.set-color-swatch'));
            btns.forEach(b => b.classList.toggle('active', String(b.getAttribute('data-color') || '').toUpperCase() === String(color || '').toUpperCase()));
        }

        if (existingSet) {
            editingSetPath = existingSet._path;
            dom.setOverlayTitle.textContent = 'Edit Set';
            dom.setOverlayName.value = existingSet.name || '';
            dom.setOverlayIcon.value = existingSet.icon || '📦';
            dom.setOverlayColor.value = normalizeHex(existingSet.color) || '#E8A838';
        } else {
            editingSetPath = null;
            dom.setOverlayTitle.textContent = 'Create New Set';
            dom.setOverlayName.value = '';
            dom.setOverlayIcon.value = '📦';
            dom.setOverlayColor.value = '#E8A838';
        }
        syncSetSwatches(dom.setOverlayColor.value);
        dom.setOverlay.classList.remove('hidden');
        dom.setOverlayName.focus();
    }
    
    function hideSetOverlay() {
        if (dom.setOverlay) dom.setOverlay.classList.add('hidden');
    }

    function saveAideSet(name, icon, color, existingScripts) {
        const setJson = JSON.stringify({
            name, icon, color,
            scripts: existingScripts || [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        }, null, 2);

        let targetPath = editingSetPath;
        if (!targetPath) {
            // Use first user-added folder, fall back to auto-detected Scripts Panel path
            let folders = AideScripts.getScriptFolders();
            if (!folders.length && autoDetectedScriptsPanelPath) {
                folders = [autoDetectedScriptsPanelPath];
            }
            if (!folders.length) return alert("Please add a local scripts folder in Settings first.");
            const safeName = name.replace(/[\/\\:*?"<>|]/g, '_') || 'New Set';
            targetPath = folders[0] + '/' + safeName + '.aide-set.json';
        }
        
        evalScriptSafe(`writeAideSet(${JSON.stringify(targetPath)}, ${JSON.stringify(setJson)})`, () => {
            hideSetOverlay();
            runScriptsToolbarRefresh();
        });
    }

    if (dom.setOverlayCancel) dom.setOverlayCancel.addEventListener('click', hideSetOverlay);
    if (dom.setOverlay) {
        dom.setOverlay.addEventListener('click', (e) => {
            if (e.target === dom.setOverlay) hideSetOverlay();
        });
    }
    // Set color swatches (avoid native color picker behind CEP)
    const setSwatches = $id('set-color-swatches');
    if (setSwatches && dom.setOverlayColor) {
        setSwatches.addEventListener('click', (e) => {
            const btn = e.target.closest('.set-color-swatch');
            if (!btn) return;
            const c = String(btn.getAttribute('data-color') || '').trim();
            if (!c) return;
            dom.setOverlayColor.value = c;
            const btns = Array.prototype.slice.call(setSwatches.querySelectorAll('.set-color-swatch'));
            btns.forEach(b => b.classList.toggle('active', b === btn));
        });
    }
    if (dom.setOverlayColor) {
        dom.setOverlayColor.addEventListener('input', () => {
            // live sync swatch active state if exact match
            const val = String(dom.setOverlayColor.value || '').trim().toUpperCase();
            const wrap = $id('set-color-swatches');
            if (!wrap) return;
            const btns = Array.prototype.slice.call(wrap.querySelectorAll('.set-color-swatch'));
            btns.forEach(b => b.classList.toggle('active', String(b.getAttribute('data-color') || '').toUpperCase() === val));
        });
    }
    if (dom.setOverlaySave) {
        dom.setOverlaySave.addEventListener('click', () => {
            const name = dom.setOverlayName.value.trim();
            if (!name) return alert("Name is required.");
            
            // Find existing if editing
            let existingScripts = [];
            if (editingSetPath) {
                const s = localSetsData.find(x => x._path === editingSetPath);
                if (s) existingScripts = s.scripts || [];
            }
            saveAideSet(name, dom.setOverlayIcon.value || '📦', dom.setOverlayColor.value || '#E8A838', existingScripts);
        });
    }

    if (dom.setOverflowMenu) {
        dom.setOverflowMenu.addEventListener('click', (e) => {
            const item = e.target.closest('[data-set-action]');
            if (!item || !setOverflowTarget) return;
            const action = item.dataset.setAction;
            const path = decodeURIComponent(setOverflowTarget);
            hideSetOverflowMenu();

            if (action === 'delete') {
                if (confirm('Delete this set? The scripts inside will not be deleted.')) {
                    evalScriptSafe(`deleteAideSet(${JSON.stringify(path)})`, () => {
                        runScriptsToolbarRefresh();
                    });
                }
            } else if (action === 'rename' || action === 'color') {
                const s = localSetsData.find(x => x._path === path);
                if (s) showSetOverlay(s);
            }
        });
        dom.setOverflowMenu.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideSetOverflowMenu();
        });
    }

    // Step 6: Create New Set + set-overflow delegation
    if (dom.scriptsList) {
        dom.scriptsList.addEventListener('click', (e) => {
            const createBtn = e.target.closest('#create-new-set-btn');
            if (createBtn) {
                showSetOverlay(null);
                return;
            }
            const setOvf = e.target.closest('[data-action="set-overflow"]');
            if (setOvf) {
                e.stopPropagation();
                showSetOverflowMenu(setOvf, setOvf.dataset.path);
            }
        });
    }

    function showAddToSetPrompt(scriptPath, scriptName) {
        if (!localSetsData.length) {
            alert("No Sets available. Create one in the Sets tab first.");
            return;
        }
        const listStr = localSetsData.map((s, i) => `${i+1}) ${s.name}`).join('\n');
        const ans = prompt(`Add ${scriptName} to which Set?\nEnter number:\n\n${listStr}`);
        if (!ans) return;
        const idx = parseInt(ans, 10) - 1;
        if (idx >= 0 && idx < localSetsData.length) {
            const targetSet = localSetsData[idx];
            let newScripts = targetSet.scripts || [];
            if (newScripts.indexOf(scriptPath) === -1) {
                newScripts.push(scriptPath);
                // Save it
                const setJson = JSON.stringify({
                    name: targetSet.name,
                    icon: targetSet.icon,
                    color: targetSet.color,
                    scripts: newScripts,
                    created: targetSet.created || new Date().toISOString(),
                    modified: new Date().toISOString()
                }, null, 2);
                evalScriptSafe(`writeAideSet(${JSON.stringify(targetSet._path)}, ${JSON.stringify(setJson)})`, () => {
                    runScriptsToolbarRefresh();
                });
            }
        }
    }

    function downloadJsxFile(name, code) {
        const base = (name || 'script').replace(/[/\\:*?"<>|]/g, '_').replace(/\.jsx?$/i, '');
        const defaultName = base + '.jsx';
        
        // 3.6: Guard csInterface before use
        if (!csInterface) return;
        const scriptStr = `aidePromptAndSaveFile(${JSON.stringify(defaultName)}, ${JSON.stringify(code)}, "Save Script", "*.jsx")`;
        evalScriptSafe(scriptStr, ({ success, error }) => {
            if (!success && error) {
                alert(error);
            }
        });
    }

    // ──────────────── Download Overlay ────────────────

    // Pending overlay state
    let _overlayScript = null;

    function showDownloadOverlay(script) {
        if (!dom.aideOverlay) return;
        _overlayScript = script;

        // Populate script name label
        if (dom.overlayScriptName) {
            dom.overlayScriptName.textContent = (script.name || 'Untitled') + '.jsx';
        }

        // Populate folder buttons
        if (dom.overlayFolders) {
            const folders = AideScripts.getScriptFolders();
            const folderSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
            if (folders.length === 0) {
                dom.overlayFolders.innerHTML = '';
            } else {
                dom.overlayFolders.innerHTML = folders.map((f, i) =>
                    `<button class="overlay-folder-btn" data-folder-index="${i}" title="${AideUtils.escapeHtml(f)}">${folderSvg}${AideUtils.escapeHtml(f)}</button>`
                ).join('');
            }
        }

        dom.aideOverlay.classList.remove('hidden');
    }

    function hideDownloadOverlay() {
        if (dom.aideOverlay) dom.aideOverlay.classList.add('hidden');
        _overlayScript = null;
    }

    function saveScriptToFolder(folderPath, script, sourceCardId) {
        if (!script || !csInterface) return;
        const fname = script.name.endsWith('.jsx') ? script.name : script.name + '.jsx';
        // 3.6: Route through evalScriptSafe
        evalScriptSafe(
            `saveScriptFile(${JSON.stringify(folderPath)}, ${JSON.stringify(fname)}, ${JSON.stringify(script.code)})`,
            ({ success, result, error }) => {
                hideDownloadOverlay();
                if (!success) {
                    alert(error || 'Failed to save script');
                    return;
                }
                // Slide-out and remove from Aide list
                const id = sourceCardId || (script && script.id);
                if (!id) { refreshScriptsList(); return; }
                const card = dom.scriptsList.querySelector(`[data-id="${id}"]`);
                if (card) {
                    card.classList.add('script-card-slide-out');
                    setTimeout(() => {
                        AideScripts.remove(id);
                        refreshScriptsList();
                        fetchLocalScriptList(() => {});
                    }, 400);
                } else {
                    AideScripts.remove(id);
                    refreshScriptsList();
                }
            }
        );
    }

    function saveScriptNative(name, code, card, id) {
        if (!csInterface) { downloadJsxFile(name, code); return; }
        const fname = name.endsWith('.jsx') ? name : name + '.jsx';
        // 3.6: Route through evalScriptSafe
        evalScriptSafe('pickScriptsFolder()', ({ success, result }) => {
            if (!success || !result || result === '') return;
            // Add the picked folder to the list for future use
            AideScripts.addScriptFolder(result.trim());
            renderLocalFoldersSettings();
            // Now save into that folder
            evalScriptSafe(
                `saveScriptFile(${JSON.stringify(result.trim())}, ${JSON.stringify(fname)}, ${JSON.stringify(code)})`,
                ({ success: ok, error }) => {
                    if (!ok) { alert(error || 'Failed to save'); return; }
                    if (card) {
                        card.classList.add('script-card-slide-out');
                        setTimeout(() => {
                            if (id) AideScripts.remove(id);
                            refreshScriptsList();
                            fetchLocalScriptList(() => {});
                        }, 400);
                    } else {
                        if (id) AideScripts.remove(id);
                        refreshScriptsList();
                    }
                }
            );
        });
    }

    // Overlay event wiring
    if (dom.aideOverlay) {
        // Close when clicking backdrop
        dom.aideOverlay.addEventListener('click', (e) => {
            if (e.target === dom.aideOverlay) hideDownloadOverlay();
        });
    }
    if (dom.overlayCloseBtn) {
        dom.overlayCloseBtn.addEventListener('click', hideDownloadOverlay);
    }
    if (dom.overlayNativeBtn) {
        dom.overlayNativeBtn.addEventListener('click', () => {
            const script = _overlayScript;
            if (!script) { hideDownloadOverlay(); return; }
            hideDownloadOverlay();
            saveScriptNative(script.name, script.code, null, script.id);
        });
    }
    if (dom.overlayFolders) {
        dom.overlayFolders.addEventListener('click', (e) => {
            const btn = e.target.closest('.overlay-folder-btn');
            if (!btn) return;
            const idx = parseInt(btn.dataset.folderIndex, 10);
            const folders = AideScripts.getScriptFolders();
            if (isNaN(idx) || !folders[idx]) return;
            const script = _overlayScript;
            if (!script) { hideDownloadOverlay(); return; }
            saveScriptToFolder(folders[idx], script, script.id);
        });
    }



    dom.scriptsList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const encPath = btn.dataset.encPath;
        const localPath = encPath ? getDecodedPath(encPath) : '';

        if (action === 'run') {
            const script = AideScripts.getById(id);
            if (script) {
                const card = btn.closest('.script-card');
                executeCode(script.code, btn, { launcherCard: card, failedCode: script.code });
            }
        }
        if (action === 'view' || action === 'toggle-code') {
            const viewer = $id('code-viewer-' + id);
            if (viewer) {
                viewer.classList.toggle('hidden');
                if (btn.dataset.action === 'view') {
                    btn.textContent = viewer.classList.contains('hidden') ? '{ }' : '{ ✕ }';
                }
            }
        }
        if (action === 'download' && id) {
            const script = AideScripts.getById(id);
            if (!script) return;
            const folders = AideScripts.getScriptFolders();
            if (folders.length > 0 && csInterface) {
                // Show overlay so user picks destination
                showDownloadOverlay(script);
            } else if (csInterface) {
                // No folders: launch native file picker directly
                saveScriptNative(script.name, script.code, btn.closest('.script-card'), id);
            } else {
                downloadJsxFile(script.name, script.code);
            }
        }
        if (action === 'load-chat') {
            const script = AideScripts.getById(id);
            if (script) {
                AideChat.newConversation();
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(v => v.classList.remove('active'));
                $id('tab-chat').classList.add('active');
                $id('view-chat').classList.add('active');
                dom.promptInput.value = '';
                persistChatDraft('');
                currentAttachment = {
                    name: script.name + '.jsx',
                    type: 'jsx',
                    content: script.code
                };
                dom.attachedFileName.textContent = currentAttachment.name;
                dom.attachedFile.classList.remove('hidden');
                dom.promptInput.focus();
                renderChatMessages();
            }
        }
        if (action === 'fav') {
            AideScripts.toggleFavorite(id);
            refreshScriptsList();
        }
        if (action === 'delete') {
            if (confirm('Delete this script?')) {
                AideScripts.remove(id);
                refreshScriptsList();
            }
        }
        if (action === 'save-edits') {
            const viewer = $id('code-viewer-' + id);
            if (viewer) {
                const pre = viewer.querySelector('pre');
                if (pre) {
                    AideScripts.update(id, { code: pre.textContent });
                    btn.textContent = '✓ Saved';
                    setTimeout(() => { btn.textContent = 'Save Changes'; }, 1500);
                }
            }
        }
        if (action === 'rename') {
            const script = AideScripts.getById(id);
            if (script) {
                const newName = prompt('New name:', script.name);
                if (newName !== null && newName.trim()) {
                    AideScripts.update(id, { name: newName.trim() });
                    refreshScriptsList();
                }
            }
        }

        if (action === 'run-local' && localPath) {
            if (!isAllowedLocalScriptPath(localPath)) return;
            // Step 9: pulse animation on the run button
            const runBtn = e.target.closest('.tree-run-btn');
            if (runBtn) {
                runBtn.classList.add('pulse');
                setTimeout(() => runBtn.classList.remove('pulse'), 300);
            }
            loadLocalFileContent(localPath, (code) => {
                if (code.indexOf('Error') === 0) {
                    alert(code);
                    return;
                }
                const card = btn.closest('.script-card');
                executeCode(code, btn, { launcherCard: card, failedCode: code });
            });
        }
        if (action === 'view-local' && localPath) {
            const card = btn.closest('.script-card');
            const viewer = card ? card.querySelector('.script-code-viewer') : null;
            if (!viewer || !card) return;
            const pre = viewer.querySelector('pre');
            const opening = viewer.classList.contains('hidden');
            viewer.classList.toggle('hidden');
            btn.textContent = viewer.classList.contains('hidden') ? '{ }' : '{ ✕ }';
            if (opening && pre && !pre.textContent.trim()) {
                loadLocalFileContent(localPath, (code) => {
                    if (code.indexOf('Error') === 0) {
                        pre.textContent = code;
                        return;
                    }
                    pre.textContent = code;
                });
            }
        }
        if (action === 'load-chat-local' && localPath) {
            loadLocalFileContent(localPath, (code) => {
                if (code.indexOf('Error') === 0) {
                    alert(code);
                    return;
                }
                const base = localPath.replace(/^[\\/]/, '').split(/[/\\]/).pop() || 'script.jsx';
                AideChat.newConversation();
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(v => v.classList.remove('active'));
                $id('tab-chat').classList.add('active');
                $id('view-chat').classList.add('active');
                dom.promptInput.value = '';
                persistChatDraft('');
                currentAttachment = { name: base, type: 'jsx', content: code };
                dom.attachedFileName.textContent = currentAttachment.name;
                dom.attachedFile.classList.remove('hidden');
                dom.promptInput.focus();
                renderChatMessages();
            });
        }
        if (action === 'fav-local' && localPath) {
            AideScripts.toggleLocalFavorite(localPath);
            refreshScriptsList();
        }
        if (action === 'reveal-local' && localPath && csInterface) {
            if (!isAllowedLocalScriptPath(localPath)) return;
            // 3.6: Route through evalScriptSafe
            evalScriptSafe(`revealLocalFileInFinder(${JSON.stringify(localPath)})`, () => {});
        }
        if (action === 'save-edits-local' && localPath) {
            const card = btn.closest('.script-card');
            const viewer = card ? card.querySelector('.script-code-viewer') : null;
            if (!viewer || !csInterface) return;
            const pre = viewer.querySelector('pre');
            if (!pre || !isAllowedLocalScriptPath(localPath)) return;
            const text = pre.textContent;
            // 3.6: Route through evalScriptSafe
            evalScriptSafe(
                `writeLocalScriptFile(${JSON.stringify(localPath)}, ${JSON.stringify(text)})`,
                ({ success, result, error }) => {
                    if (!success) alert(error || 'Failed to save');
                    else {
                        localScriptContentCache[localPath] = text;
                        btn.textContent = '✓ Saved';
                        setTimeout(() => { btn.textContent = 'Save Changes'; }, 1500);
                        if (scriptsSubTab === 'local') runScriptsToolbarRefresh();
                    }
                }
            );
        }
    });

    // ──────────────── Settings Tab ────────────────
    const PROVIDER_HINTS = {
        ollama: '',
        google: 'Get your key at <a href="#" onclick="openUrl(\'https://aistudio.google.com/apikey\')">Google AI Studio</a>',
        openai: 'Get your key at <a href="#" onclick="openUrl(\'https://platform.openai.com/api-keys\')">platform.openai.com</a>',
        anthropic: 'Get your key at <a href="#" onclick="openUrl(\'https://console.anthropic.com/\')">console.anthropic.com</a>',
        openrouter: 'Get your key at <a href="#" onclick="openUrl(\'https://openrouter.ai/keys\')">openrouter.ai/keys</a>',
        custom: 'Any OpenAI-compatible endpoint (LM Studio, text-gen-webui, Together AI, etc.)'
    };

    const PROVIDER_KEY_PLACEHOLDERS = {
        ollama: '',
        google: 'AIza...',
        openai: 'sk-...',
        anthropic: 'sk-ant-...',
        openrouter: 'sk-or-v1-...',
        custom: 'API key (optional)'
    };

    window.openUrl = function(url) {
        if (csInterface) {
            csInterface.openURLInDefaultBrowser(url);
        } else {
            window.open(url, '_blank');
        }
    };

    function initSettings() {
        const cfg = AideModels.loadSettings();

        dom.providerSelect.value = cfg.provider;
        dom.ollamaHost.value = cfg.ollamaHost;
        dom.apiKey.value = cfg.apiKeys?.[cfg.provider] || '';
        if (dom.customEndpoint) dom.customEndpoint.value = cfg.customEndpoint || '';
        dom.tempSlider.value = Math.round(cfg.temperature * 100);
        dom.tempValue.textContent = cfg.temperature.toFixed(1);

        // Debug toggle
        if (dom.debugToggle) {
            dom.debugToggle.checked = cfg.debugLogging || false;
            toggleDebugUI(cfg.debugLogging);
        }

        // Prompt modules (2.7.3: always-on by default, opt-out via Advanced)
        if (dom.modScriptui) {
            dom.modScriptui.checked = localStorage.getItem('aide_module_scriptui') !== 'false';
        }
        if (dom.modMenu) {
            dom.modMenu.checked = localStorage.getItem('aide_module_menu') !== 'false';
        }
        if (dom.modExport) {
            dom.modExport.checked = localStorage.getItem('aide_module_export') !== 'false';
        }
        if (dom.modGradients) {
            dom.modGradients.checked = localStorage.getItem('aide_module_gradients') !== 'false';
        }

        renderLocalFoldersSettings();
        syncScriptsSubtabUI();
        syncStarFilterBtn();
        syncViewToggleBtn();
        syncShowHiddenBtn();

        // Step 4: Detect Scripts Panel folder asynchronously
        detectAndRenderAutoFolder();

        toggleProviderUI(cfg.provider);
        refreshModelList();
    }

    // ── Step 4: Auto-detect Scripts Panel folder ──
    /**
     * Calls getDefaultScriptsPanelFolder() via evalScriptSafe.
     * Updates the auto-folder UI row in Settings with the result.
     */
    function detectAndRenderAutoFolder() {
        if (!csInterface) {
            autoDetectedScriptsPanelPath = '~/Library/Preferences/Adobe InDesign/Version 20.0/en_US/Scripts/Scripts Panel';
            renderLocalFoldersSettings();
            return;
        }

        evalScriptSafe('getDefaultScriptsPanelFolder()', ({ success, result }) => {
            const path = (success && result && result.trim() && result !== 'EvalScript error.') ? result.trim() : '';
            autoDetectedScriptsPanelPath = path;
            renderLocalFoldersSettings();
        });
    }

    function renderLocalFoldersSettings() {
        if (!dom.localFoldersList) return;
        let folders = AideScripts.getScriptFolders();
        if (autoDetectedScriptsPanelPath && !folders.includes(autoDetectedScriptsPanelPath)) {
            folders.unshift(autoDetectedScriptsPanelPath);
        }

        if (folders.length === 0) {
            dom.localFoldersList.innerHTML = `
            <div class="local-folders-empty" id="add-local-scripts-folder-empty" role="button" tabindex="0" title="Add a local scripts folder">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                Add folder…
            </div>`;
            return;
        }

        dom.localFoldersList.innerHTML = folders.map((p, i) => {
            const isAuto = (p === autoDetectedScriptsPanelPath);
            let displayPath = String(p || '');
            try { displayPath = decodeURIComponent(displayPath); } catch (e) { displayPath = displayPath.replace(/%20/g, ' '); }
            // If the folder is auto-detected and was unshifted, the real index in AideScripts is i-1
            // (Wait, actually if it is NOT in the real list, its real index is invalid anyway, but removeBtnHtml is empty)
            const realIndex = (autoDetectedScriptsPanelPath && !AideScripts.getScriptFolders().includes(autoDetectedScriptsPanelPath)) ? i - 1 : i;

            const badgeHtml = isAuto ? `<span style="font-size: 9px; color: var(--success); margin-right: 5px;" title="Scripts Panel folder automatically detected">● Default Panel</span> ` : '';
            const removeBtnHtml = isAuto ? '' : `<button type="button" class="compact-btn danger local-folder-remove" data-folder-index="${realIndex}" title="Remove folder">−</button>`;
            
            return `
            <div class="local-folder-row">
                <span class="storage-path-value">${badgeHtml}${AideUtils.escapeHtml(displayPath)}</span>
                <button type="button" class="code-action-btn local-folder-open-btn" data-open-folder-index="${realIndex}" title="Open folder">📁</button>
                ${removeBtnHtml}
                <button type="button" class="compact-btn local-folder-add" data-folder-index="${realIndex}" title="Add another folder">+</button>
            </div>`;
        }).join('');
    }

    function toggleProviderUI(provider) {
        dom.ollamaHostRow.classList.toggle('hidden', provider !== 'ollama');
        dom.apiKeyRow.classList.toggle('hidden', provider === 'ollama');
        if (dom.customEndpointRow) {
            dom.customEndpointRow.classList.toggle('hidden', provider !== 'custom');
        }

        dom.apiKey.placeholder = PROVIDER_KEY_PLACEHOLDERS[provider] || 'API key';

        const hint = PROVIDER_HINTS[provider];
        if (dom.providerHint) {
            if (hint) {
                dom.providerHint.innerHTML = hint;
                dom.providerHint.classList.remove('hidden');
            } else {
                dom.providerHint.classList.add('hidden');
            }
        }
    }

    function toggleDebugUI(enabled) {
        if (dom.debugActions) {
            dom.debugActions.classList.toggle('hidden', !enabled);
        }
    }

    // Provider change → auto-select default model and restore its API key
    dom.providerSelect.addEventListener('change', () => {
        const provider = dom.providerSelect.value;
        const defaultModel = AideModels.getDefaultModel(provider);

        AideModels.setConfig({ provider, model: defaultModel });
        dom.apiKey.value = AideModels.getConfig().apiKeys?.[provider] || '';

        // Clear custom model on provider switch
        dom.modelCustom.value = '';
        dom.modelCustomRow.classList.add('hidden');
        dom.clearCustomModel.disabled = true;

        toggleProviderUI(provider);
        refreshModelList();
        checkConnection();
    });

    dom.ollamaHost.addEventListener('change', () => {
        AideModels.setConfig({ ollamaHost: dom.ollamaHost.value.trim() });
        refreshModelList();
        checkConnection();
    });

    if (dom.customEndpoint) {
        dom.customEndpoint.addEventListener('change', () => {
            AideModels.setConfig({ customEndpoint: dom.customEndpoint.value.trim() });
        });
    }

    dom.apiKey.addEventListener('change', () => {
        const provider = AideModels.getConfig().provider;
        AideModels.setApiKey(provider, dom.apiKey.value.trim());
        refreshModelList();
        checkConnection();
    });

    dom.toggleKeyVis.addEventListener('click', () => {
        dom.apiKey.type = dom.apiKey.type === 'password' ? 'text' : 'password';
    });

    dom.tempSlider.addEventListener('input', () => {
        const val = parseInt(dom.tempSlider.value) / 100;
        dom.tempValue.textContent = val.toFixed(1);
        AideModels.setConfig({ temperature: val });
    });

    // 2.7.3: Module toggles are now simple opt-out checkboxes (no mode dropdown)
    function updateModulesUI() {
        // Update live token estimate
        let tokens = 0;
        if (dom.modScriptui?.checked) tokens += 300;
        if (dom.modMenu?.checked) tokens += 400;
        if (dom.modExport?.checked) tokens += 150;
        if (dom.modGradients?.checked) tokens += 130;
        
        if (dom.modTokensLive) {
            dom.modTokensLive.textContent = `Base + ${tokens} = ~${2080 + tokens}`;
        }
    }

    const moduleToggles = [
        { el: dom.modScriptui, key: 'aide_module_scriptui' },
        { el: dom.modMenu, key: 'aide_module_menu' },
        { el: dom.modExport, key: 'aide_module_export' },
        { el: dom.modGradients, key: 'aide_module_gradients' }
    ];
    
    moduleToggles.forEach(mod => {
        if (mod.el) {
            mod.el.addEventListener('change', () => {
                try { localStorage.setItem(mod.key, mod.el.checked); }
                catch (e) { /* quota – ignore */ }
                updateModulesUI();
            });
        }
    });

    // Custom model input — enable/disable clear button
    dom.modelCustom.addEventListener('input', () => {
        dom.clearCustomModel.disabled = !dom.modelCustom.value.trim();
    });

    dom.modelCustom.addEventListener('change', () => {
        const model = dom.modelCustom.value.trim();
        if (model) {
            AideModels.setConfig({ model });
            
            // Persist to custom models list for current provider (2.3.1.1 fix)
            const provider = AideModels.getConfig().provider;
            addCustomModelForProvider(provider, model);
            
            dom.clearCustomModel.disabled = false;
            // No refresh here, it will refresh next time the tab is opened or provider changed
            checkConnection();
        }
    });

    // Clear custom model → revert to dropdown selection
    if (dom.clearCustomModel) {
        dom.clearCustomModel.addEventListener('click', () => {
            dom.modelCustom.value = '';
            dom.clearCustomModel.disabled = true;
            dom.modelCustomRow.classList.add('hidden');

            // Revert to dropdown-selected model
            const selected = dom.modelSelect.value;
            if (selected) {
                AideModels.setConfig({ model: selected });
            } else {
                const cfg = AideModels.getConfig();
                const defaultModel = AideModels.getDefaultModel(cfg.provider);
                AideModels.setConfig({ model: defaultModel });
            }
            checkConnection();
        });
    }

    if (dom.clearCustomModelsListBtn) {
        dom.clearCustomModelsListBtn.addEventListener('click', () => {
            if (confirm('Clear all manually added models from the dropdown list?')) {
                clearAllCustomModels();
                refreshModelList();
                dom.clearCustomModelsListBtn.textContent = '✓ Cleared';
                setTimeout(() => { dom.clearCustomModelsListBtn.textContent = '🗑 Clear Saved Models'; }, 1500);
            }
        });
    }

    // Dropdown model selection
    dom.modelSelect.addEventListener('change', () => {
        const model = dom.modelSelect.value;
        if (model === '__custom__') {
            // Show custom model input
            dom.modelCustomRow.classList.remove('hidden');
            dom.modelCustom.focus();
            return;
        }
        if (model) {
            // Hide custom row, use dropdown selection
            dom.modelCustomRow.classList.add('hidden');
            dom.modelCustom.value = '';
            dom.clearCustomModel.disabled = true;
            AideModels.setConfig({ model });
            checkConnection();
        }
    });

    function reconcileSavedModelOption(cfg) {
        const val = (cfg.model || '').trim();
        if (!val || val === '__custom__') return;
        
        // If it's in our saved list or defaults, we don't need a temporary one
        const sel = dom.modelSelect;
        for (let i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === val) {
                sel.options[i].selected = true;
                return;
            }
        }

        // If not found in defaults or persistent list, add it temporarily
        const customOpt = sel.querySelector('option[value="__custom__"]');
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val + ' (unsaved)';
        if (customOpt) sel.insertBefore(opt, customOpt);
        else sel.appendChild(opt);
        opt.selected = true;
    }

    async function refreshModelList() {
        const cfg = AideModels.getConfig();
        dom.modelSelect.innerHTML = '<option value="">Loading...</option>';

        try {
            let options = '';

            if (cfg.provider === 'ollama') {
                const models = await AideModels.fetchOllamaModels();
                if (models.length === 0) {
                    options = '<option value="">No models found</option>';
                } else {
                    options = models.map(m =>
                        `<option value="${m.name}" ${m.name === cfg.model ? 'selected' : ''}>${m.name} (${m.paramSize})</option>`
                    ).join('');
                }
            } else if (cfg.provider === 'google') {
                const models = cfg.apiKeys?.google
                    ? await AideModels.fetchGoogleModels()
                    : AideModels.getRemoteModels('google');
                options = models.map(m =>
                    `<option value="${m.name}" ${m.name === cfg.model ? 'selected' : ''}>${m.name}${m.desc ? ' — ' + m.desc : ''}</option>`
                ).join('');
            } else {
                const models = AideModels.getRemoteModels(cfg.provider);
                if (models.length > 0) {
                    options = models.map(m =>
                        `<option value="${m.name}" ${m.name === cfg.model ? 'selected' : ''}>${m.name}${m.desc ? ' — ' + m.desc : ''}</option>`
                    ).join('');
                } else {
                    options = '<option value="">No preset models</option>';
                }
            }

            // Show custom models for current provider only (2.3.1.1 fix)
            const providerModels = getCustomModelsForProvider(cfg.provider);
            if (providerModels.length > 0) {
                options += `<optgroup label="Custom Models">`;
                options += providerModels.map(name =>
                    `<option value="${name}" ${name === cfg.model ? 'selected' : ''}>${name}</option>`
                ).join('');
                options += `</optgroup>`;
            }

            options += '<option value="__custom__">Custom model name…</option>';
            dom.modelSelect.innerHTML = options;
            reconcileSavedModelOption(AideModels.getConfig());

            // Populate Auto-Summary Model dropdown
            // Fix: Always fetch Ollama models regardless of current provider
            if (dom.summaryModelSelect) {
                try {
                    let ollamaModelsArray = [];
                    let ollamaError = null;
                    
                    try {
                        ollamaModelsArray = await AideModels.fetchOllamaModels();
                    } catch (err) {
                        ollamaError = err.message;
                    }
                    
                    let summaryOptions = '<option value="">[Auto-detect]</option>';
                    if (ollamaModelsArray && ollamaModelsArray.length > 0) {
                        summaryOptions += ollamaModelsArray.map(function(m) {
                            var selected = m.name === (cfg.summaryModel || '') ? 'selected' : '';
                            return '<option value="' + m.name + '" ' + selected + '>' + m.name + ' (' + (m.paramSize || '?') + ')</option>';
                        }).join('');
                    } else {
                        summaryOptions += '<option value="" disabled>Ollama unreachable' + (ollamaError ? ' (' + ollamaError + ')' : '') + '</option>';
                    }
                    dom.summaryModelSelect.innerHTML = summaryOptions;
                } catch(e) {
                     dom.summaryModelSelect.innerHTML = '<option value="">[Auto-detect] (Err: ' + e.message + ')</option>';
                }
            }

        } catch (e) {
            dom.modelSelect.innerHTML = '<option value="">Could not load models</option><option value="__custom__">Custom model name…</option>';
            reconcileSavedModelOption(AideModels.getConfig());
        }
    }

    dom.refreshModels.addEventListener('click', refreshModelList);

    // ── Debug Logging ──
    if (dom.debugToggle) {
        dom.debugToggle.addEventListener('change', () => {
            const enabled = dom.debugToggle.checked;
            AideModels.setConfig({ debugLogging: enabled });
            toggleDebugUI(enabled);
        });
    }

    if (dom.summaryModelSelect) {
        dom.summaryModelSelect.addEventListener('change', () => {
            AideModels.setConfig({ summaryModel: dom.summaryModelSelect.value });
        });
    }

    if (dom.exportDebugBtn) {
        dom.exportDebugBtn.addEventListener('click', () => {
            const logText = AideModels.exportDebugLog();
            if (!logText || logText.indexOf('='.repeat(60)) === -1) {
                dom.exportDebugBtn.textContent = 'No logs yet';
                setTimeout(() => { dom.exportDebugBtn.textContent = 'Export Log'; }, 1500);
                return;
            }

            const defaultName = 'aide_debug_log_' + new Date().toISOString().slice(0, 10) + '.txt';
            const scriptStr = `aidePromptAndSaveFile(${JSON.stringify(defaultName)}, ${JSON.stringify(logText)}, "Save Debug Log", "*.txt")`;

            // 3.6: Route through evalScriptSafe
            if (!csInterface) return;
            evalScriptSafe(scriptStr, ({ success, result, error }) => {
                if (result === 'Cancelled') return;
                
                if (!success) {
                    alert(error || 'Failed to save log');
                    return;
                }

                dom.exportDebugBtn.textContent = '✓ Saved';
                setTimeout(() => { dom.exportDebugBtn.textContent = 'Export Log'; }, 2000);
            });
        });
    }

    if (dom.clearDebugBtn) {
        dom.clearDebugBtn.addEventListener('click', () => {
            if (confirm('Clear all debug log entries?')) {
                AideModels.clearDebugLog();
                dom.clearDebugBtn.textContent = '✓';
                setTimeout(() => { dom.clearDebugBtn.textContent = 'Clear'; }, 1500);
            }
        });
    }

    if (dom.localFoldersList) {
        dom.localFoldersList.addEventListener('click', (e) => {
            const openBtn = e.target.closest('[data-open-folder-index]');
            if (openBtn) {
                const idx = parseInt(openBtn.dataset.openFolderIndex, 10);
                const folders = AideScripts.getScriptFolders();
                if (!isNaN(idx) && folders[idx] && csInterface) {
                    // 3.6: Route through evalScriptSafe
                    evalScriptSafe(`openScriptsFolder(${JSON.stringify(folders[idx])})`, () => { });
                }
                return;
            }
            const rm = e.target.closest('.local-folder-remove');
            if (rm) {
                const idx = parseInt(rm.dataset.folderIndex, 10);
                if (!isNaN(idx)) {
                    AideScripts.removeScriptFolder(idx);
                    clearLocalScriptContentCache();
                    renderLocalFoldersSettings();
                    if (scriptsSubTab === 'local') runScriptsToolbarRefresh();
                }
                return;
            }
            const add = e.target.closest('.local-folder-add') || e.target.closest('#add-local-scripts-folder-empty') || e.target.closest('.local-folders-empty');
            if (add) {
                const idxStr = add.dataset.folderIndex;
                const insertIdx = (idxStr !== undefined) ? parseInt(idxStr, 10) + 1 : -1;
                if (csInterface) {
                    // 3.6: Route through evalScriptSafe
                    evalScriptSafe('pickScriptsFolder()', ({ success, result }) => {
                        if (success && result && result !== '') {
                            AideScripts.addScriptFolder(result, insertIdx);
                            clearLocalScriptContentCache();
                            renderLocalFoldersSettings();
                            if (scriptsSubTab === 'local') runScriptsToolbarRefresh();
                        }
                    });
                } else {
                    const path = prompt('Enter folder path:', '');
                    if (path && path.trim()) {
                        AideScripts.addScriptFolder(path.trim(), insertIdx);
                        clearLocalScriptContentCache();
                        renderLocalFoldersSettings();
                        if (scriptsSubTab === 'local') runScriptsToolbarRefresh();
                    }
                }
            }
        });
    }

    if (dom.regenerateDescBtn) {
        dom.regenerateDescBtn.addEventListener('click', () => {
            runRegenerateAllDescriptions();
        });
    }

    if (dom.generateDescNowBtn) {
        dom.generateDescNowBtn.addEventListener('click', async () => {
            dom.generateDescNowBtn.disabled = true;
            const prev = dom.generateDescNowBtn.textContent;
            dom.generateDescNowBtn.textContent = '…';
            try {
                await runEnrichMissingDescriptions();
            } finally {
                dom.generateDescNowBtn.disabled = false;
                dom.generateDescNowBtn.textContent = prev;
            }
        });
    }

    if (dom.exportDescCsvBtn) {
        dom.exportDescCsvBtn.addEventListener('click', () => {
            const csv = AideScripts.exportDescriptionsCsv();
            if (!csv) { alert('No descriptions to export.'); return; }
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'aide_descriptions_' + new Date().toISOString().slice(0, 10) + '.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (dom.importDescCsvBtn && dom.importDescFile) {
        dom.importDescCsvBtn.addEventListener('click', () => {
            dom.importDescFile.click();
        });
        dom.importDescFile.addEventListener('change', () => {
            const file = dom.importDescFile.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const count = AideScripts.importDescriptionsCsv(reader.result);
                refreshScriptsList();
                alert('Imported ' + count + ' description(s).');
            };
            reader.readAsText(file);
            dom.importDescFile.value = ''; // reset for re-import
        });
    }

    dom.testConnBtn.addEventListener('click', async () => {
        dom.testResult.textContent = 'Testing...';
        dom.testResult.className = 'test-result';

        const cfg = AideModels.getConfig();
        let result;
        if (cfg.provider === 'ollama') {
            result = await AideModels.checkOllamaConnection();
        } else {
            result = await AideModels.testRemoteConnection();
        }

        dom.testResult.textContent = result.ok ? '✓ Connected' : `✕ ${result.error || 'Failed'}`;
        dom.testResult.className = `test-result ${result.ok ? 'ok' : 'fail'}`;
    });

    window.addEventListener('QUOTA_EXCEEDED', (e) => {
        const source = e.detail?.source || 'unknown';
        if (source === 'scripts') {
            alert('Extension Storage Quota Exceeded!\n\nPlease delete some older scripts or move them to Local Folders to free up space.');
        } else if (source === 'debug') {
            console.warn('Debug log exceeded storage quota. Pruning automatically.');
        } else {
            alert('Extension Storage Quota Exceeded!\n\nPlease clear some data to ensure proper functionality.');
        }
    });

    // ──────────────── Step 8: Settings Import / Export ────────────────

    function buildSettingsExport() {
        const cfg = AideModels.getConfig();
        // Use the live in-memory object (already synced with localStorage)
        const customModels = Object.assign({}, savedCustomModels);

        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            provider: cfg.provider,
            model: cfg.model,
            ollamaHost: cfg.ollamaHost,
            customEndpoint: cfg.customEndpoint || '',
            temperature: cfg.temperature,
            summaryModel: cfg.summaryModel || '',
            customModels: customModels,          // per-provider lists of saved custom model names
            additionalFolders: AideScripts.getScriptFolders(),
            showHidden: showHiddenScripts
            // API keys are intentionally excluded
        };
    }

    function showImportExportStatus(msg, isError) {
        if (!dom.importExportStatus) return;
        dom.importExportStatus.textContent = msg;
        dom.importExportStatus.className = 'setting-hint import-export-hint' + (isError ? ' hint-error' : ' hint-ok');
        dom.importExportStatus.classList.remove('hidden');
        clearTimeout(dom.importExportStatus._t);
        dom.importExportStatus._t = setTimeout(() => {
            if (dom.importExportStatus) dom.importExportStatus.classList.add('hidden');
        }, 4000);
    }

    if (dom.exportSettingsBtn) {
        dom.exportSettingsBtn.addEventListener('click', () => {
            const data = buildSettingsExport();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'aide-settings-' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showImportExportStatus('✓ Settings exported — API keys were not included.', false);
        });
    }

    if (dom.importSettingsBtn && dom.importSettingsFile) {
        dom.importSettingsBtn.addEventListener('click', () => dom.importSettingsFile.click());

        dom.importSettingsFile.addEventListener('change', () => {
            const file = dom.importSettingsFile.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!data || typeof data !== 'object') throw new Error('Invalid JSON');

                    // Restore provider / model / temperature / endpoints
                    const cfgUpdate = {};
                    if (data.provider) cfgUpdate.provider = data.provider;
                    if (data.model)    cfgUpdate.model    = data.model;
                    if (typeof data.temperature === 'number') cfgUpdate.temperature = data.temperature;
                    if (data.ollamaHost)     cfgUpdate.ollamaHost     = data.ollamaHost;
                    if (data.customEndpoint) cfgUpdate.customEndpoint = data.customEndpoint;
                    if (data.summaryModel !== undefined) cfgUpdate.summaryModel = data.summaryModel;
                    AideModels.setConfig(cfgUpdate);

                    // Restore per-provider custom model lists
                    if (data.customModels && typeof data.customModels === 'object') {
                        try {
                            localStorage.setItem('aide_custom_models', JSON.stringify(data.customModels));
                            // Refresh the in-memory map used by app.js
                            Object.keys(savedCustomModels).forEach(k => delete savedCustomModels[k]);
                            Object.assign(savedCustomModels, data.customModels);
                        } catch (e) { /* quota – ignore */ }
                    }

                    // Restore script folders
                    if (Array.isArray(data.additionalFolders) && data.additionalFolders.length > 0) {
                        AideScripts.setScriptFolders(data.additionalFolders);
                        clearLocalScriptContentCache();
                    }

                    // Restore showHidden
                    if (typeof data.showHidden === 'boolean') {
                        showHiddenScripts = data.showHidden;
                        AideScripts.setShowHidden(showHiddenScripts);
                        syncShowHiddenBtn();
                    }

                    // Re-initialise the Settings panel to reflect restored values
                    initSettings();
                    showImportExportStatus('✓ Settings imported successfully.', false);

                    // If on local tab, refresh tree
                    if (scriptsSubTab === 'local') runScriptsToolbarRefresh();
                } catch (err) {
                    showImportExportStatus('✕ Import failed: ' + err.message, true);
                }
            };
            reader.readAsText(file);
            dom.importSettingsFile.value = ''; // reset so same file can be re-selected
        });
    }

    // ──────────────── Boot ────────────────
    initSettings();
    restoreChatDraft();
    renderChatMessages();
    checkConnection();
});
