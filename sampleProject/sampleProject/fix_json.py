import json

# Open with utf-8-sig to ignore BOM
with open("data.json", "r", encoding="utf-8-sig") as f:
    data = json.load(f)

# Save clean JSON without BOM
with open("data_clean.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4)
