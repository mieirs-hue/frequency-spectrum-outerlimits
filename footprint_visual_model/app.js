import { ControlPanel } from "./controls.js";
import { MissionHUD } from "./hud.js";
import {
  ROOM_BOUNDS,
  SENSOR_RADIUS_FT,
  SensorNetwork,
} from "./sensors.js";
import { TrackingEngine } from "./tracking.js";

const BRIDGE_EVENTS_URL = "http://127.0.0.1:8786/events";
const HEALTH_URL = "http://127.0.0.1:8786/health";
const UPDATE_HZ = 10;
const FRAME_HZ = 10;
const DISPLAY_ROTATION_STEPS_CLOCKWISE = 0;
const DISPLAY_WORLD_SCALE_XZ = 0.9;

const canvas = document.getElementById("missionCanvas");
const ctx = canvas.getContext("2d");

const camera = {
  target: { x: ROOM_BOUNDS.width / 2, y: ROOM_BOUNDS.height / 2, z: ROOM_BOUNDS.depth / 2 },
  yaw: 0.74,
  pitch: 0.35,
  distance: 28,
  focal: 880,
  mode: "orbit",
};

const sensors = new SensorNetwork();
const tracking = new TrackingEngine(sensors);
const hud = new MissionHUD();
const controls = new ControlPanel();

let telemetryEvents = 0;
let renderFrames = 0;
let droppedPackets = 0;
let totalDropped = 0;
let lastZoneKey = "";
let lastMovementClass = "";
const zoneMonitors = {
  outside: { x: ROOM_BOUNDS.width + 4.2, y: 0.9, z: ROOM_BOUNDS.depth * 0.5 },
  upstairs: { x: ROOM_BOUNDS.width * 0.5, y: ROOM_BOUNDS.height + 2.4, z: ROOM_BOUNDS.depth * 0.5 },
};

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function resize() {
  const parent = canvas.parentElement;
  const width = Math.max(1, parent.clientWidth);
  const height = Math.max(1, parent.clientHeight);
  canvas.width = width;
  canvas.height = height;
}

function applyCameraMode(mode) {
  camera.mode = mode;
  if (mode === "top") {
    camera.yaw = 0;
    camera.pitch = 1.56;
    camera.distance = 34;
  } else if (mode === "above") {
    camera.yaw = 0.72;
    camera.pitch = 0.88;
    camera.distance = 24;
  } else if (mode === "side") {
    camera.yaw = -1.56;
    camera.pitch = 0.14;
    camera.distance = 30;
  } else if (mode === "perspective") {
    camera.yaw = 0.6;
    camera.pitch = 0.25;
    camera.distance = 26;
  } else {
    camera.yaw = 0.74;
    camera.pitch = 0.35;
    camera.distance = 28;
  }
  hud.setCameraMode(mode);
}

controls.onChange((state, reason) => {
  if (reason === "sensor-toggle-A") sensors.setEnabled("A", state.sensors.A);
  if (reason === "sensor-toggle-B") sensors.setEnabled("B", state.sensors.B);
  if (reason === "sensor-calibrate-A") {
    sensors.calibrate("A");
    hud.log("Sensor A baseline calibrated");
  }
  if (reason === "sensor-calibrate-B") {
    sensors.calibrate("B");
    hud.log("Sensor B baseline calibrated");
  }

  if (reason.startsWith("view-")) {
    applyCameraMode(state.cameraMode);
  }

  if (reason === "camera-reset") {
    applyCameraMode("orbit");
    controls.forceCameraMode("orbit");
  }

  if (reason === "zoom-in") {
    camera.distance = Math.max(8, camera.distance * 0.88);
  }

  if (reason === "zoom-out") {
    camera.distance = Math.min(120, camera.distance * 1.14);
  }

  if (reason === "forceDebugAvatar") {
    hud.log(
      state.forceDebugAvatar
        ? "Forced debug avatar mode ENABLED"
        : "Forced debug avatar mode DISABLED"
    );
  }

  sensors.setSpheresVisible(state.showSpheres);
});

