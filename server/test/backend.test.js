import test from "node:test";
import assert from "node:assert/strict";
import { WheelEngine } from "../game/WheelEngine.js";
import { RoomManager } from "../game/RoomManager.js";
import { PRESET_WHEELS } from "../game/presets.js";

test("WheelEngine.selectWinner selects a segment correctly", () => {
  const segments = [
    { id: "1", label: "A", weight: 1 },
    { id: "2", label: "B", weight: 3 }
  ];

  const result = WheelEngine.selectWinner(segments);
  assert.ok(result.segment);
  assert.ok(["1", "2"].includes(result.segment.id));
  assert.ok([0, 1].includes(result.index));
});

test("WheelEngine.generateSpin produces authoritative spin data", () => {
  const segments = PRESET_WHEELS.default_prizes.segments;
  const spin = WheelEngine.generateSpin(segments, 0);

  assert.ok(spin.winningSegment);
  assert.ok(typeof spin.targetAngle === "number");
  assert.ok(spin.targetAngle > 360 * 4, "Should complete at least 4-5 full rotations");
  assert.ok(spin.durationMs >= 4000);
  assert.equal(spin.sliceAngle, 360 / segments.length);
});

test("RoomManager manages participants, host assignment, and turn rotation", () => {
  const manager = new RoomManager();
  const channelId = "test-voice-channel-123";

  const p1 = { id: "user_1", username: "Alice" };
  const join1 = manager.joinRoom(channelId, p1, "socket_1");
  assert.equal(join1.participant.isHost, true);
  assert.equal(join1.room.hostUserId, "user_1");

  const p2 = { id: "user_2", username: "Bob" };
  const join2 = manager.joinRoom(channelId, p2, "socket_2");
  assert.equal(join2.participant.isHost, false);

  manager.updateSettings(channelId, { turnBased: true });
  assert.equal(manager.getRoom(channelId).currentTurnUserId, "user_1");

  const spin = manager.startSpin(channelId, "user_1");
  assert.ok(spin.winningSegment);
  assert.equal(manager.getRoom(channelId).isSpinning, true);

  const finish = manager.finishSpin(channelId);
  assert.ok(finish.historyItem);
  assert.equal(manager.getRoom(channelId).isSpinning, false);
  assert.equal(finish.currentTurnUserId, "user_2", "Turn should advance to Bob");

  const departures = manager.leaveAllBySocketId("socket_2");
  assert.equal(departures.length, 1);
  assert.equal(manager.getRoom(channelId).participants.size, 1);
});

test("RoomManager handles Elimination Mode with 3+ participants", () => {
  const manager = new RoomManager();
  const channelId = "elimination-room";

  manager.joinRoom(channelId, { id: "user_1", username: "Alice" }, "socket_1");
  manager.joinRoom(channelId, { id: "user_2", username: "Bob" }, "socket_2");
  manager.joinRoom(channelId, { id: "user_3", username: "Charlie" }, "socket_3");
  manager.updateSettings(channelId, { eliminationMode: true });

  const initialCount = manager.getRoom(channelId).wheelSegments.length;
  assert.equal(initialCount, 3);

  manager.startSpin(channelId, "user_1");
  const finish = manager.finishSpin(channelId);

  assert.equal(finish.eliminated, true);
  assert.equal(manager.getRoom(channelId).wheelSegments.length, 2);
});

test("RoomManager automatically syncs Voice Channel participants for Giveaways", () => {
  const manager = new RoomManager();
  const channelId = "giveaway-vc-channel";

  manager.setGiveawayPrize(channelId, "Discord Nitro 1 Month");

  manager.joinRoom(channelId, { id: "u1", username: "GamerOne" }, "sock_1");
  let room = manager.getRoom(channelId);
  assert.equal(room.wheelSegments[0].label, "GamerOne");

  manager.joinRoom(channelId, { id: "u2", username: "GamerTwo" }, "sock_2");
  room = manager.getRoom(channelId);
  assert.equal(room.wheelSegments.length, 2);
  assert.equal(room.wheelSegments[0].label, "GamerOne");
  assert.equal(room.wheelSegments[1].label, "GamerTwo");

  manager.startSpin(channelId, "u1");
  const finish = manager.finishSpin(channelId);

  assert.ok(finish.giveawayWinner);
  assert.ok(["GamerOne", "GamerTwo"].includes(finish.giveawayWinner.winner.username));
  assert.equal(finish.giveawayWinner.prize, "Discord Nitro 1 Month");
  assert.equal(room.giveaway.winners.length, 1);
});

test("RoomManager updates participant nickname in room and wheel segments", () => {
  const manager = new RoomManager();
  const channelId = "nick-change-test";

  manager.joinRoom(channelId, { id: "u1", username: "OriginalName" }, "sock_1");
  manager.joinRoom(channelId, { id: "u2", username: "PlayerTwo" }, "sock_2");

  let room = manager.getRoom(channelId);
  assert.equal(room.wheelSegments[0].label, "OriginalName");

  const updateResult = manager.updateParticipantNickname(channelId, "u1", "CustomNick");
  assert.ok(updateResult);
  assert.equal(updateResult.participant.username, "CustomNick");
  assert.equal(updateResult.participant.nickname, "CustomNick");

  // Wheel slice for user u1 should now reflect the new nickname
  const u1Slice = room.wheelSegments.find((s) => s.userId === "u1");
  assert.ok(u1Slice);
  assert.equal(u1Slice.label, "@CustomNick");
});

