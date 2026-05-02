import json
import re

IN_FILE = "_input_ignore/api-index.json"
OUT_FILE = "_input_ignore/generated-prompt.txt"

with open(IN_FILE, "r", encoding="utf-8") as f:
    api = json.load(f)

# Classes to prioritize in prompt
PRIORITIES = [
    "Application", "Document", "Page", "Spread", "MasterSpread",
    "TextFrame", "Rectangle", "Oval", "Polygon", "GraphicLine", "Group",
    "ParagraphStyle", "CharacterStyle", "Color", "Swatch", "Tint", "Layer",
    "Story", "Text", "Paragraph", "Table", "Cell", "Row", "Column",
    "File", "Folder"
]

EXCLUDE_PROPS = {
    "isValid", "parent", "properties", "events", "eventListeners", "toSource", "toSpecifier", "id", "index", "label"
}
EXCLUDE_METHODS = {
    "addEventListener", "removeEventListener", "getElements", "toSource", "toSpecifier", "extractLabel", "insertLabel", "resolve"
}

output = []
output.append("═══ INDESIGN EXTENDSCRIPT DOM REFERENCE (AUTO-EXTRACTED) ═══")

for cls in PRIORITIES:
    if cls not in api: continue
    data = api[cls]
    
    # We will format like: 
    # Document: properties(activeLayer:Layer, allPageItems:PageItem[]); methods(exportFile(format, to))
    
    # Filter properties
    props = []
    for p in data["properties"]:
        if p["name"] not in EXCLUDE_PROPS and "Preference" not in p["name"]:
            # Shorten types
            t = p["type"].split(" ")[0] # Just take the first word for compactness, or maybe handle array
            if "Array of " in p["type"]:
                t = p["type"].replace("Array of ", "").split(" ")[0] + "[]"
            props.append(f"{p['name']}:{t}")
            
    props = props[:15] # Top 15 properties
    
    # Filter methods
    meths = []
    for m in data["methods"]:
        # Example m: "String extractLabel (key: String)"
        # We just want extractLabel(key: String): String
        m = re.sub(r'[\n\r\t]+', ' ', m).strip()
        parts = m.split(' ', 1) # ['String', 'extractLabel (key: String)']
        if len(parts) > 1:
            ret_type = parts[0]
            rest = parts[1]
            m_name = rest.split('(')[0].strip()
            if m_name not in EXCLUDE_METHODS:
                sig = rest.replace(' ', '')
                meths.append(f"{sig}:{ret_type}")
                
    meths = meths[:10] # Top 10 methods
    
    props_str = "props(" + ", ".join(props) + ")" if props else ""
    meths_str = "meths(" + ", ".join(meths) + ")" if meths else ""
    
    if props_str or meths_str:
        output.append(f"{cls} -> {props_str} {meths_str}".strip())

with open(OUT_FILE, "w", encoding="utf-8") as f:
    f.write("\n".join(output))

print(f"Generated compact prompt subset to {OUT_FILE}")
