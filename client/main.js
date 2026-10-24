import { DiscordSDK } from "@discord/embedded-app-sdk";
import { io } from "socket.io-client";
import "./style.css";

/* ==========================================================================
   CONFIG & DATA SETS
   ========================================================================== */

const DEFAULT_DROP_ITEMS = [
  { id: "nitro", label: "Discord Nitro", sub: "1 Month Sub", icon: "💎", colorTheme: 1 },
  { id: "vip", label: "VIP Role", sub: "Permanent", icon: "👑", colorTheme: 0 },
  { id: "coins", label: "1,000 Coins", sub: "Server Currency", icon: "🪙", colorTheme: 2 },
  { id: "badge", label: "Rare Badge", sub: "Profile Showcase", icon: "🎖️", colorTheme: 0 },
  { id: "boost", label: "Server Boost", sub: "Level Up", icon: "🚀", colorTheme: 1 },
  { id: "box", label: "Mystery Box", sub: "Random Loot", icon: "🎁", colorTheme: 2 },
  { id: "title", label: "Custom Title", sub: "Role Color", icon: "✨", colorTheme: 0 },
  { id: "spin_again", label: "Spin Again", sub: "Bonus Turn", icon: "🔄", colorTheme: 1 },
];

const savedCustomDrops = JSON.parse(localStorage.getItem("wheel-custom-drops") || "null");
const initialDropSlices = Array.isArray(savedCustomDrops) && savedCustomDrops.length >= 2
  ? savedCustomDrops
  : DEFAULT_DROP_ITEMS;

