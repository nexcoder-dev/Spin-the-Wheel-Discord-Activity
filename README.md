# 🎡 Spin the Wheel — Discord Activity

[![Discord Activity](https://img.shields.io/badge/Discord-Embedded_App_SDK_v1.3-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/developers/docs/activities/overview)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nexcoder-dev/Spin-the-Wheel-Discord-Activity)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.22-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ESModules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: Custom](https://img.shields.io/badge/License-Custom-crimson.svg?style=for-the-badge)](LICENSE)

> **A real-time multiplayer Voice Channel giveaway & decision wheel built natively for Discord Activities.**  
> Automate Discord giveaways, draw fair winners live with synchronized physics, and celebrate with your community in real time. `#SpinTheWheel`

---

## 📖 Overview

**Spin the Wheel** is a feature-packed, high-performance Discord Embedded App that brings an interactive decision wheel and giveaway engine directly into Discord Voice and Text channels.

Instead of relying on clunky text bots or external third-party websites where screen sharing is required, **Spin the Wheel runs natively inside Discord**. Every participant in the voice channel sees the wheel spin with **100% server-authoritative synchronization**, realistic mechanical ticking acoustics, real-time floating emoji cheers, and instant winner fanfare.

---

## 🎁 Voice Channel (VC) Giveaway System

The activity is purpose-built to automate **Voice Channel Giveaways and Community Contests**:

1. **Automatic VC Participant Syncing**:
   - Every participant in the Voice Channel who opens the activity is automatically added to the wheel as a slice labeled with their Discord display name and profile avatar.
   - When new members join or leave the voice channel, the wheel automatically syncs and updates in real time across all screens.
2. **Authoritative Fair Winner Draw**:
   - The backend server randomly selects the winning participant based on weighted probabilities and broadcasts the exact angle and animation duration to ensure 100% synchronized visual results.
   - Prevents client-side manipulation, lag desync, or duplicate spins.
3. **Multi-Prize Elimination Mode**:
   - When a participant wins a round, their slice can automatically be eliminated from subsequent spins so they cannot win multiple prizes in the same giveaway (toggleable in host settings).
4. **Prize Tracking & Victory Celebration**:
   - The host can set custom prize titles (e.g. *"Discord Nitro 1 Month"*, *"Steam Gift Card"*, *"Custom Role"*).
   - Once the wheel stops, a victory fanfare plays with celebratory confetti and records the winner in the giveaway history log with timestamps.
5. **Host Exclusion & Permissions**:
   - Host can exclude themselves from the giveaway slice pool (`excludeHost: true`) to maintain fairness.
   - Host-only spin lock ensures only the designated host triggers spins during official giveaways.

---

## 🌟 Key Features

* 🎡 **Dynamic Wheels & Presets**:
  * `giveaway`: Automatically populated with Discord Voice Channel members and avatars.
  * `default_prizes`: Party challenges and community rewards.
  * `truth_or_dare`: Classic Truth or Dare party game.
  * `yes_or_no`: Quick decision maker (Yes / No / Maybe).
  * `numbers_1_8`: RNG number picker (1 through 8).
  * **Custom Wheel Editor**: Create custom segments with user-defined labels, weights, and color palettes.
* ⚡ **Real-Time Multiplayer Architecture**:
  * Isolated rooms per Discord voice/text channel (`channelId` / `instanceId`).
  * Instant state synchronization upon joining.
  * Automatic host migration if the active host disconnects.
* 🔊 **Synthetic Audio & Sound Engine**:
  * Procedural Web Audio API synthesizer for realistic mechanical clicking sounds that decelerate naturally with the wheel's rotation.
  * Victory fanfare celebration chimes for winning spins.
  * Built-in ambient calm music synthesizer with one-click mute/unmute toggle.
* 🎉 **Live Reactions & Emoji Cheers**:
  * Multiplayer emoji cheer broadcasts (`🎉`, `🔥`, `👏`, `🚀`, `❤️`) floating dynamically across all connected players' screens.
* 🎨 **Modern Glassmorphic Visuals**:
  * Sleek dark mode design with floating ambient glow effects and particle physics canvas.
  * Crisp high-DPI canvas rendering optimized for Retina screens.
  * Responsive layout tailored for Discord's mobile, web, and desktop activity viewports.
* 🛡️ **Discord OAuth2 Token Exchange**:
  * Built-in secure `/api/token` exchange for Discord OAuth2 access tokens.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **[Discord Embedded App SDK](https://github.com/discord/embedded-app-sdk)** | Discord Activity integration, user profile, and channel context |
| **[Vite 5](https://vitejs.dev/)** | Lightning-fast frontend tooling and development server |
| **[HTML5 Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)** | High-performance 60/120 FPS wheel rendering and particle physics |
| **[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)** | Zero-dependency procedural sound synthesis for wheel ticks & fanfare |
| **[Node.js](https://nodejs.org/)** | Backend runtime environment (ES Modules) |
| **[Express 4](https://expressjs.com/)** | REST API endpoints and static asset serving |
| **[Socket.IO 4](https://socket.io/)** | Bidirectional real-time WebSocket communication and room management |
| **[Node Test Runner](https://nodejs.org/api/test.html)** | Automated unit and integration test suite |

---

## 📁 Project Structure

```text
Spin-the-Wheel-Discord-Activity/
├── client/                     # Frontend Discord Activity client
│   ├── index.html              # Main HTML5 application markup
│   ├── main.js                 # Wheel canvas renderer, audio, and UI logic
│   ├── style.css               # Glassmorphic dark styling & responsive layout
│   ├── vite.config.js          # Vite configuration & Discord proxy routing
│   ├── package.json            # Client dependencies (@discord/embedded-app-sdk, socket.io-client)
│   └── dist/                   # Compiled production frontend build
├── server/                     # Backend real-time Socket.IO server
│   ├── server.js               # Express application and Socket.IO initialization
│   ├── game/
│   │   ├── RoomManager.js      # Session management, giveaway state, and participant tracking
│   │   ├── WheelEngine.js      # Authoritative RNG wheel calculation and angle math
│   │   ├── presets.js          # Built-in wheel presets (Giveaway, Truth or Dare, etc.)
│   │   └── socketHandler.js    # Real-time WebSocket event listeners and emitters
│   ├── test/
│   │   ├── backend.test.js     # Unit tests for WheelEngine and RoomManager
│   │   └── server.test.js      # Multiplayer Socket.IO integration tests
│   └── package.json            # Server dependencies (express, socket.io, dotenv, cors)
├── .env                        # Local environment variables (Discord Client ID & Secret)
├── example.env                 # Template environment variables
├── CONTRIBUTING.md             # Contribution guidelines & coding standards
├── LICENSE                     # Commercial and Attribution License
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your development machine:
* [Node.js](https://nodejs.org/) (`v18.0.0` or higher)
* [npm](https://www.npmjs.com/) (`v9.0.0` or higher)
* [Git](https://git-scm.com/)
* A Discord account with Developer Mode enabled

---

### 1. Clone the Repository

```bash
git clone https://github.com/nexcoder-dev/Spin-the-Wheel-Discord-Activity.git
cd Spin-the-Wheel-Discord-Activity
```

---

### 2. Install Dependencies

Install dependencies for both the frontend client and the backend server:

```bash
# Install frontend client dependencies
cd client
npm install

# Install backend server dependencies
cd ../server
npm install
cd ..
```

---

### 3. Configure Environment Variables

Create a `.env` file in the project root by copying `example.env`:

```bash
cp example.env .env
```

Open `.env` and fill in your Discord Application credentials:

```env
VITE_DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
PORT=3001
```

---

### 4. Start Local Development

Open two terminal windows:

* **Terminal 1: Start Backend Server**
  ```bash
  cd server
  npm run dev
  ```
  The server starts on `http://localhost:3001`.

* **Terminal 2: Start Frontend Client**
  ```bash
  cd client
  npm run dev
  ```
  The Vite dev server starts on `http://localhost:5173`.

---

### 5. Run Backend Tests

Run the built-in test suite to verify wheel mathematics, room isolation, and multiplayer synchronization:

```bash
cd server
npm test
```

---

### 6. Build for Production

To create an optimized production bundle:

```bash
npm run build
```

The compiled assets will be written to `client/dist/`, which the Express server serves directly in production.

---

## ☁️ Deploying to Render (Hosting on Render.com)

You can host **Spin the Wheel** on [Render.com](https://render.com/) as a unified Web Service (frontend + backend + WebSockets together).

### Method 1: Instant Blueprint Deployment (Recommended)
1. Fork or push this repository to your GitHub account.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** -> **Blueprint**.
4. Select your `Spin-the-Wheel-Discord-Activity` repository. Render will automatically detect [`render.yaml`](render.yaml).
5. Enter your environment variables when prompted:
   * `VITE_DISCORD_CLIENT_ID`: Your Discord Application Client ID.
   * `DISCORD_CLIENT_SECRET`: Your Discord Application Client Secret.
6. Click **Apply**. Render will automatically build the client and start the server!

### Method 2: Manual Web Service Setup
If creating the service manually:
1. In the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   * **Name**: `spin-the-wheel-discord-activity` (or your preferred name)
   * **Language / Runtime**: `Node`
   * **Branch**: `main`
   * **Build Command**: `npm --prefix client install --no-save && npm --prefix client run build && npm --prefix server install --no-save`
   * **Start Command**: `node server/server.js`
   * **Plan**: `Free`
4. Add the following **Environment Variables**:
   * `NODE_VERSION`: `20.18.0`
   * `VITE_DISCORD_CLIENT_ID`: `<your_discord_application_client_id>`
   * `DISCORD_CLIENT_SECRET`: `<your_discord_application_client_secret>`
5. Click **Create Web Service**. Once deployed, Render will provide a free HTTPS URL like `https://spin-the-wheel-discord-activity.onrender.com`.

---

## 🤖 Discord Developer Portal Configuration

To run and test the activity inside Discord:

1. Go to the **[Discord Developer Portal](https://discord.com/developers/applications)** and click **New Application**.
2. Copy the **Application ID** and paste it as `VITE_DISCORD_CLIENT_ID` in your `.env` file.
3. Go to **OAuth2** -> **General**, copy the **Client Secret**, and paste it as `DISCORD_CLIENT_SECRET` in your `.env` file.
4. Navigate to **Activities** (or **Embedded App SDK**):
   * Enable the Activity feature.
   * **URL**: Set your Render URL, e.g. `https://<your-service>.onrender.com` (or your local tunnel for development).
5. Configure **URL Mappings** under the Activity settings:
   * **Prefix**: `/.proxy/api` -> **Target**: `https://<your-service>.onrender.com/api` (or `http://localhost:3001` for local testing).
6. Join a Discord Voice Channel on a server where you have developer permissions, click the **Rocket 🚀 (Activities)** icon, and launch **Spin the Wheel**!

---

## 📡 Socket.IO Real-Time Protocol Specification

Connect through the Vite dev proxy or Discord's activity proxy:

```javascript
import { io } from "socket.io-client";

const socket = io({
  path: "/api/socket.io"
});
```

### 1. `room:join`
Join a room using the Discord Activity's channel or instance ID.
* **Payload**:
  ```json
  {
    "channelId": "123456789012345678",
    "user": {
      "id": "123456789",
      "username": "Gamer123",
      "avatar": "avatar_hash"
    }
  }
  ```
* **Acknowledgement Callback**:
  ```json
  {
    "success": true,
    "participant": { "id": "123456789", "username": "Gamer123", "isHost": true },
    "state": {}
  }
  ```

---

### 2. `giveaway:set_prize`
Update the prize title for the current giveaway.
* **Payload**:
  ```json
  {
    "channelId": "123456789012345678",
    "prize": "Discord Nitro 1 Month 🎁"
  }
  ```
* **Broadcast Event (`giveaway:prize_updated`)**:
  ```json
  { "prize": "Discord Nitro 1 Month 🎁" }
  ```

---

### 3. `giveaway:set_options`
Update giveaway settings such as host exclusion or auto-sync.
* **Payload**:
  ```json
  {
    "channelId": "123456789012345678",
    "options": {
      "prize": "Nitro 1 Month",
      "excludeHost": true,
      "autoSyncVcParticipants": true
    }
  }
  ```
* **Broadcast Event (`giveaway:options_updated`)**

---

### 4. `giveaway:sync`
Force a re-synchronization of all active VC members onto the wheel slices.
* **Payload**:
  ```json
  { "channelId": "123456789012345678" }
  ```

---

### 5. `giveaway:reset`
Reset the list of drawn giveaway winners and reload all VC participants back onto the wheel.
* **Payload**:
  ```json
  { "channelId": "123456789012345678" }
  ```
* **Broadcast Event (`giveaway:reset`)**

---

### 6. `wheel:spin`
Trigger an authoritative spin to draw a winner.
* **Payload**:
  ```json
  { "channelId": "123456789012345678" }
  ```
* **Broadcast Event (`wheel:spin_started`)**:
  Sent immediately to all players in the channel:
  ```json
  {
    "spinnerId": "host_user_id",
    "spinnerName": "HostUser",
    "targetAngle": 2345.5,
    "durationMs": 5200,
    "winningSegment": { "id": "player-123456", "label": "WinnerName", "userId": "123456" },
    "winningIndex": 2,
    "startedAt": 1700000000000,
    "endsAt": 1700000005200
  }
  ```
* **Broadcast Event (`wheel:spin_ended`)**:
  Sent automatically once the animation duration finishes on the server:
  ```json
  {
    "winningSegment": { "id": "player-123456", "label": "WinnerName" },
    "giveawayWinner": {
      "round": 1,
      "winner": { "id": "123456", "username": "WinnerName", "avatar": "..." },
      "prize": "Discord Nitro 1 Month 🎁",
      "timestamp": 1700000005200
    },
    "eliminated": true,
    "currentSegments": [],
    "state": {}
  }
  ```
* **Broadcast Event (`giveaway:winner_drawn`)**:
  Dedicated celebratory event triggering client-side confetti and victory fanfare.

---

### 7. `game:reaction`
Send an emoji reaction/cheer during the spin.
* **Payload**:
  ```json
  { "channelId": "123456789012345678", "emoji": "🎉" }
  ```

---

## 🌐 REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/token` | Exchange Discord OAuth authorization code for an `access_token` |
| `GET` | `/api/health` | Server health check, uptime, and active room count |
| `GET` | `/api/presets` | List of available wheel presets |
| `GET` | `/api/room/:channelId` | Full snapshot of room and wheel state |
| `GET` | `/api/room/:channelId/giveaway` | Giveaway state, prize, winners, and VC participants |
| `POST` | `/api/room/:channelId/giveaway/prize` | Set giveaway prize title via REST |
| `POST` | `/api/room/:channelId/giveaway/sync` | Force sync of VC participants to wheel via REST |
| `POST` | `/api/room/:channelId/spin` | REST fallback to trigger a spin |

---

## 🔧 Customization Guide

### Adding New Wheel Presets
New presets can be added to [`server/game/presets.js`](server/game/presets.js):
```javascript
export const PRESET_WHEELS = {
  custom_mode: {
    id: "custom_mode",
    name: "My Custom Wheel",
    description: "Custom wheel options",
    segments: [
      { id: "opt-1", label: "Option 1", weight: 1, color: "#6366f1" },
      { id: "opt-2", label: "Option 2", weight: 1, color: "#ec4899" }
    ]
  }
};
```

### Adjusting Spin Physics & Duration
Spin deceleration and animation durations are controlled in [`server/game/WheelEngine.js`](server/game/WheelEngine.js). The default spin duration is between 4500ms and 6500ms with 5 to 8 full rotations.

---

## 🤝 Contributing

Contributions to **Spin the Wheel - Discord Activity** are welcome! Please review our [**Contributing Guidelines**](CONTRIBUTING.md) and [`LICENSE`](LICENSE) before submitting code.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👥 Authors

* **Sayan** — *Backend Developer*  
  * GitHub: [@nexcoder-dev](https://github.com/nexcoder-dev)  
  * Licensing & Inquiries: [gsa339402@gmail.com](mailto:gsa339402@gmail.com)
* **Vedant** — *Frontend Developer*  
  * GitHub: [@Vedant08-code-ai](https://github.com/Vedant08-code-ai)  
  * Contact: [vedantmaslekar26@gmail.com](mailto:vedantmaslekar26@gmail.com)

---

## 📜 License

Distributed under the **Commercial and Attribution License**. See [`LICENSE`](LICENSE) for complete terms.

---

<p align="center">
  Crafted with ❤️ for the <strong>Discord Community</strong>
</p>
