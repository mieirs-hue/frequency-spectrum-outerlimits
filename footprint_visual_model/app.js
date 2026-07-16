import { ControlPanel } from "./controls.js";
import { MissionHUD } from "./hud.js";
import {
  ROOM_BOUNDS,
  SensorNetwork,
} from "./sensors.js";
import { TrackingEngine } from "./tracking.js";
import {
  FLOOR2_OPACITY_MAX,
  FLOOR2_OPACITY_MIN,
  OUTER_VIEW_DISTANCE_FT,
  OUTER_VIEW_EYE_HEIGHT_FT,
  SENSOR_VISUAL_RADIUS_FT,
  TACTICAL_COLORS,
  VISUAL_FLOORPLAN_SIZE_FT,
} from "./config.js";

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
  const targetCenter = {
    x: ROOM_BOUNDS.width * 0.5,
    y: ROOM_BOUNDS.height * 0.62,
    z: ROOM_BOUNDS.depth * 0.5,
  };

  const applyEyeToTarget = (eye, target) => {
    const fx = target.x - eye.x;
    const fy = target.y - eye.y;
    const fz = target.z - eye.z;
    const dist = Math.max(0.001, Math.hypot(fx, fy, fz));
    camera.target = { ...target };
    camera.distance = dist;
    camera.yaw = Math.atan2(fx, fz);
    camera.pitch = Math.asin(clamp(fy / dist, -1, 1));
  };

  if (mode === "top") {
    camera.yaw = 0;
    camera.pitch = 1.56;
    camera.distance = 34;
    camera.target = { ...targetCenter };
  } else if (mode === "above") {
    camera.yaw = 0.72;
    camera.pitch = 0.88;
    camera.distance = 24;
    camera.target = { ...targetCenter };
  } else if (mode === "side") {
    camera.yaw = -1.56;
    camera.pitch = 0.14;
    camera.distance = 30;
    camera.target = { ...targetCenter };
  } else if (mode === "perspective") {
    camera.yaw = 0.6;
    camera.pitch = 0.25;
    camera.distance = 26;
    camera.target = { ...targetCenter };
  } else if (mode === "outer50") {
    const seOffset = OUTER_VIEW_DISTANCE_FT * Math.SQRT1_2;
    applyEyeToTarget(
      {
        x: targetCenter.x + seOffset,
        y: OUTER_VIEW_EYE_HEIGHT_FT,
        z: targetCenter.z - seOffset,
      },
      targetCenter
    );
  } else {
    camera.yaw = 0.74;
    camera.pitch = 0.35;
    camera.distance = 28;
    camera.target = { ...targetCenter };
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

  if (reason === "mission-logging-toggle") {
    if (!state.missionLogging) {
      hud.log("Mission logging disengaged for savings");
      hud.setLoggingEnabled(false);
    } else {
      hud.setLoggingEnabled(true);
      hud.log("Mission logging enabled");
    }
  }

  if (reason === "open-mission-log-popout") {
    window.open("./mission_log_popout.html", "missionLogPopup", "width=760,height=640,resizable=yes,scrollbars=yes");
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
  const centerX = ROOM_BOUNDS.width * 0.5;
  const centerZ = ROOM_BOUNDS.depth * 0.5;
  const halfExtent = VISUAL_FLOORPLAN_SIZE_FT * 0.5;
  const ringCenter = {
    x: centerX,
    y: 0.04,
    z: centerZ,
  };

  drawSphere(ringCenter, OUTER_VIEW_DISTANCE_FT, "rgba(185, 217, 154, 0.26)");

  drawBox(
    centerX - halfExtent,
    centerX + halfExtent,
    0,
    0.25,
    centerZ - halfExtent,
    centerZ + halfExtent,
    "rgba(176, 210, 147, 0.55)",
    1.2,
    [8, 8]
  );

  drawLabel({ x: centerX + halfExtent - 8, y: 0.2, z: centerZ + halfExtent - 8 }, "100FT VISUAL PERIMETER", "#e9f3d8");

  const ticks = 16;
  for (let i = 0; i < ticks; i += 1) {
    const a = (Math.PI * 2 * i) / ticks;
    const inner = {
      x: ringCenter.x + Math.cos(a) * (OUTER_VIEW_DISTANCE_FT - 1.5),
      y: ringCenter.y,
      z: ringCenter.z + Math.sin(a) * (OUTER_VIEW_DISTANCE_FT - 1.5),
    };
    const outer = {
      x: ringCenter.x + Math.cos(a) * (OUTER_VIEW_DISTANCE_FT + 1.5),
      y: ringCenter.y,
      z: ringCenter.z + Math.sin(a) * (OUTER_VIEW_DISTANCE_FT + 1.5),
    };
    drawPolyline([inner, outer], "rgba(176, 210, 147, 0.32)", 1);
  }
}

function drawDomeNet(center, radius, color) {
  drawSphere(center, radius, color);
  for (let i = 1; i <= 5; i += 1) {
    const yRatio = i / 6;
    const yOffset = radius * yRatio;
    const ringRadius = Math.sqrt(Math.max(0, (radius * radius) - (yOffset * yOffset)));
    drawSphere({ x: center.x, y: center.y + yOffset, z: center.z }, ringRadius, color.replace("0.25", "0.18"));
  }
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
  const centerX = ROOM_BOUNDS.width * 0.5;
  const centerZ = ROOM_BOUNDS.depth * 0.5;
  const half = VISUAL_FLOORPLAN_SIZE_FT * 0.5;
  const minX = centerX - half;
  const maxX = centerX + half;
  const minZ = centerZ - half;
  const maxZ = centerZ + half;

  for (let x = minX; x <= maxX; x += 5) {
    const major = Math.abs((x - centerX) % 25) < 0.1;
    drawPolyline(
      [{ x, y: 0, z: minZ }, { x, y: 0, z: maxZ }],
      major ? "rgba(171, 205, 139, 0.34)" : TACTICAL_COLORS.grid,
      major ? 1.2 : 1
    );
  }
  for (let z = minZ; z <= maxZ; z += 5) {
    const major = Math.abs((z - centerZ) % 25) < 0.1;
    drawPolyline(
      [{ x: minX, y: 0, z }, { x: maxX, y: 0, z }],
      major ? "rgba(171, 205, 139, 0.34)" : TACTICAL_COLORS.grid,
      major ? 1.2 : 1
    );
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

function drawDisc(center, radius, color) {
  const points = [];
  const steps = 36;
  for (let i = 0; i <= steps; i += 1) {
    const t = (Math.PI * 2 * i) / steps;
    points.push({
      x: center.x + (Math.cos(t) * radius),
      y: center.y,
      z: center.z + (Math.sin(t) * radius),
    });
  }

  const projected = points
    .map((point) => project(point))
    .filter(Boolean);
  if (projected.length < 3) return;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let i = 1; i < projected.length; i += 1) {
    ctx.lineTo(projected[i].x, projected[i].y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawLabel(point, text, color = TACTICAL_COLORS.label) {
  const p = project(point);
  if (!p) return;
  ctx.fillStyle = color;
  ctx.font = "600 11px IBM Plex Sans";
  ctx.fillText(text, p.x + 8, p.y - 8);
}

function drawGolferAvatar(point, color, withCompanion = false) {
  const p = project(point);
  if (!p) return;

  const headY = p.y - 12;
  const bodyY = p.y + 6;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, headY, 3.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x, headY + 4);
  ctx.lineTo(p.x, bodyY);
  ctx.moveTo(p.x, headY + 8);
  ctx.lineTo(p.x - 6, headY + 12);
  ctx.moveTo(p.x, headY + 8);
  ctx.lineTo(p.x + 7, headY + 14);
  ctx.moveTo(p.x, bodyY);
  ctx.lineTo(p.x - 4, bodyY + 7);
  ctx.moveTo(p.x, bodyY);
  ctx.lineTo(p.x + 5, bodyY + 8);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x + 7, headY + 14);
  ctx.lineTo(p.x + 11, bodyY + 6);
  ctx.strokeStyle = "rgba(245, 242, 230, 0.9)";
  ctx.stroke();

  if (withCompanion) {
    ctx.fillStyle = "rgba(241, 223, 165, 0.85)";
    ctx.beginPath();
    ctx.arc(p.x - 9, p.y + 7, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGolfCartAvatar(point, color) {
  const p = project(point);
  if (!p) return;

  ctx.strokeStyle = color;
  ctx.fillStyle = "rgba(248, 238, 202, 0.35)";
  ctx.lineWidth = 1.8;

  ctx.beginPath();
  ctx.rect(p.x - 11, p.y - 6, 22, 11);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x - 8, p.y - 6);
  ctx.lineTo(p.x - 4, p.y - 13);
  ctx.lineTo(p.x + 8, p.y - 13);
  ctx.lineTo(p.x + 11, p.y - 6);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(p.x - 6, p.y + 6, 3, 0, Math.PI * 2);
  ctx.arc(p.x + 6, p.y + 6, 3, 0, Math.PI * 2);
  ctx.stroke();
}

function drawAmbientGolfers() {
  const positions = [
    { x: ROOM_BOUNDS.width + 26, y: 0.5, z: ROOM_BOUNDS.depth + 18 },
    { x: ROOM_BOUNDS.width + 31, y: 0.5, z: ROOM_BOUNDS.depth - 8 },
    { x: ROOM_BOUNDS.width - 20, y: 0.5, z: ROOM_BOUNDS.depth + 30 },
  ];

  positions.forEach((position, idx) => {
    drawGolferAvatar(position, idx === 1 ? "#f7d57e" : "#d9f0bf", false);
  });
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

function drawUpstairsAlert(active) {
  if (!active) return;

  const pulse = 0.16 + (0.16 * (0.5 + 0.5 * Math.sin(performance.now() * 0.009)));
  const minY = ROOM_BOUNDS.height + 0.03;
  const maxY = ROOM_BOUNDS.height + 1.95;
  const fill = `rgba(255,48,48,${pulse.toFixed(3)})`;

  drawFilledFloor(0, ROOM_BOUNDS.width, 0, ROOM_BOUNDS.depth, minY, fill);
  drawFilledFloor(0, ROOM_BOUNDS.width, 0, ROOM_BOUNDS.depth, maxY, fill);
  drawBox(0, ROOM_BOUNDS.width, minY, maxY, 0, ROOM_BOUNDS.depth, "rgba(255,72,72,0.78)", 1.7, [6, 4]);
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
    // A stronger A signal means closer to z=0, stronger B means closer to z=depth.
    z: clamp((ROOM_BOUNDS.depth * 0.5) - (balance * 5.8) + (Math.cos(now * 1.1) * 0.6), -2, ROOM_BOUNDS.depth + 2),
  };
  let upstairsTarget = {
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

  // When upstairs is active, lock directly to the tracked position like the previous downstairs-follow mode.
  if (upstairsActive && snapshot?.position) {
    upstairsTarget = {
      x: clamp(snapshot.position.x, 0, ROOM_BOUNDS.width),
      y: clamp(snapshot.position.y, ROOM_BOUNDS.height + 0.2, ROOM_BOUNDS.height + 4),
      z: clamp(snapshot.position.z, 0, ROOM_BOUNDS.depth),
    };
    zoneMonitors.upstairs.x += (upstairsTarget.x - zoneMonitors.upstairs.x) * 0.42;
    zoneMonitors.upstairs.y += (upstairsTarget.y - zoneMonitors.upstairs.y) * 0.42;
    zoneMonitors.upstairs.z += (upstairsTarget.z - zoneMonitors.upstairs.z) * 0.42;
  }

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

  return { upstairsActive };
}

function drawScene(snapshot, options) {
  const floor2Opacity = clamp(options.ceilingTransparency ?? 0.35, FLOOR2_OPACITY_MIN, FLOOR2_OPACITY_MAX);
  const sliceY = clamp(options.zPlaneSlice ?? (ROOM_BOUNDS.height * 0.5), 0, ROOM_BOUNDS.height * 2);

  ctx.fillStyle = TACTICAL_COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = ROOM_BOUNDS.width * 0.5;
  const centerZ = ROOM_BOUNDS.depth * 0.5;
  const half = VISUAL_FLOORPLAN_SIZE_FT * 0.5;
  drawFilledFloor(centerX - half, centerX + half, centerZ - half, centerZ + half, 0, "rgba(19, 51, 22, 0.62)");
  drawFilledFloor(centerX - half, centerX + half, centerZ - half, centerZ + half, 0.01, "rgba(31, 74, 33, 0.24)");

  drawGrid();
  drawOutdoorDecor();
  drawAmbientGolfers();
  const monitorState = drawZoneBullseyes(snapshot);
  drawUpstairsAlert(!!monitorState?.upstairsActive);
  if (options.showFloorZones) {
    drawFilledFloor(0, ROOM_BOUNDS.width, 0, ROOM_BOUNDS.depth, 0, TACTICAL_COLORS.floor1Fill);
    drawBox(0, ROOM_BOUNDS.width, 0, ROOM_BOUNDS.height, 0, ROOM_BOUNDS.depth, TACTICAL_COLORS.floor1Frame, 1.5);
    drawBox(
      0,
      ROOM_BOUNDS.width,
      ROOM_BOUNDS.height,
      ROOM_BOUNDS.height * 2,
      0,
      ROOM_BOUNDS.depth,
      `rgba(148, 177, 206, ${floor2Opacity.toFixed(3)})`,
      1.2,
      [5, 5]
    );
    drawLabel({ x: ROOM_BOUNDS.width + 0.4, y: 0.45, z: ROOM_BOUNDS.depth * 0.1 }, "MY OFFICE (FLOOR 1)");
    drawLabel({ x: ROOM_BOUNDS.width + 0.4, y: ROOM_BOUNDS.height + 2.2, z: ROOM_BOUNDS.depth * 0.1 }, "FLOOR 2 / TOPSIDE OBSERVATION");
  }

  const sensorSnapshot = sensors.getSnapshot();
  sensorSnapshot.forEach((node) => {
    const anchor = sensors.nodes[node.id];
    if (!anchor) return;

    if (options.showSpheres && node.enabled) {
      const tint = node.online
        ? (node.id === "A" ? "rgba(238, 210, 135, 0.26)" : "rgba(164, 217, 170, 0.26)")
        : "rgba(112,120,134,0.15)";
      drawDomeNet(anchor.position, SENSOR_VISUAL_RADIUS_FT, tint);

      const yOffset = Math.abs(sliceY - anchor.position.y);
      const sliceRadius = yOffset >= SENSOR_VISUAL_RADIUS_FT
        ? 0
        : Math.sqrt((SENSOR_VISUAL_RADIUS_FT ** 2) - (yOffset ** 2));
      if (sliceRadius > 0.5) {
        drawDisc(
          { x: anchor.position.x, y: sliceY, z: anchor.position.z },
          sliceRadius,
          node.id === "A" ? "rgba(255,156,66,0.08)" : "rgba(82,168,255,0.08)"
        );
        drawSphere(
          { x: anchor.position.x, y: sliceY, z: anchor.position.z },
          sliceRadius,
          node.id === "A" ? "rgba(243, 183, 98, 0.45)" : "rgba(126, 216, 183, 0.45)"
        );
      }
    }

    const s = project(anchor.position);
    if (s) {
      ctx.fillStyle = node.online ? (node.id === "A" ? "#ff6b8a" : "#ffc567") : "#9f6070";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = node.id === "A" ? TACTICAL_COLORS.boardA : TACTICAL_COLORS.boardB;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#cfe6ff";
      ctx.font = "600 12px IBM Plex Sans";
      ctx.fillText(anchor.label, s.x + 8, s.y - 8);
      ctx.fillStyle = "#9fd2ff";
      ctx.font = "11px IBM Plex Mono";
      ctx.fillText(`Range: ${SENSOR_VISUAL_RADIUS_FT} ft`, s.x + 8, s.y + 10);
    }
  });

  const nodeA = sensors.nodes.A;
  const nodeB = sensors.nodes.B;
  if (options.showSpheres && nodeA && nodeB) {
    const yOffsetA = Math.abs(sliceY - nodeA.position.y);
    const yOffsetB = Math.abs(sliceY - nodeB.position.y);
    const rA = yOffsetA >= SENSOR_VISUAL_RADIUS_FT ? 0 : Math.sqrt((SENSOR_VISUAL_RADIUS_FT ** 2) - (yOffsetA ** 2));
    const rB = yOffsetB >= SENSOR_VISUAL_RADIUS_FT ? 0 : Math.sqrt((SENSOR_VISUAL_RADIUS_FT ** 2) - (yOffsetB ** 2));
    const dist = Math.hypot(nodeA.position.x - nodeB.position.x, nodeA.position.z - nodeB.position.z);
    const overlapStrength = clamp(((rA + rB) - dist) / Math.max(1, Math.min(rA, rB) * 2), 0, 1);
    if (overlapStrength > 0.01) {
      drawDisc(
        {
          x: (nodeA.position.x + nodeB.position.x) * 0.5,
          y: sliceY,
          z: (nodeA.position.z + nodeB.position.z) * 0.5,
        },
        Math.max(0.8, Math.min(rA, rB) * (0.25 + (overlapStrength * 0.35))),
        `rgba(176, 107, 255, ${(0.14 + overlapStrength * 0.22).toFixed(3)})`
      );
      drawLabel(
        {
          x: (nodeA.position.x + nodeB.position.x) * 0.5,
          y: sliceY,
          z: (nodeA.position.z + nodeB.position.z) * 0.5,
        },
        "OVERLAP LENS",
        TACTICAL_COLORS.overlap
      );
    }
  }

  drawPolyline(
    [{ x: centerX - half, y: sliceY, z: centerZ }, { x: centerX + half, y: sliceY, z: centerZ }],
    "rgba(190, 216, 159, 0.42)",
    1.2,
    [8, 6]
  );
  drawLabel(
    { x: centerX + half - 6, y: sliceY, z: centerZ },
    `Z-PLANE ${sliceY.toFixed(1)} FT`,
    "#e2efca"
  );

  if (snapshot.active && options.showSignalPaths) {
    snapshot.paths.forEach((path) => {
      if (!path.visible) return;
      drawPolyline([path.from, path.to], "rgba(199,208,222,0.58)", 1.1, [6, 5]);
    });
  }

  if (snapshot.active && options.showAvatars && snapshot.position) {
    const p = project(snapshot.position);
    if (p) {
      const pulse = 0.75 + (0.25 * (0.5 + 0.5 * Math.sin(performance.now() * 0.01)));
      const warning = snapshot.zoneKey === "BRICK_FEET_BAND" || snapshot.zoneKey === "UPPER_LEVEL";
      let zoneColor = warning ? TACTICAL_COLORS.warning : (snapshot.zoneColor || "#ffdc82");
      if (!warning && snapshot.overlapPct >= 35) {
        zoneColor = TACTICAL_COLORS.overlap;
      } else if (!warning && snapshot.dominantSensor === "ESP32-S3 A") {
        zoneColor = TACTICAL_COLORS.boardA;
      } else if (!warning && snapshot.dominantSensor === "ESP32-S3 B") {
        zoneColor = TACTICAL_COLORS.boardB;
      }

      ctx.strokeStyle = zoneColor;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,255,255,${pulse.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(p.x - 10, p.y);
      ctx.lineTo(p.x + 10, p.y);
      ctx.moveTo(p.x, p.y - 10);
      ctx.lineTo(p.x, p.y + 10);
      ctx.stroke();

      ctx.fillStyle = zoneColor;
      ctx.font = "bold 12px IBM Plex Sans";
      ctx.fillText(snapshot.zone, p.x + 12, p.y + 4);

      if (snapshot.movementClass === "GOLF_CART_OR_VEHICLE") {
        drawGolfCartAvatar(snapshot.position, zoneColor);
      } else if (snapshot.movementClass === "DOG_WALKER_OR_PEDESTRIAN") {
        drawGolferAvatar(snapshot.position, zoneColor, true);
      } else {
        drawGolferAvatar(snapshot.position, zoneColor, false);
      }
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
    if (state.missionLogging) {
      maybeEmitMovementLogs(displaySnapshot);
    }
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
hud.setLoggingEnabled(controls.state.missionLogging);
hud.log("Mission control dashboard initialized");
hud.log("10 Hz telemetry and render gates active");
hud.updateRates({ telemetryHz: 0, renderFps: 0, dropped: 0, totalDropped: 0 });
requestAnimationFrame(loop);