const MODES = {
  members: {
    title: "Member Giveaway Mode",
    rosterTitle: "Active Contenders",
    slices: [
      { id: "alex", label: "@Alex", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80", colorTheme: 0 },
      { id: "sam", label: "@Sam", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80", colorTheme: 1 },
      { id: "jordan", label: "@Jordan", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80", colorTheme: 2 },
      { id: "maya", label: "@Maya", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80", colorTheme: 0 },
      { id: "kai", label: "@Kai", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80", colorTheme: 1 },
      { id: "elena", label: "@Elena", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80", colorTheme: 2 },
      { id: "marcus", label: "@Marcus", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80", colorTheme: 0 },
      { id: "chloe", label: "@Chloe", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80", colorTheme: 1 },
    ],
  },
  items: {
    title: "Item Drops Mode",
    rosterTitle: "Drop Pool",
    slices: initialDropSlices,
  },
};

// State Variables
let currentMode = "members";
let isSpinning = false;
let currentRotation = 0; // Cumulative rotation in degrees
let spinCount = 0;

/* ==========================================================================
   DOM ELEMENTS
   ========================================================================== */
const wheelSvg = document.getElementById("wheel-svg");
const wheelSlicesGroup = document.getElementById("wheel-slices-group");
const wheelPointer = document.getElementById("wheel-pointer");
const btnSpin = document.getElementById("btn-spin");
const btnSpinText = document.getElementById("btn-spin-text");
const btnTestAngle = document.getElementById("btn-test-angle");
const spinStatusText = document.getElementById("spin-status-text");
const rosterTitle = document.getElementById("roster-title");
const rosterChips = document.getElementById("roster-chips");
const tabMembers = document.getElementById("tab-members");
const tabItems = document.getElementById("tab-items");

// Contenders Modal Elements
const contendersModal = document.getElementById("contenders-modal");
const contendersToggleBtn = document.getElementById("contenders-toggle-btn");
const contendersCloseBtn = document.getElementById("contenders-close-btn");
const btnContendersDone = document.getElementById("btn-contenders-done");
const contendersCountBadge = document.getElementById("contenders-count-badge");
const contendersBtnText = document.getElementById("contenders-btn-text");
const rosterSubtitle = document.getElementById("roster-subtitle");
const contendersSyncText = document.getElementById("contenders-sync-text");

// Drop Pool Host Customizer Elements
const dropPoolHostControls = document.getElementById("drop-pool-host-controls");
const addDropItemForm = document.getElementById("add-drop-item-form");
const newItemIcon = document.getElementById("new-item-icon");
const newItemLabel = document.getElementById("new-item-label");
const newItemSub = document.getElementById("new-item-sub");
const btnResetDrops = document.getElementById("btn-reset-drops");

// Winner Modal Elements
const winnerModal = document.getElementById("winner-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const btnModalDismiss = document.getElementById("btn-modal-dismiss");
const winnerTitle = document.getElementById("winner-title");
const winnerNameDisplay = document.getElementById("winner-name-display");
const winnerSubtitle = document.getElementById("winner-subtitle");
const winnerAvatarText = document.getElementById("winner-avatar-text");
const confettiCanvas = document.getElementById("confetti-canvas");

// Ticker Elements
const tickerName = document.getElementById("ticker-name");
const tickerPrize = document.getElementById("ticker-prize");

// Wheel Settings State & Storage
const savedSettings = JSON.parse(localStorage.getItem("wheel-settings") || "{}");
export const wheelSettings = {
  hostOnlySpin: savedSettings.hostOnlySpin ?? true,
  removeWinner: savedSettings.removeWinner ?? false,
  showConfetti: savedSettings.showConfetti ?? true,
  spinDuration: savedSettings.spinDuration ?? 5000,
  wheelStyle: savedSettings.wheelStyle ?? "neon",
};
let currentRoomHostUserId = null;

export function isHostUser() {
  if (!currentRoomHostUserId) return true; // Standalone or local mode: current user is host
  if (auth && auth.user && auth.user.id) {
    return auth.user.id === currentRoomHostUserId;
  }
  return true;
}

// Settings Modal Elements
const settingsModal = document.getElementById("settings-modal");
const settingsToggleBtn = document.getElementById("settings-toggle-btn");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const settingHostOnly = document.getElementById("setting-host-only");
const settingRemoveWinner = document.getElementById("setting-remove-winner");
const settingShowConfetti = document.getElementById("setting-show-confetti");
const settingSpinDuration = document.getElementById("setting-spin-duration");
const settingWheelStyle = document.getElementById("setting-wheel-style");

/* ==========================================================================
   WEB AUDIO HARMONICS & CALM AMBIENT SOUNDTRACK
   ========================================================================== */
let audioCtx = null;
let musicMasterGain = null;
let musicFilter = null;
let isMusicMuted = localStorage.getItem("wheel-music-muted") === "true";
let isMusicPlaying = false;
let ambientTimer = null;
let currentChordIndex = 0;

// Dreamy, peaceful ambient chord frequencies (Hz) in warm lower-mid register
const AMBIENT_CHORDS = [
  // Ebmaj9: Eb3, G3, Bb3, D4, F4
  [155.56, 196.00, 233.08, 293.66, 349.23],
  // Cm9: C3, G3, Bb3, Eb4, D4
  [130.81, 196.00, 233.08, 311.13, 293.66],
  // Abmaj7#11: Ab2, Eb3, G3, C4, D4
  [103.83, 155.56, 196.00, 261.63, 293.66],
  // Bb6/9: Bb2, F3, G3, C4, D4
  [116.54, 174.61, 196.00, 261.63, 293.66],
];

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function initMusicEngine() {
  const ctx = getAudioContext();
  if (!ctx || musicMasterGain) return;

  musicMasterGain = ctx.createGain();
  const initialGain = isMusicMuted ? 0.0001 : 0.065;
  musicMasterGain.gain.setValueAtTime(initialGain, ctx.currentTime);

  musicFilter = ctx.createBiquadFilter();
  musicFilter.type = "lowpass";
  musicFilter.frequency.setValueAtTime(520, ctx.currentTime);
  musicFilter.Q.setValueAtTime(0.85, ctx.currentTime);

  musicFilter.connect(musicMasterGain);
  musicMasterGain.connect(ctx.destination);
}

function playNextAmbientChord() {
  if (!isMusicPlaying) return;
  const ctx = getAudioContext();
  if (!ctx || !musicFilter) return;

  const chord = AMBIENT_CHORDS[currentChordIndex % AMBIENT_CHORDS.length];
  currentChordIndex++;

  const chordDuration = 7.0;
  const now = ctx.currentTime;

  chord.forEach((freq, idx) => {
    try {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();

      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      // Gentle micro-detuning for lush warmth
      const detune = (Math.random() - 0.5) * 6;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);

      // Smooth attack, sustain, and release crossfade
      const peakGain = 0.2 / chord.length;
      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.exponentialRampToValueAtTime(peakGain, now + 2.2);
      voiceGain.gain.setValueAtTime(peakGain, now + chordDuration - 2.2);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration);

      osc.connect(voiceGain);
      voiceGain.connect(musicFilter);

      osc.start(now);
      osc.stop(now + chordDuration + 0.05);
    } catch (e) {
      // Ignore oscillator cleanup errors
    }
  });

  // Soft sparkle shimmer note periodically
  if (Math.random() < 0.45) {
    try {
      const sparkleOsc = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      const sparkleFreqs = [783.99, 880.0, 1046.5];
      const sFreq = sparkleFreqs[Math.floor(Math.random() * sparkleFreqs.length)];

      sparkleOsc.type = "sine";
      sparkleOsc.frequency.setValueAtTime(sFreq, now + 1.5);
      sparkleGain.gain.setValueAtTime(0.0001, now + 1.5);
      sparkleGain.gain.exponentialRampToValueAtTime(0.012, now + 1.9);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(ctx.destination);

      sparkleOsc.start(now + 1.5);
      sparkleOsc.stop(now + 4.3);
    } catch (e) {}
  }

  // Schedule next chord with overlap for smooth continuous crossfade
  const nextDelay = (chordDuration - 1.9) * 1000;
  ambientTimer = setTimeout(playNextAmbientChord, nextDelay);
}

function startAmbientMusic() {
  initMusicEngine();
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  if (!isMusicPlaying) {
    isMusicPlaying = true;
    playNextAmbientChord();
  }

  setMusicMuteState(isMusicMuted);
}

function setMusicMuteState(muted) {
  isMusicMuted = muted;
  localStorage.setItem("wheel-music-muted", muted ? "true" : "false");

  const musicToggleBtn = document.getElementById("music-toggle-btn");
  if (musicToggleBtn) {
    if (!muted) {
      musicToggleBtn.classList.add("is-playing");
      musicToggleBtn.setAttribute("title", "Mute calm background music");
    } else {
      musicToggleBtn.classList.remove("is-playing");
      musicToggleBtn.setAttribute("title", "Unmute calm background music");
    }
  }

  if (musicMasterGain && audioCtx) {
    const now = audioCtx.currentTime;
    musicMasterGain.gain.cancelScheduledValues(now);
    musicMasterGain.gain.setValueAtTime(Math.max(0.0001, musicMasterGain.gain.value), now);
    if (muted) {
      musicMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    } else {
      musicMasterGain.gain.exponentialRampToValueAtTime(0.065, now + 0.6);
    }
  }
}

function toggleMusicMute() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }

  if (!isMusicPlaying) {
    startAmbientMusic();
  }

  setMusicMuteState(!isMusicMuted);
}

function playTickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {
    // Ignore audio errors gracefully
  }
}

function playVictoryChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.09;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.48);
    });
  } catch (e) {
    // Ignore audio errors gracefully
  }
}

/* ==========================================================================
   WHEEL SVG GENERATION
   ========================================================================== */

/**
 * Converts polar coordinates to Cartesian coordinates
 */
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Creates an SVG arc path representing a wheel segment
 */
function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", x, y,
    "L", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "Z"
  ].join(" ");
}

/**
 * Renders the wheel segments dynamically based on current mode
 */
