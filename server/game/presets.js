export const PRESET_WHEELS = {
  giveaway: {
    id: "giveaway",
    name: "Voice Channel Giveaway 🎁",
    description: "Automatically fills wheel with all participants in the Voice Channel",
    segments: []
  },
  items: {
    id: "items",
    name: "Item Drops 🎁",
    segments: [
      { id: "nitro", label: "Discord Nitro", sub: "1 Month Sub", icon: "💎", colorTheme: 1, weight: 1 },
      { id: "vip", label: "VIP Role", sub: "Permanent", icon: "👑", colorTheme: 0, weight: 1 },
      { id: "coins", label: "1,000 Coins", sub: "Server Currency", icon: "🪙", colorTheme: 2, weight: 1 },
      { id: "badge", label: "Rare Badge", sub: "Profile Showcase", icon: "🎖️", colorTheme: 0, weight: 1 },
      { id: "boost", label: "Server Boost", sub: "Level Up", icon: "🚀", colorTheme: 1, weight: 1 },
      { id: "box", label: "Mystery Box", sub: "Random Loot", icon: "🎁", colorTheme: 2, weight: 1 },
      { id: "title", label: "Custom Title", sub: "Role Color", icon: "✨", colorTheme: 0, weight: 1 },
      { id: "spin_again", label: "Spin Again", sub: "Bonus Turn", icon: "🔄", colorTheme: 1, weight: 1 }
    ]
  },
  default_prizes: {
    id: "default_prizes",
    name: "Party & Challenges",
    segments: [
      { id: "seg-1", label: "Do 10 Pushups 💪", color: "#FF5733", weight: 1 },
      { id: "seg-2", label: "Sing a Song 🎤", color: "#33FF57", weight: 1 },
      { id: "seg-3", label: "Tell a Joke 😂", color: "#3357FF", weight: 1 },
      { id: "seg-4", label: "Safe! 🛡️", color: "#F3FF33", weight: 1 },
      { id: "seg-5", label: "Send a Meme 🎭", color: "#FF33F6", weight: 1 },
      { id: "seg-6", label: "Imitate Someone 🗣️", color: "#33FFF6", weight: 1 },
      { id: "seg-7", label: "Spin Again 🔄", color: "#FFA833", weight: 1 },
      { id: "seg-8", label: "Share a Secret 🤫", color: "#9933FF", weight: 1 }
    ]
  },
  truth_or_dare: {
    id: "truth_or_dare",
    name: "Truth or Dare",
    segments: [
      { id: "tod-1", label: "Truth 🤔", color: "#3B82F6", weight: 2 },
      { id: "tod-2", label: "Dare 🔥", color: "#EF4444", weight: 2 },
      { id: "tod-3", label: "Truth 🤔", color: "#60A5FA", weight: 2 },
      { id: "tod-4", label: "Dare 🔥", color: "#F87171", weight: 2 },
      { id: "tod-5", label: "Double Dare 💥", color: "#DC2626", weight: 1 },
      { id: "tod-6", label: "Free Pass 🌟", color: "#10B981", weight: 1 }
    ]
  },
  yes_or_no: {
    id: "yes_or_no",
    name: "Yes or No",
    segments: [
      { id: "yon-1", label: "YES! ✅", color: "#22C55E", weight: 2 },
      { id: "yon-2", label: "NO! ❌", color: "#EF4444", weight: 2 },
      { id: "yon-3", label: "MAYBE 🤔", color: "#F59E0B", weight: 1 },
      { id: "yon-4", label: "TRY AGAIN 🔄", color: "#6366F1", weight: 1 }
    ]
  },
  numbers_1_8: {
    id: "numbers_1_8",
    name: "Numbers 1-8",
    segments: [
      { id: "num-1", label: "1", color: "#E11D48", weight: 1 },
      { id: "num-2", label: "2", color: "#EA580C", weight: 1 },
      { id: "num-3", label: "3", color: "#D97706", weight: 1 },
      { id: "num-4", label: "4", color: "#16A34A", weight: 1 },
      { id: "num-5", label: "5", color: "#0D9488", weight: 1 },
      { id: "num-6", label: "6", color: "#0284C7", weight: 1 },
      { id: "num-7", label: "7", color: "#4F46E5", weight: 1 },
      { id: "num-8", label: "8", color: "#9333EA", weight: 1 }
    ]
  }
};

export const DEFAULT_PALETTE = [
  "#EF4444", "#F97316", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6",
  "#EC4899", "#14B8A6", "#84CC16", "#EAB308"
];
