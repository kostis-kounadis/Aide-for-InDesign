/**
 * Aide — chat.js
 * Conversation engine with full message history.
 * Uses /api/chat for Ollama, standard chat completions for remote.
 *
 * System prompt and modules now live in system-prompt.js (AideChatModules).
 * Token budget: ~1900 tokens core + up to ~980 optional modules.
 * Previously the auto-extracted DOM blob added ~1500 tokens unnecessarily.
 */

const AideChat = (() => {
    // Delegate to system-prompt.js — loaded before this script in index.html
    const SYSTEM_PROMPT        = AideChatModules.SYSTEM_PROMPT;
    const MODULE_SCRIPTUI      = AideChatModules.MODULE_SCRIPTUI;
    const MODULE_MENU_COMMANDS = AideChatModules.MODULE_MENU_COMMANDS;
    const MODULE_EXPORT        = AideChatModules.MODULE_EXPORT;
    const MODULE_GRADIENTS     = AideChatModules.MODULE_GRADIENTS;

    // Message history for current conversation
    let messages = [];
    let isGenerating = false;
    let _abortController = null; // active AbortController during generation
    let stickyModules = new Set(); // Persistent module state per conversation

    /**
     * Start a fresh conversation
     */
    function newConversation() {
        messages = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];
        isGenerating = false;
        stickyModules.clear();
    }

    /**
     * Get message history (without system prompt for display)
     */
    function getMessages() {
        return messages.filter(m => m.role !== 'system');
    }

    /**
     * Get conversation length (for context window management)
     */
    function getConversationLength() {
        return messages.reduce((total, m) => total + m.content.length, 0);
    }

    /**
     * Send a user message and get assistant response.
     * Manages context window by trimming old messages if conversation grows too long.
     * @param {string}   userText
     * @param {function} onUpdate - callback({ type: 'start'|'done'|'error'|'aborted', text?: string })
     */
    async function send(userText, onUpdate) {
        if (isGenerating) return;
        if (!userText.trim()) return;

        isGenerating = true;
        _abortController = new AbortController();
        messages.push({ role: 'user', content: userText });
        onUpdate({ type: 'start' });

        try {
            // Context window management: if conversation is very long,
            // trim older messages but always keep system prompt + last 6 exchanges
            const messagesToSend = getContextManagedMessages();

            const responseText = await AideModels.sendChat(messagesToSend, _abortController.signal);

            // Post-process: strip code fences and explanation text
            const cleanCode = AideUtils.stripCodeFences(responseText);

            AideModels.log('ai_response', { raw: responseText.substring(0, 500), clean: cleanCode.substring(0, 500) });

            messages.push({ role: 'assistant', content: cleanCode });
            onUpdate({ type: 'done', text: cleanCode });
        } catch (error) {
            // AbortError means the user stopped generation — treat as a clean cancel, not an error
            if (error.name === 'AbortError') {
                messages.pop(); // Remove the user message we already pushed
                onUpdate({ type: 'aborted' });
            } else {
                AideModels.log('error', { type: 'send_failed', message: error.message });
                messages.pop();
                onUpdate({ type: 'error', text: error.message });
            }
        } finally {
            isGenerating = false;
            _abortController = null;
        }
    }

    /**
     * Abort the current in-flight generation (no-op if idle).
     */
    function abort() {
        if (_abortController) {
            _abortController.abort();
        }
    }

    /**
     * Detect which conditional modules should be injected based on user text.
     * Returns an array of module names: 'scriptui', 'menu', or both.
     */
    function detectModules(userText) {
        const modules = [];

        // Use RegExp with \\b word boundaries to prevent substring false positives (e.g., 'information' triggering 'form')
        // FIX: Single backslash for word boundaries in RegExp literals
        const uiPattern = /\b(dialog|window|button|panel|checkbox|dropdown|input field|slider|progress bar|interface|ui|gui|prompt user|ask user|user input|listbox|radiobutton|radio button|form|modal)\b/i;
        if (uiPattern.test(userText)) {
            modules.push('scriptui');
        }

        const menuPattern = /\b(menu|command|pathfinder|unite|minus front|intersect|exclude|divide|outline text|create outline|flatten|expand appearance|align|distribute|clipping mask|compound path|rasterize|send to front|send to back|bring forward|send backward|lock all|unlock all|hide object|show all|join path|offset path|select all|transform again)\b/i;
        if (menuPattern.test(userText)) {
            modules.push('menu');
        }

        const exportPattern = /\b(export|pdf|png|svg|save as)\b/i;
        if (exportPattern.test(userText)) {
            modules.push('export');
        }

        const gradientPattern = /\b(gradient|gradients|fade|color ramp|radial)\b/i;
        if (gradientPattern.test(userText)) {
            modules.push('gradients');
        }

        return modules;
    }

    /**
     * Manage context window: keep system prompt + recent messages.
     * Small models have 4-8K context; we keep it lean.
     * Conditionally injects ScriptUI / Menu Commands modules when relevant.
     */
    /**
     * Build the messages array for the API call.
     * 2.7.3: All modules are always-on by default. Users can opt-out via Advanced Settings.
     * Context window management trims old messages when conversation grows too long.
     */
    function getContextManagedMessages() {
        const systemMsg = messages[0]; // Always the system prompt
        const conversationMsgs = messages.slice(1);

        // --- Always-on module injection with opt-out (2.7.3) ---
        let enhancedSystemContent = systemMsg.content;

        // Modules are enabled by default; check for explicit opt-out
        const moduleDisabled = {
            scriptui: localStorage.getItem('aide_module_scriptui') === 'false',
            menu: localStorage.getItem('aide_module_menu') === 'false',
            export: localStorage.getItem('aide_module_export') === 'false',
            gradients: localStorage.getItem('aide_module_gradients') === 'false'
        };

        if (!moduleDisabled.scriptui) {
            enhancedSystemContent += '\n\n' + MODULE_SCRIPTUI;
        }
        if (!moduleDisabled.menu) {
            enhancedSystemContent += '\n\n' + MODULE_MENU_COMMANDS;
        }
        if (!moduleDisabled.export) {
            enhancedSystemContent += '\n\n' + MODULE_EXPORT;
        }
        if (!moduleDisabled.gradients) {
            enhancedSystemContent += '\n\n' + MODULE_GRADIENTS;
        }

        const enhancedSystem = { role: 'system', content: enhancedSystemContent };

        // --- Token estimation & trimming ---
        const allMsgs = [enhancedSystem, ...conversationMsgs];
        const totalChars = allMsgs.reduce((t, m) => t + m.content.length, 0);
        const estimatedTokens = totalChars / 4;

        // If under 64000 tokens, send everything
        if (estimatedTokens < 64000) {
            return allMsgs;
        }

        // Otherwise, keep system prompt + last N message pairs
        // Always keep at least the last 6 exchanges (12 messages)
        const maxConvMessages = 12;
        const recentMsgs = conversationMsgs.slice(-maxConvMessages);

        // Add a context note so the model knows history was trimmed
        const contextNote = {
            role: 'user',
            content: '[Note: Earlier messages trimmed. Recent messages follow.]'
        };

        return [enhancedSystem, contextNote, ...recentMsgs];
    }

    /**
     * Prefer fenced ``` code from assistant messages; otherwise use full content.
     */
    function extractCodeFromAssistantContent(content) {
        if (!content) return '';
        const fence = content.match(/```(?:javascript|js|jsx)?\s*([\s\S]*?)```/i);
        if (fence) return fence[1].trim();
        return content.trim();
    }

    /**
     * Trim a script to context-aware size for error-fix prompts.
     * If error message contains a line number, include ±CONTEXT_LINES around it.
     * Otherwise cap at MAX_ERROR_CODE_CHARS to avoid context bloat.
     */
    var CONTEXT_LINES = 20;
    var MAX_ERROR_CODE_CHARS = 15000;

    function trimCodeForErrorFix(code, errorMsg) {
        if (!code) return '';
        // Try to extract line number from error message
        // Patterns: "line 36", "at line 36", "Line 36", "line:36"
        var lineMatch = errorMsg.match(/line[:\s]*(\d+)/i);
        if (lineMatch) {
            var errorLine = parseInt(lineMatch[1], 10);
            if (!isNaN(errorLine) && errorLine > 0) {
                var lines = code.split('\n');
                var startLine = Math.max(0, errorLine - CONTEXT_LINES - 1);
                var endLine = Math.min(lines.length, errorLine + CONTEXT_LINES);
                var snippet = lines.slice(startLine, endLine).join('\n');
                var prefix = startLine > 0 ? '/* ... ' + startLine + ' lines omitted ... */\n' : '';
                var suffix = endLine < lines.length ? '\n/* ... ' + (lines.length - endLine) + ' lines omitted ... */' : '';
                return prefix + snippet + suffix;
            }
        }
        // No line number found — cap by character count
        if (code.length > MAX_ERROR_CODE_CHARS) {
            return code.substring(0, MAX_ERROR_CODE_CHARS) + '\n/* ... truncated ... */';
        }
        return code;
    }

    /**
     * Add an error-feedback turn: tells the LLM the previous script failed.
     * @param {string} [failedCodeOverride] when set (e.g. Scripts launcher), use instead of last assistant message
     */
    async function sendErrorFeedback(errorMsg, onUpdate, failedCodeOverride) {
        AideModels.log('auto_fix', { error: errorMsg });

        let lastCode = (failedCodeOverride != null && String(failedCodeOverride).trim())
            ? String(failedCodeOverride).trim()
            : '';

        if (!lastCode) {
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'assistant') {
                    lastCode = extractCodeFromAssistantContent(messages[i].content);
                    break;
                }
            }
        }

        // Context-aware trimming to avoid context bloat
        var trimmedCode = trimCodeForErrorFix(lastCode, errorMsg);

        const feedbackPrompt = `The previous script produced this error when executed in InDesign:

ERROR: ${errorMsg}

THE FAILING SCRIPT WAS:
${trimmedCode}

Fix all issues. Return the COMPLETE corrected script. Remember: use only ECMAScript 3 syntax (var, no arrow functions, no let/const, no template literals, no for...of, no .includes(), no .map(), no .filter()).`;

        return send(feedbackPrompt, onUpdate);
    }

    /**
     * Log a script execution result (called from app.js after evalScript).
     * This captures InDesign-side errors that the chat engine doesn't see.
     */
    function logExecution(code, result, isError) {
        AideModels.log('execution', {
            codePreview: code.substring(0, 200),
            result: result,
            success: !isError
        });
    }

    function getIsGenerating() {
        return isGenerating;
    }

    // Initialize with system prompt
    newConversation();

    return {
        newConversation, getMessages, send, abort, sendErrorFeedback, logExecution, getIsGenerating, getConversationLength,
        extractCodeFromAssistantContent
    };
})();
