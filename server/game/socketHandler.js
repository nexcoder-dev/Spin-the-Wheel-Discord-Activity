import { roomManager } from "./RoomManager.js";

export function setupSocketHandler(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on("room:join", ({ channelId, channelName, user }, callback) => {
      try {
        if (!channelId) {
          throw new Error("channelId is required to join a room");
        }

        socket.join(channelId);
        socket.channelId = channelId;
        socket.userId = user?.id || socket.id;

        const { room, participant, wheelUpdated } = roomManager.joinRoom(channelId, user, socket.id, channelName);
        const state = roomManager.getSerializedState(channelId);

        if (typeof callback === "function") {
          callback({ success: true, state, participant });
        } else {
          socket.emit("room:state", state);
        }

        socket.to(channelId).emit("room:user_joined", {
          participant,
          participants: state.participants,
          hostUserId: state.hostUserId
        });

        if (wheelUpdated) {
          io.to(channelId).emit("wheel:segments_updated", {
            segments: state.wheelSegments,
            activePresetId: state.activePresetId
          });
        }

        console.log(`[Room] ${participant.username} joined VC channel ${channelId}`);
      } catch (err) {
        console.error(`[Room:Join Error]`, err.message);
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        } else {
          socket.emit("error", { message: err.message });
        }
      }
    });

    socket.on("room:update_channel_name", ({ channelId, channelName }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        if (!targetChannelId || !channelName || typeof channelName !== "string") {
          throw new Error("channelId and channelName are required");
        }
        const updatedName = roomManager.setChannelName(targetChannelId, channelName);
        io.to(targetChannelId).emit("room:channel_name_updated", {
          channelId: targetChannelId,
          channelName: updatedName
        });
        console.log(`[Room] Channel name updated for ${targetChannelId}: #${updatedName}`);
        if (typeof callback === "function") {
          callback({ success: true, channelName: updatedName });
        }
      } catch (err) {
        console.error("[Room:Update Channel Name Error]", err.message);
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on("wheel:spin", ({ channelId }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        if (!targetChannelId) {
          throw new Error("channelId is required to spin");
        }

        const spin = roomManager.startSpin(targetChannelId, socket.userId);

        if (typeof callback === "function") {
          callback({ success: true, spin });
        }

        io.to(targetChannelId).emit("wheel:spin_started", {
          spinnerId: spin.spinnerId,
          spinnerName: spin.spinnerName,
          targetAngle: spin.targetAngle,
          durationMs: spin.durationMs,
          winningSegment: spin.winningSegment,
          winningIndex: spin.winningIndex,
          startedAt: spin.startedAt,
          endsAt: spin.endsAt
        });

        console.log(`[Wheel] Spin started in ${targetChannelId} by ${spin.spinnerName}. Target: ${spin.winningSegment.label}`);

        setTimeout(() => {
          try {
            const result = roomManager.finishSpin(targetChannelId);
            if (result) {
              const serializedState = roomManager.getSerializedState(targetChannelId);

              io.to(targetChannelId).emit("wheel:spin_ended", {
                winningSegment: result.historyItem.winningSegment,
                historyItem: result.historyItem,
                giveawayWinner: result.giveawayWinner,
                giveawayWinners: result.giveawayWinners,
                eliminated: result.eliminated,
                eliminatedSegment: result.eliminatedSegment,
                currentSegments: result.currentSegments,
                nextTurnUserId: result.currentTurnUserId,
                state: serializedState
              });

              if (result.giveawayWinner) {
                io.to(targetChannelId).emit("giveaway:winner_drawn", {
                  round: result.giveawayWinner.round,
                  winner: result.giveawayWinner.winner,
                  prize: result.giveawayWinner.prize,
                  timestamp: result.giveawayWinner.timestamp
                });
                console.log(`[Giveaway] Winner drawn in ${targetChannelId}: ${result.giveawayWinner.winner.username} for "${result.giveawayWinner.prize}"`);
              }

              console.log(`[Wheel] Spin completed in ${targetChannelId}`);
            }
          } catch (finishErr) {
            console.error(`[Wheel Finish Error]`, finishErr);
          }
        }, spin.durationMs + 200);

      } catch (err) {
        console.warn(`[Wheel Spin Error]`, err.message);
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        } else {
          socket.emit("wheel:error", { message: err.message });
        }
      }
    });

    socket.on("giveaway:sync", ({ channelId }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        const room = roomManager.syncVcParticipantsToWheel(targetChannelId);

        const payload = {
          segments: room.wheelSegments,
          activePresetId: room.activePresetId
        };

        io.to(targetChannelId).emit("wheel:segments_updated", payload);

        if (typeof callback === "function") {
          callback({ success: true, ...payload });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on("giveaway:set_prize", ({ channelId, prize }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        const room = roomManager.setGiveawayPrize(targetChannelId, prize);

        io.to(targetChannelId).emit("giveaway:prize_updated", {
          prize: room.giveaway.prize
        });

        if (typeof callback === "function") {
          callback({ success: true, prize: room.giveaway.prize });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on("giveaway:set_options", ({ channelId, options }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        const room = roomManager.setGiveawayOptions(targetChannelId, options);

        io.to(targetChannelId).emit("giveaway:options_updated", {
          giveaway: room.giveaway,
          segments: room.wheelSegments
        });

        if (typeof callback === "function") {
          callback({ success: true, giveaway: room.giveaway });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on("giveaway:reset", ({ channelId }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        const room = roomManager.resetGiveaway(targetChannelId);

        io.to(targetChannelId).emit("giveaway:reset", {
          winners: room.giveaway.winners,
          segments: room.wheelSegments
        });

        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on("wheel:update_segments", ({ channelId, segments }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        const room = roomManager.setSegments(targetChannelId, segments, "custom");

        const payload = {
          segments: room.wheelSegments,
          activePresetId: room.activePresetId
        };

        io.to(targetChannelId).emit("wheel:segments_updated", payload);

        if (typeof callback === "function") {
          callback({ success: true, ...payload });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        } else {
          socket.emit("wheel:error", { message: err.message });
        }
      }
    });

    socket.on("wheel:load_preset", ({ channelId, presetId }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        const room = roomManager.loadPreset(targetChannelId, presetId);

        const payload = {
          segments: room.wheelSegments,
          activePresetId: room.activePresetId
        };

        io.to(targetChannelId).emit("wheel:segments_updated", payload);

        if (typeof callback === "function") {
          callback({ success: true, ...payload });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        } else {
          socket.emit("wheel:error", { message: err.message });
        }
      }
    });

    socket.on("wheel:update_settings", ({ channelId, settings }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        const room = roomManager.updateSettings(targetChannelId, settings);

        io.to(targetChannelId).emit("wheel:settings_updated", {
          settings: room.settings,
          currentTurnUserId: room.currentTurnUserId
        });

        if (typeof callback === "function") {
          callback({ success: true, settings: room.settings });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on("wheel:reset", ({ channelId }, callback) => {
      try {
        const targetChannelId = channelId || socket.channelId;
        const room = roomManager.resetWheel(targetChannelId);

        io.to(targetChannelId).emit("wheel:reset", {
          segments: room.wheelSegments,
          wheelCumulativeAngle: room.wheelCumulativeAngle
        });

        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on("game:reaction", ({ channelId, emoji }) => {
      const targetChannelId = channelId || socket.channelId;
      if (!targetChannelId || !emoji) return;

      const room = roomManager.getRoom(targetChannelId);
      const participant = room?.participants.get(socket.userId);

      io.to(targetChannelId).emit("game:reaction", {
        userId: socket.userId,
        username: participant?.username || "Player",
        emoji: String(emoji).slice(0, 10),
        timestamp: Date.now()
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      const departures = roomManager.leaveAllBySocketId(socket.id);

      for (const departure of departures) {
        const state = roomManager.getSerializedState(departure.channelId);

        io.to(departure.channelId).emit("room:user_left", {
          userId: departure.participant.id,
          username: departure.participant.username,
          newHostId: departure.newHostId,
          participants: state.participants
        });

        if (departure.wheelUpdated) {
          io.to(departure.channelId).emit("wheel:segments_updated", {
            segments: state.wheelSegments,
            activePresetId: state.activePresetId
          });
        }
      }
    });
  });
}

