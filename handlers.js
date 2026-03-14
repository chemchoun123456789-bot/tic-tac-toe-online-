const User = require("../models/User");
const Room = require("../models/Room");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "xoarena_secret_change_in_prod";

// Matchmaking queue: [{ socketId, userId, username, trophies }]
const queue = [];

// Active games: roomCode -> { board, turn, players }
const activeGames = new Map();

// Win detection
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function checkWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], line: [a,b,c] };
  }
  if (board.every(Boolean)) return { winner: "draw", line: [] };
  return null;
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = function registerSocketHandlers(io) {

  io.use(async (socket, next) => {
    // Optional auth: guest sockets skip token
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        socket.user = user;
      } catch {}
    }
    if (!socket.user) {
      socket.user = { username: socket.handshake.auth?.username || "Guest", isGuest: true, trophies: 0 };
    }
    next();
  });

  io.on("connection", (socket) => {
    const u = socket.user;
    console.log(`🔌 ${u.username} connected [${socket.id}]`);

    // Update online status
    if (!u.isGuest && u._id) {
      User.findByIdAndUpdate(u._id, { isOnline: true, socketId: socket.id }).exec();
    }

    // ── MATCHMAKING ──────────────────────────────────────────
    socket.on("matchmaking:join", () => {
      // Remove any stale entry
      const idx = queue.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) queue.splice(idx, 1);

      if (queue.length > 0) {
        const opponent = queue.shift();
        const code = genCode();
        const game = {
          board: Array(9).fill(""),
          turn: "X",
          players: {
            X: { socketId: socket.id, username: u.username, trophies: u.trophies || 0 },
            O: { socketId: opponent.socketId, username: opponent.username, trophies: opponent.trophies || 0 },
          },
        };
        activeGames.set(code, game);

        socket.join(code);
        io.sockets.sockets.get(opponent.socketId)?.join(code);

        io.to(code).emit("match:start", {
          code,
          players: game.players,
        });
      } else {
        queue.push({ socketId: socket.id, username: u.username, trophies: u.trophies || 0 });
        socket.emit("matchmaking:waiting");
      }
    });

    socket.on("matchmaking:leave", () => {
      const idx = queue.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
    });

    // ── PRIVATE ROOMS ─────────────────────────────────────────
    socket.on("room:create", async () => {
      const code = genCode();
      const game = {
        board: Array(9).fill(""),
        turn: "X",
        players: {
          X: { socketId: socket.id, username: u.username, trophies: u.trophies || 0 },
          O: null,
        },
        waitingForO: true,
      };
      activeGames.set(code, game);
      socket.join(code);
      socket.emit("room:created", { code });
    });

    socket.on("room:join", ({ code }) => {
      const game = activeGames.get(code);
      if (!game) { socket.emit("room:error", { msg: "Room not found" }); return; }
      if (!game.waitingForO) { socket.emit("room:error", { msg: "Room is full" }); return; }

      game.players.O = { socketId: socket.id, username: u.username, trophies: u.trophies || 0 };
      game.waitingForO = false;
      socket.join(code);

      io.to(code).emit("match:start", { code, players: game.players });
    });

    // ── GAMEPLAY ──────────────────────────────────────────────
    socket.on("game:move", ({ code, index }) => {
      const game = activeGames.get(code);
      if (!game) return;

      // Validate turn
      const symbol = game.players.X.socketId === socket.id ? "X" : "O";
      if (symbol !== game.turn) return;
      if (game.board[index]) return;

      game.board[index] = symbol;
      game.turn = symbol === "X" ? "O" : "X";

      io.to(code).emit("game:update", { board: game.board, turn: game.turn });

      const result = checkWinner(game.board);
      if (result) {
        io.to(code).emit("game:over", result);
        handleGameOver(code, result, game);
        activeGames.delete(code);
      }
    });

    // ── CHAT ──────────────────────────────────────────────────
    socket.on("chat:message", ({ code, msg }) => {
      if (u.isGuest) return; // guests can't chat
      if (!msg?.trim()) return;
      io.to(code).emit("chat:message", {
        user:   u.username,
        rank:   u.rank?.title || "Rookie",
        msg:    msg.trim().slice(0, 200),
        time:   new Date().toLocaleTimeString("en", { hour:"2-digit", minute:"2-digit" }),
      });
    });

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`❌ ${u.username} disconnected`);
      // Remove from queue
      const idx = queue.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) queue.splice(idx, 1);
      // Notify opponent in active games
      activeGames.forEach((game, code) => {
        const isX = game.players.X?.socketId === socket.id;
        const isO = game.players.O?.socketId === socket.id;
        if (isX || isO) {
          io.to(code).emit("game:opponent_disconnected");
          activeGames.delete(code);
        }
      });
      if (!u.isGuest && u._id) {
        User.findByIdAndUpdate(u._id, { isOnline: false, socketId: "" }).exec();
      }
    });
  });

  async function handleGameOver(code, result, game) {
    if (result.winner === "draw") {
      await updateStats(game.players.X, game.players.O, "draw");
      await updateStats(game.players.O, game.players.X, "draw");
    } else {
      const winner = result.winner === "X" ? game.players.X : game.players.O;
      const loser  = result.winner === "X" ? game.players.O : game.players.X;
      await updateStats(winner, loser, "win");
      await updateStats(loser, winner, "loss");
    }
  }

  async function updateStats(player, opponent, outcome) {
    // Only update for registered users (not guests)
    try {
      const user = await User.findOne({ username: player.username });
      if (!user) return;
      if (outcome === "win")  { user.wins++;  user.winStreak++; }
      if (outcome === "loss") { user.losses++; user.winStreak = 0; }
      if (outcome === "draw") { user.draws++; }
      user.computeTrophies();
      user.matchHistory.push({
        opponent: opponent.username,
        result:   outcome,
        symbol:   player === "X" ? "X" : "O",
      });
      await user.save();
    } catch (e) {
      console.error("Stats update error:", e.message);
    }
  }
};
