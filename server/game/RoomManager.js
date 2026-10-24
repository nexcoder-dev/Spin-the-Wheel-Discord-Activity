import { PRESET_WHEELS, DEFAULT_PALETTE } from "./presets.js";
import { WheelEngine } from "./WheelEngine.js";

export class RoomManager {
  constructor() {
    this.rooms = new Map();

    const timer = setInterval(() => this.cleanupStaleRooms(), 60 * 60 * 1000);
    if (timer.unref) {
      timer.unref();
    }
  }

  getOrCreateRoom(channelId) {
    if (!channelId) {
      throw new Error("channelId is required to access or create a room");
    }

    if (!this.rooms.has(channelId)) {
      const defaultPreset = PRESET_WHEELS.default_prizes;
      this.rooms.set(channelId, {
        channelId,
        participants: new Map(),
        hostUserId: null,
        wheelSegments: JSON.parse(JSON.stringify(defaultPreset.segments)),
        initialSegments: JSON.parse(JSON.stringify(defaultPreset.segments)),
        activePresetId: defaultPreset.id,
        wheelCumulativeAngle: 0,
        isSpinning: false,
        activeSpin: null,
        spinHistory: [],
        giveaway: {
          active: true,
          prize: "Giveaway Prize 🎁",
          excludeHost: false,
          autoSyncVcParticipants: true,
          winners: []
        },
        settings: {
          eliminationMode: true,
          allowAnyoneToSpin: false,
          turnBased: false,
          spinCooldownMs: 1500
        },
        currentTurnUserId: null,
        createdAt: Date.now(),
        lastActivityAt: Date.now()
      });
    }

    const room = this.rooms.get(channelId);
    room.lastActivityAt = Date.now();
    return room;
  }

  getRoom(channelId) {
    return this.rooms.get(channelId) || null;
  }

  syncVcParticipantsToWheel(channelId, options = {}) {
    const room = this.getOrCreateRoom(channelId);
    let players = Array.from(room.participants.values());

    if (room.giveaway.excludeHost && room.hostUserId) {
      players = players.filter((p) => p.id !== room.hostUserId);
    }

    if (room.settings.eliminationMode && room.giveaway.winners.length > 0) {
      const previousWinnerIds = new Set(room.giveaway.winners.map((w) => w.winner.id));
      const remainingPlayers = players.filter((p) => !previousWinnerIds.has(p.id));
      if (remainingPlayers.length > 0) {
        players = remainingPlayers;
      }
    }

    let segments = [];

    if (players.length === 0) {
      segments = [
        { id: "ph-1", label: "Waiting for VC members... 🎙️", color: "#64748B", weight: 1, isPlaceholder: true },
        { id: "ph-2", label: "Invite friends to Voice Channel! 🚀", color: "#475569", weight: 1, isPlaceholder: true }
      ];
    } else if (players.length === 1) {
      const p = players[0];
      segments = [
        {
          id: `player-${p.id}`,
          userId: p.id,
          label: p.username,
          avatar: p.avatar,
          color: DEFAULT_PALETTE[0],
          weight: 1
        },
        {
          id: "ph-wait",
          label: "Waiting for more VC members... 🎙️",
          color: "#64748B",
          weight: 1,
          isPlaceholder: true
        }
      ];
    } else {
      segments = players.map((p, index) => ({
        id: `player-${p.id}`,
        userId: p.id,
        label: p.username,
        avatar: p.avatar,
        color: DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
        weight: 1
      }));
    }

    room.wheelSegments = segments;
    room.activePresetId = "giveaway";
    return room;
  }

  populatePlayersWheel(channelId) {
    return this.syncVcParticipantsToWheel(channelId);
  }

  setGiveawayPrize(channelId, prize) {
    const room = this.getOrCreateRoom(channelId);
    room.giveaway.prize = String(prize || "Giveaway Prize 🎁").trim().slice(0, 100);
    return room;
  }

  setGiveawayOptions(channelId, options = {}) {
    const room = this.getOrCreateRoom(channelId);
    if (typeof options.prize === "string") {
      room.giveaway.prize = options.prize.trim().slice(0, 100);
    }
    if (typeof options.excludeHost === "boolean") {
      room.giveaway.excludeHost = options.excludeHost;
    }
    if (typeof options.autoSyncVcParticipants === "boolean") {
      room.giveaway.autoSyncVcParticipants = options.autoSyncVcParticipants;
    }
    if (typeof options.active === "boolean") {
      room.giveaway.active = options.active;
    }

    if (room.giveaway.autoSyncVcParticipants) {
      this.syncVcParticipantsToWheel(channelId);
    }

    return room;
  }

