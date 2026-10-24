# Spin the Wheel - Discord Activity Backend SDK

A real-time multiplayer backend server tailored for Discord Activities using Express and Socket.IO.

---

## 🎁 Voice Channel (VC) Giveaway System

The backend is purpose-built to automate **Voice Channel Giveaways** in Discord Activities:

1. **Automatic VC Participant Syncing**:
   - Every user in the Voice Channel who opens the activity is automatically added to the wheel as a slice labeled with their username/display name and Discord avatar.
   - When a user joins or leaves the VC, the wheel automatically updates in real-time across all screens.
2. **Authoritative Fair Winner Draw**:
   - The server randomly selects the winning participant based on weighted probabilities and broadcasts the exact angle and animation duration to ensure 100% synchronized visual results.
3. **Multi-Prize Elimination Mode**:
   - When a participant wins a round, their slice is eliminated from subsequent spins so they cannot win multiple times in the same giveaway (can be toggled in settings).
4. **Prize Tracking & Victory Celebration**:
   - The host can set prize names (e.g. *"Discord Nitro 1 Month"*, *"Steam Gift Card"*).
   - Once the wheel stops, the server emits `giveaway:winner_drawn` and records the winner in `giveaway.winners` with the prize and timestamp.
5. **Host Exclusion**:
   - Option to exclude the host running the giveaway from being drawn (`excludeHost: true`).

---

## 🌟 Other Features

- **Discord Channel Rooms**: Multi-session isolation by Discord voice/text channel ID (`channelId` / `instanceId`).
- **Server-Authoritative Spin Engine**: Prevents client desync and cheating.
- **Dynamic Wheels & Presets**:
  - `giveaway` (VC Members Giveaway)
  - `default_prizes` (Party & Challenges)
  - `truth_or_dare` (Truth or Dare)
  - `yes_or_no` (Yes, No, Maybe)
  - `numbers_1_8` (Numbers 1-8)
  - Custom wheel segments with user-defined labels, weights, and colors.
- **Turn-Based & Permitted Spins**: Supports host-only spins (ideal for giveaways) or turn-based spinning.
- **Live Reactions**: Multiplayer emoji cheers/confetti broadcasts (`game:reaction`).
- **OAuth 2.0 Token Exchange**: Preserved Discord access token exchange (`/api/token`).

---

## 🚀 Running the Server

```bash
cd server
npm install
npm run dev
npm test
```

The server listens on `http://localhost:3001`.

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
- **Payload**:
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
- **Acknowledgement / Callback**:
  ```json
  {
    "success": true,
    "participant": { "id": "123456789", "username": "Gamer123", "isHost": true },
    "state": {}
  }
  ```
- **Real-Time Wheel Sync**:
  If Giveaway mode is active, the joining user's name is automatically added to the wheel and `wheel:segments_updated` is broadcast to all clients in the VC.

---

### 2. `giveaway:set_prize`
Update the prize title for the current giveaway.
- **Payload**:
  ```json
  {
    "channelId": "123456789012345678",
    "prize": "Discord Nitro 1 Month 🎁"
  }
  ```
- **Broadcast Event: `giveaway:prize_updated`**:
  ```json
  { "prize": "Discord Nitro 1 Month 🎁" }
  ```

---

### 3. `giveaway:set_options`
Update giveaway settings such as host exclusion or auto-sync.
- **Payload**:
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
- **Broadcast Event: `giveaway:options_updated`**

---

### 4. `giveaway:sync`
Force a re-synchronization of all active VC members onto the wheel slices.
- **Payload**:
  ```json
  { "channelId": "123456789012345678" }
  ```

---

### 5. `giveaway:reset`
Reset the list of drawn giveaway winners and reload all VC participants back onto the wheel.
- **Payload**:
  ```json
  { "channelId": "123456789012345678" }
  ```
- **Broadcast Event: `giveaway:reset`**

---

### 6. `wheel:spin`
Trigger an authoritative spin to draw a winner.
- **Payload**:
  ```json
  { "channelId": "123456789012345678" }
  ```
- **Broadcast Event: `wheel:spin_started`**:
  Sent immediately to all players in the VC.
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
- **Broadcast Event: `wheel:spin_ended`**:
  Sent automatically once the animation duration finishes on the server.
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
- **Broadcast Event: `giveaway:winner_drawn`**:
  Dedicated celebratory event for client confetti and fanfare.
  ```json
  {
    "round": 1,
    "winner": { "id": "123456", "username": "WinnerName", "avatar": "..." },
    "prize": "Discord Nitro 1 Month 🎁",
    "timestamp": 1700000005200
  }
  ```

---

### 7. `game:reaction`
Send an emoji reaction/cheer during the spin.
- **Payload**:
  ```json
  { "channelId": "123456789012345678", "emoji": "🎉" }
  ```

---

## 🌐 REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/token` | Exchange Discord OAuth authorization code for an `access_token` |
| `GET` | `/api/health` | Server health check and active room count |
| `GET` | `/api/presets` | Available wheel presets |
| `GET` | `/api/room/:channelId` | Full snapshot of room and wheel state |
| `GET` | `/api/room/:channelId/giveaway` | Giveaway state, prize, winners, and VC participants |
| `POST` | `/api/room/:channelId/giveaway/prize` | Set giveaway prize title via REST |
| `POST` | `/api/room/:channelId/giveaway/sync` | Force sync of VC participants to wheel via REST |
| `POST` | `/api/room/:channelId/spin` | REST fallback to trigger a spin |
