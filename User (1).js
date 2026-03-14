const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const matchSchema = new mongoose.Schema({
  opponent:   { type: String },
  opponentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  result:     { type: String, enum: ["win","loss","draw"] },
  symbol:     { type: String, enum: ["X","O"] },
  playedAt:   { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true, minlength: 6 },
  avatar:      { type: String, default: "" },
  wins:        { type: Number, default: 0 },
  losses:      { type: Number, default: 0 },
  draws:       { type: Number, default: 0 },
  trophies:    { type: Number, default: 0 },
  winStreak:   { type: Number, default: 0 },
  matchHistory:{ type: [matchSchema], default: [] },
  isOnline:    { type: Boolean, default: false },
  socketId:    { type: String, default: "" },
}, { timestamps: true });

// Auto-compute trophies
userSchema.methods.computeTrophies = function () {
  this.trophies = Math.floor(this.wins / 3);
};

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Get rank
userSchema.virtual("rank").get(function () {
  const t = this.trophies;
  if (t >= 12) return { title: "Monarch",    icon: "👑", badge: "👑", color: "#f59e0b" };
  if (t >= 6)  return { title: "Master",     icon: "💎", badge: "💜", color: "#8b5cf6" };
  if (t >= 3)  return { title: "Strategist", icon: "🧠", badge: "🔵", color: "#3b82f6" };
  return              { title: "Rookie",     icon: "⚔️", badge: null,  color: "#94a3b8" };
});

userSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("User", userSchema);
