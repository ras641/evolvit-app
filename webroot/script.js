const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
//const frameDisplay = document.getElementById("frame-counter");


// Draw something basic for testing
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 100);

let CREATURES = {};
let FOOD = new Set();
let SPRITES = {};
let deltaFrames = {};
let currentFrame = 0;

let lastRealTime = Date.now();
let baseSimFrame = 0; // From /getstate
let lastStateFetchTime = 0;

const PARTY = ['ras641', 'llooide', 'Kooky_Scene8956'];

function parseDeltaFrame(frameStr) {
  const events = frameStr.match(/(s|m|r|o|e)\[[^\]]*\]/g) || [];

  for (const e of events) {
    if (e.startsWith("s[")) {
      const [id, x, y, d, sprite, name, parentStr, creator] = e.slice(2, -1).split("|");

      let parent_ids = [];
      console.log("parentStr:", parentStr);
      try {
        const parent_ids = JSON.parse(parentStr);
        console.log("Parsed parent_ids:", parent_ids);
      } catch (e) {
        console.error("Bad parentStr:", parentStr, e);
      }

      CREATURES[id] = {
        id: +id,
        position: [+x, +y],
        direction: +d,
        sprite_id: +sprite,
        energy: 50,
        name,
        parent_ids,
        creator
      };

      drawFrame();
    }
    
    else if (e.startsWith("m[")) {
      const parts = e.slice(2, -1).split(",");
      const id = parts[0];
      const creature = CREATURES[id];
      if (!creature) continue;

      for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (p.startsWith("x")) {
          creature.position[0] = parseFloat(p.slice(1));
        } else if (p.startsWith("y")) {
          creature.position[1] = parseFloat(p.slice(1));
        } else if (p.startsWith("d")) {
          creature.direction = parseFloat(p.slice(1));
        }
      }
    }
    
    else if (e.startsWith("r[")) {
      const id = e.slice(2, -1);
      delete CREATURES[id];
    }
    
    else if (e.startsWith("e[")) {
      const parts = e.slice(2, -1).split(",");
      const id = parts[0];
      const newEnergy = parseInt(parts[1], 10);

      if (CREATURES[id]) {
        
        CREATURES[id].energy = newEnergy;
        
      }
      

    } else if (e.startsWith("o[")) {
      const [id, newSprite] = e.slice(2, -1).split(",");
      const creature = CREATURES[id];
      if (creature) {
        creature.sprite_id = +newSprite;
        
      }

    } else {
      // console.warn(`❓ Unknown delta event: ${e}`);
    }
  }
}


