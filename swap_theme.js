const fs = require('fs');
const path = require('path');

const targetDirs = ['app', 'components'];
const fileExts = ['.tsx'];

const MAP = {
    // Buttons & Foreground inversion priority
    "bg-white text-black font-black": "bg-[#49D6D1] text-[#001B26] font-black",
    "bg-white text-black": "bg-[#49D6D1] text-[#001B26]",
    "bg-white hover:bg-zinc-200 text-black": "bg-[#49D6D1] hover:bg-[#A2EBE8] text-[#001B26]",
    "text-black bg-white": "text-[#001B26] bg-[#49D6D1]",
    
    // Backgrounds & Cards
    "bg-black": "bg-[#001B26]",
    "bg-[#0a0a0a]": "bg-[#001B26] shadow-[0_4px_20px_rgba(73,214,209,0.03)]",
    "bg-[#111]": "bg-[#265F66]/20",
    "bg-zinc-900": "bg-[#265F66]/40",
    
    // Text Primary / Secondary
    "text-white": "text-[#E6F9F8]",
    "text-zinc-500": "text-[#A2EBE8]/60",
    "text-zinc-400": "text-[#A2EBE8]/80",
    "text-zinc-600": "text-[#265F66]",
    "text-black": "text-[#001B26]",
    
    // Borders
    "border-white/10": "border-[#265F66]/50",
    "border-white/20": "border-[#49D6D1]/30",
    "border-[#111]": "border-[#265F66]",
    "border-white": "border-[#49D6D1]",
    "border-zinc-600": "border-[#265F66]",

    // Hover States
    "hover:bg-zinc-200": "hover:bg-[#A2EBE8]",
    "hover:bg-white/10": "hover:bg-[#49D6D1]/20",
    "hover:border-white/20": "hover:border-[#49D6D1]/50",
    "hover:border-white/40": "hover:border-[#49D6D1]",
    "hover:text-zinc-300": "hover:text-[#A2EBE8]",
    "hover:border-white": "hover:border-[#A2EBE8]",
    "hover:text-white": "hover:text-[#E6F9F8]",
    
    // Remaining primitive swaps
    "bg-white": "bg-[#49D6D1]"
};

// Sort by length to avoid partial replacement collision
const sortedKeys = Object.keys(MAP).sort((a, b) => b.length - a.length);

function processFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf-8');
    let original = content;
    
    sortedKeys.forEach(oldVal => {
        const newVal = MAP[oldVal];
        content = content.split(oldVal).join(newVal);
    });
    
    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log('Updated', filepath);
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fileExts.some(ext => file.endsWith(ext))) {
            processFile(fullPath);
        }
    }
}

targetDirs.forEach(d => traverse(path.join(process.cwd(), d)));
console.log('Done.');