function renderWheel() {
  const items = MODES[currentMode].slices;
  const numSlices = items.length;
  const sliceAngle = 360 / numSlices;
  const cx = 250;
  const cy = 250;
  const radius = 240;

  // Clear existing slices
  wheelSlicesGroup.innerHTML = "";

  // Color schemes for slice alternating patterns (light/dark & wheelStyle adaptive)
  const isLight = document.body.classList.contains("light-theme");
  let colorThemes;
  if (isLight) {
    colorThemes = [
      { fill: "url(#slice-grad-light-1)", text: "#0f172a", sub: "#64748b" },
      { fill: "url(#slice-grad-light-2)", text: "#4c1d95", sub: "#7c3aed" },
      { fill: "url(#slice-grad-light-3)", text: "#1e293b", sub: "#475569" },
    ];
  } else {
    switch (wheelSettings.wheelStyle) {
      case "amethyst":
        colorThemes = [
          { fill: "url(#slice-grad-amethyst-1)", text: "#f5d0fe", sub: "#e879f9" },
          { fill: "url(#slice-grad-amethyst-2)", text: "#fae8ff", sub: "#c084fc" },
          { fill: "url(#slice-grad-amethyst-3)", text: "#f3e8ff", sub: "#a855f7" },
        ];
        break;
      case "cyber":
        colorThemes = [
          { fill: "url(#slice-grad-cyber-1)", text: "#fdf2f8", sub: "#f472b6" },
          { fill: "url(#slice-grad-cyber-2)", text: "#f0f9ff", sub: "#38bdf8" },
          { fill: "url(#slice-grad-cyber-3)", text: "#faf5ff", sub: "#c084fc" },
        ];
        break;
      case "minimal":
        colorThemes = [
          { fill: "url(#slice-grad-minimal-1)", text: "#fafafa", sub: "#a1a1aa" },
          { fill: "url(#slice-grad-minimal-2)", text: "#ffffff", sub: "#d4d4d8" },
          { fill: "url(#slice-grad-minimal-3)", text: "#f4f4f5", sub: "#71717a" },
        ];
        break;
      case "neon":
      default:
        colorThemes = [
          { fill: "url(#slice-grad-1)", text: "#f8fafc", sub: "#a1a1aa" },
          { fill: "url(#slice-grad-2)", text: "#f5d0fe", sub: "#c084fc" },
          { fill: "url(#slice-grad-3)", text: "#e2e8f0", sub: "#94a3b8" },
        ];
        break;
    }
  }

  items.forEach((item, index) => {
    const startAngle = index * sliceAngle;
    const endAngle = (index + 1) * sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;

    const theme = colorThemes[item.colorTheme % colorThemes.length];

    // Create Slice Group
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "slice-group");
    g.setAttribute("data-index", index);
    g.setAttribute("data-id", item.id);

    // Path element for slice sector
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", describeArc(cx, cy, radius, startAngle, endAngle));
    path.setAttribute("fill", theme.fill);
    path.setAttribute("class", "slice-path");

    // Text container rotated radially from center towards edge
    const textGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    textGroup.setAttribute("transform", `rotate(${midAngle - 90}, ${cx}, ${cy})`);

    if (item.sub) {
      // Main Label (Item Mode)
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", cx + radius - 26);
      text.setAttribute("y", cy - 4);
      text.setAttribute("class", "slice-text");
      text.setAttribute("fill", theme.text);
      text.textContent = item.label;

      // Subtitle / Role Tag
      const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subText.setAttribute("x", cx + radius - 26);
      subText.setAttribute("y", cy + 12);
      subText.setAttribute("class", "slice-tag-sub");
      subText.setAttribute("fill", theme.sub);
      subText.textContent = `${item.icon ? item.icon + " " : ""}${item.sub}`;

      textGroup.appendChild(text);
      textGroup.appendChild(subText);
    } else {
      // Member Giveaway Mode: Profile Picture (PFP) + Member Name
      if (item.avatar) {
        const pfpX = cx + radius - 34;
        const pfpY = cy;
        const pfpR = 15;

        // Ensure clipPath exists in defs
        let clip = document.getElementById(`clip-pfp-${item.id}`);
        if (!clip) {
          clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
          clip.setAttribute("id", `clip-pfp-${item.id}`);
          const clipCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          clipCircle.setAttribute("cx", pfpX);
          clipCircle.setAttribute("cy", pfpY);
          clipCircle.setAttribute("r", pfpR);
          clip.appendChild(clipCircle);
          wheelSvg.querySelector("defs").appendChild(clip);
        }

        // Outer border / glow ring for avatar
        const pfpBorder = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        pfpBorder.setAttribute("cx", pfpX);
        pfpBorder.setAttribute("cy", pfpY);
        pfpBorder.setAttribute("r", pfpR + 2);
        pfpBorder.setAttribute("fill", "#18181f");
        pfpBorder.setAttribute("stroke", "rgba(168, 85, 247, 0.75)");
        pfpBorder.setAttribute("stroke-width", "2");

        // Avatar Image
        const pfpImg = document.createElementNS("http://www.w3.org/2000/svg", "image");
        pfpImg.setAttribute("href", item.avatar);
        pfpImg.setAttribute("x", pfpX - pfpR);
        pfpImg.setAttribute("y", pfpY - pfpR);
        pfpImg.setAttribute("width", pfpR * 2);
        pfpImg.setAttribute("height", pfpR * 2);
        pfpImg.setAttribute("clip-path", `url(#clip-pfp-${item.id})`);
        pfpImg.setAttribute("preserveAspectRatio", "xMidYMid slice");

        // Member Name Text
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", pfpX - pfpR - 10);
        text.setAttribute("y", cy + 5);
        text.setAttribute("class", "slice-text slice-text-solo");
        text.setAttribute("fill", theme.text);
        text.textContent = item.label;

        textGroup.appendChild(pfpBorder);
        textGroup.appendChild(pfpImg);
        textGroup.appendChild(text);
      } else {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", cx + radius - 24);
        text.setAttribute("y", cy + 5);
        text.setAttribute("class", "slice-text slice-text-solo");
        text.setAttribute("fill", theme.text);
        text.textContent = item.label;

        textGroup.appendChild(text);
      }
    }

    g.appendChild(path);
    g.appendChild(textGroup);
    wheelSlicesGroup.appendChild(g);
  });

  // Update Roster chips preview
  renderRoster();
}

/**
 * Updates the preview chips for active contenders or item drops
 */
