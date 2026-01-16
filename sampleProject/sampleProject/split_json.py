import json
from collections import defaultdict

with open("data_clean.json", "r", encoding="utf-8-sig") as f:
    data = json.load(f)

model_groups = defaultdict(list)

for obj in data:
    model_groups[obj['model']].append(obj)

for model, items in model_groups.items():
    filename = f"{model.replace('.', '_')}.json"
    with open(filename, "w", encoding="utf-8") as f_out:
        json.dump(items, f_out, indent=4)
    print(f"Saved {len(items)} objects to {filename}")
