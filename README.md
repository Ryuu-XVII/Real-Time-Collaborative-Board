# CollabCanvas Studio

Hey! This is a real-time collaborative whiteboard/drawing board thing I built to demonstrate low-latency state synchronization, presence tracking, and conflict resolution (CRDTs). 

It uses a pure **Node.js + WebSockets** backend and a **Vite + React** frontend. No bloated multiplayer libraries like Socket.io or SocketCluster—just raw websockets and custom state merging.

---

## The Tech Stuff

### 1. Conflict Resolution (CRDT)
To prevent users from overwriting each other's changes, I implemented a custom **LWW-Element-Set (Last-Write-Wins Element-Set) CRDT** with tombstones:
- **Tombstones**: When someone deletes an item, it doesn't just vanish from the map. It gets flagged as `deleted: true` with a timestamp. This stops offline edits from accidentally resurrecting deleted shapes when syncing back up.
- **Deterministic Merge**: If two users modify the same shape at the exact same millisecond, the merge engine uses alphabetical client ID tiebreakers so every browser converges on the exact same state.
- **Live Vector Streams**: Vector lines (freehand pencil paths) and shapes stream coordinate shifts *in real-time while you drag*, not just when you release the mouse, giving it a Figma-like feel.

### 2. Multi-Tab Isolation & LAN Support
- **Tab Isolation**: I swapped `localStorage` for `sessionStorage` to handle client IDs. Since localStorage is shared across tabs on the same domain, opening two tabs used to assign the same ID and cause socket loops. SessionStorage is tab-isolated, so you can test multiplayer side-by-side on localhost flawlessly.
- **LAN Friendly**: The client dynamically resolves the WebSocket connection using `window.location.hostname`. If you open the site on another device (like your phone) over local Wi-Fi, it connects to your server automatically.
- **Windows Loopback Fallback**: Windows sometimes resolves `localhost` to the IPv6 address `::1` while Node listens on IPv4. I added a fallback that forces `127.0.0.1` so the socket handshake never chokes.

---

## Project Structure

```text
collab-canvas/
├── package.json           # Root package with concurrently commands
├── server/
│   ├── package.json       # Express & WS dependencies
│   └── server.js          # Websocket hub & CRDT room storage
└── client/
    ├── package.json       # Vite & React SPA configs
    └── src/
        ├── App.jsx        # Component coordinator
        ├── index.css      # Dark glassmorphism styles
        ├── utils/
        │   └── crdt.js    # LWW CRDT merging algorithms
        ├── hooks/
        │   └── useWebSocket.js # Resilient WS connection wrapper
        └── components/
            ├── Canvas.jsx      # SVG drawing boards & sticky notes
            ├── CursorOverlay.jsx # Multiplayer smooth cursors overlay
            ├── Toolbar.jsx     # Active tool selections
            └── Sidebar.jsx     # Active collaborators list
```

---

## How to Get It Running

I pre-configured scripts to install everything and run concurrently. 

1. **Install all dependencies**:
   ```bash
   npm run install:all
   ```
   (This runs `npm i` in root, server, and client folders in one go.)

2. **Start both dev servers**:
   ```bash
   npm run dev
   ```

It will spin up:
- **Vite React Client**: `http://localhost:5173`
- **Node WS Server**: `ws://127.0.0.1:5000`

Just open `http://localhost:5173` in two separate side-by-side windows and start drawing. You'll see the cursor presence and drawing strokes synchronise instantly!

Let me know if you run into any port blocking or socket issues!
