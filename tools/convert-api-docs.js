#!/usr/bin/env node
/**
 * convert-api-docs.js
 *
 * Converts indesignjs.de .md documentation (grid-table format) into a
 * single, token-efficient API reference for Aide's Tier 3 prompt.
 *
 * Usage:
 *   node tools/convert-api-docs.js [source_dir] [output_file]
 *
 * Defaults:
 *   source_dir  = ./_input_ignore/webhelp/
 *   output_file = ./tools/indesign-api.md
 *
 * The resulting file can be pasted into localStorage key 'aide_api_markdown'
 * or loaded via the Advanced Settings UI (future).
 */

const fs   = require('fs');
const path = require('path');

// ── Configuration ──
const DEFAULT_SOURCE = path.resolve(__dirname, '..', '_input_ignore', 'webhelp');
const DEFAULT_OUTPUT = path.resolve(__dirname, 'indesign-api.md');

// High-value classes covering >95% of user requests.
const HIGH_VALUE_CLASSES = [
    'Application', 'Document', 'Page', 'Spread', 'MasterSpread',
    'Layer', 'TextFrame', 'Rectangle', 'Oval', 'Polygon',
    'GraphicLine', 'Group', 'Color', 'Swatch', 'Gradient', 'GradientStop',
    'ParagraphStyle', 'CharacterStyle', 'Font',
    'Table', 'Cell', 'Row', 'Column',
    'Image', 'Link', 'Story', 'Paragraph', 'Character', 'InsertionPoint',
    'Section', 'Guide', 'PageItem', 'SplineItem', 'TextPath', 'ObjectStyle',
    'PDFExportPreference', 'JPEGExportPreference',
    'FindTextPreference', 'ChangeTextPreference',
    'FindGrepPreference', 'ChangeGrepPreference',
    'TransparencySetting', 'DropShadowSetting'
];

// ── Grid-table Parser ──

/**
 * Parse a grid table block (lines starting with +---) and extract
 * the first column value (property/method name), type, and access.
 * Returns array of { name, type, access } objects.
 */
function parseGridTable(lines) {
    const rows = [];
    let currentRow = null;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        // Row separator line: +-----+-----+
        if (/^\+[-=+]+\+$/.test(line)) {
            if (currentRow && currentRow.cols.length > 0) {
                rows.push(currentRow);
            }
            currentRow = { cols: [] };
            continue;
        }

        // Data line: | col1 | col2 | col3 | col4 |
        if (line.charAt(0) === '|' && currentRow) {
            var cells = line.split('|');
            // Remove first and last empty elements from split
            cells = cells.slice(1, cells.length - 1);

            if (currentRow.cols.length === 0) {
                // Initialize columns
                for (var c = 0; c < cells.length; c++) {
                    currentRow.cols.push(cells[c].trim());
                }
            } else {
                // Append to existing columns (multi-line cell)
                for (var c = 0; c < cells.length && c < currentRow.cols.length; c++) {
                    var val = cells[c].trim();
                    if (val) {
                        currentRow.cols[c] += ' ' + val;
                    }
                }
            }
        }
    }
    // Push last row
    if (currentRow && currentRow.cols.length > 0) {
        rows.push(currentRow);
    }

    return rows;
}

/**
 * Clean a cell value: strip markdown links, bold markers, extra whitespace.
 */
function cleanCell(text) {
    if (!text) return '';
    // Strip markdown links: [Text](url){.xref} → Text
    text = text.replace(/\[([^\]]+)\]\([^)]*\)(\{[^}]*\})?/g, '$1');
    // Strip bold markers
    text = text.replace(/\*\*/g, '');
    text = text.replace(/\*/g, '');
    // Strip *[Italic]* collection indicators
    text = text.replace(/\*\[([^\]]+)\]\*/g, '$1');
    // Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

/**
 * Extract a compact property listing from the grid table in the Property Listing section.
 */
function extractProperties(content) {
    var lines = content.split('\n');
    var inPropertySection = false;
    var tableLines = [];
    var properties = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        // Detect "Property Listing" section
        if (/^##\s+Property Listing/i.test(line)) {
            inPropertySection = true;
            tableLines = [];
            continue;
        }

        // Detect "Method Listing" section (end of properties)
        if (/^##\s+Method Listing/i.test(line) || /^::::/.test(line)) {
            if (inPropertySection && tableLines.length > 0) {
                // Parse accumulated table
                var rows = parseGridTable(tableLines);
                for (var r = 0; r < rows.length; r++) {
                    var row = rows[r];
                    if (row.cols.length >= 3) {
                        var name = cleanCell(row.cols[0]);
                        var type = cleanCell(row.cols[1]);
                        var access = cleanCell(row.cols[2]);
                        // Skip headers
                        if (name === 'Property' || name === 'Name' || !name) continue;
                        // Simplify type: take first word/type only
                        var simpleType = type.split(' ')[0];
                        if (simpleType.length > 30) simpleType = simpleType.substring(0, 30);
                        var accessTag = '';
                        if (access.indexOf('readonly') !== -1) accessTag = ' (ro)';
                        properties.push('    ' + name + ' : ' + simpleType + accessTag);
                    }
                }
            }
            inPropertySection = false;
            tableLines = [];
            continue;
        }

        if (inPropertySection) {
            tableLines.push(line);
        }
    }

    // Handle case where properties section goes to end of file
    if (inPropertySection && tableLines.length > 0) {
        var rows = parseGridTable(tableLines);
        for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            if (row.cols.length >= 3) {
                var name = cleanCell(row.cols[0]);
                var type = cleanCell(row.cols[1]);
                var access = cleanCell(row.cols[2]);
                if (name === 'Property' || name === 'Name' || !name) continue;
                var simpleType = type.split(' ')[0];
                if (simpleType.length > 30) simpleType = simpleType.substring(0, 30);
                var accessTag = '';
                if (access.indexOf('readonly') !== -1) accessTag = ' (ro)';
                properties.push('    ' + name + ' : ' + simpleType + accessTag);
            }
        }
    }

    return properties;
}