function renderRoster() {
  const currentData = MODES[currentMode];
  rosterTitle.textContent = `${currentData.rosterTitle} (${currentData.slices.length})`;
  rosterChips.innerHTML = "";

  const hintTextEl = document.getElementById("roster-hint-text");
  if (hintTextEl && currentData.slices.length > 0) {
    const deg = (360 / currentData.slices.length).toFixed(currentData.slices.length === 8 ? 0 : 1);
    hintTextEl.textContent = `Even ${deg}° Slices`;
  }

  const membersBadge = document.getElementById("tab-members-badge");
  if (membersBadge && MODES.members) {
    membersBadge.textContent = MODES.members.slices.length;
  }
  const itemsBadge = document.getElementById("tab-items-badge");
  if (itemsBadge && MODES.items) {
    itemsBadge.textContent = MODES.items.slices.length;
  }

  if (contendersCountBadge) {
    contendersCountBadge.textContent = currentData.slices.length;
  }
  if (contendersBtnText) {
    contendersBtnText.textContent = currentMode === "members" ? "Contenders" : "Drop Pool";
  }
  if (rosterSubtitle) {
    rosterSubtitle.textContent = currentMode === "members"
      ? "Eligible contenders in voice channel"
      : "Active items and prizes in drop pool";
  }
  if (contendersSyncText) {
    contendersSyncText.textContent = currentMode === "members"
      ? "Live Voice Channel Sync Active"
      : "Server Prize Pool Active";
  }

  if (dropPoolHostControls) {
    if (currentMode === "items" && isHostUser()) {
      dropPoolHostControls.style.display = "block";
    } else {
      dropPoolHostControls.style.display = "none";
    }
  }

  const canDelete = currentMode === "items" && isHostUser();

  currentData.slices.forEach((slice) => {
    const chip = document.createElement("div");
    chip.className = "roster-chip";
    chip.setAttribute("data-chip-id", slice.id);
    if (slice.avatar) {
      chip.innerHTML = `
        <span class="roster-chip-avatar-wrap">
          <img class="roster-chip-pfp" src="${slice.avatar}" alt="${slice.label}" />
          <span class="roster-chip-status-ring"></span>
        </span>
        <span class="roster-chip-label">${slice.label}</span>
      `;
    } else if (slice.icon) {
      chip.innerHTML = `
        <span class="roster-chip-emoji">${slice.icon}</span>
        <span class="roster-chip-label">${slice.label}</span>
        ${slice.sub ? `<span class="roster-chip-sub" style="font-size:0.68rem; opacity:0.75; font-weight:500;">(${slice.sub})</span>` : ""}
        ${canDelete ? `<button type="button" class="chip-delete-btn" data-delete-id="${slice.id}" title="Remove item from wheel">✕</button>` : ""}
      `;
    } else {
      chip.innerHTML = `
        <span class="roster-chip-dot"></span>
        <span class="roster-chip-label">${slice.label}</span>
        ${canDelete ? `<button type="button" class="chip-delete-btn" data-delete-id="${slice.id}" title="Remove item from wheel">✕</button>` : ""}
      `;
    }
    rosterChips.appendChild(chip);
  });
}

/* ==========================================================================
   AMBIENT BACKGROUND PARTICLES (Soft Floating Amethyst & Gold Bokeh)
   ========================================================================== */
let ambientParticlesAnimId = null;