  resetGiveaway(channelId) {
    const room = this.getOrCreateRoom(channelId);
    room.giveaway.winners = [];
    if (room.giveaway.autoSyncVcParticipants) {
      this.syncVcParticipantsToWheel(channelId);
    }
    return room;
  }

  joinRoom(channelId, user, socketId) {
    const room = this.getOrCreateRoom(channelId);
    const userId = user?.id || socketId;
    const isNew = !room.participants.has(userId);

    if (!room.hostUserId || !room.participants.has(room.hostUserId)) {
      room.hostUserId = userId;
    }

    const participant = {
      id: userId,
      username: user?.username || user?.global_name || `Player_${socketId.slice(0, 4)}`,
      avatar: user?.avatar || null,
      discriminator: user?.discriminator || "0",
      socketId,
      joinedAt: room.participants.get(userId)?.joinedAt || Date.now(),
      isHost: room.hostUserId === userId
    };

    room.participants.set(userId, participant);

    if (room.settings.turnBased && !room.currentTurnUserId) {
      room.currentTurnUserId = userId;
    }

    let wheelUpdated = false;
    if (room.giveaway.autoSyncVcParticipants) {
      this.syncVcParticipantsToWheel(channelId);
      wheelUpdated = true;
    }

    return { room, participant, isNew, wheelUpdated };
  }

  leaveAllBySocketId(socketId) {
    const affectedRooms = [];

    for (const [channelId, room] of this.rooms.entries()) {
      for (const [userId, participant] of room.participants.entries()) {
        if (participant.socketId === socketId) {
          room.participants.delete(userId);

          let newHostId = room.hostUserId;
          if (room.hostUserId === userId) {
            const nextParticipant = room.participants.values().next().value;
            newHostId = nextParticipant ? nextParticipant.id : null;
            room.hostUserId = newHostId;
            if (nextParticipant) {
              nextParticipant.isHost = true;
            }
          }

          if (room.currentTurnUserId === userId) {
            this.advanceTurn(room);
          }

          let wheelUpdated = false;
          if (room.giveaway.autoSyncVcParticipants) {
            this.syncVcParticipantsToWheel(channelId);
            wheelUpdated = true;
          }

          affectedRooms.push({
            channelId,
            participant,
            newHostId,
            isEmpty: room.participants.size === 0,
            wheelUpdated
          });
          break;
        }
      }
    }

    return affectedRooms;
  }

  advanceTurn(room) {
    const participantIds = Array.from(room.participants.keys());
    if (participantIds.length === 0) {
      room.currentTurnUserId = null;
      return;
    }

    const currentIndex = participantIds.indexOf(room.currentTurnUserId);
    if (currentIndex === -1 || currentIndex >= participantIds.length - 1) {
      room.currentTurnUserId = participantIds[0];
    } else {
      room.currentTurnUserId = participantIds[currentIndex + 1];
    }
  }

  setSegments(channelId, segments, presetId = "custom") {
    const room = this.getOrCreateRoom(channelId);
    if (!Array.isArray(segments) || segments.length < 2) {
      throw new Error("A wheel must have at least 2 segments.");
    }

    const sanitizedSegments = segments.map((seg, i) => ({
      id: seg.id || `seg-${Date.now()}-${i}`,
      userId: seg.userId || null,
      avatar: seg.avatar || null,
      label: String(seg.label || `Option ${i + 1}`).trim().slice(0, 50),
      color: seg.color || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
      weight: Math.max(1, Math.min(10, Number(seg.weight) || 1))
    }));

    room.wheelSegments = sanitizedSegments;
    room.initialSegments = JSON.parse(JSON.stringify(sanitizedSegments));
    room.activePresetId = presetId;
    return room;
  }

