#!/bin/bash
# uninstall_extension.command
# Double-click to remove Aide for InDesign extension from System CEP folder (Requires Password)

cd "$(dirname "$0")"

# Extension ID path
AIDE_DIR="/Library/Application Support/Adobe/CEP/extensions/com.aide.indesign"

echo "Uninstalling Aide for InDesign extension..."
echo "🔒 This requires Administrator privileges. Please enter password when prompted."
echo ""

removed=0

if [ -d "$AIDE_DIR" ]; then
    echo "Removing: $AIDE_DIR"
    sudo rm -rf "$AIDE_DIR"
    removed=1
fi

if [ $removed -eq 1 ]; then
    echo "----------------------------------------"
    echo "✅ Success: Aide for InDesign removed."
    echo "----------------------------------------"
else
    echo "⚠️ Warning: Extension folder not found."
fi

echo "Press [Enter] to close..."
read
