# Gold and Goblins Calculator

Node/TypeScript server with a React/Vite frontend for a Gold & Goblins calculator app. Currently displays the map (Read-only), mineshafts list, cards list, chest list, and scaffolding for save loader.

## Setup

Make a copy of `.env.example` -> `.env` and populate the values. The only required value is to specify one of `IOS_DEVICE_ID` or `ANDROID_DEVICE_ID`.

## Development

```sh
npm install
npm run dev
```

The Vite frontend runs on `http://localhost:5173/` and proxies API calls to the Express server. The Express server uses `PORT` from `.env`.

## Build

```sh
npm run build
npm start
```

The frontend builds to `dist/`, and the server builds to `build/server/`.

## Project Structure

```text
src/server/   Express API and server entry point
src/client/   React frontend
scripts/      Balance update scripts
public/       Static assets copied by Vite
```

## Version

Beta 0.2 (2026-06-30)
(C) 2024-26 Darren R. Skidmore