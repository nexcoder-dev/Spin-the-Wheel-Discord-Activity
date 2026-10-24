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
   WEB AUDIO HARMONICS (Subtle Mechanical Tick & Victory Chime)
   ========================================================================== */
let audioCtx = null;

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

  // Color schemes for slice alternating patterns
  const colorThemes = [
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

  // UI state: update button and status
  btnSpin.disabled = true;
  btnSpinText.textContent = "SPINNING...";
  spinStatusText.textContent = "Rolling physics deceleration...";

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
  wheelSvg.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.8, 0.25, 1)`;
  wheelSvg.style.transform = `rotate(${currentRotation}deg)`;

  // Simulate tick flutter on pointer during spin with mechanical audio clicks
  startPointerFlutter(duration);

  // Completion timer
  setTimeout(() => {
    isSpinning = false;
    btnSpin.disabled = false;
    btnSpinText.textContent = "SPIN THE WHEEL";
    spinStatusText.textContent = `Landed on ${winner.label}`;

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
 * Ticks the top pointer while wheel rotates rapidly
 */
function startPointerFlutter(duration) {
  let elapsed = 0;
  let interval = 75;

  function scheduleTick() {
    if (elapsed < duration * 0.72) {
      wheelPointer.classList.add("flutter");
      playTickSound();
      setTimeout(() => wheelPointer.classList.remove("flutter"), interval * 0.6);

      elapsed += interval;
      interval = Math.min(interval * 1.06, 260); // Gradually decelerate tick frequency
      setTimeout(scheduleTick, interval);
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
   STANDALONE CANVAS CONFETTI ENGINE
   ========================================================================== */
let confettiAnimationId = null;
let particles = [];

function launchConfetti() {
  const canvas = confettiCanvas;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  particles = [];
  const colors = ["#a855f7", "#c084fc", "#e879f9", "#818cf8", "#facc15", "#ffffff"];

  for (let i = 0; i < 95; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() * 80 - 40),
      y: canvas.height / 2 + (Math.random() * 40 - 20),
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 1.25) * 13 - 4,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      opacity: 1,
    });
  }

  function renderConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = false;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.32; // gravity
      p.vx *= 0.98; // air drag
      p.rotation += p.vRot;

      if (p.y > canvas.height * 0.35) {
        p.opacity -= 0.012;
      }

      if (p.opacity > 0) {
        activeParticles = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
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
   INITIALIZATION
   ========================================================================== */
renderWheel();
setupDiscordSdk();