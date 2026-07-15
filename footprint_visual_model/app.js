(() => {
  const ROOM = { w: 12, d: 12, h: 9 };
  const MONITOR_VOLUME = { xMin: -20, xMax: 32, yMin: -6, yMax: 32, zMin: 0, zMax: 28 };
  const WINDOW_WALL_Y = ROOM.d;
  const SENSOR_HEIGHT = 8.5;
  const TARGET_RADIUS = 20.0;
  const CAMERA_POS = { x: 5.8, y: -4.0, z: 2.1 };
  const LOOK_AT = { x: 8.8, y: 10.9, z: 6.1 };
  const FOCAL_SCALE = 760;
  const TRAIL_MAX = 120;
  const PACKET_STALE_MS = 1800;
  const MAX_RENDER_HZ = 15;
  const BRIDGE_EVENTS_URL = "http://127.0.0.1:8786/events";

  const BOARD_A = {
    id: "A",
    color: "#1476d1",
    x: 0,
    y: WINDOW_WALL_Y,
    z: SENSOR_HEIGHT,
  };

  const BOARD_B = {
    id: "B",
    color: "#f08a24",
    x: ROOM.w,
    y: WINDOW_WALL_Y,
    z: SENSOR_HEIGHT,
  };

  const canvas = document.getElementById("focusMap");
  const ctx = canvas.getContext("2d");

  const modeLiveBtn = document.getElementById("modeLive");
  const modeSimBtn = document.getElementById("modeSim");
  const calibrateBtn = document.getElementById("calibrate");
  const clearTrailBtn = document.getElementById("clearTrail");

  const boardAState = document.getElementById("boardAState");
  const boardASignal = document.getElementById("boardASignal");
  const boardADistance = document.getElementById("boardADistance");
  const boardALast = document.getElementById("boardALast");

  const boardBState = document.getElementById("boardBState");
  const boardBSignal = document.getElementById("boardBSignal");
  const boardBDistance = document.getElementById("boardBDistance");
  const boardBLast = document.getElementById("boardBLast");

  const trackerMode = document.getElementById("trackerMode");
  const trackerStatus = document.getElementById("trackerStatus");
  const trackerPosition = document.getElementById("trackerPosition");
  const trackerAge = document.getElementById("trackerAge");
  const systemNote = document.getElementById("systemNote");

  const state = {
    mode: "live",
    source: null,
    trail: [],
    target: null,
    frequencyIntensity: 0,
    lastTargetMs: 0,
    lastRenderMs: 0,
    simulationAngle: 0,
    boards: {
      A: makeBoardState(),
      B: makeBoardState(),
    },
  };

  function makeBoardState() {
    return {
      signal: 0,
      motion: 0,
      normalized: 0,
      baseline: null,
      minObserved: Number.POSITIVE_INFINITY,
      maxObserved: Number.NEGATIVE_INFINITY,
      distanceFt: null,
      lastPacket: "--",
      lastMs: 0,
    };
  }

  function parseCsiMotion(rawMessage) {
    const text = String(rawMessage || "").trim();
    if (!text.startsWith("CSI,")) return null;
    const match = text.match(/motion=([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/);
    if (!match) return null;
    const motion = Number(match[1]);
    return Number.isFinite(motion) ? Math.abs(motion) : null;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function fmtAge(ms) {
    if (!ms) return "--";
    const dt = Math.max(0, Date.now() - ms);
    if (dt < 1000) return "now";
    return `${(dt / 1000).toFixed(1)}s ago`;
  }

  function parseSignalValue(rawMessage) {
    const text = String(rawMessage || "").trim();
    if (!text) return null;

    const nums = text.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
    if (nums.length >= 3) {
      const a = Number(nums[0]);
      const b = Number(nums[1]);
      const c = Number(nums[2]);
      if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
        return Math.abs((a + b + c) / 3);
      }
    }

    if (nums.length >= 1) {
      const first = Number(nums[0]);
      if (Number.isFinite(first)) return Math.abs(first);
    }

    if (/SIGNAL/i.test(text)) {
      return 1;
    }

    return null;
  }

  function updateBoardSignal(boardId, rawValue, rawMessage) {
    const node = state.boards[boardId];
    if (!node || rawValue == null) return;

    const alpha = 0.22;
    node.signal = node.signal === 0 ? rawValue : node.signal + (rawValue - node.signal) * alpha;
    node.motion = node.signal;
    node.minObserved = Math.min(node.minObserved, node.signal);
    node.maxObserved = Math.max(node.maxObserved, node.signal);
    node.lastPacket = String(rawMessage || "--").slice(0, 96);
    node.lastMs = Date.now();

    const floor = Number.isFinite(node.minObserved) ? node.minObserved : 0;
    const ceil = Number.isFinite(node.maxObserved) ? node.maxObserved : floor + 1;
    const span = Math.max(0.001, ceil - floor);

    node.normalized = clamp((node.signal - floor) / span, 0, 1);
    node.distanceFt = clamp(2.0 + (1 - node.normalized) * TARGET_RADIUS, 2, TARGET_RADIUS);
  }

  function trilaterate2D(a, b, da, db) {
    if (!Number.isFinite(da) || !Number.isFinite(db)) return null;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.0001) return null;

    const x = (da * da - db * db + d * d) / (2 * d);
    const y2 = da * da - x * x;

    if (y2 < 0) {
      const wa = 1 / Math.max(0.01, da);
      const wb = 1 / Math.max(0.01, db);
      const t = wb / (wa + wb);
      return {
        x: clamp(a.x + dx * t, MONITOR_VOLUME.xMin, MONITOR_VOLUME.xMax),
        y: clamp(a.y + dy * t - 1.8, MONITOR_VOLUME.yMin, MONITOR_VOLUME.yMax),
      };
    }

    const y = Math.sqrt(y2);
    const ux = dx / d;
    const uy = dy / d;

    const p1 = {
      x: a.x + x * ux + y * (-uy),
      y: a.y + x * uy + y * ux,
    };
    const p2 = {
      x: a.x + x * ux - y * (-uy),
      y: a.y + x * uy - y * ux,
    };

    const score = (p) => {
      const inRoomBias = p.x >= 0 && p.x <= ROOM.w && p.y >= 0 && p.y <= ROOM.d ? 0 : 2;
      const verticalBias = Math.abs(p.y - ROOM.d * 0.55);
      return inRoomBias + verticalBias;
    };

    const picked = score(p1) <= score(p2) ? p1 : p2;
    return {
      x: clamp(picked.x, MONITOR_VOLUME.xMin, MONITOR_VOLUME.xMax),
      y: clamp(picked.y, MONITOR_VOLUME.yMin, MONITOR_VOLUME.yMax),
    };
  }

  function estimateZ() {
    const a = state.boards.A.normalized;
    const b = state.boards.B.normalized;
    const avg = (a + b) / 2;
    const spread = Math.abs(a - b);

    let z = 0.8 + avg * 9.4 + spread * 2.2;
    if (avg > 0.84) {
      z += 1.4;
    }
    return clamp(z, MONITOR_VOLUME.zMin, MONITOR_VOLUME.zMax);
  }

  function computeTargetFromBoards() {
    const dA = state.boards.A.distanceFt;
    const dB = state.boards.B.distanceFt;
    if (!Number.isFinite(dA) || !Number.isFinite(dB)) return null;

    const p2 = trilaterate2D(BOARD_A, BOARD_B, dA, dB);
    if (!p2) return null;

    const avgDist = (dA + dB) * 0.5;
    const lateral = Math.abs(p2.x - (ROOM.w * 0.5));
    const depthOut = Math.sqrt(Math.max(0, (avgDist * avgDist) - (lateral * lateral)));

    const frequency = clamp(((state.boards.A.normalized + state.boards.B.normalized) * 0.5) * 100, 0, 100);
    state.frequencyIntensity = frequency;

    const y = ROOM.d + clamp(depthOut * 0.72, 0.5, TARGET_RADIUS);
    const z = ROOM.h + clamp((frequency * 0.09) + (Math.abs(state.boards.A.normalized - state.boards.B.normalized) * 3.2), 0.2, TARGET_RADIUS * 0.45);

    return {
      x: clamp(p2.x, MONITOR_VOLUME.xMin, MONITOR_VOLUME.xMax),
      y: clamp(y, MONITOR_VOLUME.yMin, MONITOR_VOLUME.yMax),
      z: clamp(z, MONITOR_VOLUME.zMin, MONITOR_VOLUME.zMax),
    };
  }

  function pushTrail(point) {
    state.trail.push({ x: point.x, y: point.y, z: point.z, ts: Date.now() });
    if (state.trail.length > TRAIL_MAX) {
      state.trail.splice(0, state.trail.length - TRAIL_MAX);
    }
  }

  function classifyTarget(target) {
    if (!target) return "searching";
    const inVault = target.x >= 0 && target.x <= ROOM.w && target.y >= 0 && target.y <= ROOM.d && target.z >= 0 && target.z <= ROOM.h;
    if (inVault) return "interior (vault ignored)";
    if (target.y > ROOM.d || target.z > ROOM.h) return "upper skeleton / perimeter active";
    return "out of range";
  }

  function refreshUI() {
    const now = Date.now();
    const aFresh = now - state.boards.A.lastMs < PACKET_STALE_MS;
    const bFresh = now - state.boards.B.lastMs < PACKET_STALE_MS;

    boardAState.textContent = `status: ${aFresh ? "live" : "waiting"}`;
    boardASignal.textContent = `signal: ${state.boards.A.signal.toFixed(2)}`;
    boardADistance.textContent = `distance: ${Number.isFinite(state.boards.A.distanceFt) ? state.boards.A.distanceFt.toFixed(2) : "--"} ft`;
    boardALast.textContent = `last packet: ${state.boards.A.lastPacket}`;

    boardBState.textContent = `status: ${bFresh ? "live" : "waiting"}`;
    boardBSignal.textContent = `signal: ${state.boards.B.signal.toFixed(2)}`;
    boardBDistance.textContent = `distance: ${Number.isFinite(state.boards.B.distanceFt) ? state.boards.B.distanceFt.toFixed(2) : "--"} ft`;
    boardBLast.textContent = `last packet: ${state.boards.B.lastPacket}`;

    trackerMode.textContent = `mode: ${state.mode === "live" ? "live bridge" : "simulation"}`;

    if (state.target) {
      trackerStatus.textContent = `status: ${classifyTarget(state.target)}`;
      trackerPosition.textContent = `position: x ${state.target.x.toFixed(2)}, y ${state.target.y.toFixed(2)}, z ${state.target.z.toFixed(2)} | freq ${state.frequencyIntensity.toFixed(1)}%`;
      trackerAge.textContent = `last update: ${fmtAge(state.lastTargetMs)}`;
    } else {
      trackerStatus.textContent = "status: searching";
      trackerPosition.textContent = "position: x --, y --, z --";
      trackerAge.textContent = "last update: --";
    }

    systemNote.textContent = state.mode === "live"
      ? "note: perimeter echo-shield active | interior vault tracking suppressed"
      : "note: simulation sweeps inside, outside, and above ceiling";
  }

  function projectPoint(point, rect) {
    const centerX = rect.width * 0.54;
    const centerY = rect.height * 0.62;

    const fx = LOOK_AT.x - CAMERA_POS.x;
    const fy = LOOK_AT.y - CAMERA_POS.y;
    const fz = LOOK_AT.z - CAMERA_POS.z;
    const flen = Math.hypot(fx, fy, fz) || 1;
    const forward = { x: fx / flen, y: fy / flen, z: fz / flen };

    const worldUp = { x: 0, y: 0, z: 1 };
    const rxRaw = (forward.y * worldUp.z) - (forward.z * worldUp.y);
    const ryRaw = (forward.z * worldUp.x) - (forward.x * worldUp.z);
    const rzRaw = (forward.x * worldUp.y) - (forward.y * worldUp.x);
    const rlen = Math.hypot(rxRaw, ryRaw, rzRaw) || 1;
    const right = { x: rxRaw / rlen, y: ryRaw / rlen, z: rzRaw / rlen };

    const up = {
      x: (right.y * forward.z) - (right.z * forward.y),
      y: (right.z * forward.x) - (right.x * forward.z),
      z: (right.x * forward.y) - (right.y * forward.x),
    };

    const rel = {
      x: point.x - CAMERA_POS.x,
      y: point.y - CAMERA_POS.y,
      z: point.z - CAMERA_POS.z,
    };

    const camX = (rel.x * right.x) + (rel.y * right.y) + (rel.z * right.z);
    const camY = (rel.x * up.x) + (rel.y * up.y) + (rel.z * up.z);
    const camZ = (rel.x * forward.x) + (rel.y * forward.y) + (rel.z * forward.z);
    const depth = Math.max(0.12, camZ);
    const perspective = FOCAL_SCALE / depth;

    return {
      x: centerX + (camX * perspective),
      y: centerY - (camY * perspective),
      depth,
      scale: perspective,
    };
  }

  function drawPolyline3D(points3d, strokeStyle, lineWidth = 1.2, dash = null) {
    if (!points3d.length) return;
    const rect = { width: canvas.width, height: canvas.height };
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();

    points3d.forEach((p, idx) => {
      const s = projectPoint(p, rect);
      if (idx === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });

    ctx.stroke();
    if (dash) ctx.setLineDash([]);
  }

  function boxCorners(bounds) {
    const { xMin, xMax, yMin, yMax, zMin, zMax } = bounds;
    return [
      { x: xMin, y: yMin, z: zMin },
      { x: xMax, y: yMin, z: zMin },
      { x: xMax, y: yMax, z: zMin },
      { x: xMin, y: yMax, z: zMin },
      { x: xMin, y: yMin, z: zMax },
      { x: xMax, y: yMin, z: zMax },
      { x: xMax, y: yMax, z: zMax },
      { x: xMin, y: yMax, z: zMax },
    ];
  }

  function drawBox(bounds, color, width, dash = null) {
    const c = boxCorners(bounds);
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    edges.forEach(([a, b]) => drawPolyline3D([c[a], c[b]], color, width, dash));
  }

  function drawSphere(center, radius, color) {
    const steps = 42;
    const loops = ["xy", "xz", "yz"];

    loops.forEach((plane, index) => {
      const points = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = (Math.PI * 2 * i) / steps;
        if (plane === "xy") {
          points.push({
            x: center.x + Math.cos(t) * radius,
            y: center.y + Math.sin(t) * radius,
            z: center.z,
          });
        } else if (plane === "xz") {
          points.push({
            x: center.x + Math.cos(t) * radius,
            y: center.y,
            z: center.z + Math.sin(t) * radius,
          });
        } else {
          points.push({
            x: center.x,
            y: center.y + Math.cos(t) * radius,
            z: center.z + Math.sin(t) * radius,
          });
        }
      }
      drawPolyline3D(points, color, index === 0 ? 1.8 : 1.1, index === 0 ? null : [5, 6]);
    });
  }

  function drawSensorNode(sensor, label) {
    const rect = { width: canvas.width, height: canvas.height };
    const top = projectPoint({ x: sensor.x, y: sensor.y, z: sensor.z + 0.5 }, rect);
    const bottom = projectPoint({ x: sensor.x, y: sensor.y, z: sensor.z - 1.6 }, rect);

    ctx.strokeStyle = sensor.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bottom.x, bottom.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();

    ctx.fillStyle = sensor.color;
    ctx.beginPath();
    ctx.arc(top.x, top.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#213453";
    ctx.font = "600 13px IBM Plex Sans";
    ctx.fillText(label, top.x + 8, top.y - 6);
  }

  function drawTrail() {
    // Intentionally disabled for operator clarity.
    // Historical path lines were visually noisy in live monitoring.
    return;
  }

  function drawTarget() {
    if (!state.target) return;

    if (classifyTarget(state.target) === "interior (vault ignored)") {
      return;
    }

    const rect = { width: canvas.width, height: canvas.height };
    const p = projectPoint(state.target, rect);

    const t = clamp(state.frequencyIntensity / 100, 0, 1);
    const low = { r: 24, g: 208, b: 255 };
    const high = { r: 255, g: 200, b: 64 };
    const pulse = 0.78 + (0.22 * (0.5 + 0.5 * Math.sin(performance.now() * 0.012)));
    const r = Math.round(low.r + ((high.r - low.r) * t));
    const g = Math.round(low.g + ((high.g - low.g) * t));
    const b = Math.round(low.b + ((high.b - low.b) * t));

    ctx.fillStyle = `rgba(${r},${g},${b},${pulse.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6 + (t * 4), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(88,54,180,${(0.35 + 0.45 * t).toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(
      p.x,
      p.y + 1,
      14 + (t * 12),
      5 + (t * 4),
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  function drawBackdrop() {
    const rect = { width: canvas.width, height: canvas.height };

    const grd = ctx.createLinearGradient(0, 0, 0, rect.height);
    grd.addColorStop(0, "#f8fbff");
    grd.addColorStop(1, "#ebf2fb");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  function drawLegend() {
    ctx.fillStyle = "#445a7c";
    ctx.font = "12px JetBrains Mono";
    ctx.fillText("Perimeter Echo-Shield: 20ft RF bubbles from corner-mounted boards", 16, 24);
    ctx.fillText("Vault interior ignored; only outside wall / upper skeleton disruptions rendered", 16, 44);
  }

  function drawScene() {
    drawBackdrop();

    drawBox(MONITOR_VOLUME, "rgba(94,122,166,0.48)", 1.2, [6, 6]);
    drawBox(
      { xMin: 0, xMax: ROOM.w, yMin: 0, yMax: ROOM.d, zMin: 0, zMax: ROOM.h },
      "rgba(58,90,135,0.95)",
      1.8
    );

    const sphereRadiusA = TARGET_RADIUS;
    const sphereRadiusB = TARGET_RADIUS;

    drawSphere(BOARD_A, sphereRadiusA, "rgba(20,118,209,0.50)");
    drawSphere(BOARD_B, sphereRadiusB, "rgba(240,138,36,0.50)");

    drawSensorNode(BOARD_A, "ESP32-A corner crown line");
    drawSensorNode(BOARD_B, "ESP32-B corner crown line");

    drawTrail();
    drawTarget();
    drawLegend();
  }

  function setMode(mode) {
    state.mode = mode;
    modeLiveBtn.classList.toggle("active", mode === "live");
    modeSimBtn.classList.toggle("active", mode === "sim");

    if (mode === "live") {
      startBridge();
    } else {
      stopBridge();
    }
  }

  function startBridge() {
    stopBridge();
    try {
      const source = new EventSource(BRIDGE_EVENTS_URL);
      source.addEventListener("packet", (evt) => {
        const payload = JSON.parse(evt.data);
        const boardId = String(payload.board || "").toUpperCase() === "B" ? "B" : "A";
        const csiMotion = parseCsiMotion(payload.message);
        const raw = csiMotion == null ? parseSignalValue(payload.message) : csiMotion;
        updateBoardSignal(boardId, raw, payload.message);
      });
      source.onerror = () => {
        systemNote.textContent = "note: bridge unavailable; keep server and serial bridge running";
      };
      state.source = source;
    } catch {
      state.source = null;
    }
  }

  function stopBridge() {
    if (state.source) {
      state.source.close();
      state.source = null;
    }
  }

  function runSimulation(nowMs) {
    if (state.mode !== "sim") return;

    state.simulationAngle += 0.014;

    const point = {
      x: ROOM.w / 2 + Math.cos(state.simulationAngle * 0.9) * 6.8,
      y: ROOM.d / 2 + Math.sin(state.simulationAngle * 1.1) * 6.5,
      z: clamp(4.6 + Math.sin(state.simulationAngle * 0.7) * 3.2 + Math.max(0, Math.cos(state.simulationAngle * 0.42)) * 2.4, 0, MONITOR_VOLUME.zMax),
    };

    const dA = Math.hypot(point.x - BOARD_A.x, point.y - BOARD_A.y, point.z - BOARD_A.z);
    const dB = Math.hypot(point.x - BOARD_B.x, point.y - BOARD_B.y, point.z - BOARD_B.z);

    const aSignal = clamp((16 - dA) / 13, 0.06, 1.25) * 100;
    const bSignal = clamp((16 - dB) / 13, 0.06, 1.25) * 100;

    updateBoardSignal("A", aSignal, "SIM");
    updateBoardSignal("B", bSignal, "SIM");

    state.boards.A.lastMs = nowMs;
    state.boards.B.lastMs = nowMs;
  }

  function tick(nowMs) {
    runSimulation(nowMs);

    const target = computeTargetFromBoards();
    if (target) {
      state.target = target;
      state.lastTargetMs = Date.now();
      pushTrail(target);
    }

    if ((nowMs - state.lastRenderMs) < (1000 / MAX_RENDER_HZ)) {
      requestAnimationFrame(tick);
      return;
    }

    state.lastRenderMs = nowMs;

    refreshUI();
    drawScene();
    requestAnimationFrame(tick);
  }

  function calibrate() {
    ["A", "B"].forEach((id) => {
      const node = state.boards[id];
      node.baseline = node.signal;
      node.minObserved = node.signal;
      node.maxObserved = node.signal + 0.001;
    });
    systemNote.textContent = "note: baseline captured for empty room";
  }

  function clearTrail() {
    state.trail = [];
    state.target = null;
    state.lastTargetMs = 0;
  }

  modeLiveBtn.addEventListener("click", () => setMode("live"));
  modeSimBtn.addEventListener("click", () => setMode("sim"));
  calibrateBtn.addEventListener("click", calibrate);
  clearTrailBtn.addEventListener("click", clearTrail);

  setMode("live");
  refreshUI();
  requestAnimationFrame(tick);
})();
