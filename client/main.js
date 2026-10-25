import { DiscordSDK } from "@discord/embedded-app-sdk";
import { io } from "socket.io-client";
import "./style.css";

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

export let discordSdk = null;
export let auth = null;
export let socket = null;
export let currentChannelId = null;
export let currentChannelName = null;
export let currentUser = null;
export let currentRoomHostUserId = null;
export let currentMode = "members";
export let isSpinning = false;
export let currentRotation = 0;
let spinCount = 0;

export function getDiscordAvatarUrl(userOrParticipant, size = 128) {
  if (!userOrParticipant) return "https://cdn.discordapp.com/embed/avatars/0.png";
  const avatar = userOrParticipant.avatar;
  const id = userOrParticipant.id || userOrParticipant.userId;

  if (typeof avatar === "string" && (avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("data:"))) {
    return avatar;
  }

  if (id && typeof avatar === "string" && avatar.trim().length > 0) {
    const isAnimated = avatar.startsWith("a_");
    const ext = isAnimated ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=${size}`;
  }

  if (id && /^\d+$/.test(id)) {
    try {
      const idx = Number((BigInt(id) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    } catch {
      return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
  }

  return "https://cdn.discordapp.com/embed/avatars/0.png";
}

export function getFriendlyChannelName(name, id) {
  if (name && typeof name === "string" && name.trim().length > 0 && !/^\d+$/.test(name.trim()) && name.trim() !== "Voice Channel") {
    return name.trim();
  }
  if (id && typeof id === "string" && !/^\d+$/.test(id) && id !== "voice-channel-demo" && id !== "voice-channel-lobby") {
    return id.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
  return "Voice Channel";
}

const userNameEl = document.getElementById("user-name");
const userTagEl = document.getElementById("user-tag");
const userAvatarEl = document.getElementById("user-avatar");
const channelNameText = document.getElementById("channel-name-text");
const channelBadge = document.getElementById("channel-badge");
const connectionPill = document.getElementById("connection-pill");
const connectionDot = document.getElementById("connection-dot");
const connectionStatusText = document.getElementById("connection-status-text");

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

const contendersModal = document.getElementById("contenders-modal");
const contendersToggleBtn = document.getElementById("contenders-toggle-btn");
const contendersCloseBtn = document.getElementById("contenders-close-btn");
const btnContendersDone = document.getElementById("btn-contenders-done");
const contendersCountBadge = document.getElementById("contenders-count-badge");
const contendersBtnText = document.getElementById("contenders-btn-text");
const rosterSubtitle = document.getElementById("roster-subtitle");
const contendersSyncText = document.getElementById("contenders-sync-text");

const giveawayHostControls = document.getElementById("giveaway-host-controls");
const giveawayPrizeInput = document.getElementById("giveaway-prize-input");
const btnSavePrize = document.getElementById("btn-save-prize");
const btnSyncVc = document.getElementById("btn-sync-vc");
const btnResetGiveaway = document.getElementById("btn-reset-giveaway");

const dropPoolHostControls = document.getElementById("drop-pool-host-controls");
const addDropItemForm = document.getElementById("add-drop-item-form");
const newItemIcon = document.getElementById("new-item-icon");
const newItemLabel = document.getElementById("new-item-label");
const newItemSub = document.getElementById("new-item-sub");
const btnResetDrops = document.getElementById("btn-reset-drops");

const winnerModal = document.getElementById("winner-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const btnModalDismiss = document.getElementById("btn-modal-dismiss");
const winnerTitle = document.getElementById("winner-title");
const winnerNameDisplay = document.getElementById("winner-name-display");
const winnerSubtitle = document.getElementById("winner-subtitle");
const winnerAvatarText = document.getElementById("winner-avatar-text");
const confettiCanvas = document.getElementById("confetti-canvas");

const tickerName = document.getElementById("ticker-name");
const tickerPrize = document.getElementById("ticker-prize");
const tickerTime = document.getElementById("ticker-time");

const toastContainer = document.getElementById("toast-container");
const floatingReactionsLayer = document.getElementById("floating-reactions-layer");

const savedSettings = JSON.parse(localStorage.getItem("wheel-settings") || "{}");
export const wheelSettings = {
  hostOnlySpin: savedSettings.hostOnlySpin ?? true,
  removeWinner: savedSettings.removeWinner ?? false,
  showConfetti: savedSettings.showConfetti ?? true,
  spinDuration: savedSettings.spinDuration ?? 5000,
  wheelStyle: savedSettings.wheelStyle ?? "neon",
  bgVideo: savedSettings.bgVideo ?? true,
};

export function isHostUser() {
  if (!currentRoomHostUserId) return true;
  const myId = currentUser?.id || auth?.user?.id;
  if (!myId) return true;
  return myId === currentRoomHostUserId;
}

const settingsModal = document.getElementById("settings-modal");
const settingsToggleBtn = document.getElementById("settings-toggle-btn");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const settingHostOnly = document.getElementById("setting-host-only");
const settingRemoveWinner = document.getElementById("setting-remove-winner");
const settingShowConfetti = document.getElementById("setting-show-confetti");
const settingBgVideo = document.getElementById("setting-bg-video");
const settingSpinDuration = document.getElementById("setting-spin-duration");
const settingWheelStyle = document.getElementById("setting-wheel-style");
const bgVideoEl = document.getElementById("bg-video");

let audioCtx = null;
let musicMasterGain = null;
let musicFilter = null;
let isMusicMuted = localStorage.getItem("wheel-music-muted") === "true";
let isMusicPlaying = false;
let ambientTimer = null;
let currentChordIndex = 0;

const AMBIENT_CHORDS = [

  [155.56, 196.00, 233.08, 293.66, 349.23],

  [130.81, 196.00, 233.08, 311.13, 293.66],

  [103.83, 155.56, 196.00, 261.63, 293.66],

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

      const detune = (Math.random() - 0.5) * 6;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);

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

    }
  });

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

  }
}

function playVictoryChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5];
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

  }
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

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

function renderWheel() {
  const items = MODES[currentMode].slices;
  const numSlices = items.length;
  const sliceAngle = 360 / numSlices;
  const cx = 250;
  const cy = 250;
  const radius = 240;

  wheelSlicesGroup.innerHTML = "";
  const defs = wheelSvg.querySelector("defs");
  if (defs) {
    defs.querySelectorAll("[id^='clip-pfp-']").forEach((el) => el.remove());
  }

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
    const groupAngle = midAngle - 90;
    const isFlipped = midAngle > 90 && midAngle < 270;

    const theme = colorThemes[item.colorTheme % colorThemes.length];

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "slice-group");
    g.setAttribute("data-index", index);
    g.setAttribute("data-id", item.id);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", describeArc(cx, cy, radius, startAngle, endAngle));
    path.setAttribute("fill", theme.fill);
    path.setAttribute("class", "slice-path");

    const textGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    textGroup.setAttribute("transform", `rotate(${groupAngle}, ${cx}, ${cy})`);

    if (item.sub) {

      const itemAnchorX = cx + radius - 26;
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", itemAnchorX);
      text.setAttribute("y", cy - 4);
      text.setAttribute("class", "slice-text");
      text.setAttribute("fill", theme.text);
      text.textContent = item.label;

      const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subText.setAttribute("x", itemAnchorX);
      subText.setAttribute("y", cy + 12);
      subText.setAttribute("class", "slice-tag-sub");
      subText.setAttribute("fill", theme.sub);
      subText.textContent = `${item.icon ? item.icon + " " : ""}${item.sub}`;

      if (isFlipped) {
        text.setAttribute("text-anchor", "start");
        text.setAttribute("transform", `rotate(180, ${itemAnchorX}, ${cy - 4})`);
        subText.setAttribute("text-anchor", "start");
        subText.setAttribute("transform", `rotate(180, ${itemAnchorX}, ${cy + 12})`);
      } else {
        text.setAttribute("text-anchor", "end");
        subText.setAttribute("text-anchor", "end");
      }

      textGroup.appendChild(text);
      textGroup.appendChild(subText);
    } else {

      const pfpX = cx + radius - 34;
      const pfpY = cy;
      const pfpR = 15;

      const pfpBorder = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pfpBorder.setAttribute("cx", pfpX);
      pfpBorder.setAttribute("cy", pfpY);
      pfpBorder.setAttribute("r", pfpR + 2);
      pfpBorder.setAttribute("fill", "#18181f");
      pfpBorder.setAttribute("stroke", "rgba(168, 85, 247, 0.85)");
      pfpBorder.setAttribute("stroke-width", "2");
      textGroup.appendChild(pfpBorder);

      const pfpFallbackBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pfpFallbackBg.setAttribute("cx", pfpX);
      pfpFallbackBg.setAttribute("cy", pfpY);
      pfpFallbackBg.setAttribute("r", pfpR);
      pfpFallbackBg.setAttribute("fill", "#3b0764");
      textGroup.appendChild(pfpFallbackBg);

      const pfpFallbackText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      pfpFallbackText.setAttribute("x", pfpX);
      pfpFallbackText.setAttribute("y", pfpY + 4);
      pfpFallbackText.setAttribute("text-anchor", "middle");
      pfpFallbackText.setAttribute("dominant-baseline", "middle");
      pfpFallbackText.setAttribute("font-size", item.isPlaceholder ? "13px" : "11px");
      pfpFallbackText.setAttribute("font-weight", "700");
      pfpFallbackText.setAttribute("fill", "#f5d0fe");

      pfpFallbackText.setAttribute("transform", `rotate(${-groupAngle}, ${pfpX}, ${pfpY})`);
      const initial = item.isPlaceholder
        ? "🎙️"
        : (item.label ? item.label.replace(/^[@! ]+/, "").slice(0, 1).toUpperCase() : "👑");
      pfpFallbackText.textContent = initial;
      textGroup.appendChild(pfpFallbackText);

      const resolvedAvatarUrl = !item.isPlaceholder ? getDiscordAvatarUrl(item) : null;
      if (resolvedAvatarUrl && defs) {
        const clipId = `clip-pfp-${index}`;
        let clip = document.getElementById(clipId);
        if (!clip) {
          clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
          clip.setAttribute("id", clipId);
          const clipCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          clipCircle.setAttribute("cx", pfpX);
          clipCircle.setAttribute("cy", pfpY);
          clipCircle.setAttribute("r", pfpR);
          clip.appendChild(clipCircle);
          defs.appendChild(clip);
        }

        const pfpImg = document.createElementNS("http://www.w3.org/2000/svg", "image");
        pfpImg.setAttribute("href", resolvedAvatarUrl);
        pfpImg.setAttribute("x", pfpX - pfpR);
        pfpImg.setAttribute("y", pfpY - pfpR);
        pfpImg.setAttribute("width", pfpR * 2);
        pfpImg.setAttribute("height", pfpR * 2);
        pfpImg.setAttribute("clip-path", `url(#${clipId})`);
        pfpImg.setAttribute("preserveAspectRatio", "xMidYMid slice");

        pfpImg.setAttribute("transform", `rotate(${-groupAngle}, ${pfpX}, ${pfpY})`);
        textGroup.appendChild(pfpImg);
      }

      const anchorX = pfpX - pfpR - 10;
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", anchorX);
      text.setAttribute("y", cy + 5);
      text.setAttribute("class", "slice-text slice-text-solo");
      text.setAttribute("fill", theme.text);

      const rawLabel = item.label || "Contender";
      const displayLabel = rawLabel.length > 20 ? rawLabel.slice(0, 18) + "…" : rawLabel;
      text.textContent = displayLabel;

      if (isFlipped) {
        text.setAttribute("text-anchor", "start");
        text.setAttribute("transform", `rotate(180, ${anchorX}, ${cy + 5})`);
      } else {
        text.setAttribute("text-anchor", "end");
      }

      textGroup.appendChild(text);
    }

    g.appendChild(path);
    g.appendChild(textGroup);
    wheelSlicesGroup.appendChild(g);
  });

  renderRoster();
}

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

  if (giveawayHostControls) {
    if (currentMode === "members" && isHostUser()) {
      giveawayHostControls.style.display = "block";
    } else {
      giveawayHostControls.style.display = "none";
    }
  }

  const canDelete = currentMode === "items" && isHostUser();

  currentData.slices.forEach((slice) => {
    const chip = document.createElement("div");
    chip.className = "roster-chip";
    chip.setAttribute("data-chip-id", slice.id);
    if (slice.avatar && !slice.isPlaceholder) {
      const avatarSrc = getDiscordAvatarUrl(slice);
      chip.innerHTML = `
        <span class="roster-chip-avatar-wrap">
          <img class="roster-chip-pfp" src="${avatarSrc}" alt="" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'" />
          <span class="roster-chip-status-ring"></span>
        </span>
        <span class="roster-chip-label">${slice.label}</span>
      `;
    } else if (slice.isPlaceholder) {
      chip.innerHTML = `
        <span class="roster-chip-emoji">🎙️</span>
        <span class="roster-chip-label" style="opacity: 0.85;">${slice.label}</span>
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
  const isMobile = window.innerWidth <= 640;
  const orbCount = isMobile ? 12 : Math.min(32, Math.floor(window.innerWidth / 40));

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

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (ambientParticlesAnimId) {
        cancelAnimationFrame(ambientParticlesAnimId);
        ambientParticlesAnimId = null;
      }
    } else {
      if (!ambientParticlesAnimId) {
        loop();
      }
    }
  });

  if (ambientParticlesAnimId) cancelAnimationFrame(ambientParticlesAnimId);
  loop();
}

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

export function spinWheelFromServer(spinData) {
  if (!spinData || isSpinning) return;

  const actualDuration = spinData.durationMs || wheelSettings.spinDuration;
  const targetRotation = spinData.targetAngle;
  const winner = spinData.winningSegment || { label: "Winner", id: "winner" };
  const chosenIndex = typeof spinData.winningIndex === "number" ? spinData.winningIndex : 0;
  const spinnerName = spinData.spinnerName || "Someone";

  isSpinning = true;
  spinCount++;

  const wheelWrapper = document.querySelector(".wheel-wrapper");
  if (wheelWrapper) {
    wheelWrapper.classList.add("is-spinning");
  }

  document.querySelectorAll(".winning-slice").forEach((el) => el.classList.remove("winning-slice"));
  document.querySelectorAll(".roster-chip.winner-chip").forEach((el) => el.classList.remove("winner-chip"));

  btnSpin.disabled = true;
  btnSpinText.textContent = "SPINNING...";
  spinStatusText.textContent = `${spinnerName} spun! Rolling wheel...`;

  const statusPill = document.getElementById("status-pill");
  if (statusPill) {
    statusPill.classList.remove("has-winner");
    statusPill.classList.add("is-spinning");
  }

  currentRotation = targetRotation;

  wheelSvg.style.transition = `transform ${actualDuration}ms cubic-bezier(0.12, 0.8, 0.25, 1)`;
  wheelSvg.style.transform = `rotate(${currentRotation}deg) translateZ(0)`;

  startPointerFlutter(actualDuration);

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

    const winningSlice = wheelSlicesGroup.querySelector(`[data-index="${chosenIndex}"]`);
    if (winningSlice) {
      winningSlice.classList.add("winning-slice");
    }

    const chips = rosterChips.querySelectorAll(".roster-chip");
    if (chips[chosenIndex]) {
      chips[chosenIndex].classList.add("winner-chip");
    }

    playVictoryChime();
    showWinnerModal(winner);
  }, actualDuration + 50);
}

export function spinWheel(targetAngle = null, duration = null, customWinner = null) {
  if (isSpinning) return;

  if (socket && socket.connected && currentChannelId) {
    if (wheelSettings.hostOnlySpin && !isHostUser()) {
      spinStatusText.textContent = "Only the host can spin the wheel";
      showToast("Only the host can spin the wheel", "warning");
      return;
    }
    btnSpin.disabled = true;
    btnSpinText.textContent = "SPINNING...";
    socket.emit("wheel:spin", { channelId: currentChannelId }, (res) => {
      if (res && !res.success) {
        btnSpin.disabled = false;
        btnSpinText.textContent = "SPIN THE WHEEL";
        spinStatusText.textContent = res.error || "Cannot spin";
        showToast(res.error || "Cannot spin right now", "warning");
      }
    });
    return;
  }

  const actualDuration = duration !== null ? duration : wheelSettings.spinDuration;
  isSpinning = true;
  spinCount++;

  const wheelWrapper = document.querySelector(".wheel-wrapper");
  if (wheelWrapper) {
    wheelWrapper.classList.add("is-spinning");
  }

  document.querySelectorAll(".winning-slice").forEach((el) => el.classList.remove("winning-slice"));
  document.querySelectorAll(".roster-chip.winner-chip").forEach((el) => el.classList.remove("winner-chip"));

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
  let jitter = 0;

  if (targetAngle !== null && !isNaN(targetAngle)) {
    const normalized = ((targetAngle % 360) + 360) % 360;
    chosenIndex = Math.floor(normalized / sliceAngle);
  } else {
    chosenIndex = Math.floor(Math.random() * numSlices);
    const maxJitter = sliceAngle * 0.35;
    jitter = (Math.random() * 2 - 1) * maxJitter;
  }

  const winner = customWinner || items[chosenIndex];

  const sliceCenterAngle = chosenIndex * sliceAngle + sliceAngle / 2;
  const desiredNormalizedAngle = (360 - ((sliceCenterAngle + jitter) % 360)) % 360;
  const currentNormalized = ((currentRotation % 360) + 360) % 360;
  let forwardDelta = desiredNormalizedAngle - currentNormalized;
  if (forwardDelta < 0) {
    forwardDelta += 360;
  }
  const fullRotations = (5 + Math.floor(Math.random() * 3)) * 360;
  currentRotation = currentRotation + fullRotations + forwardDelta;

  wheelSvg.style.transition = `transform ${actualDuration}ms cubic-bezier(0.12, 0.8, 0.25, 1)`;
  wheelSvg.style.transform = `rotate(${currentRotation}deg) translateZ(0)`;

  startPointerFlutter(actualDuration);

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

    const winningSlice = wheelSlicesGroup.querySelector(`[data-index="${chosenIndex}"]`);
    if (winningSlice) {
      winningSlice.classList.add("winning-slice");
    }

    const chips = rosterChips.querySelectorAll(".roster-chip");
    if (chips[chosenIndex]) {
      chips[chosenIndex].classList.add("winner-chip");
    }

    playVictoryChime();
    showWinnerModal(winner);

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

export function setWheelMode(mode, broadcast = true) {
  if (!MODES[mode]) return;
  if (isSpinning) return;
  currentMode = mode;

  if (mode === "members") {
    tabMembers.classList.add("active");
    tabMembers.setAttribute("aria-selected", "true");
    tabItems.classList.remove("active");
    tabItems.setAttribute("aria-selected", "false");
  } else {
    tabItems.classList.add("active");
    tabItems.setAttribute("aria-selected", "true");
    tabMembers.classList.remove("active");
    tabMembers.setAttribute("aria-selected", "false");
  }

  renderWheel();

  if (broadcast && socket && socket.connected && currentChannelId && isHostUser()) {
    const presetId = mode === "members" ? "giveaway" : "items";
    socket.emit("wheel:load_preset", { channelId: currentChannelId, presetId });
  }
}

window.spinWheel = spinWheel;
window.spinWheelFromServer = spinWheelFromServer;
window.setWheelMode = setWheelMode;

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

      if (studs.length > 0) {
        studs.forEach((s) => s.classList.remove("active-glow"));
        const idx1 = studStep % studs.length;
        const idx2 = (studStep + Math.floor(studs.length / 2)) % studs.length;
        studs[idx1]?.classList.add("active-glow");
        studs[idx2]?.classList.add("active-glow");
        studStep = (studStep + 1) % studs.length;
      }

      elapsed += interval;
      interval = Math.min(interval * 1.06, 260);
      setTimeout(scheduleTick, interval);
    } else {
      studs.forEach((s) => s.classList.remove("active-glow"));
    }
  }

  scheduleTick();
}

function showWinnerModal(winner) {
  if (winnerTitle) {
    winnerTitle.textContent = "THE WINNER IS";
  }
  const cleanWinnerName = winner.displayName || winner.global_name || winner.label || "Winner";
  winnerNameDisplay.textContent = cleanWinnerName;
  winnerSubtitle.innerHTML = currentMode === "members"
    ? `Congratulations to <span class="highlight-text">${cleanWinnerName}</span>!`
    : `Landed on <span class="highlight-text">${cleanWinnerName}</span>!`;

  const winnerAvatarImg = document.getElementById("winner-avatar-img");
  const avatarUrl = !winner.isPlaceholder ? getDiscordAvatarUrl(winner) : null;
  const initial = winner.isPlaceholder
    ? "🎙️"
    : (cleanWinnerName ? cleanWinnerName.replace(/^[@! ]+/, "").slice(0, 1).toUpperCase() : "👑");

  if (avatarUrl && winnerAvatarImg) {
    winnerAvatarImg.src = avatarUrl;
    winnerAvatarImg.style.display = "block";
    winnerAvatarText.style.display = "none";
    winnerAvatarImg.onerror = () => {
      winnerAvatarImg.style.display = "none";
      winnerAvatarText.style.display = "flex";
      winnerAvatarText.textContent = initial;
    };
  } else {
    if (winnerAvatarImg) winnerAvatarImg.style.display = "none";
    winnerAvatarText.style.display = "flex";
    winnerAvatarText.textContent = winner.icon || initial;
  }

  tickerName.textContent = cleanWinnerName;
  tickerPrize.textContent = currentMode === "members" ? "won the Giveaway" : `won ${winner.sub || cleanWinnerName}`;

  winnerModal.classList.add("active");
  winnerModal.setAttribute("aria-hidden", "false");

  if (wheelSettings.showConfetti) {
    launchConfetti();
  }
}

function closeWinnerModal() {
  winnerModal.classList.remove("active");
  winnerModal.setAttribute("aria-hidden", "true");
  stopConfetti();
}

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

  const particleCount = window.innerWidth < 640 ? 55 : 110;
  for (let i = 0; i < particleCount; i++) {
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
      p.vy += 0.34;
      p.vx *= 0.985;
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

export function updateChannelDisplay() {
  const friendlyName = getFriendlyChannelName(currentChannelName, currentChannelId);
  const cleanName = friendlyName.replace(/^#+/, "");
  if (channelNameText) {
    channelNameText.textContent = `Voice: #${cleanName}`;
  }
  if (connectionPill && connectionStatusText) {
    if (connectionPill.classList.contains("is-connected")) {
      connectionStatusText.textContent = "LIVE ROOM";
      connectionPill.setAttribute("title", `Connected to #${cleanName}`);
    }
  }
}

function updateConnectionStatus(status) {
  if (!connectionPill || !connectionStatusText) return;
  connectionPill.classList.remove("is-connected", "is-offline");

  const friendlyName = getFriendlyChannelName(currentChannelName, currentChannelId);

  if (status === "connected") {
    connectionPill.classList.add("is-connected");
    connectionStatusText.textContent = "LIVE ROOM";
    connectionPill.setAttribute("title", `Connected to #${friendlyName}`);
  } else if (status === "connecting") {
    connectionStatusText.textContent = "CONNECTING...";
    connectionPill.setAttribute("title", "Connecting to live room...");
  } else {
    connectionPill.classList.add("is-offline");
    connectionStatusText.textContent = "OFFLINE MODE";
    connectionPill.setAttribute("title", "Disconnected from server");
  }
}

function showToast(message, type = "normal") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 320);
  }, 3500);
}