function initAmbientParticles() {
  const canvas = document.getElementById("ambient-particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const colors = [
    "rgba(168, 85, 247, 0.4)",
    "rgba(192, 132, 252, 0.3)",
    "rgba(139, 92, 246, 0.25)",
    "rgba(250, 204, 21, 0.25)",
    "rgba(255, 255, 255, 0.35)",
  ];

  const orbs = [];
  const orbCount = Math.min(32, Math.floor(window.innerWidth / 40));

  for (let i = 0; i < orbCount; i++) {
    orbs.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 3 + 1.2,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.4 - 0.15,
      color: colors[Math.floor(Math.random() * colors.length)],
      baseAlpha: Math.random() * 0.4 + 0.2,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.015 + Math.random() * 0.02,
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    orbs.forEach((orb) => {
      orb.x += orb.vx;
      orb.y += orb.vy;
      orb.phase += orb.pulseSpeed;

      if (orb.x < -10) orb.x = canvas.width + 10;
      if (orb.x > canvas.width + 10) orb.x = -10;
      if (orb.y < -10) orb.y = canvas.height + 10;
      if (orb.y > canvas.height + 10) orb.y = -10;

      const currentAlpha = orb.baseAlpha * (0.6 + 0.4 * Math.sin(orb.phase));

      ctx.save();
      ctx.globalAlpha = Math.max(0, currentAlpha);
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ambientParticlesAnimId = requestAnimationFrame(loop);
  }

  if (ambientParticlesAnimId) cancelAnimationFrame(ambientParticlesAnimId);
  loop();
}

/**
 * Populates 24 micro-studs around the metallic bezel ring
 */
function renderBezelStuds() {
  const bezelTicks = document.getElementById("bezel-ticks");
  if (!bezelTicks) return;
  bezelTicks.innerHTML = "";
  const numStuds = 24;
  for (let i = 0; i < numStuds; i++) {
    const angle = ((i * 360) / numStuds) * (Math.PI / 180);
    const x = 50 + 48.2 * Math.cos(angle);
    const y = 50 + 48.2 * Math.sin(angle);
    const stud = document.createElement("div");
    stud.className = "bezel-stud";
    stud.style.left = `${x.toFixed(2)}%`;
    stud.style.top = `${y.toFixed(2)}%`;
    bezelTicks.appendChild(stud);
  }
}

/* ==========================================================================
   SPIN MECHANICS & ANIMATION
   ========================================================================== */

/**
 * Public function to spin the wheel.
 * Designed to be called by backend developers or local UI trigger.
 * 
 * @param {number|null} targetAngle - Target angle in degrees [0, 360).
 *                                   If null, a random slice is selected.
 * @param {number} duration - Duration in milliseconds (default: 5000ms).
 * @param {object|null} customWinner - Optional winner object override.
 */
export function spinWheel(targetAngle = null, duration = null, customWinner = null) {
  if (isSpinning) return;

  const actualDuration = duration !== null ? duration : wheelSettings.spinDuration;

  isSpinning = true;
  spinCount++;

  const wheelWrapper = document.querySelector(".wheel-wrapper");
  if (wheelWrapper) {
    wheelWrapper.classList.add("is-spinning");
  }

  // Clear previous winning highlights
  document.querySelectorAll(".winning-slice").forEach((el) => el.classList.remove("winning-slice"));
  document.querySelectorAll(".roster-chip.winner-chip").forEach((el) => el.classList.remove("winner-chip"));

  // UI state: update button and status
  btnSpin.disabled = true;
  btnSpinText.textContent = "SPINNING...";
  spinStatusText.textContent = "Rolling physics deceleration...";

  const statusPill = document.getElementById("status-pill");
  if (statusPill) {
    statusPill.classList.remove("has-winner");
    statusPill.classList.add("is-spinning");
  }

  const items = MODES[currentMode].slices;
  const numSlices = items.length;
  const sliceAngle = 360 / numSlices;

  let chosenIndex;
  let finalSliceAngle;

  if (targetAngle !== null && !isNaN(targetAngle)) {
    // Normalizing target angle to [0, 360)
    const normalized = ((targetAngle % 360) + 360) % 360;
    chosenIndex = Math.floor(normalized / sliceAngle);
    finalSliceAngle = normalized;
  } else {
    // Pick a random slice and land within its middle 60%
    chosenIndex = Math.floor(Math.random() * numSlices);
    const sliceStart = chosenIndex * sliceAngle;
    const padding = sliceAngle * 0.2;
    const randomOffset = padding + Math.random() * (sliceAngle - padding * 2);
    finalSliceAngle = sliceStart + randomOffset;
  }

  // Ensure winning item reference
  const winner = customWinner || items[chosenIndex];

  // Calculate cumulative rotation forward
  const fullRotations = (5 + Math.floor(Math.random() * 3)) * 360;
  const currentAngleMod = currentRotation % 360;
  let targetAngleMod = 360 - finalSliceAngle;
  let angleDelta = targetAngleMod - currentAngleMod;
  if (angleDelta <= 0) {
    angleDelta += 360;
  }

  const nextRotation = currentRotation + fullRotations + angleDelta;
  currentRotation = nextRotation;

  // Apply CSS transition to the SVG
  wheelSvg.style.transition = `transform ${actualDuration}ms cubic-bezier(0.12, 0.8, 0.25, 1)`;
  wheelSvg.style.transform = `rotate(${currentRotation}deg)`;

  // Simulate tick flutter on pointer during spin with mechanical audio clicks & chasing bezel lights
  startPointerFlutter(actualDuration);

  // Completion timer
  setTimeout(() => {
    isSpinning = false;
    btnSpin.disabled = false;
    btnSpinText.textContent = "SPIN THE WHEEL";
    spinStatusText.textContent = `Landed on ${winner.label}`;

    if (statusPill) {
      statusPill.classList.remove("is-spinning");
      statusPill.classList.add("has-winner");
    }

    if (wheelWrapper) {
      wheelWrapper.classList.remove("is-spinning");
    }

    // Highlight winning slice in SVG
    const winningSlice = wheelSlicesGroup.querySelector(`[data-index="${chosenIndex}"]`);
    if (winningSlice) {
      winningSlice.classList.add("winning-slice");
    }

    // Highlight winning chip in roster preview
    const chips = rosterChips.querySelectorAll(".roster-chip");
    if (chips[chosenIndex]) {
      chips[chosenIndex].classList.add("winner-chip");
    }

    // Announce Winner via Modal, Chime & Confetti
    playVictoryChime();
    showWinnerModal(winner);

    // If Remove Winner is enabled:
    if (wheelSettings.removeWinner && items.length > 2) {
      setTimeout(() => {
        const itemIdx = items.findIndex((s) => s.id === winner.id);
        if (itemIdx !== -1) {
          items.splice(itemIdx, 1);
          renderWheel();
          spinStatusText.textContent = `Removed ${winner.label} from entries`;
        }
      }, 1500);
    }
  }, actualDuration + 50);
}

// Expose spinWheel and mode controller globally on window for easy backend hookup
window.spinWheel = spinWheel;
window.setWheelMode = (mode) => {
  if (MODES[mode]) {
    currentMode = mode;
    if (mode === "members") {
      tabMembers.click();
    } else {
      tabItems.click();
    }
  }
};

/**
 * Ticks the top pointer and pulses bezel studs sequentially while wheel rotates rapidly
 */
function startPointerFlutter(duration) {
  let elapsed = 0;
  let interval = 75;
  const studs = document.querySelectorAll(".bezel-stud");
  let studStep = 0;

  function scheduleTick() {
    if (elapsed < duration * 0.72) {
      wheelPointer.classList.add("flutter");
      playTickSound();
      setTimeout(() => wheelPointer.classList.remove("flutter"), interval * 0.6);

      // Light up chasing studs around the bezel rim
      if (studs.length > 0) {
        studs.forEach((s) => s.classList.remove("active-glow"));
        const idx1 = studStep % studs.length;
        const idx2 = (studStep + Math.floor(studs.length / 2)) % studs.length;
        studs[idx1]?.classList.add("active-glow");
        studs[idx2]?.classList.add("active-glow");
        studStep = (studStep + 1) % studs.length;
      }

      elapsed += interval;
      interval = Math.min(interval * 1.06, 260); // Gradually decelerate tick frequency
      setTimeout(scheduleTick, interval);
    } else {
      studs.forEach((s) => s.classList.remove("active-glow"));
    }
  }

  scheduleTick();
}

/* ==========================================================================
   WINNER MODAL & CELEBRATION EFFECTS
   ========================================================================== */

/**
 * Shows the elegant winner modal with winner details
 */
function showWinnerModal(winner) {
  if (winnerTitle) {
    winnerTitle.textContent = "THE WINNER IS";
  }
  winnerNameDisplay.textContent = winner.label;
  winnerSubtitle.innerHTML = currentMode === "members"
    ? `Congratulations to <span class="highlight-text">${winner.label}</span>!`
    : `Landed on <span class="highlight-text">${winner.label}</span>!`;

  const winnerAvatarImg = document.getElementById("winner-avatar-img");
  if (winner.avatar && winnerAvatarImg) {
    winnerAvatarImg.src = winner.avatar;
    winnerAvatarImg.style.display = "block";
    winnerAvatarText.style.display = "none";
  } else {
    if (winnerAvatarImg) winnerAvatarImg.style.display = "none";
    winnerAvatarText.style.display = "block";
    winnerAvatarText.textContent = winner.icon || "👑";
  }

  // Update recent winner ticker
  tickerName.textContent = winner.label;
  tickerPrize.textContent = currentMode === "members" ? "won the Giveaway" : `won ${winner.sub || winner.label}`;

  // Activate Modal overlay
  winnerModal.classList.add("active");
  winnerModal.setAttribute("aria-hidden", "false");

  // Launch celebratory confetti burst if showConfetti is enabled
  if (wheelSettings.showConfetti) {
    launchConfetti();
  }
}

/**
 * Dismisses the winner modal
 */
function closeWinnerModal() {
  winnerModal.classList.remove("active");
  winnerModal.setAttribute("aria-hidden", "true");
  stopConfetti();
}

/* ==========================================================================
   STANDALONE CANVAS CONFETTI ENGINE (Multi-Shape, 3D Flip & Sparkles)
   ========================================================================== */
let confettiAnimationId = null;
let particles = [];

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

function launchConfetti() {
  const canvas = confettiCanvas;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  particles = [];
  const colors = [
    "#c084fc",
    "#a855f7",
    "#8b5cf6",
    "#facc15",
    "#fbbf24",
    "#38bdf8",
    "#f472b6",
    "#ffffff",
  ];
  const shapes = ["rect", "star", "circle", "ribbon"];

  for (let i = 0; i < 110; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() * 120 - 60),
      y: canvas.height / 2 + (Math.random() * 60 - 30),
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 1.35) * 14 - 5,
      size: Math.random() * 8 + 4,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 14,
      flip: Math.random() * Math.PI,
      vFlip: Math.random() * 0.1 + 0.05,
      opacity: 1,
    });
  }

  function renderConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = false;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.34; // gravity
      p.vx *= 0.985; // drag
      p.rotation += p.vRot;
      p.flip += p.vFlip;

      if (p.y > canvas.height * 0.32) {
        p.opacity -= 0.011;
      }

      if (p.opacity > 0) {
        activeParticles = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        const scaleY = Math.cos(p.flip);

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "star") {
          drawStar(ctx, 0, 0, 5, p.size * 0.65, p.size * 0.3);
        } else if (p.shape === "ribbon") {
          ctx.scale(1, scaleY);
          ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 2);
        } else {
          // rect
          ctx.scale(1, scaleY);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        }

        ctx.restore();
      }
    });

    if (activeParticles) {
      confettiAnimationId = requestAnimationFrame(renderConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  renderConfetti();
}

function stopConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  const ctx = confettiCanvas.getContext("2d");
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

/* ==========================================================================
   EVENT LISTENERS & MODE SWITCHING
   ========================================================================== */

// Global socket instance for multiplayer synchronisation with server.js
let socket = null;


// Spin Button Trigger
btnSpin.addEventListener("click", () => {
  if (wheelSettings.hostOnlySpin && !isHostUser()) {
    spinStatusText.textContent = "Only the host can spin the wheel";
    return;
  }
  if (socket && socket.connected && discordSdk && discordSdk.channelId) {
    socket.emit("wheel:spin", { channelId: discordSdk.channelId });
  } else {
    spinWheel();
  }
});

// Test Specific Angle Trigger (convenient for backend devs)
btnTestAngle.addEventListener("click", () => {
  const input = prompt("Enter target angle (0 - 359 degrees) to test backend landing:", "135");
  if (input !== null) {
    const angle = parseFloat(input);
    if (!isNaN(angle)) {
      spinWheel(angle);
    }
  }
});

// Mode Tabs
tabMembers.addEventListener("click", () => {
  if (isSpinning || currentMode === "members") return;
  currentMode = "members";
  tabMembers.classList.add("active");
  tabMembers.setAttribute("aria-selected", "true");
  tabItems.classList.remove("active");
  tabItems.setAttribute("aria-selected", "false");
  renderWheel();
});

tabItems.addEventListener("click", () => {
  if (isSpinning || currentMode === "items") return;
  currentMode = "items";
  tabItems.classList.add("active");
  tabItems.setAttribute("aria-selected", "true");
  tabMembers.classList.remove("active");
  tabMembers.setAttribute("aria-selected", "false");
  renderWheel();
});

// Modal Close Triggers
modalCloseBtn.addEventListener("click", closeWinnerModal);
btnModalDismiss.addEventListener("click", closeWinnerModal);

winnerModal.addEventListener("click", (e) => {
  if (e.target === winnerModal) {
    closeWinnerModal();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && winnerModal.classList.contains("active")) {
    closeWinnerModal();
  }
});

// Resize canvas on window resize
window.addEventListener("resize", () => {
  if (confettiCanvas) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});

/* ==========================================================================
   DISCORD EMBEDDED APP SDK INTEGRATION (OPTIONAL & GRACEFUL FALLBACK)
   ========================================================================== */

let auth = null;
const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

async function setupDiscordSdk() {
  if (!clientId) {
    console.info("Discord Activity: Running in standalone dev mode (no VITE_DISCORD_CLIENT_ID set).");
    return;
  }

  try {
    const discordSdk = new DiscordSDK(clientId);
    await discordSdk.ready();
    console.log("Discord SDK is ready.");

    // Retrieve Voice Channel Name if inside a guild
    if (discordSdk.channelId != null && discordSdk.guildId != null) {
      try {
        const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId });
        if (channel && channel.name) {
          channelNameText.textContent = `Voice: #${channel.name}`;
        }
      } catch (err) {
        console.warn("Could not fetch Discord channel info:", err);
      }
    }

    // Attempt authorization if server token endpoint exists
    try {
      const { code } = await discordSdk.commands.authorize({
        client_id: clientId,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify", "guilds"],
      });

      const response = await fetch("/.proxy/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const { access_token } = await response.json();
        auth = await discordSdk.commands.authenticate({ access_token });

        if (auth && auth.user) {
          userNameEl.textContent = auth.user.global_name || auth.user.username;
          userTagEl.textContent = `@${auth.user.username}`;
          if (auth.user.avatar) {
            userAvatarEl.src = `https://cdn.discordapp.com/avatars/${auth.user.id}/${auth.user.avatar}.png?size=128`;
          }

          // Connect to backend Socket.IO room for live VC sync
          initSocketConnection(discordSdk.channelId, auth.user);
        }
      }
    } catch (authError) {
      console.warn("Discord SDK OAuth handshake skipped or in test mode:", authError);
    }

    // Subscribe to Discord Activity participants update
    try {
      await discordSdk.subscribe("ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE", (event) => {
        if (event && Array.isArray(event.participants) && event.participants.length > 0) {
          const vcMembers = event.participants.map((p, idx) => ({
            id: p.id || `p-${idx}`,
            label: `@${p.username || p.global_name || 'Member'}`,
            avatar: p.avatar
              ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png?size=128`
              : `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`,
          }));
          setParticipants(vcMembers);
        }
      });
    } catch (subErr) {
      console.info("Activity instance participants subscription note:", subErr.message);
    }
  } catch (sdkError) {
    console.info("Discord SDK not running in Discord client iframe; running standalone mode.", sdkError);
  }
}

/**
 * Connects to the backend Socket.io server (from server/server.js)
 * to automatically sync real voice channel participants in real time.
 */
function initSocketConnection(channelId, user) {
  try {
    socket = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected to backend room for VC channel:", channelId);
      socket.emit("room:join", { channelId, user });
    });

    socket.on("room:state", (state) => {
      if (state && Array.isArray(state.wheelSegments) && state.wheelSegments.length > 0) {
        setParticipants(state.wheelSegments);
      }
      if (state && state.hostUserId) {
        currentRoomHostUserId = state.hostUserId;
      }
      if (state && state.settings) {
        if (typeof state.settings.eliminationMode === "boolean") {
          wheelSettings.removeWinner = state.settings.eliminationMode;
        }
        if (typeof state.settings.allowAnyoneToSpin === "boolean") {
          wheelSettings.hostOnlySpin = !state.settings.allowAnyoneToSpin;
        }
        syncSettingsInputs();
      }
    });

    socket.on("wheel:settings_updated", ({ settings }) => {
      if (settings) {
        if (typeof settings.eliminationMode === "boolean") {
          wheelSettings.removeWinner = settings.eliminationMode;
        }
        if (typeof settings.allowAnyoneToSpin === "boolean") {
          wheelSettings.hostOnlySpin = !settings.allowAnyoneToSpin;
        }
        syncSettingsInputs();
      }
    });

    socket.on("wheel:segments_updated", ({ segments }) => {
      if (Array.isArray(segments) && segments.length > 0) {
        setParticipants(segments);
      }
    });

    socket.on("room:user_joined", ({ participants }) => {
      if (Array.isArray(participants) && participants.length > 0) {
        setParticipants(participants);
      }
    });

    socket.on("wheel:spin_started", (spinData) => {
      spinWheel(spinData.targetAngle, spinData.durationMs, spinData.winningSegment);
    });
  } catch (err) {
    console.warn("[Socket] Could not connect to socket server:", err);
  }
}

/**
 * Public helper to dynamically populate the wheel with real members from the voice channel.
 * 
 * @param {Array<{ id?: string, label?: string, username?: string, avatar?: string }>} memberList
 */
export function setParticipants(memberList) {
  if (!Array.isArray(memberList) || memberList.length === 0) return;

  MODES.members.slices = memberList.map((m, index) => {
    const handle = m.label || (m.username ? `@${m.username}` : `@Member${index + 1}`);
    let avatarUrl = m.avatar || null;
    if (!avatarUrl && m.id && m.avatarId) {
      avatarUrl = `https://cdn.discordapp.com/avatars/${m.id}/${m.avatarId}.png?size=128`;
    }
    return {
      id: m.id || `member-${index}`,
      label: handle,
      avatar: avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`,
      colorTheme: index % 3,
    };
  });

  if (currentMode === "members") {
    renderWheel();
  }
}

// Expose on window for easy access
window.setParticipants = setParticipants;

/* ==========================================================================
   THEME TOGGLE CONTROLLER
   ========================================================================== */
const themeToggleBtn = document.getElementById("theme-toggle-btn");

function initTheme() {
  const savedTheme = localStorage.getItem("wheel-theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const isNowLight = document.body.classList.toggle("light-theme");
    localStorage.setItem("wheel-theme", isNowLight ? "light" : "dark");
    renderWheel();
  });
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
initTheme();
renderWheel();
renderBezelStuds();
initAmbientParticles();
setupDiscordSdk();

// Calm Music Mute Controller & Continuous Background Soundtrack
const musicToggleBtn = document.getElementById("music-toggle-btn");
if (musicToggleBtn) {
  musicToggleBtn.addEventListener("click", () => {
    toggleMusicMute();
  });
}

// Start background soundtrack on first interaction according to browser autoplay requirements
const handleFirstAudioInteraction = () => {
  if (!isMusicMuted) {
    startAmbientMusic();
  } else {
    setMusicMuteState(true);
  }
  window.removeEventListener("pointerdown", handleFirstAudioInteraction);
  window.removeEventListener("keydown", handleFirstAudioInteraction);
};

window.addEventListener("pointerdown", handleFirstAudioInteraction, { once: true });
window.addEventListener("keydown", handleFirstAudioInteraction, { once: true });

// Setup initial UI indicator
setMusicMuteState(isMusicMuted);

/* ==========================================================================
   WHEEL SETTINGS CONTROLLER
   ========================================================================== */
function syncSettingsInputs() {
  if (settingHostOnly) settingHostOnly.checked = wheelSettings.hostOnlySpin;
  if (settingRemoveWinner) settingRemoveWinner.checked = wheelSettings.removeWinner;
  if (settingShowConfetti) settingShowConfetti.checked = wheelSettings.showConfetti;
  if (settingSpinDuration) settingSpinDuration.value = String(wheelSettings.spinDuration);
  if (settingWheelStyle) settingWheelStyle.value = wheelSettings.wheelStyle;
}

function initWheelSettings() {
  syncSettingsInputs();

  function saveSettings() {
    localStorage.setItem("wheel-settings", JSON.stringify(wheelSettings));
    if (socket && socket.connected && discordSdk && discordSdk.channelId) {
      socket.emit("wheel:update_settings", {
        channelId: discordSdk.channelId,
        settings: {
          eliminationMode: wheelSettings.removeWinner,
          allowAnyoneToSpin: !wheelSettings.hostOnlySpin,
          spinCooldownMs: wheelSettings.spinDuration,
        },
      });
    }
  }

  settingHostOnly?.addEventListener("change", (e) => {
    wheelSettings.hostOnlySpin = e.target.checked;
    saveSettings();
  });

  settingRemoveWinner?.addEventListener("change", (e) => {
    wheelSettings.removeWinner = e.target.checked;
    saveSettings();
  });

  settingShowConfetti?.addEventListener("change", (e) => {
    wheelSettings.showConfetti = e.target.checked;
    saveSettings();
  });

  settingSpinDuration?.addEventListener("change", (e) => {
    wheelSettings.spinDuration = parseInt(e.target.value, 10) || 5000;
    saveSettings();
  });

  settingWheelStyle?.addEventListener("change", (e) => {
    wheelSettings.wheelStyle = e.target.value || "neon";
    saveSettings();
    renderWheel();
  });

  function openSettings() {
    settingsModal?.classList.add("active");
    settingsModal?.setAttribute("aria-hidden", "false");
  }

  function closeSettings() {
    settingsModal?.classList.remove("active");
    settingsModal?.setAttribute("aria-hidden", "true");
  }

  settingsToggleBtn?.addEventListener("click", openSettings);
  settingsCloseBtn?.addEventListener("click", closeSettings);

  settingsModal?.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsModal?.classList.contains("active")) {
      closeSettings();
    }
  });
}

initWheelSettings();

/* ==========================================================================
   CONTENDERS MODAL CONTROLLER
   ========================================================================== */
function initContendersModal() {
  function openContenders() {
    contendersModal?.classList.add("active");
    contendersModal?.setAttribute("aria-hidden", "false");
    contendersToggleBtn?.classList.add("is-active");
  }

  function closeContenders() {
    contendersModal?.classList.remove("active");
    contendersModal?.setAttribute("aria-hidden", "true");
    contendersToggleBtn?.classList.remove("is-active");
  }

  function toggleContenders() {
    if (contendersModal?.classList.contains("active")) {
      closeContenders();
    } else {
      openContenders();
    }
  }

  contendersToggleBtn?.addEventListener("click", toggleContenders);
  contendersCloseBtn?.addEventListener("click", closeContenders);
  btnContendersDone?.addEventListener("click", closeContenders);

  contendersModal?.addEventListener("click", (e) => {
    if (e.target === contendersModal) {
      closeContenders();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && contendersModal?.classList.contains("active")) {
      closeContenders();
    }
  });
}

initContendersModal();

/* ==========================================================================
   DROP POOL HOST CUSTOMIZER CONTROLLER
   ========================================================================== */
function initDropPoolHostControls() {
  // Add item form submission
  addDropItemForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isHostUser()) return;

    const label = newItemLabel.value.trim();
    if (!label) return;

    const icon = newItemIcon.value.trim() || "🎁";
    const sub = newItemSub.value.trim() || "Custom Prize";

    const newItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: label,
      sub: sub,
      icon: icon,
      colorTheme: MODES.items.slices.length % 3,
    };

    MODES.items.slices.push(newItem);
    localStorage.setItem("wheel-custom-drops", JSON.stringify(MODES.items.slices));

    newItemLabel.value = "";
    newItemSub.value = "";

    renderWheel();
    renderRoster();

    if (socket && socket.connected && discordSdk && discordSdk.channelId) {
      socket.emit("wheel:update_segments", {
        channelId: discordSdk.channelId,
        segments: MODES.items.slices,
      });
    }
  });

  // Quick emoji buttons
  document.querySelectorAll(".quick-emoji-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const emoji = btn.getAttribute("data-emoji");
      if (newItemIcon && emoji) {
        newItemIcon.value = emoji;
      }
    });
  });

  // Reset to default drop items
  btnResetDrops?.addEventListener("click", () => {
    if (!isHostUser()) return;
    MODES.items.slices = JSON.parse(JSON.stringify(DEFAULT_DROP_ITEMS));
    localStorage.setItem("wheel-custom-drops", JSON.stringify(MODES.items.slices));
    renderWheel();
    renderRoster();

    if (socket && socket.connected && discordSdk && discordSdk.channelId) {
      socket.emit("wheel:update_segments", {
        channelId: discordSdk.channelId,
        segments: MODES.items.slices,
      });
    }
  });

  // Delegate click for delete buttons inside rosterChips
  rosterChips?.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".chip-delete-btn");
    if (!deleteBtn) return;
    if (!isHostUser()) return;

    const idToDelete = deleteBtn.getAttribute("data-delete-id");
    if (!idToDelete) return;

    if (MODES.items.slices.length <= 2) {
      alert("At least 2 items are required on the wheel.");
      return;
    }

    MODES.items.slices = MODES.items.slices.filter((s) => s.id !== idToDelete);
    localStorage.setItem("wheel-custom-drops", JSON.stringify(MODES.items.slices));
    renderWheel();
    renderRoster();

    if (socket && socket.connected && discordSdk && discordSdk.channelId) {
      socket.emit("wheel:update_segments", {
        channelId: discordSdk.channelId,
        segments: MODES.items.slices,
      });
    }
  });
}

initDropPoolHostControls();