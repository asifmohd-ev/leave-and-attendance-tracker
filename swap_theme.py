import os
import re

TARGET_DIRS = ['app', 'components']
FILE_EXTS = ['.tsx']

# Precise regex mapping dictionary simulating the new Neo Midnight UI
# 'previous UI standard': 'new Midnight class'
MAP = {
    # Backgrounds & Cards
    "bg-black": "bg-[#001B26]",
    "bg-[#0a0a0a]": "bg-[#001B26] shadow-[0_0_15px_rgba(73,214,209,0.05)]",
    "bg-[#111]": "bg-[#265F66]/20",
    "bg-zinc-900": "bg-[#265F66]/40",
    
    # Borders
    "border-white/10": "border-[#265F66]/50",
    "border-white/20": "border-[#49D6D1]/30",
    "border-[#111]": "border-[#265F66]",
    "border-white": "border-[#49D6D1]",
    "border-zinc-600": "border-[#265F66]",
    
    # Text Primary / Secondary
    "text-white": "text-[#E6F9F8]",
    "text-zinc-500": "text-[#A2EBE8]/60",
    "text-zinc-400": "text-[#A2EBE8]/80",
    "text-zinc-600": "text-[#265F66]",
    
    # Accent specific conversions (Like primary button mapping)
    "bg-white text-black": "bg-[#49D6D1] text-[#001B26]",
    "bg-white text-black font-black": "bg-[#49D6D1] text-[#001B26] font-black",
    "text-black bg-white": "text-[#001B26] bg-[#49D6D1]",
    "bg-white": "bg-[#49D6D1]",
    "text-black": "text-[#001B26]",
    
    # Hover States
    "hover:bg-zinc-200": "hover:bg-[#A2EBE8]",
    "hover:bg-white/10": "hover:bg-[#49D6D1]/20",
    "hover:border-white/20": "hover:border-[#49D6D1]/50",
    "hover:border-white/40": "hover:border-[#49D6D1]",
    "hover:text-zinc-300": "hover:text-[#A2EBE8]",
    "hover:border-white": "hover:border-[#A2EBE8]",
    "hover:text-white": "hover:text-[#E6F9F8]"
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    # Order matters: replace longer, more specific ones first
    for old_val in sorted(MAP.keys(), key=len, reverse=True):
        new_val = MAP[old_val]
        # Look for the exact class to avoid partial replacement bugs
        new_content = new_content.replace(old_val, new_val)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for d in TARGET_DIRS:
    for root, dirs, files in os.walk(d):
        for file in files:
            if any(file.endswith(ext) for ext in FILE_EXTS):
                process_file(os.path.join(root, file))

print('Complete.')
