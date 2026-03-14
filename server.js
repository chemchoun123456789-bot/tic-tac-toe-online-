const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const roomRoutes = require("./routes/rooms");
const leaderboardRoutes = require("./routes/leaderboard");
const registerSocketHandlers = require("./socket/handlers");

const app = express();
const server = http.createServer(app);

// ── Socket.io ──
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", methods: ["GET","POST"] }
});

// ── Middleware ──
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// ── Routes ──
app.use("/api/auth",        authRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/rooms",       roomRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// ── Socket handlers ──
registerSocketHandlers(io);

// ── DB + Start ──
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/xoarena")
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => { console.error("❌ MongoDB error:", err); process.exit(1); });
