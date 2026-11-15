import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ ok: true, name: "Mission Control server" }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const rooms = new Map();

function publicRoom(room) {
  return { code: room.code, players: [...room.players.values()], config: room.config, report: room.report };
}
function broadcastRoom(code) {
  const room = rooms.get(code);
  if (room) io.to(code).emit("room:update", publicRoom(room));
}

io.on("connection", socket => {
  socket.on("room:join", ({ code, name, role }) => {
    const roomCode = String(code || "").trim().toUpperCase().slice(0, 8);
    if (!roomCode) return socket.emit("room:error", "Enter a room code.");
    let room = rooms.get(roomCode);
    if (!room) {
      room = { code: roomCode, players: new Map(), config: null, report: null };
      rooms.set(roomCode, room);
    }
    if (room.players.size >= 4 && !room.players.has(socket.id)) {
      return socket.emit("room:error", "This mission room already has four participants.");
    }
    socket.join(roomCode);
    room.players.set(socket.id, {
      id: socket.id,
      name: String(name || "Mission Engineer").slice(0, 24),
      role: String(role || "Mission Planner"),
      connectedAt: Date.now()
    });
    socket.data.roomCode = roomCode;
    socket.emit("room:joined", { code: roomCode, selfId: socket.id });
    broadcastRoom(roomCode);
  });

  socket.on("mission:update", config => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    room.config = config;
    room.report = null;
    broadcastRoom(code);
  });

  socket.on("mission:report", report => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    room.report = report;
    broadcastRoom(code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    room.players.delete(socket.id);
    if (room.players.size === 0) rooms.delete(code);
    else broadcastRoom(code);
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, "0.0.0.0", () => console.log(`Mission Control server listening on ${PORT}`));