function spawnReaction(emoji) {
  if (!floatingReactionsLayer) return;
  const el = document.createElement("div");
  el.className = "floating-emoji";
  el.textContent = emoji;

  const x = Math.max(20, Math.min(window.innerWidth - 60, Math.random() * (window.innerWidth - 80) + 40));
  const y = window.innerHeight - 80;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  floatingReactionsLayer.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function updateRecentWinnerTicker(item) {
  if (!item) return;
  const name = item.winner?.displayName || item.winner?.global_name || item.winner?.username || item.winningSegment?.label || item.label || "Winner";
  const prize = item.prize || (item.winningSegment ? (item.winningSegment.sub || item.winningSegment.label) : "Giveaway Prize");
  if (tickerName) tickerName.textContent = name.startsWith("@") ? name : `@${name}`;
  if (tickerPrize) tickerPrize.textContent = `won ${prize}`;
  if (tickerTime) tickerTime.textContent = "Just now";
}

function updateCurrentUserDisplay(user, channelId) {
  if (userNameEl && user) {
    userNameEl.textContent = user.global_name || user.displayName || user.username || "Player";
  }
  if (userTagEl && user) {
    userTagEl.textContent = `@${user.username || "player"}`;
  }
  if (userAvatarEl && user) {
    userAvatarEl.src = getDiscordAvatarUrl(user);
    userAvatarEl.onerror = () => {
      userAvatarEl.src = "https://cdn.discordapp.com/embed/avatars/0.png";
    };
  }
  updateChannelDisplay();
}

btnSpin.addEventListener("click", () => {
  if (wheelSettings.hostOnlySpin && !isHostUser()) {
    spinStatusText.textContent = "Only the host can spin the wheel";
    showToast("Only the host can spin the wheel", "warning");
    return;
  }
  spinWheel();
});

btnTestAngle.addEventListener("click", () => {
  const input = prompt("Enter target angle (0 - 359 degrees) to test wheel landing:", "135");
  if (input !== null) {
    const angle = parseFloat(input);
    if (!isNaN(angle)) {
      spinWheel(angle);
    }
  }
});

tabMembers.addEventListener("click", () => {
  setWheelMode("members", true);
});

tabItems.addEventListener("click", () => {
  setWheelMode("items", true);
});

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

window.addEventListener("resize", () => {
  if (confettiCanvas) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});

document.querySelectorAll(".reaction-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const emoji = btn.getAttribute("data-emoji");
    if (!emoji) return;
    spawnReaction(emoji);
    if (socket && socket.connected && currentChannelId) {
      socket.emit("game:reaction", { channelId: currentChannelId, emoji });
    }
  });
});

