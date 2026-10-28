export type SeedItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  price: number;
  preview: Record<string, string>;
  sortOrder: number;
  isLimited?: boolean;
};

export const SEED_ITEMS: SeedItem[] = [
  // SYMBOLS (10)
  { id: "sym-classic", name: "Classic X/O", description: "The timeless default symbols.", category: "symbols", rarity: "common", price: 0, preview: { x: "✕", o: "○", css: "classic" }, sortOrder: 1 },
  { id: "sym-neon", name: "Neon Pulse", description: "Glowing neon X and O with electric aura.", category: "symbols", rarity: "uncommon", price: 150, preview: { x: "✕", o: "○", css: "neon-blue" }, sortOrder: 2 },
  { id: "sym-star-heart", name: "Star / Heart", description: "Celestial star versus loving heart.", category: "symbols", rarity: "rare", price: 400, preview: { x: "★", o: "♥", css: "star-heart" }, sortOrder: 3 },
  { id: "sym-moon-sun", name: "Moon / Sun", description: "Lunar crescent battles solar blaze.", category: "symbols", rarity: "rare", price: 450, preview: { x: "☾", o: "☀", css: "moon-sun" }, sortOrder: 4 },
  { id: "sym-crown-shield", name: "Crown / Shield", description: "Royal crown versus guardian shield.", category: "symbols", rarity: "epic", price: 900, preview: { x: "♛", o: "⛨", css: "crown-shield" }, sortOrder: 5 },
  { id: "sym-dragon-phoenix", name: "Dragon / Phoenix", description: "Mythic beasts clash on the board.", category: "symbols", rarity: "legendary", price: 2000, preview: { x: "🐉", o: "🔥", css: "dragon-phoenix" }, sortOrder: 6 },
  { id: "sym-cyber", name: "Cyber Glyphs", description: "Futuristic holographic glyphs.", category: "symbols", rarity: "epic", price: 1200, preview: { x: "⬢", o: "⬣", css: "cyber" }, sortOrder: 7 },
  { id: "sym-candy", name: "Candy Pop", description: "Sweet candy symbols for playful games.", category: "symbols", rarity: "uncommon", price: 200, preview: { x: "🍬", o: "🍭", css: "candy" }, sortOrder: 8 },
  { id: "sym-ninja", name: "Ninja Clan", description: "Shuriken versus katana marks.", category: "symbols", rarity: "rare", price: 600, preview: { x: "✦", o: "❖", css: "ninja" }, sortOrder: 9 },
  { id: "sym-divine-rune", name: "Divine Runes", description: "Godly runes blessed with golden light.", category: "symbols", rarity: "divine", price: 8000, preview: { x: "ᚱ", o: "ᛟ", css: "divine" }, sortOrder: 10 },

  // BOARDS (9)
  { id: "board-neon", name: "Neon Board", description: "Electric blue grid with neon glow lines.", category: "boards", rarity: "uncommon", price: 300, preview: { bg: "#0a0e27", grid: "#00e5ff", css: "board-neon" }, sortOrder: 11 },
  { id: "board-glass", name: "Glass Board", description: "Frosted glass with subtle reflections.", category: "boards", rarity: "rare", price: 550, preview: { bg: "#e0f2fe33", grid: "#ffffff", css: "board-glass" }, sortOrder: 12 },
  { id: "board-cyberpunk", name: "Cyberpunk Board", description: "Magenta and cyan dystopian grid.", category: "boards", rarity: "epic", price: 1100, preview: { bg: "#12061f", grid: "#ff2d95", css: "board-cyberpunk" }, sortOrder: 13 },
  { id: "board-minimal", name: "Minimal Board", description: "Clean monochrome lines for purists.", category: "boards", rarity: "common", price: 100, preview: { bg: "#111111", grid: "#e5e5e5", css: "board-minimal" }, sortOrder: 14 },
  { id: "board-golden", name: "Golden Royale", description: "24k gold lines on obsidian.", category: "boards", rarity: "legendary", price: 3000, preview: { bg: "#0c0a09", grid: "#fbbf24", css: "board-golden" }, sortOrder: 15 },
  { id: "board-matrix", name: "Matrix Grid", description: "Cascading green digital rain grid.", category: "boards", rarity: "rare", price: 700, preview: { bg: "#020617", grid: "#22ff66", css: "board-matrix" }, sortOrder: 16 },
  { id: "board-lava", name: "Lava Arena", description: "Molten cracks pulse beneath the grid.", category: "boards", rarity: "epic", price: 1400, preview: { bg: "#1c0a00", grid: "#ff5722", css: "board-lava" }, sortOrder: 17 },
  { id: "board-ice", name: "Ice Palace", description: "Frosted crystal grid with aurora shimmer.", category: "boards", rarity: "rare", price: 650, preview: { bg: "#082f49", grid: "#a5f3fc", css: "board-ice" }, sortOrder: 18 },
  { id: "board-void", name: "Void Singularity", description: "Black hole board warping space itself.", category: "boards", rarity: "ancient", price: 6000, preview: { bg: "#000000", grid: "#8b5cf6", css: "board-void" }, sortOrder: 19 },

  // BACKGROUNDS / PLACES (20)
  { id: "bg-neon-city", name: "Neon Cyber City", description: "Rainy cyberpunk streets with neon signs.", category: "backgrounds", rarity: "rare", price: 500, preview: { gradient: "linear-gradient(135deg,#0f0520,#2b0a54,#ff2d95)", emoji: "🌃" }, sortOrder: 20 },
  { id: "bg-tokyo-night", name: "Tokyo Night Streets", description: "Lantern-lit Tokyo alley at midnight.", category: "backgrounds", rarity: "rare", price: 550, preview: { gradient: "linear-gradient(135deg,#0b1026,#7c2d12,#f472b6)", emoji: "🗼" }, sortOrder: 21 },
  { id: "bg-space-station", name: "Space Station", description: "Orbit above Earth with starfield views.", category: "backgrounds", rarity: "epic", price: 1000, preview: { gradient: "linear-gradient(135deg,#020617,#1e3a8a,#000)", emoji: "🛰️" }, sortOrder: 22 },
  { id: "bg-moon", name: "Moon Surface", description: "Grey craters under Earthshine.", category: "backgrounds", rarity: "uncommon", price: 250, preview: { gradient: "linear-gradient(135deg,#1c1917,#57534e,#a8a29e)", emoji: "🌕" }, sortOrder: 23 },
  { id: "bg-mars", name: "Mars Colony", description: "Red dunes and colony domes.", category: "backgrounds", rarity: "rare", price: 600, preview: { gradient: "linear-gradient(135deg,#450a0a,#b45309,#f97316)", emoji: "🔴" }, sortOrder: 24 },
  { id: "bg-galaxy-portal", name: "Galaxy Portal", description: "Swirling wormhole to another universe.", category: "backgrounds", rarity: "legendary", price: 2500, preview: { gradient: "conic-gradient(from 0deg,#7c3aed,#ec4899,#06b6d4,#7c3aed)", emoji: "🌀" }, sortOrder: 25 },
  { id: "bg-deep-ocean", name: "Deep Ocean", description: "Abyssal depths with bioluminescence.", category: "backgrounds", rarity: "rare", price: 600, preview: { gradient: "linear-gradient(180deg,#082f49,#0c4a6e,#020617)", emoji: "🌊" }, sortOrder: 26 },
  { id: "bg-coral-reef", name: "Coral Reef", description: "Vibrant coral garden teeming with life.", category: "backgrounds", rarity: "uncommon", price: 300, preview: { gradient: "linear-gradient(135deg,#0e7490,#f472b6,#fbbf24)", emoji: "🪸" }, sortOrder: 27 },
  { id: "bg-tropical", name: "Tropical Island", description: "Palm trees and turquoise lagoons.", category: "backgrounds", rarity: "common", price: 150, preview: { gradient: "linear-gradient(135deg,#0d9488,#22d3ee,#fef08a)", emoji: "🏝️" }, sortOrder: 28 },
  { id: "bg-snow-mountain", name: "Snow Mountain", description: "Alpine peaks under aurora skies.", category: "backgrounds", rarity: "uncommon", price: 280, preview: { gradient: "linear-gradient(180deg,#0c4a6e,#e0f2fe,#ffffff)", emoji: "🏔️" }, sortOrder: 29 },
  { id: "bg-desert-kingdom", name: "Desert Kingdom", description: "Golden dunes and ancient pyramids.", category: "backgrounds", rarity: "uncommon", price: 260, preview: { gradient: "linear-gradient(135deg,#78350f,#f59e0b,#fef3c7)", emoji: "🏜️" }, sortOrder: 30 },
  { id: "bg-ancient-temple", name: "Ancient Temple", description: "Moss-covered ruins with torchlight.", category: "backgrounds", rarity: "epic", price: 900, preview: { gradient: "linear-gradient(135deg,#14532d,#365314,#a3e635)", emoji: "🛕" }, sortOrder: 31 },
  { id: "bg-medieval-castle", name: "Medieval Castle", description: "Stone battlements under stormy skies.", category: "backgrounds", rarity: "rare", price: 650, preview: { gradient: "linear-gradient(135deg,#1e293b,#475569,#94a3b8)", emoji: "🏰" }, sortOrder: 32 },
  { id: "bg-crystal-cave", name: "Crystal Cave", description: "Glowing amethyst caverns.", category: "backgrounds", rarity: "epic", price: 1100, preview: { gradient: "linear-gradient(135deg,#3b0764,#7c3aed,#c4b5fd)", emoji: "💠" }, sortOrder: 33 },
  { id: "bg-volcano", name: "Volcano Core", description: "Rivers of magma inside the crater.", category: "backgrounds", rarity: "epic", price: 1200, preview: { gradient: "linear-gradient(135deg,#000,#7f1d1d,#f97316)", emoji: "🌋" }, sortOrder: 34 },
  { id: "bg-sakura", name: "Sakura Garden", description: "Cherry blossoms drifting in spring breeze.", category: "backgrounds", rarity: "rare", price: 700, preview: { gradient: "linear-gradient(135deg,#831843,#f9a8d4,#fce7f3)", emoji: "🌸" }, sortOrder: 35 },
  { id: "bg-hologram-arena", name: "Hologram Arena", description: "Competitive esports hologram stadium.", category: "backgrounds", rarity: "legendary", price: 2200, preview: { gradient: "linear-gradient(135deg,#020617,#4c1d95,#06b6d4)", emoji: "🏟️" }, sortOrder: 36 },
  { id: "bg-dragon-lair", name: "Dragon's Lair", description: "Treasure hoard guarded by an ancient wyrm.", category: "backgrounds", rarity: "mythic", price: 5000, preview: { gradient: "linear-gradient(135deg,#1c0a00,#b45309,#fbbf24)", emoji: "🐲" }, sortOrder: 37 },
  { id: "bg-black-hole", name: "Black Hole", description: "Event horizon bending starlight.", category: "backgrounds", rarity: "ancient", price: 6500, preview: { gradient: "radial-gradient(circle,#000 30%,#4c1d95 60%,#f0abfc)", emoji: "⚫" }, sortOrder: 38 },
  { id: "bg-retro-arcade", name: "Retro Arcade", description: "80s synthwave grid with neon sun.", category: "backgrounds", rarity: "rare", price: 750, preview: { gradient: "linear-gradient(180deg,#1e1b4b,#be185d,#fb7185)", emoji: "🕹️" }, sortOrder: 39 },

  // AVATARS (8)
  { id: "ava-rookie", name: "Rookie Bot", description: "Friendly starter robot avatar.", category: "avatars", rarity: "common", price: 0, preview: { emoji: "🤖", bg: "#1e293b" }, sortOrder: 40 },
  { id: "ava-ninja", name: "Shadow Ninja", description: "Silent warrior of the night.", category: "avatars", rarity: "rare", price: 500, preview: { emoji: "🥷", bg: "#0f172a" }, sortOrder: 41 },
  { id: "ava-fox", name: "Cyber Fox", description: "Cunning fox with neon visor.", category: "avatars", rarity: "epic", price: 1000, preview: { emoji: "🦊", bg: "#7c2d12" }, sortOrder: 42 },
  { id: "ava-dragon", name: "Ember Dragon", description: "Ancient fire drake avatar.", category: "avatars", rarity: "legendary", price: 2500, preview: { emoji: "🐉", bg: "#450a0a" }, sortOrder: 43 },
  { id: "ava-astronaut", name: "Star Voyager", description: "Explorer of distant galaxies.", category: "avatars", rarity: "rare", price: 600, preview: { emoji: "🧑‍🚀", bg: "#1e3a8a" }, sortOrder: 44 },
  { id: "ava-samurai", name: "Neon Samurai", description: "Honor-bound cyber warrior.", category: "avatars", rarity: "epic", price: 1300, preview: { emoji: "⚔️", bg: "#4c1d95" }, sortOrder: 45 },
  { id: "ava-phoenix", name: "Solar Phoenix", description: "Reborn from cosmic flames.", category: "avatars", rarity: "mythic", price: 4500, preview: { emoji: "🔥", bg: "#9a3412" }, sortOrder: 46 },
  { id: "ava-god", name: "Eternal Deity", description: "Transcendent godlike presence.", category: "avatars", rarity: "divine", price: 9000, preview: { emoji: "✨", bg: "#713f12" }, sortOrder: 47 },

  // FRAMES (5)
  { id: "frame-bronze", name: "Bronze Ring", description: "Simple bronze avatar frame.", category: "frames", rarity: "common", price: 120, preview: { css: "ring-bronze", emoji: "🟤" }, sortOrder: 48 },
  { id: "frame-neon", name: "Neon Circuit", description: "Pulsing electric frame.", category: "frames", rarity: "rare", price: 550, preview: { css: "ring-neon", emoji: "🔷" }, sortOrder: 49 },
  { id: "frame-gold", name: "Royal Gold", description: "Majestic golden laurels.", category: "frames", rarity: "legendary", price: 2800, preview: { css: "ring-gold", emoji: "🟡" }, sortOrder: 50 },
  { id: "frame-dragon", name: "Dragon Coil", description: "Serpent wrapped around your avatar.", category: "frames", rarity: "mythic", price: 4800, preview: { css: "ring-dragon", emoji: "🐲" }, sortOrder: 51 },
  { id: "frame-cosmic", name: "Cosmic Halo", description: "Swirling galaxy halo.", category: "frames", rarity: "ancient", price: 6200, preview: { css: "ring-cosmic", emoji: "🌌" }, sortOrder: 52 },

  // WIN ANIMATIONS (4)
  { id: "win-confetti", name: "Confetti Burst", description: "Classic celebration confetti.", category: "win_animations", rarity: "common", price: 150, preview: { emoji: "🎊", css: "win-confetti" }, sortOrder: 53 },
  { id: "win-fireworks", name: "Sky Fireworks", description: "Grand firework finale.", category: "win_animations", rarity: "rare", price: 600, preview: { emoji: "🎆", css: "win-fireworks" }, sortOrder: 54 },
  { id: "win-lightning", name: "Judgment Lightning", description: "Divine bolts strike the board.", category: "win_animations", rarity: "epic", price: 1300, preview: { emoji: "⚡", css: "win-lightning" }, sortOrder: 55 },
  { id: "win-supernova", name: "Supernova", description: "Star explodes across the arena.", category: "win_animations", rarity: "legendary", price: 3000, preview: { emoji: "💥", css: "win-supernova" }, sortOrder: 56 },

  // MOVE ANIMATIONS (3)
  { id: "move-pop", name: "Pop In", description: "Snappy spring placement.", category: "move_animations", rarity: "common", price: 100, preview: { emoji: "💫", css: "move-pop" }, sortOrder: 57 },
  { id: "move-flame", name: "Flame Trail", description: "Fiery swoosh on every move.", category: "move_animations", rarity: "epic", price: 1100, preview: { emoji: "🔥", css: "move-flame" }, sortOrder: 58 },
  { id: "move-portal", name: "Portal Drop", description: "Pieces fall through portals.", category: "move_animations", rarity: "legendary", price: 2600, preview: { emoji: "🌀", css: "move-portal" }, sortOrder: 59 },

  // SOUND PACKS (3)
  { id: "snd-classic", name: "Classic Beeps", description: "Retro arcade blips.", category: "sound_packs", rarity: "common", price: 0, preview: { emoji: "🔈", css: "snd-classic" }, sortOrder: 60 },
  { id: "snd-cyber", name: "Cyber Synth", description: "Futuristic synth effects.", category: "sound_packs", rarity: "rare", price: 500, preview: { emoji: "🎹", css: "snd-cyber" }, sortOrder: 61 },
  { id: "snd-epic", name: "Epic Orchestra", description: "Cinematic orchestral stingers.", category: "sound_packs", rarity: "epic", price: 1200, preview: { emoji: "🎻", css: "snd-epic" }, sortOrder: 62 },

  // VICTORY EFFECTS (3)
  { id: "vic-crown", name: "Champion Crown", description: "Golden crown descends on victory.", category: "victory_effects", rarity: "rare", price: 700, preview: { emoji: "👑", css: "vic-crown" }, sortOrder: 63 },
  { id: "vic-throne", name: "Victory Throne", description: "Ascend to a crystal throne.", category: "victory_effects", rarity: "legendary", price: 2900, preview: { emoji: "💺", css: "vic-throne" }, sortOrder: 64 },
  { id: "vic-godrays", name: "God Rays", description: "Heavenly light bathes the winner.", category: "victory_effects", rarity: "divine", price: 7500, preview: { emoji: "🌟", css: "vic-godrays" }, sortOrder: 65 },

  // TRAILS (4)
  { id: "trail-sparkle", name: "Sparkle Trail", description: "Gentle glitter follows your cursor.", category: "trails", rarity: "uncommon", price: 220, preview: { emoji: "✨", css: "trail-sparkle" }, sortOrder: 66 },
  { id: "trail-neon", name: "Neon Comet", description: "Electric comet streak.", category: "trails", rarity: "rare", price: 650, preview: { emoji: "☄️", css: "trail-neon" }, sortOrder: 67 },
  { id: "trail-fire", name: "Inferno Wake", description: "Blazing fire trail.", category: "trails", rarity: "epic", price: 1400, preview: { emoji: "🔥", css: "trail-fire" }, sortOrder: 68 },
  { id: "trail-rainbow", name: "Prism Cascade", description: "Rainbow aurora cascade.", category: "trails", rarity: "legendary", price: 3200, preview: { emoji: "🌈", css: "trail-rainbow" }, sortOrder: 69 },

  // PROFILE DECORATIONS (5)
  { id: "deco-banner-neon", name: "Neon Banner", description: "Glowing profile banner.", category: "profile_decorations", rarity: "rare", price: 600, preview: { emoji: "🎴", css: "deco-neon" }, sortOrder: 70 },
  { id: "deco-badge-star", name: "Star Badge", description: "Shining achievement badge.", category: "profile_decorations", rarity: "epic", price: 1000, preview: { emoji: "⭐", css: "deco-star" }, sortOrder: 71 },
  { id: "deco-aura", name: "Mystic Aura", description: "Ethereal aura around profile.", category: "profile_decorations", rarity: "legendary", price: 2700, preview: { emoji: "💫", css: "deco-aura" }, sortOrder: 72 },
  { id: "deco-throne-room", name: "Throne Room", description: "Opulent throne room backdrop.", category: "profile_decorations", rarity: "ancient", price: 5800, preview: { emoji: "🏛️", css: "deco-throne" }, sortOrder: 73 },
  { id: "relic-eternal-god", name: "R-T Eternal God Chest Relic", description: "Ultra-exclusive god relic. 0.1% drop from Secret Chest. Direct price 1,000,000,000 R Coins.", category: "profile_decorations", rarity: "mythic", price: 1000000000, preview: { emoji: "🗿", css: "relic-god" }, sortOrder: 74, isLimited: true },

  // SEASONAL (6)
  { id: "seas-halloween", name: "Haunted Mansion", description: "Spooky Halloween arena with ghosts.", category: "seasonal", rarity: "epic", price: 1500, preview: { emoji: "🎃", css: "seas-halloween", gradient: "linear-gradient(135deg,#000,#7c2d12,#f97316)" }, sortOrder: 75, isLimited: true },
  { id: "seas-winter", name: "Winter Frostfest", description: "Snowy holiday wonderland.", category: "seasonal", rarity: "rare", price: 800, preview: { emoji: "❄️", css: "seas-winter", gradient: "linear-gradient(135deg,#0c4a6e,#bae6fd,#fff)" }, sortOrder: 76, isLimited: true },
  { id: "seas-lunar", name: "Lunar New Year", description: "Red lanterns and golden dragons.", category: "seasonal", rarity: "legendary", price: 2800, preview: { emoji: "🏮", css: "seas-lunar", gradient: "linear-gradient(135deg,#7f1d1d,#dc2626,#fbbf24)" }, sortOrder: 77, isLimited: true },
  { id: "seas-summer", name: "Summer Splash", description: "Beach party vibes.", category: "seasonal", rarity: "uncommon", price: 350, preview: { emoji: "🍉", css: "seas-summer", gradient: "linear-gradient(135deg,#0ea5e9,#22d3ee,#fef08a)" }, sortOrder: 78, isLimited: true },
  { id: "seas-eclipse", name: "Solar Eclipse", description: "Rare cosmic eclipse spectacle.", category: "seasonal", rarity: "secret", price: 12000, preview: { emoji: "🌘", css: "seas-eclipse", gradient: "radial-gradient(circle,#000 40%,#f59e0b 60%,#000)" }, sortOrder: 79, isLimited: true },
];

