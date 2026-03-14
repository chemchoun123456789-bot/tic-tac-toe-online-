# XO ARENA — Full-Stack Multiplayer Platform

A professional esports-style Tic-Tac-Toe platform with real-time multiplayer, rankings, trophies, private rooms, and chat.

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS + Framer Motion
- **Backend**: Node.js + Express.js
- **Realtime**: Socket.io
- **Database**: MongoDB
- **Auth**: JWT + Email login

---

## Project Structure

```
xo-arena/
├── backend/
│   ├── server.js              # Express + Socket.io entry point
│   ├── models/
│   │   ├── User.js            # User schema (stats, rank, history)
│   │   └── Room.js            # Private room schema
│   ├── routes/
│   │   ├── auth.js            # Register / Login / Me
│   │   ├── users.js           # Profile endpoints
│   │   ├── rooms.js           # Room status check
│   │   └── leaderboard.js     # Top 50 players
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   ├── socket/
│   │   └── handlers.js        # All Socket.io game logic
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Global auth state
│   │   ├── hooks/
│   │   │   └── useSocket.js     # Socket.io hook
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Auth.jsx
│   │   │   ├── Menu.jsx
│   │   │   ├── Game.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── Leaderboard.jsx
│   │   ├── components/
│   │   │   ├── Board.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── Confetti.jsx
│   │   │   └── RankBadge.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

**backend/.env**
```
MONGO_URI=mongodb://localhost:27017/xoarena
JWT_SECRET=your_super_secret_key_here
PORT=4000
CLIENT_URL=http://localhost:5173
```

**frontend/.env**
```
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173**

---

## Rank System

| Trophies | Title      | Badge |
|----------|------------|-------|
| 0–2      | Rookie     | ⚔️   |
| 3–5      | Strategist | 🧠   |
| 6–11     | Master     | 💎   |
| 12+      | Monarch    | 👑   |

**Trophy formula**: 1 Trophy per 3 wins

---

## Socket.io Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `matchmaking:join` | client→server | — |
| `matchmaking:waiting` | server→client | — |
| `match:start` | server→client | `{ code, players }` |
| `game:move` | client→server | `{ code, index }` |
| `game:update` | server→client | `{ board, turn }` |
| `game:over` | server→client | `{ winner, line }` |
| `room:create` | client→server | — |
| `room:created` | server→client | `{ code }` |
| `room:join` | client→server | `{ code }` |
| `chat:message` | bidirectional | `{ code, msg }` |

---

## Deployment

### Backend (Railway / Render)
1. Set env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`
2. Build command: `npm install`
3. Start command: `node server.js`

### Frontend (Vercel / Netlify)
1. Set env vars: `VITE_API_URL`, `VITE_SOCKET_URL`
2. Build command: `npm run build`
3. Output directory: `dist`

### MongoDB Atlas
1. Create free cluster at mongodb.com/atlas
2. Whitelist your server IP
3. Use connection string as `MONGO_URI`

---

## Features Implemented

- ✅ JWT Authentication (register / login)
- ✅ Guest mode (play without account)
- ✅ Real-time matchmaking queue
- ✅ Private rooms with 6-digit codes
- ✅ Full Tic-Tac-Toe game logic (server-validated)
- ✅ Trophy system (1 per 3 wins)
- ✅ 4-tier rank system
- ✅ Live chat (guests read-only)
- ✅ Player profiles with match history
- ✅ Leaderboard (top 50)
- ✅ Confetti + trophy popup animations
- ✅ Disconnect handling
- ✅ Anti-cheat (server validates every move)
- ✅ Dark neon esports UI
- ✅ Mobile responsive
