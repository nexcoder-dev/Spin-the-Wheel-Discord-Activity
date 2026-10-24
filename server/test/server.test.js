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