  loadPreset(channelId, presetId) {
    const room = this.getOrCreateRoom(channelId);
    if (presetId === "giveaway" || presetId === "players") {
      return this.syncVcParticipantsToWheel(channelId);
    }

    const preset = PRESET_WHEELS[presetId];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetId}`);
    }

    return this.setSegments(channelId, preset.segments, preset.id);
  }

  updateSettings(channelId, newSettings = {}) {
    const room = this.getOrCreateRoom(channelId);
    if (typeof newSettings.eliminationMode === "boolean") {
      room.settings.eliminationMode = newSettings.eliminationMode;
    }
    if (typeof newSettings.allowAnyoneToSpin === "boolean") {
      room.settings.allowAnyoneToSpin = newSettings.allowAnyoneToSpin;
    }
    if (typeof newSettings.turnBased === "boolean") {
      room.settings.turnBased = newSettings.turnBased;
      if (room.settings.turnBased && !room.currentTurnUserId) {
        this.advanceTurn(room);
      }
    }
    if (typeof newSettings.spinCooldownMs === "number") {
      room.settings.spinCooldownMs = Math.max(500, Math.min(10000, newSettings.spinCooldownMs));
    }
    return room;
  }

  startSpin(channelId, userId) {
    const room = this.getOrCreateRoom(channelId);

    if (room.isSpinning) {
      throw new Error("Wheel is currently spinning.");
    }

    if (room.wheelSegments.length < 2) {
      throw new Error("Need at least 2 segments to spin the wheel.");
    }

    const participant = room.participants.get(userId);
    if (!room.settings.allowAnyoneToSpin && room.hostUserId && room.hostUserId !== userId) {
      throw new Error("Only the host is allowed to spin the wheel for this giveaway.");
    }

    if (room.settings.turnBased && room.currentTurnUserId && room.currentTurnUserId !== userId) {
      throw new Error("It is not your turn to spin.");
    }

    const spin = WheelEngine.generateSpin(room.wheelSegments, room.wheelCumulativeAngle);

    room.isSpinning = true;
    room.wheelCumulativeAngle = spin.targetAngle;
    room.activeSpin = {
      ...spin,
      spinnerId: userId,
      spinnerName: participant?.username || "Host",
      startedAt: Date.now(),
      endsAt: Date.now() + spin.durationMs
    };

    return room.activeSpin;
  }

  finishSpin(channelId) {
    const room = this.getOrCreateRoom(channelId);
    if (!room.isSpinning || !room.activeSpin) {
      return null;
    }

    const activeSpin = room.activeSpin;
    const winningSegment = activeSpin.winningSegment;

    const historyItem = {
      id: `spin-${Date.now()}`,
      spinnerId: activeSpin.spinnerId,
      spinnerName: activeSpin.spinnerName,
      winningSegment,
      timestamp: Date.now()
    };
    room.spinHistory.unshift(historyItem);
    if (room.spinHistory.length > 50) {
      room.spinHistory.pop();
    }

    let giveawayWinner = null;
    if (winningSegment.userId) {
      const winnerParticipant = room.participants.get(winningSegment.userId) || {
        id: winningSegment.userId,
        username: winningSegment.label,
        avatar: winningSegment.avatar || null
      };

      giveawayWinner = {
        round: room.giveaway.winners.length + 1,
        winner: winnerParticipant,
        prize: room.giveaway.prize,
        timestamp: Date.now()
      };
      room.giveaway.winners.unshift(giveawayWinner);
    }

    let eliminated = false;
    if (room.settings.eliminationMode && room.wheelSegments.length > 2 && !winningSegment.isPlaceholder) {
      room.wheelSegments = room.wheelSegments.filter((s) => s.id !== winningSegment.id);
      eliminated = true;
    }

    if (room.settings.turnBased) {
      this.advanceTurn(room);
    }

    room.isSpinning = false;
    room.activeSpin = null;

    return {
      historyItem,
      giveawayWinner,
      eliminated,
      eliminatedSegment: eliminated ? winningSegment : null,
      currentSegments: room.wheelSegments,
      currentTurnUserId: room.currentTurnUserId,
      giveawayWinners: room.giveaway.winners
    };
  }

  resetWheel(channelId) {
    const room = this.getOrCreateRoom(channelId);
    if (room.isSpinning) {
      throw new Error("Cannot reset wheel while spinning.");
    }

    if (room.giveaway.autoSyncVcParticipants) {
      this.syncVcParticipantsToWheel(channelId);
    } else {
      room.wheelSegments = JSON.parse(JSON.stringify(room.initialSegments));
    }
    room.wheelCumulativeAngle = 0;
    return room;
  }

  getSerializedState(channelId) {
    const room = this.getOrCreateRoom(channelId);
    return {
      channelId: room.channelId,
      participants: Array.from(room.participants.values()),
      hostUserId: room.hostUserId,
      wheelSegments: room.wheelSegments,
      activePresetId: room.activePresetId,
      wheelCumulativeAngle: room.wheelCumulativeAngle,
      isSpinning: room.isSpinning,
      activeSpin: room.activeSpin,
      spinHistory: room.spinHistory,
      giveaway: room.giveaway,
      settings: room.settings,
      currentTurnUserId: room.currentTurnUserId
    };
  }

  cleanupStaleRooms() {
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    for (const [id, room] of this.rooms.entries()) {
      if (room.participants.size === 0 && room.lastActivityAt < cutoff) {
        this.rooms.delete(id);
      }
    }
  }
}

export const roomManager = new RoomManager();
