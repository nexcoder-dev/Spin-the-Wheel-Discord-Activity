import http from "http";
import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";
import { Server } from "socket.io";
import { setupSocketHandler } from "./game/socketHandler.js";
import { roomManager } from "./game/RoomManager.js";
import { PRESET_WHEELS } from "./game/presets.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  path: "/api/socket.io",
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

setupSocketHandler(io);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    game: "Spin the Wheel Discord Activity SDK",
    uptime: process.uptime(),
    activeRooms: roomManager.rooms.size,
    timestamp: Date.now()
  });
});

app.post("/api/token", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    const clientId = process.env.VITE_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn("VITE_DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is missing in environment variables.");
    }

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId || "",
        client_secret: clientSecret || "",
        grant_type: "authorization_code",
        code
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Discord OAuth Error]", data);
      return res.status(response.status).json(data);
    }

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error("[Token Endpoint Error]", err);
    res.status(500).json({ error: "Internal server error during token exchange", details: err.message });
  }
});

app.get("/api/presets", (req, res) => {
  res.json({
    presets: Object.values(PRESET_WHEELS)
  });
});

app.get("/api/room/:channelId", (req, res) => {
  const { channelId } = req.params;
  const state = roomManager.getSerializedState(channelId);
  res.json(state);
});

app.get("/api/room/:channelId/giveaway", (req, res) => {
  const { channelId } = req.params;
  const state = roomManager.getSerializedState(channelId);
  res.json({
    channelId,
    giveaway: state.giveaway,
    wheelSegments: state.wheelSegments,
    participants: state.participants
  });
});

app.post("/api/room/:channelId/giveaway/prize", (req, res) => {
  const { channelId } = req.params;
  const { prize } = req.body;
  try {
    const room = roomManager.setGiveawayPrize(channelId, prize);
    io.to(channelId).emit("giveaway:prize_updated", { prize: room.giveaway.prize });
    res.json({ success: true, prize: room.giveaway.prize });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/room/:channelId/giveaway/sync", (req, res) => {
  const { channelId } = req.params;
  try {
    const room = roomManager.syncVcParticipantsToWheel(channelId);
    io.to(channelId).emit("wheel:segments_updated", {
      segments: room.wheelSegments,
      activePresetId: room.activePresetId
    });
    res.json({ success: true, segments: room.wheelSegments });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/room/:channelId/spin", (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.body;

  try {
    const spin = roomManager.startSpin(channelId, userId || "system");

    io.to(channelId).emit("wheel:spin_started", {
      spinnerId: spin.spinnerId,
      spinnerName: spin.spinnerName,
      targetAngle: spin.targetAngle,
      durationMs: spin.durationMs,
      winningSegment: spin.winningSegment,
      winningIndex: spin.winningIndex,
      startedAt: spin.startedAt,
      endsAt: spin.endsAt
    });

    setTimeout(() => {
      const result = roomManager.finishSpin(channelId);
      if (result) {
        io.to(channelId).emit("wheel:spin_ended", {
          winningSegment: result.historyItem.winningSegment,
          historyItem: result.historyItem,
          eliminated: result.eliminated,
          eliminatedSegment: result.eliminatedSegment,
          currentSegments: result.currentSegments,
          nextTurnUserId: result.currentTurnUserId,
          state: roomManager.getSerializedState(channelId)
        });
      }
    }, spin.durationMs + 200);

    res.json({ success: true, spin });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

httpServer.listen(port, () => {
  console.log(`[Spin-The-Wheel Server] Listening on http://localhost:${port}`);
  console.log(`[Spin-The-Wheel Server] WebSocket & Socket.IO active`);
});