btnSavePrize?.addEventListener("click", () => {
  if (!isHostUser()) {
    showToast("Only the host can update the prize", "warning");
    return;
  }
  const prize = giveawayPrizeInput?.value?.trim() || "Giveaway Prize 🎁";
  if (socket && socket.connected && currentChannelId) {
    socket.emit("giveaway:set_prize", { channelId: currentChannelId, prize }, (res) => {
      if (res && res.success) {
        showToast(`🎁 Prize saved: "${prize}"`, "success");
      }
    });
  } else {
    showToast(`🎁 Prize set: "${prize}"`);
  }
});

btnSyncVc?.addEventListener("click", () => {
  if (!isHostUser()) {
    showToast("Only the host can sync participants", "warning");
    return;
  }
  fetchDiscordChannelName();
  if (socket && socket.connected && currentChannelId) {
    socket.emit("giveaway:sync", { channelId: currentChannelId }, (res) => {
      if (res && res.success) {
        showToast("🔄 Voice Channel participants refreshed!", "success");
      }
    });
  } else {
    showToast("🔄 Synced active contenders!");
  }
});

channelBadge?.addEventListener("click", async () => {
  if (discordSdk && discordSdk.channelId) {
    showToast("🔄 Refreshing Discord voice channel name...", "normal");
    const name = await fetchDiscordChannelName();
    if (name) {
      showToast(`🎙️ Voice Channel: #${name}`, "success");
    } else {
      showToast("Voice channel synced", "normal");
    }
  } else {
    const custom = prompt("Enter custom voice room name:", currentChannelName || "Voice Room");
    if (custom && custom.trim().length > 0) {
      currentChannelName = custom.trim().replace(/^#+/, "");
      updateChannelDisplay();
      if (socket && socket.connected && currentChannelId) {
        socket.emit("room:update_channel_name", {
          channelId: currentChannelId,
          channelName: currentChannelName
        });
      }
      showToast(`Room set to #${currentChannelName}`, "success");
    }
  }
});

btnResetGiveaway?.addEventListener("click", () => {
  if (!isHostUser()) {
    showToast("Only the host can reset the giveaway", "warning");
    return;
  }
  if (confirm("Reset giveaway winners and restore all Voice Channel participants to the wheel?")) {
    if (socket && socket.connected && currentChannelId) {
      socket.emit("giveaway:reset", { channelId: currentChannelId }, (res) => {
        if (res && res.success) {
          showToast("✨ Giveaway reset successfully!", "success");
        }
      });
    }
  }
});

const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

export async function fetchDiscordChannelName() {
  if (!discordSdk || !discordSdk.channelId) {
    return null;
  }
  try {
    console.log("[Discord SDK] Querying getChannel for channel_id:", discordSdk.channelId);
    const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId });
    console.log("[Discord SDK] getChannel response:", channel);
    const fetchedName = channel?.name || channel?.channel?.name;
    if (fetchedName && typeof fetchedName === "string" && fetchedName.trim().length > 0) {
      currentChannelName = fetchedName.trim();
      updateChannelDisplay();
      if (socket && socket.connected) {
        socket.emit("room:update_channel_name", {
          channelId: currentChannelId,
          channelName: currentChannelName
        });
      }
      return currentChannelName;
    }
  } catch (err) {
    console.info("[Discord SDK] Channel fetch status:", err?.message || err);
  }
  return null;
}

