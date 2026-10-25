import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
import { setupSocketHandler } from "../game/socketHandler.js";
import { PRESET_WHEELS } from "../game/presets.js";

test("Socket.IO client can connect, join room, and receive room:state", async () => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  setupSocketHandler(io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const clientSocket = Client(`http://localhost:${port}`);

  await new Promise((resolve, reject) => {
    clientSocket.on("connect", () => {
      clientSocket.emit(
        "room:join",
        {
          channelId: "voice-integration-test",
          user: { id: "u123", username: "Tester" }
        },
        (response) => {
          try {
            assert.equal(response.success, true);
            assert.equal(response.state.channelId, "voice-integration-test");
            assert.equal(response.state.participants.length, 1);
            assert.equal(response.state.participants[0].id, "u123");
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      );
    });
    clientSocket.on("connect_error", reject);
  });

  await new Promise((resolve, reject) => {
    clientSocket.emit("wheel:spin", { channelId: "voice-integration-test" }, (spinRes) => {
      try {
        assert.equal(spinRes.success, true);
        assert.ok(spinRes.spin.winningSegment);
        assert.ok(spinRes.spin.targetAngle > 0);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });

  clientSocket.disconnect();
  io.close();
  server.close();
});

test("Multi-client real-time synchronization: joins, spins, reactions, presets, and settings", async () => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  setupSocketHandler(io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const client1 = Client(`http://localhost:${port}`);
  const client2 = Client(`http://localhost:${port}`);

  await Promise.all([
    new Promise((resolve) => {
      if (client1.connected) resolve();
      else client1.once("connect", resolve);
    }),
    new Promise((resolve) => {
      if (client2.connected) resolve();
      else client2.once("connect", resolve);
    })
  ]);

  const channelId = "multiplayer-sync-room";

  await new Promise((resolve, reject) => {
    client1.emit("room:join", { channelId, user: { id: "host-1", username: "AliceHost" } }, (res) => {
      try {
        assert.equal(res.success, true);
        assert.equal(res.state.hostUserId, "host-1");
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

  await Promise.all([
    new Promise((resolve) => {
      client1.once("room:user_joined", ({ participant, participants }) => {
        assert.equal(participant.id, "guest-2");
        assert.equal(participants.length, 2);
        resolve();
      });
    }),
    new Promise((resolve, reject) => {
      client2.emit("room:join", { channelId, user: { id: "guest-2", username: "BobGuest" } }, (res) => {
        try {
          assert.equal(res.success, true);
          assert.equal(res.state.participants.length, 2);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    })
  ]);

  let spin1Data, spin2Data;
  await Promise.all([
    new Promise((resolve) => {
      client1.once("wheel:spin_started", (data) => {
        spin1Data = data;
        resolve();
      });
    }),
    new Promise((resolve) => {
      client2.once("wheel:spin_started", (data) => {
        spin2Data = data;
        resolve();
      });
    }),
    new Promise((resolve, reject) => {
      client1.emit("wheel:spin", { channelId }, (res) => {
        if (!res.success) reject(new Error(res.error));
        else resolve();
      });
    })
  ]);

  assert.ok(spin1Data && spin2Data);
  assert.equal(spin1Data.targetAngle, spin2Data.targetAngle);
  assert.equal(spin1Data.durationMs, spin2Data.durationMs);
  assert.equal(spin1Data.winningIndex, spin2Data.winningIndex);
  assert.equal(spin1Data.winningSegment.id, spin2Data.winningSegment.id);

  await Promise.all([
    new Promise((resolve) => {
      client1.once("game:reaction", (data) => {
        assert.equal(data.emoji, "🔥");
        assert.equal(data.userId, "guest-2");
        resolve();
      });
    }),
    new Promise((resolve) => {
      client2.emit("game:reaction", { channelId, emoji: "🔥" });
      resolve();
    })
  ]);

  await Promise.all([
    new Promise((resolve) => {
      client1.once("wheel:segments_updated", ({ segments, activePresetId }) => {
        assert.equal(activePresetId, "items");
        assert.equal(segments.length, 8);
        resolve();
      });
    }),
    new Promise((resolve) => {
      client2.once("wheel:segments_updated", ({ segments, activePresetId }) => {
        assert.equal(activePresetId, "items");
        assert.equal(segments.length, 8);
        resolve();
      });
    }),
    new Promise((resolve, reject) => {
      client1.emit("wheel:load_preset", { channelId, presetId: "items" }, (res) => {
        if (!res.success) reject(new Error(res.error));
        else resolve();
      });
    })
  ]);

  await Promise.all([
    new Promise((resolve) => {
      client2.once("wheel:settings_updated", ({ settings }) => {
        assert.equal(settings.eliminationMode, false);
        assert.equal(settings.spinCooldownMs, 3000);
        resolve();
      });
    }),
    new Promise((resolve, reject) => {
      client1.emit(
        "wheel:update_settings",
        { channelId, settings: { eliminationMode: false, spinCooldownMs: 3000 } },
        (res) => {
          if (!res.success) reject(new Error(res.error));
          else resolve();
        }
      );
    })
  ]);

  await Promise.all([
    new Promise((resolve) => {
      client2.once("giveaway:prize_updated", ({ prize }) => {
        assert.equal(prize, "Tesla Model S");
        resolve();
      });
    }),
    new Promise((resolve, reject) => {
      client1.emit("giveaway:set_prize", { channelId, prize: "Tesla Model S" }, (res) => {
        if (!res.success) reject(new Error(res.error));
        else resolve();
      });
    })
  ]);

  await Promise.all([
    new Promise((resolve) => {
      client2.once("room:channel_name_updated", ({ channelName }) => {
        assert.equal(channelName, "Gaming Lounge");
        resolve();
      });
    }),
    new Promise((resolve, reject) => {
      client1.emit("room:update_channel_name", { channelId, channelName: "Gaming Lounge" }, (res) => {
        if (!res.success) reject(new Error(res.error));
        else {
          assert.equal(res.channelName, "Gaming Lounge");
          resolve();
        }
      });
    })
  ]);

  client1.disconnect();
  client2.disconnect();
  io.close();
  server.close();
});

