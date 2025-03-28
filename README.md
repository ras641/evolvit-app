# Evolvit Creature Simulator Frontend

This is the frontend for a Reddit Devvit project where users can create and view evolving creatures in a shared, persistent simulation world. The app includes a custom post for creature input and a simulation viewer that replays buffered state updates at 30 FPS, allowing users to smoothly observe recent activity in near real-time.

## Features

- 🌏 Persistent environment hosted on a VPS with virtual customisable "Creatures" with variable organs and interactions. capable of reproduction and muatation.
- 🖼️ Custom Devvit interactive post for creature creation and upload
- 🎮 Simulation viewer using canvas views last buffered 10 seconds (300 frames)
- 📐 Delta system (maybe not actual delta because sending absolute positions with enough change but im still gonna call it that) for smooth 30 FPS updates. gets state and delta every 10 seconds with `/getfull`. maxes out ~150kB with alot of activity (after compression)
- 🔄 Syncs with backend simulation via `/getfull` endpoint

## Tech Stack

- Reddit Devvit (Blocks + WebView)
- HTML/CSS/JavaScript (Canvas)
- Python/Flask backend run on Gunicorn
- Delta frame system for efficient state updates

## Setup

This frontend is part of a larger project. It assumes a backend simulation server is running and accessible.

1. Clone the repo
```bash
git clone https://github.com/ras641/evolvit-app.git