async function setupDiscordSdk() {
  const isInsideDiscordIframe = typeof window !== "undefined" && (
    (window.parent && window.parent !== window) ||
    new URLSearchParams(window.location.search).has("frame_id")
  );

  let inDiscordSuccess = false;
  let activeClientId = clientId;

  if (!activeClientId && isInsideDiscordIframe) {
    try {
      const cfgRes = await fetch("/api/config");
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        if (cfg.clientId) activeClientId = cfg.clientId;
      }
    } catch {
    }
  }

  if (activeClientId && isInsideDiscordIframe) {
    try {
      discordSdk = new DiscordSDK(activeClientId);

      const readyPromise = discordSdk.ready();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Discord SDK handshake timeout")), 2500)
      );
      await Promise.race([readyPromise, timeoutPromise]);
      console.log("[Discord SDK] Ready inside Discord Activity iframe.");

      currentChannelId = discordSdk.channelId || discordSdk.instanceId || "voice-channel-lobby";

      await fetchDiscordChannelName();

      try {
        const { code } = await discordSdk.commands.authorize({
          client_id: activeClientId,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify", "guilds"],
        });

        let tokenRes;
        try {
          tokenRes = await fetch("/.proxy/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          if (!tokenRes.ok) throw new Error("Proxy token failed");
        } catch {
          tokenRes = await fetch("/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
        }

        if (tokenRes && tokenRes.ok) {
          const { access_token } = await tokenRes.json();
          auth = await discordSdk.commands.authenticate({ access_token });
          if (auth && auth.user) {
            currentUser = {
              id: auth.user.id,
              username: auth.user.username,
              global_name: auth.user.global_name,
              displayName: auth.user.global_name || auth.user.username,
              avatar: getDiscordAvatarUrl(auth.user),
              discriminator: auth.user.discriminator
            };
            inDiscordSuccess = true;
          }
        }

        await fetchDiscordChannelName();

        try {
          const instanceData = await discordSdk.commands.getInstanceConnectedParticipants();
          if (instanceData && Array.isArray(instanceData.participants) && instanceData.participants.length > 0) {
            const vcMembers = instanceData.participants.map((p, idx) => ({
              id: p.id || `p-${idx}`,
              userId: p.id,
              displayName: p.nickname || p.global_name || p.username || `Member ${idx + 1}`,
              username: p.username || `member${idx + 1}`,
              label: p.nickname || p.global_name || p.username || `@Member${idx + 1}`,
              avatar: getDiscordAvatarUrl(p),
            }));
            setParticipants(vcMembers);
          }
        } catch (pErr) {
          console.info("getInstanceConnectedParticipants info:", pErr.message);
        }
      } catch (authError) {
        console.warn("Discord SDK OAuth handshake skipped or in test mode:", authError);
      }

      try {
        await discordSdk.subscribe("ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE", (event) => {
          if (event && Array.isArray(event.participants) && event.participants.length > 0) {
            const vcMembers = event.participants.map((p, idx) => ({
              id: p.id || `p-${idx}`,
              userId: p.id,
              displayName: p.nickname || p.global_name || p.username || `Member ${idx + 1}`,
              username: p.username || `member${idx + 1}`,
              label: p.nickname || p.global_name || p.username || `@Member${idx + 1}`,
              avatar: getDiscordAvatarUrl(p),
            }));
            setParticipants(vcMembers);
          }
        });
      } catch (subErr) {
        console.info("Activity instance participants subscription note:", subErr.message);
      }
    } catch (sdkError) {
      console.info("Discord SDK not running in Discord client iframe; running standalone mode.", sdkError.message);
    }
  }

  if (!inDiscordSuccess || !currentUser) {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("channelId") || urlParams.get("channel") || urlParams.get("room");
    currentChannelId = currentChannelId || roomParam || "voice-channel-demo";

    const nameParam = urlParams.get("channelName") || urlParams.get("channel_name") || urlParams.get("name");
    if (nameParam && typeof nameParam === "string" && !/^\d+$/.test(nameParam.trim())) {
      currentChannelName = nameParam.trim();
    }

    const savedUserId = localStorage.getItem("wheel-user-id") || `player-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem("wheel-user-id", savedUserId);

    const savedUserName = localStorage.getItem("wheel-username") || `Player_${savedUserId.slice(-4)}`;
    const avatarList = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80"
    ];
    const savedAvatar = localStorage.getItem("wheel-avatar") || avatarList[Math.floor(Math.random() * avatarList.length)];
    localStorage.setItem("wheel-avatar", savedAvatar);

    currentUser = {
      id: savedUserId,
      username: savedUserName,
      global_name: savedUserName,
      displayName: savedUserName,
      avatar: savedAvatar
    };
    console.info(`[Dev Mode] Initialized local profile: ${currentUser.username} (${currentUser.id}) in room #${currentChannelId}`);
  }

  updateCurrentUserDisplay(currentUser, currentChannelId);

  initSocketConnection(currentChannelId, currentUser);
}