function getCameraBasis() {
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  const cy = Math.cos(camera.yaw);
  const sy = Math.sin(camera.yaw);

  const forward = { x: sy * cp, y: sp, z: cy * cp };
  const eye = {
    x: camera.target.x - (forward.x * camera.distance),
    y: camera.target.y - (forward.y * camera.distance),
    z: camera.target.z - (forward.z * camera.distance),
  };

  const worldUp = { x: 0, y: 1, z: 0 };
  const right = {
    x: (forward.y * worldUp.z) - (forward.z * worldUp.y),
    y: (forward.z * worldUp.x) - (forward.x * worldUp.z),
    z: (forward.x * worldUp.y) - (forward.y * worldUp.x),
  };
  const rightLen = Math.hypot(right.x, right.y, right.z) || 1;
  right.x /= rightLen;
  right.y /= rightLen;
  right.z /= rightLen;

  const up = {
    x: (right.y * forward.z) - (right.z * forward.y),
    y: (right.z * forward.x) - (right.x * forward.z),
    z: (right.x * forward.y) - (right.y * forward.x),
  };

  return { eye, forward, right, up };
}

function project(point) {
  const worldPoint = rotatePointForDisplay(point);
  const { eye, forward, right, up } = getCameraBasis();
  const rel = {
    x: worldPoint.x - eye.x,
    y: worldPoint.y - eye.y,
    z: worldPoint.z - eye.z,
  };

  const camX = (rel.x * right.x) + (rel.y * right.y) + (rel.z * right.z);
  const camY = (rel.x * up.x) + (rel.y * up.y) + (rel.z * up.z);
  const camZ = (rel.x * forward.x) + (rel.y * forward.y) + (rel.z * forward.z);
  if (camZ <= 0.1) return null;

  const persp = camera.focal / camZ;
  return {
    x: (canvas.width * 0.5) + (camX * persp),
    y: (canvas.height * 0.62) - (camY * persp),
    z: camZ,
  };
}

function rotatePointForDisplay(point) {
  const steps = ((DISPLAY_ROTATION_STEPS_CLOCKWISE % 4) + 4) % 4;
  if (steps === 0) return point;

  const cx = ROOM_BOUNDS.width * 0.5;
  const cz = ROOM_BOUNDS.depth * 0.5;
  let dx = point.x - cx;
  let dz = point.z - cz;

  // Rotate in 90-degree clockwise increments around room center.
  for (let i = 0; i < steps; i += 1) {
    const nextDx = dz;
    const nextDz = -dx;
    dx = nextDx;
    dz = nextDz;
  }

  dx *= DISPLAY_WORLD_SCALE_XZ;
  dz *= DISPLAY_WORLD_SCALE_XZ;

  return {
    x: cx + dx,
    y: point.y,
    z: cz + dz,
  };
}

function drawPolyline(points, color, width = 1, dash = null) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  let moved = false;
  points.forEach((point) => {
    const s = project(point);
    if (!s) return;
    if (!moved) {
      ctx.moveTo(s.x, s.y);
      moved = true;
    } else {
      ctx.lineTo(s.x, s.y);
    }
  });
  if (moved) ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

function drawBox(minX, maxX, minY, maxY, minZ, maxZ, color, width = 1, dash = null) {
  const c = [
    { x: minX, y: minY, z: minZ },
    { x: maxX, y: minY, z: minZ },
    { x: maxX, y: maxY, z: minZ },
    { x: minX, y: maxY, z: minZ },
    { x: minX, y: minY, z: maxZ },
    { x: maxX, y: minY, z: maxZ },
    { x: maxX, y: maxY, z: maxZ },
    { x: minX, y: maxY, z: maxZ },
  ];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  edges.forEach(([a,b]) => drawPolyline([c[a], c[b]], color, width, dash));
}

