import { DiscordSDK } from "@discord/embedded-app-sdk";
import { io } from "socket.io-client";
import "./style.css";

/* ==========================================================================
   CONFIG & DATA SETS
   ========================================================================== */

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
    slices: [
      { id: "nitro", label: "Discord Nitro", sub: "1 Month Sub", icon: "💎", colorTheme: 1 },
      { id: "vip", label: "VIP Role", sub: "Permanent", icon: "👑", colorTheme: 0 },
      { id: "coins", label: "1,000 Coins", sub: "Server Currency", icon: "🪙", colorTheme: 2 },
      { id: "badge", label: "Rare Badge", sub: "Profile Showcase", icon: "🎖️", colorTheme: 0 },
      { id: "boost", label: "Server Boost", sub: "Level Up", icon: "🚀", colorTheme: 1 },
      { id: "box", label: "Mystery Box", sub: "Random Loot", icon: "🎁", colorTheme: 2 },
      { id: "title", label: "Custom Title", sub: "Role Color", icon: "✨", colorTheme: 0 },
      { id: "spin_again", label: "Spin Again", sub: "Bonus Turn", icon: "🔄", colorTheme: 1 },
    ],
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

// Discord User & Channel Elements
const userNameEl = document.getElementById("user-name");
const userTagEl = document.getElementById("user-tag");
const userAvatarEl = document.getElementById("user-avatar");
const channelNameText = document.getElementById("channel-name-text");

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

  // Color schemes for slice alternating patterns (light/dark adaptive)
  const isLight = document.body.classList.contains("light-theme");
  const colorThemes = isLight
    ? [
        { fill: "url(#slice-grad-light-1)", text: "#0f172a", sub: "#64748b" },
        { fill: "url(#slice-grad-light-2)", text: "#4c1d95", sub: "#7c3aed" },
        { fill: "url(#slice-grad-light-3)", text: "#1e293b", sub: "#475569" },
      ]
    : [
        { fill: "url(#slice-grad-1)", text: "#f8fafc", sub: "#a1a1aa" },
        { fill: "url(#slice-grad-2)", text: "#f5d0fe", sub: "#c084fc" },
        { fill: "url(#slice-grad-3)", text: "#e2e8f0", sub: "#94a3b8" },
      ];

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

  currentData.slices.forEach((slice) => {
    const chip = document.createElement("div");
    chip.className = "roster-chip";
    if (slice.avatar) {
      chip.innerHTML = `
        <img class="roster-chip-pfp" src="${slice.avatar}" alt="${slice.label}" />
        <span>${slice.label}</span>
      `;
    } else {
      chip.innerHTML = `
        <span class="roster-chip-dot"></span>
        <span>${slice.label}</span>
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
export function spinWheel(targetAngle = null, duration = 4800, customWinner = null) {
  if (isSpinning) return;

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

  const items = MODES[currentMode].slices;
  const numSlices = items.length;
  const sliceAngle = 360 / numSlices;

  let chosenIndex;
  let nextRotation;
  let winner = customWinner;

  if (targetAngle !== null && !isNaN(targetAngle)) {
    // Exact authoritative server angle:
    // If targetAngle is already cumulative (> currentRotation), use directly
    if (targetAngle > currentRotation) {
      nextRotation = targetAngle;
    } else {
      const targetMod = ((targetAngle % 360) + 360) % 360;
      const currentMod = ((currentRotation % 360) + 360) % 360;
      let diff = targetMod - currentMod;
      if (diff <= 0) diff += 360;
      nextRotation = currentRotation + (5 * 360) + diff;
    }
    currentRotation = nextRotation;

    if (winner && winner.id) {
      chosenIndex = items.findIndex((it) => it.id === winner.id);
    }
    if (chosenIndex === undefined || chosenIndex < 0) {
      const landingAngle = ((360 - (currentRotation % 360)) % 360 + 360) % 360;
      chosenIndex = Math.floor(landingAngle / sliceAngle) % numSlices;
    }
    if (!winner) {
      winner = items[chosenIndex] || { label: "Winner", id: "winner" };
    }
  } else {
    // Local offline spin
    chosenIndex = Math.floor(Math.random() * numSlices);
    const sliceStart = chosenIndex * sliceAngle;
    const padding = sliceAngle * 0.2;
    const randomOffset = padding + Math.random() * (sliceAngle - padding * 2);
    const finalSliceAngle = sliceStart + randomOffset;
    winner = customWinner || items[chosenIndex];

    const fullRotations = (5 + Math.floor(Math.random() * 3)) * 360;
    const currentAngleMod = currentRotation % 360;
    let targetAngleMod = 360 - finalSliceAngle;
    let angleDelta = targetAngleMod - currentAngleMod;
    if (angleDelta <= 0) angleDelta += 360;
    nextRotation = currentRotation + fullRotations + angleDelta;
    currentRotation = nextRotation;
  }

  // Apply CSS transition to the SVG
  wheelSvg.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.8, 0.25, 1)`;
  wheelSvg.style.transform = `rotate(${currentRotation}deg)`;

  // Simulate tick flutter on pointer during spin with mechanical audio clicks & chasing bezel lights
  startPointerFlutter(duration);

  // Completion timer
  setTimeout(() => {
    isSpinning = false;
    btnSpin.disabled = false;
    btnSpinText.textContent = "SPIN THE WHEEL";
    spinStatusText.textContent = `Landed on ${winner.label}`;

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
  }, duration + 50);
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

  // Launch celebratory confetti burst
  launchConfetti();
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
let currentRoomState = null;

// Spin Button Trigger
btnSpin.addEventListener("click", () => {
  const channelId = (discordSdk && discordSdk.channelId) || (socket && socket.channelId) || "standalone-room";
  if (socket && socket.connected) {
    btnSpin.disabled = true;
    btnSpinText.textContent = "SPINNING...";
    socket.emit("wheel:spin", { channelId });
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

// Mode Tabs (Synced with Backend Presets)
tabMembers.addEventListener("click", () => {
  if (isSpinning) return;
  currentMode = "members";
  tabMembers.classList.add("active");
  tabMembers.setAttribute("aria-selected", "true");
  tabItems.classList.remove("active");
  tabItems.setAttribute("aria-selected", "false");
  renderWheel();

  const channelId = (discordSdk && discordSdk.channelId) || (socket && socket.channelId) || "standalone-room";
  if (socket && socket.connected) {
    socket.emit("giveaway:sync", { channelId });
  }
});

tabItems.addEventListener("click", () => {
  if (isSpinning) return;
  currentMode = "items";
  tabItems.classList.add("active");
  tabItems.setAttribute("aria-selected", "true");
  tabMembers.classList.remove("active");
  tabMembers.setAttribute("aria-selected", "false");
  renderWheel();

  const channelId = (discordSdk && discordSdk.channelId) || (socket && socket.channelId) || "standalone-room";
  if (socket && socket.connected) {
    socket.emit("wheel:load_preset", { channelId, presetId: "items" });
  }
});

// Giveaway Prize Edit Trigger
if (btnPrizeEdit) {
  btnPrizeEdit.addEventListener("click", () => {
    const currentPrize = prizeTitleText ? prizeTitleText.textContent : "Discord Nitro 1 Month 🎁";
    const newPrize = prompt("Enter Giveaway Prize Title:", currentPrize);
    if (newPrize && newPrize.trim()) {
      const channelId = (discordSdk && discordSdk.channelId) || (socket && socket.channelId) || "standalone-room";
      if (prizeTitleText) prizeTitleText.textContent = newPrize.trim();
      if (tickerPrize) tickerPrize.textContent = `Prize: ${newPrize.trim()}`;
      if (socket && socket.connected) {
        socket.emit("giveaway:set_prize", { channelId, prize: newPrize.trim() });
      }
    }
  });
}

// Winner Elimination Mode Toggle
if (btnToggleElimination) {
  btnToggleElimination.addEventListener("click", () => {
    const isCurrentlyElim = eliminationStatusLabel?.textContent.includes("ON") || false;
    const newElim = !isCurrentlyElim;
    if (eliminationStatusLabel) eliminationStatusLabel.textContent = `Elimination: ${newElim ? "ON" : "OFF"}`;
    if (eliminationStatusDot) eliminationStatusDot.className = newElim ? "status-dot-active" : "status-dot-inactive";

    const channelId = (discordSdk && discordSdk.channelId) || (socket && socket.channelId) || "standalone-room";
    if (socket && socket.connected) {
      socket.emit("giveaway:set_options", { channelId, options: { eliminationMode: newElim } });
    }
  });
}

// Reset Wheel & Contenders Trigger
if (btnResetWheel) {
  btnResetWheel.addEventListener("click", () => {
    const channelId = (discordSdk && discordSdk.channelId) || (socket && socket.channelId) || "standalone-room";
    if (socket && socket.connected) {
      if (currentMode === "members") {
        socket.emit("giveaway:reset", { channelId });
      } else {
        socket.emit("wheel:load_preset", { channelId, presetId: "items" });
      }
    } else {
      renderWheel();
    }
  });
}

// Live Cheer / Reaction Trigger
if (reactionsList) {
  reactionsList.addEventListener("click", (e) => {
    const btn = e.target.closest(".reaction-pill");
    if (!btn) return;
    const emoji = btn.getAttribute("data-emoji") || "🎉";
    const channelId = (discordSdk && discordSdk.channelId) || (socket && socket.channelId) || "standalone-room";
    const myName = (userNameEl && userNameEl.textContent !== "Alex Rivera") ? userNameEl.textContent : "Player";

    // Immediate local feedback
    spawnFloatingReaction(myName, emoji);

    // Broadcast across all clients in the Discord Activity
    if (socket && socket.connected) {
      socket.emit("game:reaction", { channelId, emoji });
    }
  });
}

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
let discordSdk = null;
const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

async function setupDiscordSdk() {
  if (!clientId) {
    console.info("Discord Activity: Running in standalone dev mode (no VITE_DISCORD_CLIENT_ID set).");
    initSocketConnection("standalone-room", { id: "dev-tester", username: "LocalTester" });
    return;
  }

  try {
    discordSdk = new DiscordSDK(clientId);

    // Timeout safeguard: if running in standalone browser tab outside Discord iframe,
    // ready() handshake will never complete. Fall back to standalone after 2.5s.
    await Promise.race([
      discordSdk.ready(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Running standalone outside Discord")), 2500)
      )
    ]);
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
    let currentUser = null;
    try {
      const { code } = await discordSdk.commands.authorize({
        client_id: clientId,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify", "guilds"],
      });

      // Try /api/token first, fallback to /.proxy/api/token
      let response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch("/.proxy/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }).catch(() => null);
      }

      if (response && response.ok) {
        const { access_token } = await response.json();
        auth = await discordSdk.commands.authenticate({ access_token });

        if (auth && auth.user) {
          currentUser = auth.user;
          userNameEl.textContent = auth.user.global_name || auth.user.username;
          userTagEl.textContent = `@${auth.user.username}`;
          if (auth.user.avatar) {
            userAvatarEl.src = `https://cdn.discordapp.com/avatars/${auth.user.id}/${auth.user.avatar}.png?size=128`;
          }
        }
      }
    } catch (authError) {
      console.warn("Discord SDK OAuth handshake skipped or in test mode:", authError);
    }

    // Always connect to backend Socket.IO room for live VC sync & authoritative wheel spins
    initSocketConnection(discordSdk.channelId || "vc-room", currentUser || {
      id: `user-${Math.random().toString(36).substring(2, 7)}`,
      username: "Member"
    });

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
    initSocketConnection("standalone-room", {
      id: `dev-${Math.random().toString(36).substring(2, 7)}`,
      username: "DevTester"
    });
  }
}

/**
 * Spawns a floating reaction bubble on top of the wheel with audio chirp
 */
function spawnFloatingReaction(username, emoji) {
  if (!floatingReactionsContainer) return;

  const bubble = document.createElement("div");
  bubble.className = "floating-bubble";
  const randomLeft = 20 + Math.random() * 55;
  bubble.style.left = `${randomLeft}%`;

  bubble.innerHTML = `
    <span class="floating-emoji">${emoji}</span>
    <span class="floating-user">@${username || "Friend"}</span>
  `;

  floatingReactionsContainer.appendChild(bubble);
  playReactionSound();

  setTimeout(() => {
    if (bubble.parentNode) {
      bubble.parentNode.removeChild(bubble);
    }
  }, 2400);
}

function playReactionSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx || isMusicMuted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.14);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
}

/**
 * Synchronizes room state received from server across UI components
 */
function syncRoomState(state) {
  if (!state) return;
  currentRoomState = state;

  // 1. Update Giveaway Prize
  if (state.giveaway && state.giveaway.prize) {
    if (prizeTitleText) prizeTitleText.textContent = state.giveaway.prize;
    if (tickerPrize) tickerPrize.textContent = `Prize: ${state.giveaway.prize}`;
  }

  // 2. Update Elimination Mode Status
  if (state.settings && typeof state.settings.eliminationMode === "boolean") {
    const isElim = state.settings.eliminationMode;
    if (eliminationStatusLabel) {
      eliminationStatusLabel.textContent = `Elimination: ${isElim ? "ON" : "OFF"}`;
    }
    if (eliminationStatusDot) {
      eliminationStatusDot.className = isElim ? "status-dot-active" : "status-dot-inactive";
    }
  }

  // 3. Update Host Indicator & Online Count
  const myId = auth?.user?.id || socket?.userId;
  if (rosterHostPill) {
    if (state.hostUserId && myId && state.hostUserId === myId) {
      rosterHostPill.textContent = "👑 You are Host";
      rosterHostPill.style.display = "inline-block";
    } else {
      const host = state.participants?.find((p) => p.id === state.hostUserId);
      rosterHostPill.textContent = `👑 Host: @${host?.username || 'Host'}`;
      rosterHostPill.style.display = "inline-block";
    }
  }

  // 4. Update Mode Tabs & Wheel Segments
  const activePreset = state.activePresetId || "giveaway";
  if (activePreset === "giveaway" || activePreset === "players") {
    currentMode = "members";
    tabMembers.classList.add("active");
    tabMembers.setAttribute("aria-selected", "true");
    tabItems.classList.remove("active");
    tabItems.setAttribute("aria-selected", "false");
  } else {
    currentMode = "items";
    tabItems.classList.add("active");
    tabItems.setAttribute("aria-selected", "true");
    tabMembers.classList.remove("active");
    tabMembers.setAttribute("aria-selected", "false");
  }

  if (Array.isArray(state.wheelSegments) && state.wheelSegments.length > 0) {
    applyServerSegments(state.wheelSegments, currentMode);
  }
}

/**
 * Applies backend segments to the active mode and re-renders
 */
function applyServerSegments(segments, mode) {
  if (!Array.isArray(segments) || segments.length === 0) return;

  const targetMode = mode || currentMode;
  const mapped = segments.map((s, index) => ({
    id: s.id || `seg-${index}`,
    label: s.label || `@User${index + 1}`,
    sub: s.sub || null,
    icon: s.icon || null,
    avatar: s.avatar || (targetMode === "members" ? `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80` : null),
    colorTheme: s.colorTheme !== undefined ? s.colorTheme : index % 3,
    color: s.color || null,
  }));

  MODES[targetMode].slices = mapped;
  renderWheel();
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
    socket.channelId = channelId;
    socket.userId = user?.id || null;

    socket.on("connect", () => {
      console.log("[Socket] Connected to backend room for VC channel:", channelId);
      socket.emit("room:join", { channelId, user }, (response) => {
        if (response && response.success && response.state) {
          syncRoomState(response.state);
        }
      });
    });

    socket.on("room:state", (state) => {
      syncRoomState(state);
    });

    socket.on("wheel:segments_updated", ({ segments, activePresetId }) => {
      if (activePresetId === "giveaway" || activePresetId === "players") {
        currentMode = "members";
        tabMembers.classList.add("active");
        tabItems.classList.remove("active");
      } else if (activePresetId === "items" || activePresetId === "default_prizes") {
        currentMode = "items";
        tabItems.classList.add("active");
        tabMembers.classList.remove("active");
      }
      applyServerSegments(segments, currentMode);
    });

    socket.on("room:user_joined", ({ participant, participants, hostUserId }) => {
      if (participant) {
        console.log(`[Room] ${participant.username} joined.`);
      }
      if (currentRoomState) {
        currentRoomState.participants = participants;
        if (hostUserId) currentRoomState.hostUserId = hostUserId;
        syncRoomState(currentRoomState);
      }
    });

    socket.on("room:user_left", ({ username, newHostId, participants }) => {
      console.log(`[Room] ${username} left.`);
      if (currentRoomState) {
        currentRoomState.participants = participants;
        if (newHostId) currentRoomState.hostUserId = newHostId;
        syncRoomState(currentRoomState);
      }
    });

    socket.on("wheel:spin_started", (spinData) => {
      spinStatusText.textContent = `${spinData.spinnerName || "Someone"} is spinning...`;
      spinWheel(spinData.targetAngle, spinData.durationMs, spinData.winningSegment);
    });

    socket.on("wheel:spin_ended", (data) => {
      if (data && Array.isArray(data.currentSegments) && data.currentSegments.length > 0) {
        applyServerSegments(data.currentSegments, currentMode);
      }
      if (data && data.giveawayWinner) {
        tickerName.textContent = data.giveawayWinner.winner?.username || "@Winner";
        tickerPrize.textContent = `won ${data.giveawayWinner.prize || 'Prize'}`;
      }
    });

    socket.on("giveaway:winner_drawn", (data) => {
      if (data && data.winner) {
        tickerName.textContent = data.winner.username || "@Winner";
        tickerPrize.textContent = `won ${data.prize || 'Giveaway'}`;
      }
    });

    socket.on("giveaway:prize_updated", ({ prize }) => {
      if (prizeTitleText) prizeTitleText.textContent = prize;
      if (tickerPrize) tickerPrize.textContent = `Prize: ${prize}`;
    });

    socket.on("giveaway:options_updated", ({ giveaway, segments }) => {
      if (giveaway && typeof giveaway.eliminationMode === "boolean") {
        if (eliminationStatusLabel) eliminationStatusLabel.textContent = `Elimination: ${giveaway.eliminationMode ? "ON" : "OFF"}`;
        if (eliminationStatusDot) eliminationStatusDot.className = giveaway.eliminationMode ? "status-dot-active" : "status-dot-inactive";
      }
      if (Array.isArray(segments) && segments.length > 0) {
        applyServerSegments(segments, currentMode);
      }
    });

    socket.on("giveaway:reset", ({ segments }) => {
      if (Array.isArray(segments) && segments.length > 0) {
        applyServerSegments(segments, currentMode);
      }
    });

    socket.on("game:reaction", ({ username, emoji }) => {
      spawnFloatingReaction(username, emoji);
    });

    socket.on("wheel:error", ({ message }) => {
      spinStatusText.textContent = message || "Cannot spin right now";
      btnSpin.disabled = false;
      btnSpinText.textContent = "SPIN THE WHEEL";
      setTimeout(() => {
        spinStatusText.textContent = "Ready to spin";
      }, 3000);
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