function applyServerRoomState(state) {
  if (!state) return;

  if (state.hostUserId) {
    currentRoomHostUserId = state.hostUserId;
  }

  if (state.channelName && typeof state.channelName === "string" && !/^\d+$/.test(state.channelName.trim()) && state.channelName.trim() !== "Voice Channel") {
    currentChannelName = state.channelName.trim();
    updateChannelDisplay();
  }

  if (state.giveaway && state.giveaway.prize && giveawayPrizeInput) {
    giveawayPrizeInput.value = state.giveaway.prize;
  }

  if (state.giveaway && Array.isArray(state.giveaway.winners) && state.giveaway.winners.length > 0) {
    updateRecentWinnerTicker(state.giveaway.winners[0]);
  } else if (Array.isArray(state.spinHistory) && state.spinHistory.length > 0) {
    updateRecentWinnerTicker(state.spinHistory[0]);
  }

  if (state.settings) {
    if (typeof state.settings.eliminationMode === "boolean") {
      wheelSettings.removeWinner = state.settings.eliminationMode;
    }
    if (typeof state.settings.allowAnyoneToSpin === "boolean") {
      wheelSettings.hostOnlySpin = !state.settings.allowAnyoneToSpin;
    }
    if (typeof state.settings.spinCooldownMs === "number") {
      wheelSettings.spinDuration = state.settings.spinCooldownMs;
    }
    syncSettingsInputs();
  }

  if (Array.isArray(state.wheelSegments) && state.wheelSegments.length > 0) {
    if (state.activePresetId === "items") {
      MODES.items.slices = state.wheelSegments;
      setWheelMode("items", false);
    } else {
      setParticipants(state.wheelSegments);
      setWheelMode("members", false);
    }
  }

  if (typeof state.wheelCumulativeAngle === "number" && state.wheelCumulativeAngle > 0 && !isSpinning) {
    currentRotation = state.wheelCumulativeAngle;
    wheelSvg.style.transform = `rotate(${currentRotation}deg) translateZ(0)`;
  }
}

