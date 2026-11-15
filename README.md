# MISSION CONTROL: BEYOND EARTH

A playable 3D space mission design game with single-player and up-to-four-player collaborative rooms.

## Requirements
- Node.js 18+ (20+ recommended)
- npm

## Run locally
From this folder:

```bash
npm run install:all
npm run dev
```

Open the Vite URL printed by the client (normally http://localhost:5173).
The API and multiplayer server runs at http://localhost:4000.

For multiplayer:
1. Start the project once.
2. On one browser choose **Team Mission**, enter a room code and create/join.
3. On other devices on the same network, open `http://YOUR_COMPUTER_IP:5173`.
4. Enter the same room code. Set `VITE_SERVER_URL` if the server is hosted elsewhere.

For a production build:
```bash
npm run build
npm start
```
Serve the built `client/dist` folder with your preferred static host and deploy the `server` separately. Set `VITE_SERVER_URL` at build time to your deployed server URL.

## Gameplay
1. Choose a mission and difficulty.
2. Select a spacecraft bus, power, communications, computer and propulsion system.
3. Add scientific instruments. Each instrument changes mass, power, data, cost and science value.
4. Select an orbit and launch vehicle. The game checks compatibility and payload capacity.
5. Review constraints and launch the mission.
6. Resolve a mission event and receive a performance report.
7. Modify the design and run another simulation.

## Multiplayer notes
Socket.IO synchronizes mission configuration and simulation results in a room. The game supports up to four connected participants per room. It is a cooperative prototype: players share one design state, can assign roles, and can see who is connected. It does not include accounts, persistent cloud saves, or anti-cheat protections.

## Simulation model
The game uses transparent educational estimates, not flight-certified aerospace calculations. Orbit characteristics, costs, component ratings and random mission events are simplified for learning. Treat all values as game balance values, not real procurement or launch data.