function drawOutdoorDecor() {
  // Lightweight outside activity context: bushes near window line and golf-cart path.
  const path = [
    { x: ROOM_BOUNDS.width + 1.5, y: 0.05, z: -6 },
    { x: ROOM_BOUNDS.width + 4.5, y: 0.05, z: -2 },
    { x: ROOM_BOUNDS.width + 5.2, y: 0.05, z: 5 },
    { x: ROOM_BOUNDS.width + 2.4, y: 0.05, z: 10 },
  ];
  drawPolyline(path, "rgba(255,177,72,0.85)", 2.1, [10, 8]);

  const bushes = [
    { x: ROOM_BOUNDS.width + 0.9, y: 0.2, z: 1.2 },
    { x: ROOM_BOUNDS.width + 1.4, y: 0.2, z: 3.3 },
    { x: ROOM_BOUNDS.width + 1.1, y: 0.2, z: 5.4 },
    { x: ROOM_BOUNDS.width + 1.5, y: 0.2, z: 7.8 },
    { x: ROOM_BOUNDS.width + 1.0, y: 0.2, z: 10.1 },
  ];

  bushes.forEach((bush, idx) => {
    const p = project(bush);
    if (!p) return;
    const radius = 6 + (idx % 3);
    ctx.strokeStyle = idx % 2 === 0 ? "rgba(43,166,107,0.65)" : "rgba(55,187,130,0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawSphere(center, radius, color) {
  const planes = ["xy", "xz", "yz"];
  planes.forEach((plane, idx) => {
    const points = [];
    const steps = 22;
    for (let i = 0; i <= steps; i += 1) {
      const t = (Math.PI * 2 * i) / steps;
      if (plane === "xy") points.push({ x: center.x + Math.cos(t) * radius, y: center.y + Math.sin(t) * radius, z: center.z });
      if (plane === "xz") points.push({ x: center.x + Math.cos(t) * radius, y: center.y, z: center.z + Math.sin(t) * radius });
      if (plane === "yz") points.push({ x: center.x, y: center.y + Math.cos(t) * radius, z: center.z + Math.sin(t) * radius });
    }
    drawPolyline(points, color, idx === 0 ? 1.8 : 1.1, idx === 0 ? null : [5, 6]);
  });
}

function drawGrid() {
  const margin = 8;
  const minX = -margin;
  const maxX = ROOM_BOUNDS.width + margin;
  const minZ = -margin;
  const maxZ = ROOM_BOUNDS.depth + margin;

  for (let x = minX; x <= maxX; x += 4) {
    drawPolyline([{ x, y: 0, z: minZ }, { x, y: 0, z: maxZ }], "rgba(55,86,124,0.35)", 1);
  }
  for (let z = minZ; z <= maxZ; z += 4) {
    drawPolyline([{ x: minX, y: 0, z }, { x: maxX, y: 0, z }], "rgba(55,86,124,0.35)", 1);
  }
}

function drawFilledFloor(minX, maxX, minZ, maxZ, y, color) {
  const a = project({ x: minX, y, z: minZ });
  const b = project({ x: maxX, y, z: minZ });
  const c = project({ x: maxX, y, z: maxZ });
  const d = project({ x: minX, y, z: maxZ });
  if (!a || !b || !c || !d) return;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
}

function drawBullseye(point, label, color, active = false) {
  const p = project(point);
  if (!p) return;

  const pulse = 0.72 + (0.28 * (0.5 + 0.5 * Math.sin(performance.now() * 0.008)));
  const alpha = active ? pulse : 0.35;
  const r1 = active ? 16 : 12;
  const r2 = active ? 11 : 8;
  const r3 = active ? 6 : 4;

  ctx.strokeStyle = `${color}${active ? "dd" : "99"}`;
  ctx.lineWidth = active ? 2.2 : 1.2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(p.x, p.y, r2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = active ? "#ffffff" : "#c5d4ea";
  ctx.font = "600 11px IBM Plex Sans";
  ctx.fillText(label, p.x + 18, p.y - 6);
}

function drawZoneBullseyes(snapshot) {
  const now = performance.now() * 0.0017;
  const key = snapshot?.zoneKey || "";
  const altitude = snapshot?.altitude ?? 0;
  const aNorm = sensors.nodes.A?.normalized ?? 0;
  const bNorm = sensors.nodes.B?.normalized ?? 0;
  const balance = clamp(aNorm - bNorm, -1, 1);

  const outsideTarget = {
    x: ROOM_BOUNDS.width + 4.2 + (Math.sin(now * 1.2) * 0.55),
    y: 0.9 + (Math.sin(now * 1.9) * 0.15),
    z: clamp((ROOM_BOUNDS.depth * 0.5) + (balance * 5.8) + (Math.cos(now * 1.1) * 0.6), -2, ROOM_BOUNDS.depth + 2),
  };
  const upstairsTarget = {
    x: clamp((ROOM_BOUNDS.width * 0.5) + (balance * 4.8) + (Math.sin(now * 0.9) * 0.6), 0, ROOM_BOUNDS.width),
    y: ROOM_BOUNDS.height + 2.4 + (Math.cos(now * 1.35) * 0.28) + clamp((altitude - ROOM_BOUNDS.height) * 0.2, -0.4, 1.6),
    z: clamp((ROOM_BOUNDS.depth * 0.5) - (balance * 4.8) + (Math.sin(now * 1.15) * 0.6), 0, ROOM_BOUNDS.depth),
  };

  const lerp = 0.18;
  zoneMonitors.outside.x += (outsideTarget.x - zoneMonitors.outside.x) * lerp;
  zoneMonitors.outside.y += (outsideTarget.y - zoneMonitors.outside.y) * lerp;
  zoneMonitors.outside.z += (outsideTarget.z - zoneMonitors.outside.z) * lerp;
  zoneMonitors.upstairs.x += (upstairsTarget.x - zoneMonitors.upstairs.x) * lerp;
  zoneMonitors.upstairs.y += (upstairsTarget.y - zoneMonitors.upstairs.y) * lerp;
  zoneMonitors.upstairs.z += (upstairsTarget.z - zoneMonitors.upstairs.z) * lerp;

  const insidePoint = { x: ROOM_BOUNDS.width * 0.5, y: 0.12, z: ROOM_BOUNDS.depth * 0.5 };
  const outsidePoint = { ...zoneMonitors.outside };
  const upstairsPoint = { ...zoneMonitors.upstairs };

  // Priority monitor policy for this test: upstairs first, otherwise outside.
  const upstairsActive = key === "UPPER_LEVEL" || key === "BRICK_FEET_BAND" || altitude > (ROOM_BOUNDS.height + 0.6);
  const outsideActive = !upstairsActive;
  const insideActive = false;

  const sensorA = sensors.nodes.A?.position;
  const sensorB = sensors.nodes.B?.position;
  if (sensorA && sensorB) {
    [outsidePoint, upstairsPoint].forEach((target) => {
      drawPolyline([sensorA, target], "rgba(255,107,138,0.45)", 1.0, [3, 4]);
      drawPolyline([sensorB, target], "rgba(255,197,103,0.45)", 1.0, [3, 4]);
    });
  }

  drawBullseye(insidePoint, "INSIDE OFFICE BLACKOUT", "#3d4756", insideActive);
  drawBullseye(outsidePoint, "OUTSIDE ZONE LOCK", "#59d5ff", outsideActive);
  drawBullseye(upstairsPoint, "UPSTAIRS ZONE LOCK", "#ffce6a", upstairsActive);
}

function drawScene(snapshot, options) {
  ctx.fillStyle = "#020812";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawOutdoorDecor();
  drawZoneBullseyes(snapshot);
  if (options.showFloorZones) {
    drawFilledFloor(0, ROOM_BOUNDS.width, 0, ROOM_BOUNDS.depth, 0, "rgba(120,138,164,0.24)");
    // Keep indoor/outdoor split logic invisible for lower visual clutter and better performance.
    drawBox(0, ROOM_BOUNDS.width, 0, ROOM_BOUNDS.height, 0, ROOM_BOUNDS.depth, "rgba(57,255,20,0.55)", 1.4);
    drawBox(0, ROOM_BOUNDS.width, ROOM_BOUNDS.height, ROOM_BOUNDS.height + 2, 0, ROOM_BOUNDS.depth, "rgba(210,105,30,0.75)", 1.6, [4,4]);
    drawBox(0, ROOM_BOUNDS.width, ROOM_BOUNDS.height + 2, ROOM_BOUNDS.height * 2, 0, ROOM_BOUNDS.depth, "rgba(255,170,0,0.55)", 1.2, [6,6]);
  }

  const sensorSnapshot = sensors.getSnapshot();
  sensorSnapshot.forEach((node) => {
    const anchor = sensors.nodes[node.id];
    if (!anchor) return;

    if (options.showSpheres && node.enabled) {
      const tint = node.online ? "rgba(220,226,238,0.55)" : "rgba(112,120,134,0.35)";
      drawSphere(anchor.position, SENSOR_RADIUS_FT, tint);
    }

    const s = project(anchor.position);
    if (s) {
      ctx.fillStyle = node.online ? (node.id === "A" ? "#ff6b8a" : "#ffc567") : "#9f6070";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#cfe6ff";
      ctx.font = "600 12px IBM Plex Sans";
      ctx.fillText(anchor.label, s.x + 8, s.y - 8);
      ctx.fillStyle = "#9fd2ff";
      ctx.font = "11px IBM Plex Mono";
      ctx.fillText(`Range: ${SENSOR_RADIUS_FT} ft`, s.x + 8, s.y + 10);
    }
  });

  if (snapshot.active && options.showSignalPaths) {
    snapshot.paths.forEach((path) => {
      if (!path.visible) return;
      drawPolyline([path.from, path.to], "rgba(199,208,222,0.60)", 1.2);
    });
  }

  if (snapshot.active && options.showAvatars && snapshot.position) {
    const p = project(snapshot.position);
    if (p) {
      const pulse = 0.75 + (0.25 * (0.5 + 0.5 * Math.sin(performance.now() * 0.01)));
      const zoneColor = snapshot.zoneColor || "#ffdc82";
      ctx.strokeStyle = zoneColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,255,255,${pulse.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(p.x - 8, p.y);
      ctx.lineTo(p.x + 8, p.y);
      ctx.moveTo(p.x, p.y - 8);
      ctx.lineTo(p.x, p.y + 8);
      ctx.stroke();

      ctx.fillStyle = zoneColor;
      ctx.font = "bold 12px IBM Plex Sans";
      ctx.fillText(snapshot.zone, p.x + 12, p.y + 4);
    }
  }
}

function maybeEmitMovementLogs(snapshot) {
  if (!snapshot) return;

  // Test mode: suppress indoor recognition logs while office zone is blacked out.
  if (snapshot.zoneKey === "VAULT_INTERIOR") return;

  if (snapshot.zoneKey && snapshot.zoneKey !== lastZoneKey) {
    if (snapshot.zoneKey === "BRICK_FEET_BAND") {
      hud.log(`BRICKFEET BAND entered at ${snapshot.altitude.toFixed(2)} ft`, true);
    } else {
      hud.log(`Zone transition -> ${snapshot.zone}`);
    }
    lastZoneKey = snapshot.zoneKey;
  }

  if (!snapshot.movementClass || snapshot.movementClass === lastMovementClass) return;

  if (snapshot.movementClass === "GOLF_CART_OR_VEHICLE") {
    hud.log(`Perimeter class: potential vehicle/golf cart (${snapshot.speedFtPerSec.toFixed(2)} ft/s)`, true);
  } else if (snapshot.movementClass === "DOG_WALKER_OR_PEDESTRIAN") {
    hud.log(`Perimeter class: likely dog walker/pedestrian (${snapshot.speedFtPerSec.toFixed(2)} ft/s)`);
  } else if (snapshot.movementClass === "UPSTAIRS_BRICKFEET_BAND") {
    hud.log("Upstairs classifier: BRICKFEET BAND activity detected", true);
  } else if (snapshot.movementClass === "UNCLE_JESSE_INDOOR") {
    hud.log("Indoor classifier: Uncle Jesse movement profile active");
  }

  lastMovementClass = snapshot.movementClass;
}

function ingestPayload(payload) {
  if (payload && payload.boards && typeof payload.boards === "object") {
    Object.keys(payload.boards).forEach((id) => {
      sensors.ingestPacket(id, payload.boards[id]);
    });
  } else if (payload) {
    sensors.ingestPacket(payload.board || "A", payload);
  }
}

function connectBridge() {
  const source = new EventSource(BRIDGE_EVENTS_URL);

  source.addEventListener("open", () => {
    hud.setBridgeStatus("BRIDGE LIVE", true);
    hud.log("Bridge connected");
  });

  source.addEventListener("packet", (evt) => {
    const payload = JSON.parse(evt.data);
    telemetryEvents += 1;
    const dropped = Number(payload.dropped_packets || 0);
    if (Number.isFinite(dropped) && dropped > 0) {
      droppedPackets += dropped;
      totalDropped += dropped;
    }
    ingestPayload(payload);
  });

  source.addEventListener("error", () => {
    hud.setBridgeStatus("BRIDGE RECONNECTING", false);
  });

  return source;
}

async function pollHealth() {
  try {
    const response = await fetch(HEALTH_URL, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    hud.updateSystemHealth(payload);
  } catch {
    // keep previous values on connectivity dips
  }
}

let source = connectBridge();
setInterval(pollHealth, 2000);
pollHealth();

const orbitDrag = { active: false, x: 0, y: 0 };
canvas.addEventListener("mousedown", (evt) => {
  if (camera.mode !== "orbit") return;
  orbitDrag.active = true;
  orbitDrag.x = evt.clientX;
  orbitDrag.y = evt.clientY;
});
window.addEventListener("mouseup", () => {
  orbitDrag.active = false;
});
window.addEventListener("mousemove", (evt) => {
  if (!orbitDrag.active || camera.mode !== "orbit") return;
  const dx = evt.clientX - orbitDrag.x;
  const dy = evt.clientY - orbitDrag.y;
  orbitDrag.x = evt.clientX;
  orbitDrag.y = evt.clientY;
  camera.yaw += dx * 0.008;
  camera.pitch = Math.max(-1.35, Math.min(1.35, camera.pitch - (dy * 0.006)));
});

let lastUpdateMs = performance.now();
let lastRenderMs = performance.now();
let lastMetricsMs = performance.now();

function publishRates() {
  hud.updateRates({
    telemetryHz: telemetryEvents,
    renderFps: renderFrames,
    dropped: droppedPackets,
    totalDropped,
  });
  telemetryEvents = 0;
  renderFrames = 0;
  droppedPackets = 0;
}

setInterval(() => {
  publishRates();
  lastMetricsMs = performance.now();
}, 1000);

function loop(nowMs) {
  requestAnimationFrame(loop);

  if ((nowMs - lastUpdateMs) >= (1000 / UPDATE_HZ)) {
    const state = controls.state;
    sensors.tick(Date.now());
    const snapshot = tracking.update(state);
    const displaySnapshot = snapshot.zoneKey === "VAULT_INTERIOR"
      ? {
          ...snapshot,
          active: false,
          zone: "INSIDE OFFICE BLACKOUT",
          floor: "--",
          sector: "--",
          confidence: 0,
        }
      : snapshot;
    hud.updateTarget(displaySnapshot);
    hud.updateSensors(sensors.getSnapshot());
    maybeEmitMovementLogs(displaySnapshot);
    window.__lastTrackingSnapshot = displaySnapshot;
    lastUpdateMs = nowMs;
  }

  if ((nowMs - lastRenderMs) < (1000 / FRAME_HZ)) return;

  const snapshot = window.__lastTrackingSnapshot || {
    active: false,
    paths: [],
  };
  drawScene(snapshot, controls.state);
  renderFrames += 1;
  lastRenderMs = nowMs;

  if ((nowMs - lastMetricsMs) >= 1000) {
    publishRates();
    lastMetricsMs = nowMs;
  }
}

window.addEventListener("resize", resize);
window.addEventListener("beforeunload", () => {
  if (source) {
    source.close();
    source = null;
  }
});

resize();
applyCameraMode("orbit");
hud.log("Mission control dashboard initialized");
hud.log("10 Hz telemetry and render gates active");
hud.updateRates({ telemetryHz: 0, renderFps: 0, dropped: 0, totalDropped: 0 });
requestAnimationFrame(loop);