function initSocketConnection(channelId, user) {
  if (socket && socket.connected) {
    return;
  }

  updateConnectionStatus("connecting");

  const socketPath = window.location.pathname.startsWith("/.proxy")
    ? "/.proxy/api/socket.io"
    : "/api/socket.io";

  try {
    socket = io({
      path: socketPath,
      transports: ["websocket", "polling"],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected to backend room for VC channel:", channelId);
      updateConnectionStatus("connected");
      socket.emit("room:join", { channelId, channelName: currentChannelName, user }, (response) => {
        if (response && response.success && response.state) {
          applyServerRoomState(response.state);
        }
      });
      if (discordSdk && discordSdk.channelId && (!currentChannelName || currentChannelName === "Voice Channel")) {
        fetchDiscordChannelName();
      }
    });

    socket.on("room:channel_name_updated", ({ channelName }) => {
      if (channelName && typeof channelName === "string" && !/^\d+$/.test(channelName.trim()) && channelName.trim() !== "Voice Channel") {
        currentChannelName = channelName.trim();
        updateChannelDisplay();
        console.log(`[Socket] Authoritative voice channel name updated: #${currentChannelName}`);
      }
    });

    socket.on("room:state", (state) => {
      applyServerRoomState(state);
    });

    socket.on("room:user_joined", ({ participant, participants, hostUserId }) => {
      if (hostUserId) currentRoomHostUserId = hostUserId;
      if (Array.isArray(participants)) setParticipants(participants);
      if (participant && participant.username) {
        showToast(`👋 ${participant.username} joined the room`, "normal");
      }
    });

    socket.on("room:user_left", ({ userId, username, newHostId, participants }) => {
      if (newHostId) currentRoomHostUserId = newHostId;
      if (Array.isArray(participants)) setParticipants(participants);
      if (username) {
        showToast(`🚪 ${username} left the room`, "normal");
      }
    });

    socket.on("wheel:segments_updated", ({ segments, activePresetId }) => {
      if (!Array.isArray(segments) || segments.length === 0) return;
      if (activePresetId === "items") {
        MODES.items.slices = segments;
        setWheelMode("items", false);
      } else {
        setParticipants(segments);
        setWheelMode("members", false);
      }
    });

    socket.on("wheel:settings_updated", ({ settings }) => {
      if (!settings) return;
      if (typeof settings.eliminationMode === "boolean") {
        wheelSettings.removeWinner = settings.eliminationMode;
      }
      if (typeof settings.allowAnyoneToSpin === "boolean") {
        wheelSettings.hostOnlySpin = !settings.allowAnyoneToSpin;
      }
      if (typeof settings.spinCooldownMs === "number") {
        wheelSettings.spinDuration = settings.spinCooldownMs;
      }
      syncSettingsInputs();
    });

    socket.on("wheel:spin_started", (spinData) => {
      spinWheelFromServer(spinData);
    });

    socket.on("wheel:spin_ended", (result) => {
      if (result && Array.isArray(result.currentSegments)) {
        setTimeout(() => {
          if (currentMode === "members") {
            setParticipants(result.currentSegments);
          } else {
            MODES.items.slices = result.currentSegments;
            renderWheel();
          }
        }, 1600);
      }
      if (result && result.giveawayWinner) {
        updateRecentWinnerTicker(result.giveawayWinner);
      }
    });

    socket.on("giveaway:winner_drawn", (data) => {
      updateRecentWinnerTicker(data);
    });

    socket.on("giveaway:prize_updated", ({ prize }) => {
      if (giveawayPrizeInput) giveawayPrizeInput.value = prize;
      showToast(`🎁 Prize updated: "${prize}"`, "normal");
    });

    socket.on("giveaway:reset", () => {
      showToast("🔄 Giveaway has been reset!", "normal");
    });

    socket.on("game:reaction", ({ username, emoji }) => {
      spawnReaction(emoji);
    });

    socket.on("wheel:error", ({ message }) => {
      btnSpin.disabled = false;
      btnSpinText.textContent = "SPIN THE WHEEL";
      spinStatusText.textContent = message || "Spin rejected";
      showToast(message || "Wheel error", "warning");
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
      updateConnectionStatus("offline");
    });

    socket.on("disconnect", (reason) => {
      console.warn("[Socket] Disconnected:", reason);
      updateConnectionStatus("offline");
    });

  } catch (err) {
    console.warn("[Socket] Could not connect to socket server:", err);
    updateConnectionStatus("offline");
  }
}