/**
 * Extract method names from the "Methods:" section at the top of the file.
 * These are listed as [methodName](link){.xref} comma-separated.
 */
function extractMethods(content) {
    var lines = content.split('\n');
    var inMethodsSection = false;
    var methods = [];
    var methodText = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();

        if (/^##\s+Methods:/i.test(line)) {
            inMethodsSection = true;
            continue;
        }

        // End of methods section when hitting next section header or :::
        if (inMethodsSection && (/^##\s+/.test(line) || /^:::$/.test(line))) {
            inMethodsSection = false;
            continue;
        }

        if (inMethodsSection && line) {
            methodText += ' ' + line;
        }
    }

    // Parse method names from the collected text
    // Pattern: [methodName](url){.xref}
    var re = /\[([a-zA-Z_]\w*)\]\([^)]*\)/g;
    var match;
    while ((match = re.exec(methodText)) !== null) {
        methods.push('    ' + match[1] + '()');
    }

    return methods;
}

/**
 * Extract the class hierarchy info (superclass).
 */
function extractHierarchy(content) {
    var match = content.match(/Superclass:\s*\[([^\]]+)\]/);
    if (match) return match[1];
    return null;
}

// ── Main ──

function main() {
    var sourceDir  = process.argv[2] || DEFAULT_SOURCE;
    var outputFile = process.argv[3] || DEFAULT_OUTPUT;

    if (!fs.existsSync(sourceDir)) {
        console.error('Source directory not found: ' + sourceDir);
        console.error('Place .md files from indesignjs.de in: ' + DEFAULT_SOURCE);
        process.exit(1);
    }

    console.log('Source:  ' + sourceDir);
    console.log('Output:  ' + outputFile);
    console.log('Classes: ' + HIGH_VALUE_CLASSES.length);
    console.log('');

    var sections = [];
    var found = 0;
    var skipped = 0;

    for (var ci = 0; ci < HIGH_VALUE_CLASSES.length; ci++) {
        var cls = HIGH_VALUE_CLASSES[ci];
        var mdFile = path.join(sourceDir, cls + '.md');
        if (!fs.existsSync(mdFile)) {
            console.warn('  SKIP (not found): ' + cls + '.md');
            skipped++;
            continue;
        }

        var content = fs.readFileSync(mdFile, 'utf8');
        var superclass = extractHierarchy(content);
        var properties = extractProperties(content);
        var methods = extractMethods(content);

        if (properties.length > 0 || methods.length > 0) {
            var header = '── ' + cls;
            if (superclass) header += ' < ' + superclass;
            header += ' ──';
            sections.push(header);

            if (properties.length > 0) {
                sections.push('  Props:');
                for (var p = 0; p < properties.length; p++) {
                    sections.push(properties[p]);
                }
            }

            if (methods.length > 0) {
                sections.push('  Methods:');
                for (var m = 0; m < methods.length; m++) {
                    sections.push(methods[m]);
                }
            }

            sections.push('');
            found++;
            console.log('  ✓ ' + cls + ': ' + properties.length + ' props, ' + methods.length + ' methods');
        } else {
            console.warn('  SKIP (empty): ' + cls);
            skipped++;
        }
    }

    if (sections.length === 0) {
        console.error('No API content extracted. Check source directory format.');
        process.exit(1);
    }

    var header = [
        '# InDesign ExtendScript API Reference (compact)',
        '# Generated by convert-api-docs.js',
        '# Classes: ' + found + '/' + HIGH_VALUE_CLASSES.length,
        ''
    ];

    var output = header.concat(sections).join('\n');
    fs.writeFileSync(outputFile, output, 'utf8');

    // Also emit a JS module for direct script-tag inclusion in the CEP panel
    var jsOutputFile = path.resolve(__dirname, '..', 'js', 'system-prompt-api.js');
    var escaped = output.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    var jsContent = [
        '/**',
        ' * Aide for InDesign — system-prompt-api.js  (auto-generated)',
        ' * DO NOT EDIT — regenerate with: node tools/convert-api-docs.js',
        ' * Classes: ' + found + '/' + HIGH_VALUE_CLASSES.length,
        ' * Size: ' + output.length + ' chars (~' + Math.round(output.length / 4) + ' tokens)',
        ' */',
        '',
        '/* global AideChatModules */',
        '',
        'var AIDE_API_REFERENCE = `' + escaped + '`;',
        ''
    ].join('\n');
    fs.writeFileSync(jsOutputFile, jsContent, 'utf8');

    var tokens = Math.round(output.length / 4);
    console.log('');
    console.log('Done!');
    console.log('  Classes extracted: ' + found);
    console.log('  Classes skipped:   ' + skipped);
    console.log('  Output size:       ' + output.length + ' chars (~' + tokens + ' tokens)');
    console.log('  Markdown:          ' + outputFile);
    console.log('  JS module:         ' + jsOutputFile);
}

main();
