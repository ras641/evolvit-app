const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

// Internal resolution
canvas.width = 500;
canvas.height = 500;
canvas.style.width = "500px";
canvas.style.height = "500px";

let currentState = {
  creatures: [],
  food: [],
  sprites: {}
};

// 🔁 Rendering loop — draws full state every frame
function drawFrame() {
  ctx.clearRect(0, 0, 500, 500);

  // --- Draw food ---
  ctx.fillStyle = "green";
  for (const [x, y] of currentState.food ?? []) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
  }

  // ✅ Debug: Show how many creatures
  //console.log("🧬 Drawing", currentState.creatures.length, "creatures");

  for (const creature of currentState.creatures ?? []) {
    const { position, direction, sprite_id } = creature;
    const sprite = currentState.sprites?.[sprite_id];
    const layout = sprite?.layout;
    // ✅ Debug: Missing layout?
    if (!layout) {
      //console.warn("❌ Missing layout for sprite ID", sprite_id);
      continue;
    }

    if (typeof layout !== "string") {
      //console.warn("❌ Layout not a string for sprite ID", sprite_id, layout);
      continue;
    }

    const organs = parseLayout(layout);
    //console.log("🔍 Parsed organs for sprite", sprite_id, organs);

    const cos = Math.cos(direction);
    const sin = Math.sin(direction);

    const body = organs.find(o => o.type === "body");
    if (!body) {
      //console.warn("❌ No body organ found for creature", creature);
      continue;
    }

    const bodyX = position[0] + body.x * cos - body.y * sin;
    const bodyY = position[1] + body.x * sin + body.y * cos;

    // ✅ Debug: Log computed body position
    //console.log("📍 Body position:", bodyX, bodyY);

    // Draw organs
    for (const organ of organs) {
      if (organ.type === "body") continue;

      const ox = position[0] + organ.x * cos - organ.y * sin;
      const oy = position[1] + organ.x * sin + organ.y * cos;

      // Line from body to organ
      ctx.beginPath();
      ctx.moveTo(bodyX, bodyY);
      ctx.lineTo(ox, oy);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Organ shape
      ctx.beginPath();
      ctx.arc(ox, oy, organ.size * 0.5, 0, 2 * Math.PI);
      ctx.fillStyle = getOrganColor(organ.type);
      ctx.fill();
    }

    // Draw body
    ctx.beginPath();
    ctx.arc(bodyX, bodyY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "blue";
    ctx.fill();
  }

  requestAnimationFrame(drawFrame);
}


// 🧠 Helper: Parse layout string
function parseLayout(layoutStr) {
  return layoutStr
    .split("|")
    .filter(Boolean)
    .map(line => {
      const [type, x, y, size] = line.split(",");
      return {
        type,
        x: parseFloat(x),
        y: parseFloat(y),
        size: parseFloat(size ?? "0")
      };
    });
}

// 🎨 Color scheme for organs
function getOrganColor(type) {
  switch (type) {
    case "mouth": return "yellow";
    case "eye": return "white";
    case "flipper": return "orange";
    case "spike": return "red";
    default: return "#ccc";
  }
}

// 🔄 Apply full state from backend
function applyFullState({ creatures, food, sprites }) {
  currentState.creatures = creatures;
  currentState.food = food;
  currentState.sprites = sprites;
}

// 🔁 Devvit messaging
addEventListener("message", (event) => {
  const msg = event.data?.data?.message;
  if (!msg) return;

  switch (msg.type) {
    case "stateUpdate": {
      const { state, frame, deltas, sprites } = msg.data;

      // Update info panel
      document.getElementById("creatureCount").textContent = state.creatures.length;
      document.getElementById("foodCount").textContent = state.food.length;
      document.getElementById("frameCount").textContent = frame;
      document.getElementById("deltaCount").textContent = Object.keys(deltas ?? {}).length;
      document.getElementById("spriteCount").textContent = Object.keys(sprites ?? {}).length;

      // Apply new state
      applyFullState({ ...state, sprites });
      break;
    }

    case "error": {
      document.body.innerHTML = `<h1 style="color: red;">❌ Error</h1><p>${msg.data.message}</p>`;
      break;
    }
  }
});

// ✅ Signal to Devvit + polling every 10s
addEventListener("load", () => {
  parent.postMessage({ type: "webViewReady" }, "*");

  setInterval(() => {
    parent.postMessage({ type: "requestUpdate" }, "*");
  }, 10000);
});

// 🚀 Start drawing
drawFrame();