export function setParticipants(memberList) {
  if (!Array.isArray(memberList) || memberList.length === 0) return;

  MODES.members.slices = memberList.map((m, index) => {
    const rawName = m.displayName || m.global_name || m.label || (m.username ? `@${m.username}` : `Member ${index + 1}`);
    const isPh = !!m.isPlaceholder;
    return {
      id: m.id || `member-${index}`,
      userId: m.userId || m.id || null,
      displayName: m.displayName || m.global_name || m.username || null,
      username: m.username || null,
      label: rawName,
      avatar: isPh ? null : getDiscordAvatarUrl(m),
      colorTheme: index % 3,
      isPlaceholder: isPh
    };
  });

  if (currentMode === "members") {
    renderWheel();
  } else {
    renderRoster();
  }
}

window.setParticipants = setParticipants;

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
function initLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  const appContainer = document.getElementById("app");
  const barFill = document.getElementById("loading-bar-fill");
  const ringProgress = document.getElementById("loading-ring-progress");
  const percentText = document.getElementById("loading-percent");
  const statusMessage = document.getElementById("loading-status-message");
  const tipText = document.getElementById("loading-tip-text");

  const pillFonts = document.getElementById("pill-fonts");
  const pillVideo = document.getElementById("pill-video");
  const pillDiscord = document.getElementById("pill-discord");
  const pillSocket = document.getElementById("pill-socket");

  const bgVideo = document.getElementById("bg-video");

  if (bgVideo) {
    bgVideo.muted = true;
    bgVideo.playsInline = true;
    if (wheelSettings.bgVideo === false) {
      bgVideo.classList.add("is-hidden");
      bgVideo.pause();
    }
  }

  const TIPS = [
    "Spin the wheel in your Voice Channel with server friends!",
    "Switch to Item Drops mode to raffle Nitro, Server Roles, and Custom Loot!",
    "Customize wheel entries, avatars, and prize amounts in real-time!",
    "Click the settings icon to customize spin duration and wheel themes!",
    "Simulate spins with random angles or test client animations instantly!"
  ];
  let tipIndex = 0;
  const tipInterval = setInterval(() => {
    tipIndex = (tipIndex + 1) % TIPS.length;
    if (tipText) {
      tipText.style.opacity = "0";
      setTimeout(() => {
        tipText.textContent = TIPS[tipIndex];
        tipText.style.opacity = "1";
      }, 250);
    }
  }, 2400);

  const TOTAL_DURATION_MS = 10000;
  const startTime = performance.now();
  let isDone = false;
  let animFrameId = null;

  function setPillDone(pillEl) {
    if (!pillEl) return;
    pillEl.classList.add("ready");
    const icon = pillEl.querySelector(".pill-status-icon");
    if (icon) icon.textContent = "✓";
  }

  function setStatus(msg) {
    if (statusMessage) statusMessage.textContent = msg;
  }

  function tickProgress() {
    if (isDone) return;
    const elapsed = performance.now() - startTime;
    const ratio = Math.min(1, elapsed / TOTAL_DURATION_MS);
    const percent = Math.min(100, Math.floor(ratio * 100));

    if (barFill) barFill.style.width = `${ratio * 100}%`;
    if (percentText) percentText.textContent = `${percent}%`;

    if (ringProgress) {
      const circumference = 314;
      const offset = circumference - ratio * circumference;
      ringProgress.style.strokeDashoffset = String(offset);
    }

    if (ratio >= 0.25) {
      setPillDone(pillFonts);
      setStatus("Buffering motion background...");
    }
    if (ratio >= 0.50) {
      setPillDone(pillVideo);
      setStatus("Initializing Discord SDK...");
    }
    if (ratio >= 0.75) {
      setPillDone(pillDiscord);
      setStatus("Connecting to Voice Lobby...");
    }
    if (ratio >= 0.92) {
      setPillDone(pillSocket);
      setStatus("Preparing wheel arena...");
    }

    if (ratio < 1) {
      animFrameId = requestAnimationFrame(tickProgress);
    } else {
      finishLoading();
    }
  }

  animFrameId = requestAnimationFrame(tickProgress);

  function finishLoading() {
    if (isDone) return;
    isDone = true;
    clearInterval(tipInterval);
    if (animFrameId) cancelAnimationFrame(animFrameId);

    setPillDone(pillFonts);
    setPillDone(pillVideo);
    setPillDone(pillDiscord);
    setPillDone(pillSocket);

    setStatus("Ready! Launching arena...");
    if (percentText) percentText.textContent = "100%";
    if (barFill) barFill.style.width = "100%";
    if (ringProgress) ringProgress.style.strokeDashoffset = "0";

    if (bgVideo && wheelSettings.bgVideo !== false) {
      bgVideo.play().catch(() => {
        const resumeOnFirstTouch = () => {
          bgVideo.play().catch(() => {});
          window.removeEventListener("pointerdown", resumeOnFirstTouch);
          window.removeEventListener("keydown", resumeOnFirstTouch);
        };
        window.addEventListener("pointerdown", resumeOnFirstTouch, { once: true });
        window.addEventListener("keydown", resumeOnFirstTouch, { once: true });
      });
    }

    setTimeout(() => {
      loadingScreen?.classList.add("loaded");
      loadingScreen?.setAttribute("aria-busy", "false");
      appContainer?.classList.add("is-visible");

      setTimeout(() => {
        if (loadingScreen) {
          loadingScreen.style.display = "none";
        }
      }, 700);
    }, 350);
  }

  (async () => {
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch {}
  })();

  (async () => {
    if (bgVideo && wheelSettings.bgVideo !== false) {
      if (bgVideo.readyState < 2) {
        await new Promise((res) => {
          bgVideo.addEventListener("canplay", res, { once: true });
          setTimeout(res, 3000);
        });
      }
      bgVideo.play().catch(() => {});
    }
  })();

  (async () => {
    try {
      await setupDiscordSdk();
    } catch {}
  })();
}