export type SeedChest = {
  id: string;
  name: string;
  description: string;
  price: number;
  colorTheme: string;
  icon: string;
  gradient: string;
};

export const SEED_CHESTS: SeedChest[] = [
  { id: "common_chest", name: "Common Chest", description: "A humble wooden chest. Great for starters.", price: 100, colorTheme: "#9ca3af", icon: "📦", gradient: "from-slate-500 to-slate-700" },
  { id: "rare_chest", name: "Rare Chest", description: "Blue-trimmed chest with better odds.", price: 250, colorTheme: "#3b82f6", icon: "🎁", gradient: "from-blue-500 to-cyan-600" },
  { id: "ultra_rare_chest", name: "Ultra Rare Chest", description: "Cyan crystal chest humming with energy.", price: 500, colorTheme: "#06b6d4", icon: "💠", gradient: "from-cyan-400 to-blue-600" },
  { id: "epic_chest", name: "Epic Chest", description: "Violet chest radiating arcane power.", price: 1000, colorTheme: "#a855f7", icon: "🔮", gradient: "from-violet-500 to-purple-700" },
  { id: "legendary_chest", name: "Legendary Chest", description: "Golden chest of champions.", price: 2500, colorTheme: "#f59e0b", icon: "👑", gradient: "from-amber-400 to-orange-600" },
  { id: "mythic_chest", name: "Mythic Chest", description: "Pink mythic chest from another realm.", price: 5000, colorTheme: "#ec4899", icon: "💎", gradient: "from-pink-500 to-rose-600" },
  { id: "royal_chest", name: "Royal Chest", description: "Fit for kings and queens.", price: 7500, colorTheme: "#facc15", icon: "🏆", gradient: "from-yellow-400 to-amber-600" },
  { id: "cosmic_chest", name: "Cosmic Chest", description: "Contains fragments of the universe.", price: 10000, colorTheme: "#8b5cf6", icon: "🌌", gradient: "from-indigo-500 to-fuchsia-600" },
  { id: "ancient_chest", name: "Ancient Chest", description: "Unearthed from forgotten ruins.", price: 15000, colorTheme: "#f97316", icon: "🏺", gradient: "from-orange-500 to-red-700" },
  { id: "secret_chest", name: "Secret Chest", description: "The only chest that can drop the R-T Eternal God Chest Relic (0.1%).", price: 25000, colorTheme: "#ff2d55", icon: "🗝️", gradient: "from-red-500 to-pink-700" },
];