function parseFoodFrame(newStr, delStr) {
  //console.log("🔥 Incoming food strings:", newStr, delStr);

  const addMatches = newStr.match(/\[\d+,\d+\]/g) || [];
  const delMatches = delStr.match(/\[\d+,\d+\]/g) || [];

  for (const f of addMatches) {
      const [x, y] = f.slice(1, -1).split(',').map(Number);
      FOOD.add(`${x},${y}`);
      //console.log(`✅ Added food at (${x}, ${y})`);
  }

  for (const f of delMatches) {
      const [x, y] = f.slice(1, -1).split(',').map(Number);
      FOOD.delete(`${x},${y}`);
      //console.log(`❌ Removed food at (${x}, ${y})`);

  }
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



function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const pos of FOOD) {
    const [x, y] = pos.split(',').map(Number);
    const r = 4;
  
    if (shading) {
      const gradient = ctx.createRadialGradient(
        x - r * 0.4, y - r * 0.4, r * 0.2,
        x, y, r
      );
      gradient.addColorStop(0, "white");
      gradient.addColorStop(1, "green");
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = "green";
    }
  
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw creatures
  for (const c of Object.values(CREATURES)) {
    const angle = c.direction;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const layout = SPRITES[c.sprite_id];

    const organs = layout.split("|").filter(Boolean).map(line => {
      const [type, x, y, size] = line.split(",");
      return {
        type,
        x: parseFloat(x),
        y: parseFloat(y),
        size: parseFloat(size),
      };
    });

    const body = organs.find(o => o.type === "body") || { x: 0, y: 0 };
    const body_rx = body.x * cos - body.y * sin;
    const body_ry = body.x * sin + body.y * cos;
    const cx = c.position[0] + body_rx;
    const cy = c.position[1] + body_ry;
    
    for (const organ of organs) {
      if (organ.type === "body") continue;
      const rx = organ.x * cos - organ.y * sin;
      const ry = organ.x * sin + organ.y * cos;
      const ox = c.position[0] + rx;
      const oy = c.position[1] + ry;

      let baseColour = "grey";

      switch (organ.type) {
        case "spike": baseColour = "red"; break;
        case "mouth": baseColour = "yellow"; break;
        case "eye": baseColour = "white"; break;
        case "flipper": baseColour = "orange"; break;
        default: baseColour = "#ccc"; break;
      }
      
      // Set fill style
      if (shading) {
        const gradient = ctx.createRadialGradient(
          ox - organ.size * 0.4,
          oy - organ.size * 0.4,
          organ.size * 0.2,
          ox,
          oy,
          organ.size
        );
        gradient.addColorStop(0, "white");
        gradient.addColorStop(1, baseColour);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = baseColour;
      }
      
      // Draw connector line to center of body
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ox, oy);
      ctx.stroke();
      
      // Draw organ
      ctx.beginPath();
      ctx.arc(ox, oy, organ.size, 0, 2 * Math.PI);
      ctx.fill();
    }

    if (shading) {
      // Create a radial gradient centered on the organ
      const gradient = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 8);
      gradient.addColorStop(0, "white");         // light spot
      gradient.addColorStop(1, "blue");          // base color (you can replace with a variable)

      // Apply gradient and draw the shaded organ
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
      ctx.fill();
    }

    else {

      ctx.fillStyle = "blue";
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
      ctx.fill();
    }

    if (c.creator && PARTY.includes(c.creator)){
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      ctx.fillText('🎩', cx, cy - 8);
    }

    // Draw name and ID above creature
    if (showCreatureText) {

      // Draw name and ID above creature
      ctx.fillStyle = "white";
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${c.name} (${c.id})`, c.position[0], c.position[1] - 10);

      // Draw health bar
      const barWidth = 30;
      const barHeight = 4;
      const barX = c.position[0] - barWidth / 2;
      const barY = c.position[1] - 22;
      const energyRatio = Math.max(0, Math.min(1, c.energy / 100)); // clamp 0–1

      // Red background
      ctx.fillStyle = "red";
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Green foreground
      ctx.fillStyle = "lime";
      ctx.fillRect(barX, barY, barWidth * energyRatio, barHeight);
    }
  }

  //frameDisplay.textContent = `Frame: ${currentFrame}`;
  
}



let lastFrameBlock = 0;

function advanceFrames() {

  if (pause) return;
      
  const now = Date.now();
  const elapsedMs = now - lastRealTime;
  const targetFrame = baseSimFrame + Math.floor(elapsedMs / (1000 / 30));

  let appliedDelta = false;

  while (currentFrame < targetFrame) {
    const delta = deltaFrames[currentFrame];
    if (delta) {
      parseDeltaFrame(delta.creatures || "");
      parseFoodFrame(delta.new_food || "", delta.deleted_food || "");
      appliedDelta = true;

      

    }

    // Reduce energy for all creatures
    for (const creature of Object.values(CREATURES)) {
      creature.energy -= 0.01;

      const layout = SPRITES[creature.sprite_id];
      const organs = layout.split("|").filter(Boolean).map(line => {
        const [type, x, y, size] = line.split(",");
        return {
          type,
          x: parseFloat(x),
          y: parseFloat(y),
          size: parseFloat(size),
        };
      });

      for (const organ of organs) {
        switch (organ.type) {
          case "flipper": creature.energy -= 0.001 * organ.size; break;
          case "spike": creature.energy -= 0.001 * organ.size; break;
          default: ctx.fillStyle = "#ccc"; break;
        }

      }

    }

    currentFrame++;

    document.getElementById("frameCount").textContent = currentFrame;

  }

  /*
  console.log(currentFrame);
  console.log(lastFrameBlock);
  */

  if (appliedDelta && (currentFrame < (lastFrameBlock + 300))) {
    
    drawFrame(); // Only draw if we actually applied updates
  
  }
}



//fetchSprites();

let pause = false;

setInterval(advanceFrames, 1000 / 30);


// 🔄 Apply full state from backend
function applyFullState({ creatures, food, sprites, frame, deltas }) {

  if (frame === lastFrameBlock) {

    pause = true;

    document.getElementById("server").textContent = "Waiting for server to catch up";

    return

  }

  else {
    
    lastFrameBlock = frame;

    pause = false;

    document.getElementById("server").textContent = "";

    

  }

  

  // Update existing creatures and add new ones
  
  for (const c of creatures) {
    const existing = CREATURES[c.id];
    if (!existing) {
      CREATURES[c.id] = {
        id: c.id,
        name: c.name,
        position: c.position,
        direction: c.direction,
        sprite_id: c.sprite_id,
        energy: c.energy,
        parent_ids: typeof c.parent_ids === "string" ? JSON.parse(c.parent_ids) : c.parent_ids,
        creator: c.creator
      };
    }
  }

  // Remove creatures that no longer exist

  FOOD.clear();

  for (const f of food) {
    FOOD.add(`${f[0]},${f[1]}`);
  }

  SPRITES = sprites;

  deltaFrames = deltas;

  currentFrame = frame + 1;
  lastRealTime = Date.now();
  baseSimFrame = frame + 1;


}

// 🔁 Devvit messaging
addEventListener("message", (event) => {
  const msg = event.data?.data?.message;
  if (!msg) return;

  switch (msg.type) {
    case "stateUpdate": {
      const { status, message, state, frame, deltas, sprites } = msg.data;

      if (status === "pending") {
        console.log("⏳ Backend says:", message || "Waiting for simulation...");
        document.getElementById("status").textContent = message || "Simulation loading...";
        return;
      }

      document.getElementById("status").textContent = ""; // Clear loading text

      // ✅ Update info panel
      document.getElementById("creatureCount").textContent = state.creatures.length;
      document.getElementById("foodCount").textContent = state.food.length;
      //document.getElementById("frameCount").textContent = frame;
      document.getElementById("deltaCount").textContent = Object.keys(deltas ?? {}).length;
      document.getElementById("spriteCount").textContent = Object.keys(sprites ?? {}).length;

      document.getElementById("frameBlock").textContent = frame;

      // Clear any loading message
      document.getElementById("status").textContent = "";

      if (state && frame != null && sprites && deltas) {
        applyFullState({ ...state, sprites, frame, deltas });
      } else {
        console.warn("⚠️ Received malformed state update.");
      }

      break;
    }

    case "deltaFrame": {
      const { frame, delta } = msg.data;
      deltaFrames[frame] = delta;
      break;
    }

    case "error": {
      document.body.innerHTML = `<h1 style="color: red;">❌ Error</h1><p>${msg.data.message}</p>`;
      break;
    }
  }
});

let showCreatureText = false;

document.getElementById('toggleText').addEventListener('click', () => {
  showCreatureText = !showCreatureText;
});

let shading = false;
document.getElementById('3D').addEventListener('click', () => {
  shading = !shading;
});


// ✅ Signal to Devvit + polling every 10s
addEventListener("load", () => {
  parent.postMessage({ type: "webViewReady" }, "*");

  // Request full state every 10 seconds
  setInterval(() => {
    parent.postMessage({ type: "requestUpdate" }, "*");
  }, 10000);
});

// 🚀 Start drawing
drawFrame();