initTheme();
renderWheel();
renderBezelStuds();
initAmbientParticles();
initLoadingScreen();

const musicToggleBtn = document.getElementById("music-toggle-btn");
if (musicToggleBtn) {
  musicToggleBtn.addEventListener("click", () => {
    toggleMusicMute();
  });
}

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

setMusicMuteState(isMusicMuted);

function syncSettingsInputs() {
  if (settingHostOnly) settingHostOnly.checked = wheelSettings.hostOnlySpin;
  if (settingRemoveWinner) settingRemoveWinner.checked = wheelSettings.removeWinner;
  if (settingShowConfetti) settingShowConfetti.checked = wheelSettings.showConfetti;
  if (settingBgVideo) settingBgVideo.checked = wheelSettings.bgVideo;
  if (settingSpinDuration) settingSpinDuration.value = String(wheelSettings.spinDuration);
  if (settingWheelStyle) settingWheelStyle.value = wheelSettings.wheelStyle;
}

function initWheelSettings() {
  syncSettingsInputs();

  function saveSettings() {
    localStorage.setItem("wheel-settings", JSON.stringify(wheelSettings));
    if (socket && socket.connected && currentChannelId && isHostUser()) {
      socket.emit("wheel:update_settings", {
        channelId: currentChannelId,
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

  settingBgVideo?.addEventListener("change", (e) => {
    wheelSettings.bgVideo = e.target.checked;
    saveSettings();
    if (bgVideoEl) {
      if (wheelSettings.bgVideo) {
        bgVideoEl.classList.remove("is-hidden");
        bgVideoEl.play().catch(() => {});
      } else {
        bgVideoEl.classList.add("is-hidden");
        bgVideoEl.pause();
      }
    }
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

function initDropPoolHostControls() {

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

    if (socket && socket.connected && currentChannelId) {
      socket.emit("wheel:update_segments", {
        channelId: currentChannelId,
        segments: MODES.items.slices,
      });
    }
  });

  document.querySelectorAll(".quick-emoji-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const emoji = btn.getAttribute("data-emoji");
      if (newItemIcon && emoji) {
        newItemIcon.value = emoji;
      }
    });
  });

  btnResetDrops?.addEventListener("click", () => {
    if (!isHostUser()) return;
    MODES.items.slices = JSON.parse(JSON.stringify(DEFAULT_DROP_ITEMS));
    localStorage.setItem("wheel-custom-drops", JSON.stringify(MODES.items.slices));
    renderWheel();
    renderRoster();

    if (socket && socket.connected && currentChannelId) {
      socket.emit("wheel:update_segments", {
        channelId: currentChannelId,
        segments: MODES.items.slices,
      });
    }
  });

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

    if (socket && socket.connected && currentChannelId) {
      socket.emit("wheel:update_segments", {
        channelId: currentChannelId,
        segments: MODES.items.slices,
      });
    }
  });
}

initDropPoolHostControls();

window.addEventListener("pointerdown", () => {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}, { once: true });