// Pools: each sums to exactly 100. Secret chest: relic 0.1% + rest 99.9%
export const SEED_POOLS: Record<string, { itemId: string; probability: number }[]> = {
  common_chest: [
    { itemId: "sym-neon", probability: 20 },
    { itemId: "board-minimal", probability: 20 },
    { itemId: "bg-tropical", probability: 15 },
    { itemId: "frame-bronze", probability: 15 },
    { itemId: "win-confetti", probability: 12 },
    { itemId: "move-pop", probability: 10 },
    { itemId: "trail-sparkle", probability: 8 },
  ],
  rare_chest: [
    { itemId: "sym-star-heart", probability: 18 },
    { itemId: "board-neon", probability: 18 },
    { itemId: "bg-moon", probability: 14 },
    { itemId: "ava-ninja", probability: 12 },
    { itemId: "frame-neon", probability: 12 },
    { itemId: "win-fireworks", probability: 10 },
    { itemId: "trail-neon", probability: 8 },
    { itemId: "seas-summer", probability: 8 },
  ],
  ultra_rare_chest: [
    { itemId: "sym-moon-sun", probability: 16 },
    { itemId: "board-glass", probability: 16 },
    { itemId: "bg-neon-city", probability: 14 },
    { itemId: "bg-coral-reef", probability: 12 },
    { itemId: "snd-cyber", probability: 12 },
    { itemId: "vic-crown", probability: 10 },
    { itemId: "deco-banner-neon", probability: 10 },
    { itemId: "seas-winter", probability: 10 },
  ],
  epic_chest: [
    { itemId: "sym-crown-shield", probability: 15 },
    { itemId: "sym-cyber", probability: 12 },
    { itemId: "board-cyberpunk", probability: 14 },
    { itemId: "bg-ancient-temple", probability: 12 },
    { itemId: "ava-fox", probability: 10 },
    { itemId: "win-lightning", probability: 10 },
    { itemId: "move-flame", probability: 9 },
    { itemId: "trail-fire", probability: 9 },
    { itemId: "seas-halloween", probability: 9 },
  ],
  legendary_chest: [
    { itemId: "sym-dragon-phoenix", probability: 14 },
    { itemId: "board-golden", probability: 14 },
    { itemId: "bg-galaxy-portal", probability: 12 },
    { itemId: "bg-hologram-arena", probability: 10 },
    { itemId: "ava-dragon", probability: 10 },
    { itemId: "frame-gold", probability: 10 },
    { itemId: "win-supernova", probability: 10 },
    { itemId: "move-portal", probability: 10 },
    { itemId: "seas-lunar", probability: 10 },
  ],
  mythic_chest: [
    { itemId: "sym-dragon-phoenix", probability: 12 },
    { itemId: "board-lava", probability: 12 },
    { itemId: "bg-volcano", probability: 12 },
    { itemId: "bg-crystal-cave", probability: 11 },
    { itemId: "ava-phoenix", probability: 11 },
    { itemId: "frame-dragon", probability: 11 },
    { itemId: "trail-rainbow", probability: 11 },
    { itemId: "deco-aura", probability: 10 },
    { itemId: "snd-epic", probability: 10 },
  ],
  royal_chest: [
    { itemId: "sym-crown-shield", probability: 12 },
    { itemId: "board-golden", probability: 13 },
    { itemId: "bg-medieval-castle", probability: 12 },
    { itemId: "ava-samurai", probability: 11 },
    { itemId: "frame-gold", probability: 12 },
    { itemId: "vic-throne", probability: 12 },
    { itemId: "deco-badge-star", probability: 14 },
    { itemId: "bg-retro-arcade", probability: 14 },
  ],
  cosmic_chest: [
    { itemId: "sym-cyber", probability: 11 },
    { itemId: "board-void", probability: 11 },
    { itemId: "bg-space-station", probability: 12 },
    { itemId: "bg-sakura", probability: 11 },
    { itemId: "frame-cosmic", probability: 11 },
    { itemId: "ava-astronaut", probability: 11 },
    { itemId: "deco-aura", probability: 11 },
    { itemId: "trail-rainbow", probability: 11 },
    { itemId: "bg-snow-mountain", probability: 11 },
  ],
  ancient_chest: [
    { itemId: "board-void", probability: 13 },
    { itemId: "bg-black-hole", probability: 13 },
    { itemId: "bg-dragon-lair", probability: 12 },
    { itemId: "frame-cosmic", probability: 12 },
    { itemId: "deco-throne-room", probability: 13 },
    { itemId: "vic-godrays", probability: 12 },
    { itemId: "sym-divine-rune", probability: 12 },
    { itemId: "ava-god", probability: 13 },
  ],
  secret_chest: [
    { itemId: "relic-eternal-god", probability: 0.1 },
    { itemId: "seas-eclipse", probability: 9.9 },
    { itemId: "sym-divine-rune", probability: 12 },
    { itemId: "ava-god", probability: 12 },
    { itemId: "bg-dragon-lair", probability: 12 },
    { itemId: "vic-godrays", probability: 12 },
    { itemId: "deco-throne-room", probability: 12 },
    { itemId: "board-void", probability: 10 },
    { itemId: "frame-dragon", probability: 10 },
    { itemId: "trail-rainbow", probability: 10 },
  ],
};
