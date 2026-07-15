(() => {
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const threeStage = document.getElementById("threeStage");
  const hasThree = typeof window.THREE !== "undefined" && !!threeStage;

  const calibrateBtn = document.getElementById("calibrateBtn");
  const modeSimBtn = document.getElementById("modeSim");
  const modeBridgeBtn = document.getElementById("modeBridge");
  const simRunBtn = document.getElementById("simRunBtn");
  const simSpeedInput = document.getElementById("simSpeed");
  const simNoiseInput = document.getElementById("simNoise");
  const boardSpacingInput = document.getElementById("boardSpacing");
  const simSpeedLabel = document.getElementById("simSpeedLabel");
  const simNoiseLabel = document.getElementById("simNoiseLabel");
  const boardSpacingLabel = document.getElementById("boardSpacingLabel");
  const modeStatus = document.getElementById("modeStatus");
  const bridgeStatus = document.getElementById("bridgeStatus");
  const calStatus = document.getElementById("calStatus");
  const stateSummary = document.getElementById("stateSummary");
  const zoneStatusEl = document.getElementById("zoneStatus");
  const confidenceEl = document.getElementById("confidence");
  const waveLevelEl = document.getElementById("waveLevel");
  const stillTimerEl = document.getElementById("stillTimer");
  const stillnessEl = document.getElementById("stillness");
  const rawAEl = document.getElementById("rawA");
  const rawBEl = document.getElementById("rawB");
  const rawSolverEl = document.getElementById("rawSolver");
  const uiMonitorBtn = document.getElementById("uiMonitorBtn");
  const uiDevBtn = document.getElementById("uiDevBtn");
  const monitorOccupancyEl = document.getElementById("monitorOccupancy");
  const monitorTrackingEl = document.getElementById("monitorTracking");
  const monitorMovementEl = document.getElementById("monitorMovement");
  const monitorZoneEl = document.getElementById("monitorZone");
  const monitorTimeEl = document.getElementById("monitorTime");
  const monitorLastEventEl = document.getElementById("monitorLastEvent");
  const trackCardIdEl = document.getElementById("trackCardId");
  const trackCardStateEl = document.getElementById("trackCardState");
  const trackCardPosEl = document.getElementById("trackCardPos");
  const trackCardConfEl = document.getElementById("trackCardConf");
  const trackCardAEl = document.getElementById("trackCardA");
  const trackCardBEl = document.getElementById("trackCardB");
  const trackCardVolumeEl = document.getElementById("trackCardVolume");
  const trackCardFirstSeenEl = document.getElementById("trackCardFirstSeen");
  const trackCardEnteredEl = document.getElementById("trackCardEntered");
  const trackCardStoppedEl = document.getElementById("trackCardStopped");
  const trackCardDurationEl = document.getElementById("trackCardDuration");
  const eventFeedEl = document.getElementById("eventFeed");
  const eventFeedInteriorEl = document.getElementById("eventFeedInterior");
  const eventFeedWindowEl = document.getElementById("eventFeedWindow");
  const eventFeedFloorEl = document.getElementById("eventFeedFloor");
  const eventFeedTopsideEl = document.getElementById("eventFeedTopside");
  const gadgetBannerEl = document.getElementById("gadgetBanner");
  const targetBannerEl = document.getElementById("targetBanner");
  const acqStateEl = document.getElementById("acqState");
  const acqSensorEl = document.getElementById("acqSensor");
  const acqDistanceEl = document.getElementById("acqDistance");
  const acqZoneEl = document.getElementById("acqZone");
  const pipeIngressEl = document.getElementById("pipeIngress");
  const pipeClassifierEl = document.getElementById("pipeClassifier");
  const pipeTrackerEl = document.getElementById("pipeTracker");
  const pipeRendererEl = document.getElementById("pipeRenderer");
  const coverageScoreEl = document.getElementById("coverageScore");
  const blindSpotStatusEl = document.getElementById("blindSpotStatus");
  const handoffStatusEl = document.getElementById("handoffStatus");
  const perimeterRiskEl = document.getElementById("perimeterRisk");
  const coverageSectorsEl = document.getElementById("coverageSectors");
  const gadgetAgreedBtn = document.getElementById("gadgetAgreed");
  const gadgetDeniedBtn = document.getElementById("gadgetDenied");
  const gadgetResponseEl = document.getElementById("gadgetResponse");

  const attemptIdEl = document.getElementById("attemptId");
  const attemptResultEl = document.getElementById("attemptResult");
  const attemptNotesEl = document.getElementById("attemptNotes");
  const saveAttemptBtn = document.getElementById("saveAttempt");
  const exportAttemptsBtn = document.getElementById("exportAttempts");
  const clearAttemptsBtn = document.getElementById("clearAttempts");
  const attemptListEl = document.getElementById("attemptList");

  const distAInput = document.getElementById("distA");
  const distBInput = document.getElementById("distB");
  const distALabel = document.getElementById("distALabel");
  const distBLabel = document.getElementById("distBLabel");

  const ROOM_W_FT = 12;
  const ROOM_H_FT = 12;
  const SENSOR_HEIGHT_FT = 8.0;
  const ROOM_Z_MIN_FT = 0;
  const ROOM_VOLUME_Z_MAX_FT = SENSOR_HEIGHT_FT;
  const TOPSIDE_MONITOR_Z_MAX_FT = 16.0;
  const Z_MARGIN_FT = 1.0;
  const WORLD_MIN_X_FT = 0;
  const WORLD_MAX_X_FT = 12;
  const WORLD_MIN_Y_FT = 0;
  const WORLD_MAX_Y_FT = 14;
  const SENSOR_RANGE_FT = 15;
  const WINDOW_WALL_Y_FT = 11.6;
  const WALL_MARGIN_FT = 0.8;
  const MAX_TRAIL = 60;
  const GHOST_MS = 900;
  const EVENT_LOG_MAX = 40;
  const EMA_ALPHA = 0.25;
  const DIST_THRESH_FT = 0.12;
  const DIST_SMOOTH_ALPHA = 0.18;
  const MAX_DIST_STEP = 0.45;
  const LOCK_IN = 0.42;
  const LOCK_OUT = 0.24;
  const STILLNESS_SPEED_FTPS = 0.26;
  const STILLNESS_HOLD_MS = 1400;
  const STILLNESS_WAVE_MAX = 0.40;
  const STILLNESS_MIN_CONF = 0.42;
  const PRESENCE_GATE_BRIDGE = 0.18;
  const TOPSIDE_NEAR_FT = 2.2;
  const CONFIDENCE_RING_MIN = 0.34;
  const CONFIDENCE_RING_MAX = 0.86;
  const CONFIRM_RADIUS_FT = 15.0;
  const DIRECT_LOCK_SIGNAL = 0.95;
  const DIRECT_LOCK_RANGE_FT = 1.8;
  const DIRECT_LOCK_HOLD_MS = 1200;
  const HANDOFF_DELAY_MS = 2000;
  const DOMINANCE_SWITCH_MIN = 0.09;
  const ZONE_QUALIFY_HOLD_MS = 900;
  const TOPSIDE_QUALIFY_HOLD_MS = 700;
  const HUMAN_MIN_SIGNAL_TOTAL = 0.26;
  const HUMAN_MIN_WAVE = 0.18;
  const HUMAN_MIN_CONFIDENCE = 0.52;
  const HUMAN_MIN_HEIGHT_FT = 2.6;
  const HUMAN_MIN_SPEED_FTPS = 0.30;
  const TOPSIDE_MIN_SIGNAL_TOTAL = 0.20;
  const TOPSIDE_MIN_CONFIDENCE = 0.46;
  const TOPSIDE_MIN_HEIGHT_FT = SENSOR_HEIGHT_FT + 0.55;
  const ENTRY_CONFIRM_MS = 900;
  const EXIT_CONFIRM_MS = 1100;
  const ARM_SETTLE_MS = 2800;

  const boardA = { x: 1.0, y: WINDOW_WALL_Y_FT };
  const boardB = { x: 11.0, y: WINDOW_WALL_Y_FT };
  const COVERAGE_SECTORS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  const ZoneClassifier = window.ZoneClassifier || {
    classify(position, ceilingHeight = SENSOR_HEIGHT_FT) {
      if (!position) return { type: "UNKNOWN", color: 0xf5f8ff };
      if (typeof position.z === "number" && position.z > 7.0) return { type: "TOPSIDE", color: 0x4ea3ff };
      if (typeof position.z === "number" && position.z < 2.0) return { type: "FLOOR_LEVEL", color: 0xffd64d };
      if (typeof position.y === "number" && position.y >= ROOM_H_FT - 1.6) return { type: "WINDOW_PERIMETER", color: 0x39d96a };
      const inside = position.x > 0 && position.x < ROOM_W_FT && position.y > 0 && position.y < ROOM_H_FT;
      if (inside) return { type: "INTERIOR_ROOM", color: 0xff4d4d };
      return { type: "EXTERIOR", color: 0x39d96a };
    },
    laserColorForClassification(classification) {
      const cls = String(classification || "UNKNOWN").toUpperCase();
      if (cls === "INTERIOR" || cls === "INTERIOR_ROOM") return 0xff4d4d;
      if (cls === "EXTERIOR") return 0x39d96a;
      if (cls === "WINDOW_PERIMETER") return 0x39d96a;
      if (cls === "TOPSIDE") return 0x4ea3ff;
      if (cls === "FLOOR_LEVEL") return 0xffd64d;
      return 0xf5f8ff;
    },
    describeClassification(classification) {
      const cls = String(classification || "UNKNOWN").toUpperCase();
      if (cls === "INTERIOR" || cls === "INTERIOR_ROOM") return { title: "INTERIOR TARGET", eventLabel: "INTERIOR TARGET" };
      if (cls === "EXTERIOR") return { title: "EXTERIOR PASS-BY", eventLabel: "GREEN TRACK" };
      if (cls === "WINDOW_PERIMETER") return { title: "WINDOW PERIMETER", eventLabel: "WINDOW PERIMETER MOTION" };
      if (cls === "TOPSIDE") return { title: "TOPSIDE SIGNATURE", eventLabel: "TOPSIDE SIGNATURE" };
      if (cls === "FLOOR_LEVEL") return { title: "FLOOR LEVEL MOTION", eventLabel: "FLOOR LEVEL MOTION" };
      return { title: "AWAITING CLASSIFICATION", eventLabel: "UNKNOWN TRACK" };
    },
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function setBoardSpacing(spacingFt) {
    const spacing = clamp(spacingFt, 6.0, ROOM_W_FT - WALL_MARGIN_FT * 2);
    const cx = ROOM_W_FT / 2;
    boardA.x = cx - spacing / 2;
    boardB.x = cx + spacing / 2;
    boardA.y = WINDOW_WALL_Y_FT;
    boardB.y = WINDOW_WALL_Y_FT;
  }

  boardSpacingInput.value = "10.0";
  setBoardSpacing(Number(boardSpacingInput.value));

  const state = {
    uiMode: "monitor",
    mode: "bridge",
    baseline: { A: null, B: null },
    calibrating: false,
    calEndsAt: 0,
    calSamplesA: [],
    calSamplesB: [],
    motion: { A: 0, B: 0 },
    distances: { A: Number(distAInput.value), B: Number(distBInput.value) },
    filteredDistances: { A: Number(distAInput.value), B: Number(distBInput.value) },
    point: { x: ROOM_W_FT / 2, y: ROOM_H_FT / 2 },
    trail: [],
    confidence: 0,
    isLocked: false,
    lastStrongMs: 0,
    ghostOpacity: 0,
    wave: 0,
    waveBuffer: [],
    signal: { A: 0, B: 0, total: 0 },
    boardStatus: { A: "quiet", B: "quiet" },
    dominantBoard: "none",
    previousDominantBoard: "none",
    zEstimate: null,
    spatialClass: "clear",
    camera: {
      x: ROOM_W_FT * 0.5,
      y: ROOM_H_FT * 0.55,
      z: 13,
    },
    three: null,
    threeVisualAlpha: 0,
    threeLastMs: performance.now(),
    prevDist: { A: Number(distAInput.value), B: Number(distBInput.value) },
    prevPoint: { x: ROOM_W_FT / 2, y: ROOM_H_FT / 2 },
    prevNowMs: performance.now(),
    stillSinceMs: 0,
    stillAnchor: null,
    speedEma: 0,
    currentZone: "unknown",
    previousZone: "unknown",
    occupiedSinceMs: 0,
    pendingOccupiedSinceMs: 0,
    pendingClearSinceMs: 0,
    monitorArmed: false,
    monitorArmedAtMs: 0,
    entryGatePrimed: false,
    entrySatisfied: false,
    trackingEnabled: false,
    directLock: null,
    directLockUntilMs: 0,
    fusionLock: false,
    zoneQualified: false,
    zoneCandidateSinceMs: 0,
    topsideQualified: false,
    topsideCandidateSinceMs: 0,
    targetQualified: false,
    targetFilterReason: "none",
    movementLabel: "none",
    entityClass: "none",
    trackView: { id: "--", state: "CLEAR", confidence: 0 },
    lastTrackState: "CLEAR",
    lastTrackClassification: "UNKNOWN",
    trackDiagnostics: null,
    lastEventLabel: "system ready",
    lastEventAtMs: 0,
    eventFeed: [],
    eventDebounce: {},
    packetStats: {
      A: { countWindow: 0, rate: 0 },
      B: { countWindow: 0, rate: 0 },
      lastWindowAtMs: performance.now(),
    },
    coverage: {
      sectors: COVERAGE_SECTORS.reduce((acc, sector) => {
        acc[sector] = 0;
        return acc;
      }, {}),
      lastHandoff: "none",
      lastSource: "none",
      perimeterRisk: "normal",
    },
    ownership: {
      active: "none",
      candidate: "none",
      candidateSinceMs: 0,
      scoreA: 0,
      scoreB: 0,
      lastSwitchMs: 0,
    },
    verticalModel: {
      groundSignalRef: 0.12,
      groundWaveRef: 0.08,
      groundConfidence: 0,
      upScore: 0,
      upLocked: false,
    },
    source: null,
    sim: {
      running: false,
      speed: Number(simSpeedInput.value),
      noiseFt: Number(simNoiseInput.value),
      truePoint: { x: ROOM_W_FT / 2, y: ROOM_H_FT / 2 },
    },
  };

  const simControls = [simRunBtn, simSpeedInput, simNoiseInput, boardSpacingInput, distAInput, distBInput];

  const recorder = {
    key: "fssc_attempts_v1",
    entries: [],
  };

  function loadAttempts() {
    try {
      const raw = localStorage.getItem(recorder.key);
      recorder.entries = raw ? JSON.parse(raw) : [];
    } catch {
      recorder.entries = [];
    }
  }

  function saveAttempts() {
    localStorage.setItem(recorder.key, JSON.stringify(recorder.entries));
  }

  function nextRunId() {
    return String(recorder.entries.length + 1).padStart(3, "0");
  }

  function fmtClock(ts) {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function fmtElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function classifyPriority(label) {
    if (/ENTRY|TRACK LOCKED|TARGET ANCHORED|INTERIOR|TRACK CROSSED/i.test(label)) return { label: "HIGH", className: "prio-high" };
    if (/EXIT|TOPSIDE|CALIBRATION COMPLETE/i.test(label)) return { label: "MED", className: "prio-med" };
    if (/OUTSIDE|TARGET MOVING|ZONE/i.test(label)) return { label: "LOW", className: "prio-low" };
    return { label: "INFO", className: "prio-info" };
  }

  function pushEvent(label, nowMs, meta = "") {
    const last = state.eventFeed[0];
    if (last && last.label === label && nowMs - state.lastEventAtMs < 1400) return;
    state.lastEventLabel = label;
    state.lastEventAtMs = nowMs;
    state.eventFeed.unshift({ label, meta, ts: Date.now() });
    if (state.eventFeed.length > EVENT_LOG_MAX) state.eventFeed.length = EVENT_LOG_MAX;
  }

  function pushEventThrottled(key, label, nowMs, meta = "", minMs = 2600) {
    const lastAt = state.eventDebounce[key] || 0;
    if (nowMs - lastAt < minMs) return;
    state.eventDebounce[key] = nowMs;
    pushEvent(label, nowMs, meta);
  }

  function renderEventFeed() {
    const formatEvents = (events) => events.map((e) => {
      const priority = classifyPriority(e.label);
      const meta = e.meta ? `<div class="feed-meta">${e.meta}</div>` : "";
      return `
        <div class="feed-line ${priority.className}">
          <div class="feed-meta">[${fmtClock(e.ts)}] PRIORITY ${priority.label}</div>
          <div>${e.label}</div>
          ${meta}
        </div>
      `;
    }).join("");

    const classifyZoneFeed = (eventItem) => {
      const text = `${eventItem.label || ""} ${eventItem.meta || ""}`.toUpperCase();
      if (/TOPSIDE/.test(text)) return "TOPSIDE";
      if (/FLOOR/.test(text)) return "FLOOR_LEVEL";
      if (/WINDOW|PERIMETER|OUTSIDE/.test(text)) return "WINDOW_PERIMETER";
      return "INTERIOR_ROOM";
    };

    if (eventFeedInteriorEl && eventFeedWindowEl && eventFeedFloorEl && eventFeedTopsideEl) {
      const grouped = {
        INTERIOR_ROOM: [],
        WINDOW_PERIMETER: [],
        FLOOR_LEVEL: [],
        TOPSIDE: [],
      };

      for (const entry of state.eventFeed) {
        grouped[classifyZoneFeed(entry)].push(entry);
      }

      const writeZone = (el, items, emptyText) => {
        if (!items.length) {
          el.textContent = emptyText;
          return;
        }
        el.innerHTML = formatEvents(items.slice(0, 8));
      };

      writeZone(eventFeedInteriorEl, grouped.INTERIOR_ROOM, "No interior events yet.");
      writeZone(eventFeedWindowEl, grouped.WINDOW_PERIMETER, "No perimeter events yet.");
      writeZone(eventFeedFloorEl, grouped.FLOOR_LEVEL, "No floor-level events yet.");
      writeZone(eventFeedTopsideEl, grouped.TOPSIDE, "No topside events yet.");
      return;
    }

    if (!eventFeedEl) return;
    if (!state.eventFeed.length) {
      eventFeedEl.textContent = "No events yet.";
      return;
    }
    eventFeedEl.innerHTML = formatEvents(state.eventFeed);
  }

  function showConfirmationBanner(target) {
    if (!targetBannerEl) return;
    const sensorLabel = target.sensorId || target.sensor || target.detectedBy || "UNKNOWN";
    const distanceText = Number.isFinite(target.distance)
      ? `${target.distance.toFixed(1)} ft`
      : Number.isFinite(target.distanceFt)
        ? `${target.distanceFt.toFixed(1)} ft`
        : "--";
    const zoneText = String(target.zone || target.classification || "UNKNOWN").toUpperCase();
    const zoneClass = zoneText.includes("TOPSIDE")
      ? "zone-topside"
      : zoneText.includes("FLOOR")
        ? "zone-floor"
        : zoneText.includes("WINDOW") || zoneText.includes("PERIMETER") || zoneText.includes("OUTSIDE")
          ? "zone-perimeter"
          : "zone-interior";
    targetBannerEl.innerHTML = `
      <div class="confirm-avatar-wrap ${zoneClass}">
        <div class="confirm-avatar-glyph"></div>
        <div class="confirm-avatar-content">
          <div class="confirm-banner-title">TARGET AVATAR DEPLOYED</div>
          <div class="confirm-banner-body">Territory: ${zoneText}</div>
          <div class="confirm-banner-body">Sensor Lock: ${String(sensorLabel).toUpperCase()}</div>
          <div class="confirm-banner-body">Range: ${distanceText}</div>
        </div>
      </div>
    `;
    targetBannerEl.classList.add("active");
    window.clearTimeout(showConfirmationBanner._timer);
    showConfirmationBanner._timer = window.setTimeout(() => {
      targetBannerEl.classList.remove("active");
    }, 2200);
  }

  function showSystemBanner(title, detail = "") {
    if (!targetBannerEl) return;
    targetBannerEl.innerHTML = `
      <div class="confirm-banner-title">${title}</div>
      <div class="confirm-banner-body">${detail}</div>
    `;
    targetBannerEl.classList.add("active");
    window.clearTimeout(showSystemBanner._timer);
    showSystemBanner._timer = window.setTimeout(() => {
      targetBannerEl.classList.remove("active");
    }, 1800);
  }

  function updateCoveragePosture(nowMs, diag) {
    const decay = 0.975;
    for (const sector of COVERAGE_SECTORS) {
      state.coverage.sectors[sector] = clamp(state.coverage.sectors[sector] * decay, 0, 1);
    }

    const baseBoost = clamp((state.signal.total || 0) * 0.09, 0, 0.08);
    for (const sector of COVERAGE_SECTORS) {
      state.coverage.sectors[sector] = clamp(state.coverage.sectors[sector] + baseBoost, 0, 1);
    }

    if (state.isLocked && state.confidence > LOCK_OUT) {
      const cx = ROOM_W_FT * 0.5;
      const cy = ROOM_H_FT * 0.5;
      const angle = Math.atan2(state.point.y - cy, state.point.x - cx);
      const normalized = (angle + Math.PI) / (Math.PI * 2);
      const idx = Math.floor(normalized * COVERAGE_SECTORS.length) % COVERAGE_SECTORS.length;
      const primary = COVERAGE_SECTORS[idx];
      const left = COVERAGE_SECTORS[(idx + COVERAGE_SECTORS.length - 1) % COVERAGE_SECTORS.length];
      const right = COVERAGE_SECTORS[(idx + 1) % COVERAGE_SECTORS.length];
      state.coverage.sectors[primary] = clamp(state.coverage.sectors[primary] + 0.25 * state.confidence, 0, 1);
      state.coverage.sectors[left] = clamp(state.coverage.sectors[left] + 0.12 * state.confidence, 0, 1);
      state.coverage.sectors[right] = clamp(state.coverage.sectors[right] + 0.12 * state.confidence, 0, 1);
    }

    const sourceNow = diag?.sensorA?.locked && diag?.sensorB?.locked
      ? "ESP32-A + ESP32-B"
      : diag?.sensorA?.locked
        ? "ESP32-A"
        : diag?.sensorB?.locked
          ? "ESP32-B"
          : "none";
    if (sourceNow !== "none" && sourceNow !== state.coverage.lastSource) {
      state.coverage.lastHandoff = `${state.coverage.lastSource} -> ${sourceNow}`;
      if (state.coverage.lastSource !== "none") {
        pushEventThrottled("sensor-handoff", "SENSOR HANDOFF", nowMs, state.coverage.lastHandoff, 1800);
      }
    }
    state.coverage.lastSource = sourceNow;

    const perimeterHot = state.spatialClass === "window_perimeter" || state.spatialClass === "outside";
    state.coverage.perimeterRisk = perimeterHot
      ? "elevated"
      : state.signal.total > 0.65
        ? "watch"
        : "normal";

    const values = COVERAGE_SECTORS.map((sector) => state.coverage.sectors[sector]);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const blindCount = values.filter((v) => v < 0.22).length;

    if (coverageScoreEl) coverageScoreEl.textContent = `Coverage: ${(avg * 100).toFixed(0)}%`;
    if (blindSpotStatusEl) blindSpotStatusEl.textContent = `Blind Spots: ${blindCount} sectors`;
    if (handoffStatusEl) handoffStatusEl.textContent = `Sensor Handoff: ${state.coverage.lastHandoff}`;
    if (perimeterRiskEl) perimeterRiskEl.textContent = `Perimeter Risk: ${state.coverage.perimeterRisk}`;

    if (coverageSectorsEl) {
      coverageSectorsEl.innerHTML = COVERAGE_SECTORS.map((sector) => {
        const value = state.coverage.sectors[sector];
        const cls = value > 0.66 ? "high" : value > 0.33 ? "med" : "low";
        return `<div class="coverage-sector ${cls}">${sector}<br>${Math.round(value * 100)}%</div>`;
      }).join("");
    }

    if (blindCount >= 4) {
      pushEventThrottled("coverage-gap", "COVERAGE GAP", nowMs, `${blindCount} low-confidence sectors`, 4200);
    }
  }

  function setUiMode(mode) {
    state.uiMode = mode;
    document.body.classList.toggle("monitor-mode", mode === "monitor");
    uiMonitorBtn.classList.toggle("active", mode === "monitor");
    uiDevBtn.classList.toggle("active", mode === "developer");
  }

  function renderAttemptList() {
    if (!recorder.entries.length) {
      attemptListEl.textContent = "No attempts recorded yet.";
      attemptIdEl.textContent = `run: ${nextRunId()}`;
      return;
    }
    const lines = recorder.entries.slice().reverse().map((e) => (
      `${e.runId} | ${e.result} | spacing ${e.spacingFt.toFixed(1)}ft | speed ${e.simSpeed.toFixed(1)}x | noise ${e.simNoise.toFixed(2)}ft\n` +
      `notes: ${e.notes || "(none)"}`
    ));
    attemptListEl.textContent = lines.join("\n\n");
    attemptIdEl.textContent = `run: ${nextRunId()}`;
  }

  function exportAttemptsMarkdown() {
    const lines = ["# FSSC Attempt Log", "", `Generated: ${new Date().toISOString()}`, ""];
    recorder.entries.forEach((e) => {
      lines.push(`## Run ${e.runId}`);
      lines.push(`- Result: ${e.result}`);
      lines.push(`- Mode: ${e.mode}`);
      lines.push(`- Spacing: ${e.spacingFt.toFixed(1)} ft`);
      lines.push(`- Sim speed: ${e.simSpeed.toFixed(1)}x`);
      lines.push(`- Sim noise: ${e.simNoise.toFixed(2)} ft`);
      lines.push(`- LOCK_IN/LOCK_OUT: ${LOCK_IN}/${LOCK_OUT}`);
      lines.push(`- Notes: ${e.notes || "(none)"}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mapping_session_attempts.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function toPx(point) {
    const pad = 36;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;
    const worldW = WORLD_MAX_X_FT - WORLD_MIN_X_FT;
    const worldH = WORLD_MAX_Y_FT - WORLD_MIN_Y_FT;
    return {
      x: pad + ((point.x - WORLD_MIN_X_FT) / worldW) * w,
      y: canvas.height - pad - ((point.y - WORLD_MIN_Y_FT) / worldH) * h,
    };
  }

  function mapMotionToDistance(motion, baseline) {
    const base = Number.isFinite(baseline) ? baseline : 0;
    const delta = Math.abs(motion - base);
    const n = clamp(delta / (Math.abs(base) * 0.45 + 0.25), 0, 1);
    return clamp(SENSOR_RANGE_FT - n * (SENSOR_RANGE_FT - 0.8), 0.8, SENSOR_RANGE_FT);
  }

  function smoothDistance(prev, raw) {
    const bounded = prev + clamp(raw - prev, -MAX_DIST_STEP, MAX_DIST_STEP);
    return prev + (bounded - prev) * DIST_SMOOTH_ALPHA;
  }

  function activityColor(status) {
    if (status === "topside") return "#ff4d7a";
    if (status === "outside") return "#65f5ff";
    if (status === "inside") return "#7fff9c";
    return "#5f7fa8";
  }

  function classifyEvent(target) {
    if (target.confidence < LOCK_IN) {
      return "clear";
    }

    if (target.z > 7.0 && target.z <= TOPSIDE_MONITOR_Z_MAX_FT) {
      return "topside";
    }

    if (target.z >= ROOM_Z_MIN_FT && target.z < 2.0) {
      return "floor_level";
    }

    if (target.z >= ROOM_Z_MIN_FT && target.z <= ROOM_VOLUME_Z_MAX_FT + Z_MARGIN_FT) {
      if (String(target.zone || "").startsWith("window_perimeter") || String(target.zone || "").startsWith("outside near window")) return "window_perimeter";
      if (isOutsideZone(target.zone)) return "outside";
      if (isInsideZone(target.zone)) return "interior_room";
      return "interior_room";
    }

    return "outside";
  }

  function classifyColor(spatialClass) {
    if (spatialClass === "outside") return "#39d96a";
    if (spatialClass === "window_perimeter") return "#39d96a";
    if (spatialClass === "interior" || spatialClass === "interior_room") return "#ff4d4d";
    if (spatialClass === "topside") return "#4ea3ff";
    if (spatialClass === "floor_level") return "#ffd64d";
    if (spatialClass === "anchored") return "#ffffff";
    return "#6a7894";
  }

  function quadrantLaserColor(point, spatialClass) {
    const cls = String(spatialClass || "").toLowerCase();
    if (cls === "topside") return 0x4ea3ff;
    if (cls === "floor_level") return 0xffd64d;
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return 0xf5f8ff;

    const west = point.x < ROOM_W_FT * 0.5;
    const north = point.y >= ROOM_H_FT * 0.5;
    if (north && west) return 0xff4da6; // NW
    if (north && !west) return 0x4dd8ff; // NE
    if (!north && west) return 0xffc14d; // SW
    return 0x6dff7a; // SE
  }

  function classificationDescriptor(spatialClass) {
    return ZoneClassifier.describeClassification(spatialClass);
  }

  function trend(values) {
    if (values.length < 2) return 0;
    const n = values.length;
    return values[n - 1] - values[Math.max(0, n - 4)];
  }

  function setLinePoints(line, start, end) {
    line.geometry.setFromPoints([start, end]);
  }

  class TrackVisual {
    constructor({ id, scene, sensorA, sensorB, roomHeight }) {
      this.id = id;
      this.scene = scene;
      this.sensorA = sensorA;
      this.sensorB = sensorB;
      this.roomHeight = roomHeight;
      this.group = new THREE.Group();
      this.group.visible = false;
      this.scene.add(this.group);

      this.state = "INITIALIZING";
      this.classification = "clear";
      this.opacity = 0;
      this.position = new THREE.Vector3(0, roomHeight * 0.5, 0);
      this.lastPosition = this.position.clone();
      this.lastSeenMs = 0;
      this.stateEnteredMs = 0;
      this.lastUpdateMs = performance.now();
      this.memoryMs = 2800;
      this.confidence = 0;
      this.confidenceHistory = [];
      this.trailPoints = [];
      this.history = this.trailPoints;
      this.firstSeenMs = 0;
      this.firstSeenTs = 0;
      this.lastMotionMs = 0;
      this.stoppedAtMs = 0;
      this.stoppedAtTs = 0;
      this.enteredZone = "unknown";
      this.currentZone = "unknown";
      this.classification = "UNKNOWN";
      this.laserColor = ZoneClassifier.laserColorForClassification("UNKNOWN");
      this.laserDecay = 0;
      this.laserOpacity = 0;
      this.lockSource = "";
      this.lockReason = "";

      this.target = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xff8c50, transparent: true, opacity: 0.0 })
      );
      this.group.add(this.target);

      this.projectionLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 })
      );
      this.group.add(this.projectionLine);

      this.floorMarker = new THREE.Mesh(
        new THREE.CircleGeometry(0.34, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 })
      );
      this.floorMarker.rotation.x = -Math.PI / 2;
      this.group.add(this.floorMarker);

      this.confidenceFootprint = new THREE.Mesh(
        new THREE.CircleGeometry(0.56, 24),
        new THREE.MeshBasicMaterial({ color: 0x8dd6ff, transparent: true, opacity: 0.0 })
      );
      this.confidenceFootprint.rotation.x = -Math.PI / 2;
      this.group.add(this.confidenceFootprint);

      this.motionVector = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0xffd37a, transparent: true, opacity: 0.0 })
      );
      this.group.add(this.motionVector);

      this.heading = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 0.45, 0xffffff, 0.16, 0.08);
      this.group.add(this.heading);

      this.trail = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0x9ed8ff, transparent: true, opacity: 0.0 })
      );
      this.group.add(this.trail);

      this.pointer = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.42, 14),
        new THREE.MeshBasicMaterial({ color: 0xffe3a6, transparent: true, opacity: 0.0 })
      );
      this.pointer.rotation.x = Math.PI;
      this.pointer.position.set(0, 0.78, 0);
      this.group.add(this.pointer);

      this.vectorA = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0x5fe8c0, transparent: true, opacity: 0.0 })
      );
      this.vectorB = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0x6fd0ff, transparent: true, opacity: 0.0 })
      );
      this.group.add(this.vectorA, this.vectorB);

      this.confidenceRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.04, 10, 28),
        new THREE.MeshBasicMaterial({ color: 0xff8c50, transparent: true, opacity: 0.0 })
      );
      this.confidenceRing.rotation.x = Math.PI / 2;
      this.group.add(this.confidenceRing);

      const xMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false });
      this.x1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), xMat);
      this.x2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), xMat);
      this.x2.rotation.y = Math.PI / 2;
      this.group.add(this.x1, this.x2);

      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 512;
      labelCanvas.height = 160;
      this.labelCtx = labelCanvas.getContext("2d");
      this.labelTexture = new THREE.CanvasTexture(labelCanvas);
      this.labelTexture.needsUpdate = true;
      this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.labelTexture, transparent: true, opacity: 0.0 }));
      this.label.scale.set(3.6, 1.1, 1);
      this.label.position.set(0, 0.9, 0);
      this.group.add(this.label);
    }

    setState(nextState, nowMs) {
      if (this.state === nextState) return;
      this.state = nextState;
      this.stateEnteredMs = nowMs;
    }

    pushConfidence(value) {
      this.confidenceHistory.push(value);
      if (this.confidenceHistory.length > 14) this.confidenceHistory.shift();
    }

    updateLabel(alpha) {
      const ctx2d = this.labelCtx;
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, 512, 160);
      ctx2d.fillStyle = `rgba(8,20,34,${0.66 * alpha})`;
      ctx2d.fillRect(0, 0, 512, 160);
      ctx2d.strokeStyle = `rgba(123,190,255,${0.86 * alpha})`;
      ctx2d.lineWidth = 2;
      ctx2d.strokeRect(4, 4, 504, 152);
      ctx2d.fillStyle = `rgba(236,245,255,${Math.max(0.22, alpha)})`;
      ctx2d.font = "700 38px monospace";
      ctx2d.fillText(`TRACK ${String(this.id).padStart(2, "0")}`, 20, 46);
      ctx2d.font = "600 27px monospace";
      ctx2d.fillText(`${this.classification.toUpperCase()} | ${this.state}`, 20, 92);
      ctx2d.font = "500 24px monospace";
      const memoryLeft = this.state === "MEMORY" ? Math.max(0, this.memoryMs - (performance.now() - this.lastSeenMs)) / 1000 : 0;
      const right = this.state === "MEMORY"
        ? `Searching ${memoryLeft.toFixed(1)}s`
        : `Conf ${(this.confidence * 100).toFixed(0)}%`;
      ctx2d.fillText(right, 20, 132);
      this.labelTexture.needsUpdate = true;
      this.label.material.opacity = clamp(alpha, 0, 0.98);
    }

    applyMeasurement(measurement, nowMs) {
      this.lastPosition.copy(this.position);
      this.position.copy(measurement.position);
      this.confidence = measurement.confidence;
      this.classification = String(measurement.classification || this.classification || "UNKNOWN").toUpperCase();
      this.laserColor = ZoneClassifier.laserColorForClassification(this.classification);
      this.currentZone = measurement.zone || this.currentZone;
      this.lockSource = measurement.lockSource || this.lockSource;
      this.lockReason = measurement.lockReason || this.lockReason;
      this.lastSeenMs = nowMs;
      if (!this.firstSeenMs) {
        this.firstSeenMs = nowMs;
        this.firstSeenTs = Date.now();
      }
      if (this.enteredZone === "unknown" && this.currentZone !== "unknown") this.enteredZone = this.currentZone;
      this.pushConfidence(measurement.confidence);

      const step = this.position.distanceTo(this.lastPosition);
      if (step > 0.04) {
        this.lastMotionMs = nowMs;
        this.stoppedAtMs = 0;
        this.stoppedAtTs = 0;
      }
      this.trailPoints.push(this.position.clone());
      if (this.trailPoints.length > 100) this.trailPoints.shift();
      this.laserDecay = 0;
    }

    updateVisual(nowMs) {
      const dt = Math.max(0, nowMs - this.lastUpdateMs) / 1000;
      this.lastUpdateMs = nowMs;
      const targetAlpha = this.state === "TRACKING" || this.state === "ANCHORED" || this.state === "DIRECT_LOCK"
        ? 1
        : this.state === "FUSION_LOCK"
          ? 0.9
        : this.state === "VALIDATING"
          ? 0.72
          : this.state === "DETECTION"
            ? 0.52
            : this.state === "LOST"
              ? 0.28
              : this.state === "MEMORY"
                ? clamp(1 - (nowMs - this.lastSeenMs) / this.memoryMs, 0, 0.45)
                : 0;

      const upRate = 3.8;
      const downRate = 1.7;
      if (targetAlpha > this.opacity) {
        this.opacity = clamp(this.opacity + dt * upRate, 0, targetAlpha);
      } else {
        this.opacity = clamp(this.opacity - dt * downRate, 0, 1);
      }

      const visible = this.opacity > 0.02 && this.state !== "EXPIRED";
      this.group.visible = visible;
      if (!visible) return;

      const pulse = this.state === "TRACKING"
        ? 1 + Math.sin(nowMs * 0.005) * 0.15
        : this.state === "ANCHORED"
          ? 1.04
          : this.state === "VALIDATING"
            ? 1 + Math.sin(nowMs * 0.0035) * 0.08
            : 1;
      this.target.scale.set(pulse, pulse, pulse);
      this.confidenceRing.scale.set(pulse, pulse, pulse);

      const beamTarget = this.state === "ANCHORED" && this.trailPoints.length
        ? this.trailPoints[this.trailPoints.length - 1]
        : this.position;
      if (this.state === "ANCHORED") {
        this.laserOpacity = 1;
      } else {
        this.laserDecay = clamp(this.laserDecay + dt / 2.0, 0, 1);
        this.laserOpacity = clamp(1 - this.laserDecay, 0, 1);
      }

      this.group.position.copy(this.position);
      const floorY = 0.03 - this.position.y;
      this.floorMarker.position.set(0, floorY, 0);
      this.confidenceFootprint.position.set(0, floorY + 0.01, 0);
      this.x1.position.set(0, floorY + 0.03, 0);
      this.x2.position.set(0, floorY + 0.03, 0);

      setLinePoints(this.projectionLine, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, floorY - 0.01, 0));

      const sA = this.sensorA.position;
      const sB = this.sensorB.position;
      setLinePoints(
        this.vectorA,
        new THREE.Vector3(sA.x - this.position.x, sA.y - this.position.y, sA.z - this.position.z),
        new THREE.Vector3(0, 0, 0)
      );
      setLinePoints(
        this.vectorB,
        new THREE.Vector3(sB.x - this.position.x, sB.y - this.position.y, sB.z - this.position.z),
        new THREE.Vector3(0, 0, 0)
      );

      const motionDelta = this.position.clone().sub(this.lastPosition);
      const motionLen = clamp(motionDelta.length() * 3.2, 0.0, 1.9);
      const motionDir = motionDelta.length() > 0.001 ? motionDelta.normalize() : new THREE.Vector3(0, 0, 0.001);
      setLinePoints(
        this.motionVector,
        new THREE.Vector3(0, 0.02, 0),
        new THREE.Vector3(motionDir.x * motionLen, motionDir.y * motionLen, motionDir.z * motionLen)
      );

      const headingDir = this.trailPoints.length > 1
        ? this.trailPoints[this.trailPoints.length - 1].clone().sub(this.trailPoints[this.trailPoints.length - 2]).normalize()
        : motionDir.clone();
      if (headingDir.lengthSq() > 1e-6) {
        this.heading.visible = this.state === "TRACKING" || this.state === "ANCHORED";
        this.heading.setDirection(headingDir.normalize());
        this.heading.setLength(Math.max(0.25, Math.min(0.9, 0.22 + (motionLen || 0) * 0.22)), 0.16, 0.08);
        this.heading.position.set(0, 0.08, 0);
        this.heading.line.material.color.setHex(this.laserColor);
        this.heading.cone.material.color.setHex(this.laserColor);
      }

      if (this.trailPoints.length > 1) {
        const localPts = this.trailPoints.map((p) => new THREE.Vector3(p.x - this.position.x, p.y - this.position.y, p.z - this.position.z));
        this.trail.geometry.setFromPoints(localPts);
      }

      const color = classifyColor(this.classification);
      const confNorm = clamp((this.confidence - CONFIDENCE_RING_MIN) / (CONFIDENCE_RING_MAX - CONFIDENCE_RING_MIN), 0, 1);
      const uncertaintyRadius = clamp(0.26 + (1 - this.confidence) * 0.9, 0.26, 1.15);

      this.target.material.color.set(color);
      this.target.material.opacity = clamp(this.opacity, 0, 0.96);
      this.confidenceRing.material.color.set(color);
      this.confidenceRing.material.opacity = clamp(this.opacity * confNorm, 0, 0.9);
      this.floorMarker.material.color.set(color);
      this.floorMarker.material.opacity = clamp(this.opacity * 0.5, 0, 0.74);
      this.confidenceFootprint.material.color.set(color);
      this.confidenceFootprint.material.opacity = clamp(this.opacity * (0.12 + (1 - this.confidence) * 0.24), 0, 0.52);
      this.confidenceFootprint.scale.set(uncertaintyRadius, uncertaintyRadius, 1);
      this.vectorA.material.opacity = clamp(this.opacity * 0.62, 0, 0.78);
      this.vectorB.material.opacity = clamp(this.opacity * 0.62, 0, 0.78);
      this.projectionLine.material.opacity = clamp(this.opacity * (this.state === "VALIDATING" ? 0.32 : 0.56), 0, 0.68);
      this.motionVector.material.opacity = clamp(this.opacity * (motionLen > 0.1 ? 0.66 : 0.22), 0, 0.74);
      this.trail.material.opacity = clamp(this.opacity * 0.45, 0, 0.52);
      this.pointer.material.opacity = clamp(this.opacity * 0.78, 0, 0.86);
      this.x1.material.opacity = this.state === "ANCHORED" ? clamp(this.opacity * 0.94, 0, 0.94) : 0;
      this.x2.material.opacity = this.state === "ANCHORED" ? clamp(this.opacity * 0.94, 0, 0.94) : 0;

      this.updateLabel(this.opacity);

      this.laserTarget = beamTarget.clone();
    }

    summary() {
      return {
        id: String(this.id).padStart(2, "0"),
        state: this.state,
        confidence: this.confidence,
        classification: this.classification,
        position: { x: this.position.x, y: this.position.z, z: this.position.y },
        firstSeenMs: this.firstSeenMs,
        firstSeenTs: this.firstSeenTs,
        enteredZone: this.enteredZone,
        stoppedAtMs: this.stoppedAtMs,
        stoppedAtTs: this.stoppedAtTs,
        lockSource: this.lockSource,
        lockReason: this.lockReason,
        laserColor: this.laserColor,
        laserOpacity: this.laserOpacity,
        classificationTitle: classificationDescriptor(this.classification.toLowerCase()).title,
      };
    }
  }

  class TrackManager {
    constructor({ scene, sensorA, sensorB, roomHeight }) {
      this.scene = scene;
      this.sensorA = sensorA;
      this.sensorB = sensorB;
      this.roomHeight = roomHeight;
      this.nextId = 1;
      this.tracks = [];
      this.reacquireRadiusFt = 2.4;
      this.renderState = {
        primaryTrack: null,
        sensorA: { signal: 0, noise: 0, status: "quiet", distanceFt: null, locked: false, insideVolume: false, bubbleScale: 1, bubbleOpacity: 0.04 },
        sensorB: { signal: 0, noise: 0, status: "quiet", distanceFt: null, locked: false, insideVolume: false, bubbleScale: 1, bubbleOpacity: 0.04 },
        laser: { color: 0xff2b2b, aVisible: false, bVisible: false, aOpacity: 0, bOpacity: 0, target: null },
      };
    }

    laserColorForClass(cls) {
      return ZoneClassifier.laserColorForClassification(cls);
    }

    createTrack(nowMs, measurement) {
      const t = new TrackVisual({
        id: this.nextId++,
        scene: this.scene,
        sensorA: this.sensorA,
        sensorB: this.sensorB,
        roomHeight: this.roomHeight,
      });
      t.setState("DETECTION", nowMs);
      t.applyMeasurement(measurement, nowMs);
      t.updateVisual(nowMs);
      this.tracks.push(t);
      return t;
    }

    update(measurement, sensorInput, nowMs) {
      const hasMeasurement = !!(measurement && measurement.active);
      let track = this.tracks[0] || null;
      if (!track && hasMeasurement) {
        track = this.createTrack(nowMs, measurement);
      }
      if (!track) return;

      if (hasMeasurement) {
        const nearLast = track.position.distanceTo(measurement.position) <= this.reacquireRadiusFt;
        const canReacquire = nearLast || track.state === "MEMORY" || track.state === "LOST";
        if (canReacquire) {
          track.applyMeasurement(measurement, nowMs);
          const confTrend = trend(track.confidenceHistory);
          const avgConf = track.confidenceHistory.reduce((sum, c) => sum + c, 0) / Math.max(1, track.confidenceHistory.length);

          if (measurement.stillAnchor) {
            track.setState("ANCHORED", nowMs);
            if (!track.stoppedAtMs) {
              track.stoppedAtMs = nowMs;
              track.stoppedAtTs = Date.now();
            }
          } else if (measurement.directLock) {
            track.setState("DIRECT_LOCK", nowMs);
          } else if (measurement.fusionLock && avgConf >= LOCK_IN) {
            track.setState("FUSION_LOCK", nowMs);
          } else if (avgConf >= LOCK_IN && confTrend > -0.06) {
            track.setState("TRACKING", nowMs);
          } else if (avgConf >= LOCK_OUT) {
            track.setState("VALIDATING", nowMs);
          } else {
            track.setState("DETECTION", nowMs);
          }
        }
      } else {
        const elapsedSinceSeen = nowMs - track.lastSeenMs;
        if (["TRACKING", "ANCHORED", "DIRECT_LOCK", "VALIDATING", "DETECTION"].includes(track.state)) {
          track.setState("LOST", nowMs);
        }
        if (track.state === "LOST" && elapsedSinceSeen > 450) {
          track.setState("MEMORY", nowMs);
        }
        if (track.state === "MEMORY" && elapsedSinceSeen > track.memoryMs) {
          track.setState("EXPIRED", nowMs);
        }
      }

      track.updateVisual(nowMs);
      if (track.state === "EXPIRED" && track.opacity <= 0.01) {
        track.group.visible = false;
        this.tracks = [];
        track = null;
      }

      const primary = track && track.state !== "EXPIRED" ? track : null;
      const sigA = clamp(sensorInput?.signalA || 0, 0, 1.6);
      const sigB = clamp(sensorInput?.signalB || 0, 0, 1.6);
      const noise = clamp(sensorInput?.noise || 0, 0, 1);
      const distA = primary ? this.sensorA.position.distanceTo(primary.position) : null;
      const distB = primary ? this.sensorB.position.distanceTo(primary.position) : null;
      const inA = Number.isFinite(distA) ? distA <= CONFIRM_RADIUS_FT : false;
      const inB = Number.isFinite(distB) ? distB <= CONFIRM_RADIUS_FT : false;
      const laserColor = this.laserColorForClass(primary ? primary.classification : "UNKNOWN");
      this.renderState = {
        primaryTrack: primary ? primary.summary() : null,
        sensorA: {
          signal: sigA,
          noise,
          status: sensorInput?.statusA || "quiet",
          distanceFt: distA,
          locked: !!(primary && inA),
          insideVolume: inA,
          bubbleScale: 0.5 + sigA * 0.95,
          bubbleOpacity: clamp(0.06 + sigA * 0.12 * (0.82 + Math.sin(nowMs * 0.004) * 0.18), 0.04, 0.32),
        },
        sensorB: {
          signal: sigB,
          noise,
          status: sensorInput?.statusB || "quiet",
          distanceFt: distB,
          locked: !!(primary && inB),
          insideVolume: inB,
          bubbleScale: 0.5 + sigB * 0.95,
          bubbleOpacity: clamp(0.06 + sigB * 0.12 * (0.82 + Math.sin(nowMs * 0.004) * 0.18), 0.04, 0.32),
        },
        laser: {
          color: laserColor,
          aVisible: !!(primary && (inA || primary.state === "ANCHORED")),
          bVisible: !!(primary && (inB || primary.state === "ANCHORED")),
          aOpacity: primary ? clamp(Math.max(primary.laserOpacity, 0.18 + sigA * 0.42), 0.12, 1) : 0,
          bOpacity: primary ? clamp(Math.max(primary.laserOpacity, 0.18 + sigB * 0.42), 0.12, 1) : 0,
          target: primary ? (primary.laserTarget || primary.position).clone() : null,
        },
      };
    }

    getRenderableTracks() {
      return this.tracks.filter((t) => t.state !== "EXPIRED");
    }

    getPrimarySummary() {
      const t = this.tracks[0];
      if (!t) return { id: "--", state: "CLEAR", confidence: 0, classification: "clear" };
      return t.summary();
    }

    getRenderState() {
      return this.renderState;
    }
  }

  function initThreeScene() {
    if (!hasThree) return null;

    document.body.classList.add("three-mode");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07111e);
    scene.fog = new THREE.Fog(0x07111e, 18, 60);

    const width = threeStage.clientWidth || canvas.width;
    const height = threeStage.clientHeight || canvas.height;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 140);
    camera.position.set(2.5, 9.2, 20.5);
    camera.lookAt(0, 4.2, -8.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height, false);
    threeStage.innerHTML = "";
    threeStage.appendChild(renderer.domElement);

    const house = new THREE.Group();
    scene.add(house);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ color: 0x13253d, transparent: true, opacity: 0.45, wireframe: true })
    );
    floor.rotation.x = -Math.PI / 2;
    house.add(floor);

    const roomHeight = SENSOR_HEIGHT_FT;
    const wallAngle = THREE.MathUtils.degToRad(40);
    const wallPivotZ = -5.92;
    const rotateWallXZ = (x, z) => {
      const cos = Math.cos(wallAngle);
      const sin = Math.sin(wallAngle);
      const dx = x;
      const dz = z - wallPivotZ;
      return {
        x: dx * cos - dz * sin,
        z: wallPivotZ + dx * sin + dz * cos,
      };
    };

    const exteriorCenter = rotateWallXZ(0, -10.0);
    const exteriorLane = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 8),
      new THREE.MeshBasicMaterial({ color: 0x0d1f30, transparent: true, opacity: 0.35, wireframe: true })
    );
    exteriorLane.rotation.set(-Math.PI / 2, wallAngle, 0);
    exteriorLane.position.set(exteriorCenter.x, 0.02, exteriorCenter.z);
    house.add(exteriorLane);

    const exteriorLand = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 11),
      new THREE.MeshBasicMaterial({ color: 0x103025, transparent: true, opacity: 0.35 })
    );
    exteriorLand.rotation.set(-Math.PI / 2, wallAngle, 0);
    exteriorLand.position.set(exteriorCenter.x, -0.005, exteriorCenter.z - 0.7);
    house.add(exteriorLand);

    const exteriorRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 2.6),
      new THREE.MeshBasicMaterial({ color: 0x1f2631, transparent: true, opacity: 0.66 })
    );
    exteriorRoad.rotation.set(-Math.PI / 2, wallAngle, 0);
    exteriorRoad.position.set(exteriorCenter.x, 0.01, exteriorCenter.z - 0.5);
    house.add(exteriorRoad);

    const laneStripe = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xf5f7b8, transparent: true, opacity: 0.8 })
    );
    laneStripe.rotation.set(-Math.PI / 2, wallAngle, 0);
    laneStripe.position.set(exteriorCenter.x, 0.015, exteriorCenter.z - 0.5);
    house.add(laneStripe);

    const cartoonDecor = new THREE.Group();
    scene.add(cartoonDecor);

    const placeOnExterior = (x, z, y = 0.02) => {
      const p = rotateWallXZ(x, z);
      return new THREE.Vector3(p.x, y, p.z);
    };

    const pathGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 3.4),
      new THREE.MeshBasicMaterial({ color: 0x6fe2ff, transparent: true, opacity: 0.12 })
    );
    pathGlow.rotation.set(-Math.PI / 2, wallAngle, 0);
    pathGlow.position.copy(placeOnExterior(0, -9.8, 0.012));
    cartoonDecor.add(pathGlow);

    const hillLeft = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0x2f8f56, transparent: true, opacity: 0.62 })
    );
    hillLeft.position.copy(placeOnExterior(-6.1, -11.1, 0.8));
    hillLeft.scale.set(1.1, 0.45, 1.5);
    cartoonDecor.add(hillLeft);

    const hillRight = new THREE.Mesh(
      new THREE.SphereGeometry(1.9, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0x3b9b61, transparent: true, opacity: 0.62 })
    );
    hillRight.position.copy(placeOnExterior(5.9, -11.2, 0.86));
    hillRight.scale.set(1.2, 0.42, 1.35);
    cartoonDecor.add(hillRight);

    const treeGroup = new THREE.Group();
    const makeTree = (x, z, trunkColor, leafColor) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.55, 8),
        new THREE.MeshBasicMaterial({ color: trunkColor })
      );
      trunk.position.y = 0.28;
      const crownA = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.44, 10),
        new THREE.MeshBasicMaterial({ color: leafColor, transparent: true, opacity: 0.9 })
      );
      crownA.position.y = 0.66;
      const crownB = crownA.clone();
      crownB.scale.set(0.72, 0.72, 0.72);
      crownB.position.y = 0.88;
      t.add(trunk, crownA, crownB);
      t.position.copy(placeOnExterior(x, z));
      return t;
    };
    const treeA = makeTree(-4.5, -11.0, 0x7c5a32, 0x55cc78);
    const treeB = makeTree(-2.9, -10.8, 0x7c5a32, 0x62d784);
    const treeC = makeTree(3.4, -11.05, 0x7c5a32, 0x55cc78);
    const treeD = makeTree(5.0, -10.85, 0x7c5a32, 0x62d784);
    treeGroup.add(treeA, treeB, treeC, treeD);
    cartoonDecor.add(treeGroup);

    const bushes = new THREE.Group();
    const makeBush = (x, z, color, scale = 1) => {
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 10, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86 })
      );
      b.scale.set(scale, 0.65, scale * 1.2);
      b.position.copy(placeOnExterior(x, z, 0.12));
      return b;
    };
    bushes.add(
      makeBush(-1.2, -8.1, 0x5ed87f, 1.1),
      makeBush(0.8, -8.0, 0x6de28b, 0.95),
      makeBush(-3.2, -8.25, 0x5ad07b, 1.0),
      makeBush(2.8, -8.2, 0x6de28b, 1.05)
    );
    cartoonDecor.add(bushes);

    const flowerDots = new THREE.Group();
    const flowerColors = [0xff79b4, 0xffd35b, 0x8fe6ff, 0xffa67e];
    for (let i = 0; i < 18; i++) {
      const petal = new THREE.Mesh(
        new THREE.CircleGeometry(0.045, 10),
        new THREE.MeshBasicMaterial({ color: flowerColors[i % flowerColors.length], transparent: true, opacity: 0.82 })
      );
      petal.rotation.x = -Math.PI / 2;
      const x = -5 + (i % 9) * 1.25;
      const z = -7.2 - Math.floor(i / 9) * 0.65;
      const p = placeOnExterior(x, z, 0.024);
      petal.position.set(p.x, p.y, p.z);
      flowerDots.add(petal);
    }
    cartoonDecor.add(flowerDots);

    const cloudGroup = new THREE.Group();
    const makeCloud = (x, y, z) => {
      const c = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xe9f6ff, transparent: true, opacity: 0.75 });
      const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), mat);
      const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat);
      const p3 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat);
      p1.position.set(-0.18, 0, 0);
      p2.position.set(0.15, 0.05, 0);
      p3.position.set(0.38, -0.02, 0);
      c.add(p1, p2, p3);
      c.position.set(x, y, z);
      return c;
    };
    const cloudA = makeCloud(-3.8, roomHeight + 4.8, -13.2);
    const cloudB = makeCloud(2.5, roomHeight + 5.4, -12.2);
    cloudGroup.add(cloudA, cloudB);
    cartoonDecor.add(cloudGroup);

    const perimeterCenter = rotateWallXZ(0, -6.0);
    const perimeterMark = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.02, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x71d7ff, transparent: true, opacity: 0.75 })
    );
    perimeterMark.position.set(perimeterCenter.x, 0.03, perimeterCenter.z);
    perimeterMark.rotation.y = wallAngle;
    house.add(perimeterMark);

    const upperHeight = 6.0;
    const totalHeight = roomHeight + upperHeight;
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x8ccfff, transparent: true, opacity: 0.14, wireframe: true });
    const roomShell = new THREE.Mesh(new THREE.BoxGeometry(12, roomHeight, 12), wallMaterial);
    roomShell.position.y = roomHeight / 2;
    house.add(roomShell);

    const secondFloorShell = new THREE.Mesh(
      new THREE.BoxGeometry(12, upperHeight, 12),
      new THREE.MeshBasicMaterial({ color: 0x96bfff, transparent: true, opacity: 0.16, wireframe: true })
    );
    secondFloorShell.position.y = roomHeight + upperHeight / 2;
    house.add(secondFloorShell);

    const windowWallGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(12.1, roomHeight + 0.25),
      new THREE.MeshBasicMaterial({ color: 0x6ed0ff, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
    );
    const glowPos = rotateWallXZ(0, -5.94);
    windowWallGlow.position.set(glowPos.x, (roomHeight + 0.125) / 2, glowPos.z);
    windowWallGlow.rotation.y = wallAngle;
    house.add(windowWallGlow);

    const windowWallFrame = new THREE.Mesh(
      new THREE.BoxGeometry(7.95, roomHeight + 0.08, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x9ee8ff, transparent: true, opacity: 0.28 })
    );
    const framePos = rotateWallXZ(0, -5.92);
    windowWallFrame.position.set(framePos.x, roomHeight / 2 - 0.02, framePos.z);
    windowWallFrame.rotation.y = wallAngle;
    house.add(windowWallFrame);

    const windowMullions = new THREE.Group();
    const mullionMat = new THREE.MeshBasicMaterial({ color: 0xd9f5ff, transparent: true, opacity: 0.64 });
    for (let i = -2; i <= 2; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, roomHeight - 0.2, 0.06), mullionMat);
      const stripPos = rotateWallXZ(i * 1.3, -5.86);
      strip.position.set(stripPos.x, roomHeight / 2 - 0.02, stripPos.z);
      strip.rotation.y = wallAngle;
      windowMullions.add(strip);
    }
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.05, 0.05), mullionMat);
      const bandPos = rotateWallXZ(0, -5.86);
      band.position.set(bandPos.x, 2.0 + i * 2.2, bandPos.z);
      band.rotation.y = wallAngle;
      windowMullions.add(band);
    }
    house.add(windowMullions);

    const secondFloorPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ color: 0x7baeff, transparent: true, opacity: 0.3, wireframe: true })
    );
    secondFloorPlate.rotation.x = -Math.PI / 2;
    secondFloorPlate.position.y = roomHeight + 0.02;
    house.add(secondFloorPlate);

    const roofPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({ color: 0x9fd1ff, transparent: true, opacity: 0.26, wireframe: true })
    );
    roofPlate.rotation.x = -Math.PI / 2;
    roofPlate.position.y = totalHeight;
    house.add(roofPlate);

    const topWall = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.05, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x8ad7ff, transparent: true, opacity: 0.95 })
    );
    const topWallPos = rotateWallXZ(0, -6);
    topWall.position.set(topWallPos.x, roomHeight - 0.02, topWallPos.z);
    topWall.rotation.y = wallAngle;
    house.add(topWall);

    const windowWall = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 0.12, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.65 })
    );
    const windowWallPos = rotateWallXZ(0, -5.92);
    windowWall.position.set(windowWallPos.x, roomHeight - 0.02, windowWallPos.z);
    windowWall.rotation.y = wallAngle;
    house.add(windowWall);

    const upperWindowWall = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 0.12, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x7fbfff, transparent: true, opacity: 0.42 })
    );
    const upperWallPos = rotateWallXZ(0, -5.92);
    upperWindowWall.position.set(upperWallPos.x, roomHeight + 0.05, upperWallPos.z);
    upperWindowWall.rotation.y = wallAngle;
    house.add(upperWindowWall);

    const sensorMaterialA = new THREE.MeshBasicMaterial({ color: 0x36d2ff });
    const sensorMaterialB = new THREE.MeshBasicMaterial({ color: 0xffad45 });
    const sensorA = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), sensorMaterialA);
    const sensorB = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), sensorMaterialB);
    const sensorAPos = rotateWallXZ(-5.4, -5.8);
    const sensorBPos = rotateWallXZ(5.4, -5.8);
    sensorA.position.set(sensorAPos.x, roomHeight - 0.2, sensorAPos.z);
    sensorB.position.set(sensorBPos.x, roomHeight - 0.2, sensorBPos.z);
    house.add(sensorA, sensorB);

    const confirmBubbleMatA = new THREE.MeshBasicMaterial({ color: 0xff5c5c, transparent: true, opacity: 0.065, wireframe: true });
    const confirmBubbleMatB = new THREE.MeshBasicMaterial({ color: 0xff5c5c, transparent: true, opacity: 0.065, wireframe: true });
    const confirmBubbleA = new THREE.Mesh(new THREE.SphereGeometry(CONFIRM_RADIUS_FT + 2.5, 36, 24), confirmBubbleMatA);
    const confirmBubbleB = new THREE.Mesh(new THREE.SphereGeometry(CONFIRM_RADIUS_FT + 2.5, 36, 24), confirmBubbleMatB);
    confirmBubbleA.position.copy(sensorA.position);
    confirmBubbleB.position.copy(sensorB.position);
    house.add(confirmBubbleA, confirmBubbleB);
    confirmBubbleA.visible = false;
    confirmBubbleB.visible = false;

    const sweepMatA = new THREE.MeshBasicMaterial({ color: 0x66f3ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const sweepMatB = new THREE.MeshBasicMaterial({ color: 0x66f3ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const sweepA = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.64, 64), sweepMatA);
    const sweepB = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.64, 64), sweepMatB);
    sweepA.rotation.x = Math.PI / 2;
    sweepB.rotation.x = Math.PI / 2;
    sweepA.position.copy(sensorA.position);
    sweepB.position.copy(sensorB.position);
    house.add(sweepA, sweepB);
    sweepA.visible = false;
    sweepB.visible = false;

    const groundProjectionRadius = Math.sqrt(Math.max(0.1, CONFIRM_RADIUS_FT * CONFIRM_RADIUS_FT - roomHeight * roomHeight));
    const longRangeRingA = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.15, groundProjectionRadius - 0.16), groundProjectionRadius + 0.16, 96),
      new THREE.MeshBasicMaterial({ color: 0x8ad7ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
    );
    const longRangeRingB = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.15, groundProjectionRadius - 0.16), groundProjectionRadius + 0.16, 96),
      new THREE.MeshBasicMaterial({ color: 0x8ad7ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
    );
    longRangeRingA.rotation.x = Math.PI / 2;
    longRangeRingB.rotation.x = Math.PI / 2;
    longRangeRingA.position.set(sensorA.position.x, 0.03, sensorA.position.z);
    longRangeRingB.position.set(sensorB.position.x, 0.03, sensorB.position.z);
    house.add(longRangeRingA, longRangeRingB);
    longRangeRingA.visible = false;
    longRangeRingB.visible = false;

    const spectrumBubbleMatA = new THREE.MeshBasicMaterial({ color: 0x50b8ff, transparent: true, opacity: 0.0, wireframe: true });
    const spectrumBubbleMatB = new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.0, wireframe: true });
    const spectrumBubbleA = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 22), spectrumBubbleMatA);
    const spectrumBubbleB = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 22), spectrumBubbleMatB);
    spectrumBubbleA.position.copy(sensorA.position);
    spectrumBubbleB.position.copy(sensorB.position);
    house.add(spectrumBubbleA, spectrumBubbleB);
    spectrumBubbleA.visible = false;
    spectrumBubbleB.visible = false;

    const laserMatA = new THREE.LineBasicMaterial({ color: 0xff2b2b, transparent: true, opacity: 0.0 });
    const laserMatB = new THREE.LineBasicMaterial({ color: 0xff2b2b, transparent: true, opacity: 0.0 });
    const laserA = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), laserMatA);
    const laserB = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), laserMatB);
    scene.add(laserA, laserB);

    const trackedAvatar = new THREE.Group();
    const avatarBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 0.58, 12),
      new THREE.MeshBasicMaterial({ color: 0xff9d66, transparent: true, opacity: 0.95 })
    );
    avatarBody.position.y = 0.55;
    const avatarHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd5be, transparent: true, opacity: 0.95 })
    );
    avatarHead.position.y = 1.02;
    trackedAvatar.add(avatarBody, avatarHead);
    trackedAvatar.visible = false;
    scene.add(trackedAvatar);

    const dogWalker = new THREE.Group();
    const walkerBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.44, 10),
      new THREE.MeshBasicMaterial({ color: 0x85d8ff, transparent: true, opacity: 0.9 })
    );
    walkerBody.position.y = 0.48;
    const walkerHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xe9f7ff, transparent: true, opacity: 0.9 })
    );
    walkerHead.position.y = 0.85;
    const dogBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.18, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xb09a7d, transparent: true, opacity: 0.95 })
    );
    dogBody.position.set(0.28, 0.11, 0);
    const leash = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.52, 0), new THREE.Vector3(0.2, 0.22, 0)]),
      new THREE.LineBasicMaterial({ color: 0xf5f5f5, transparent: true, opacity: 0.8 })
    );
    dogWalker.add(walkerBody, walkerHead, dogBody, leash);
    dogWalker.visible = false;
    scene.add(dogWalker);

    const golfCart = new THREE.Group();
    const cartBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.22, 0.42),
      new THREE.MeshBasicMaterial({ color: 0x95f0bc, transparent: true, opacity: 0.9 })
    );
    cartBody.position.y = 0.2;
    const cartRoof = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.05, 0.42),
      new THREE.MeshBasicMaterial({ color: 0xd9fff0, transparent: true, opacity: 0.9 })
    );
    cartRoof.position.y = 0.5;
    const wheelMat = new THREE.MeshBasicMaterial({ color: 0x1e2d30 });
    const wheel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), wheelMat);
    const wheel2 = wheel1.clone();
    const wheel3 = wheel1.clone();
    const wheel4 = wheel1.clone();
    [wheel1, wheel2, wheel3, wheel4].forEach((w) => { w.rotation.z = Math.PI / 2; });
    wheel1.position.set(-0.25, 0.07, -0.18);
    wheel2.position.set(0.25, 0.07, -0.18);
    wheel3.position.set(-0.25, 0.07, 0.18);
    wheel4.position.set(0.25, 0.07, 0.18);
    golfCart.add(cartBody, cartRoof, wheel1, wheel2, wheel3, wheel4);
    golfCart.visible = false;
    scene.add(golfCart);

    const cartPilot = new THREE.Group();
    const pilotBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.28, 10),
      new THREE.MeshBasicMaterial({ color: 0xffba88, transparent: true, opacity: 0.95 })
    );
    const pilotHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe0c9, transparent: true, opacity: 0.95 })
    );
    pilotBody.position.y = 0.38;
    pilotHead.position.y = 0.58;
    cartPilot.add(pilotBody, pilotHead);
    cartPilot.visible = false;
    scene.add(cartPilot);

    const cartLaser = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xff4da6, transparent: true, opacity: 0.0 })
    );
    cartLaser.visible = false;
    scene.add(cartLaser);

    const trackManager = new TrackManager({ scene, sensorA, sensorB, roomHeight });
    state.three = {
      scene,
      camera,
      renderer,
      house,
      sensorA,
      sensorB,
      roomHeight,
      totalHeight,
      trackManager,
      confirmBubbleA,
      confirmBubbleB,
      spectrumBubbleA,
      spectrumBubbleB,
      laserA,
      laserB,
      sweepA,
      sweepB,
      longRangeRingA,
      longRangeRingB,
      trackedAvatar,
      dogWalker,
      golfCart,
      cartPilot,
      cartLaser,
      cartoonDecor,
      treeGroup,
      cloudGroup,
      flowerDots,
    };

    window.addEventListener("resize", () => {
      if (!state.three) return;
      const w = threeStage.clientWidth || canvas.width;
      const h = threeStage.clientHeight || canvas.height;
      state.three.camera.aspect = w / h;
      state.three.camera.updateProjectionMatrix();
      state.three.renderer.setSize(w, h, false);
    });

    return state.three;
  }

  function updateThreeScene(nowMs) {
    if (!state.three) return;

    const {
      scene,
      camera,
      renderer,
      roomHeight,
      totalHeight,
      sensorA,
      sensorB,
      trackManager,
      confirmBubbleA,
      confirmBubbleB,
      spectrumBubbleA,
      spectrumBubbleB,
      laserA,
      laserB,
      sweepA,
      sweepB,
      longRangeRingA,
      longRangeRingB,
      trackedAvatar,
      dogWalker,
      golfCart,
      cartPilot,
      cartLaser,
      cartoonDecor,
      treeGroup,
      cloudGroup,
      flowerDots,
    } = state.three;
    camera.lookAt(0, 4.2, -8.2);

    // Light environmental motion so the scene feels alive but not noisy.
    if (treeGroup) {
      treeGroup.children.forEach((tree, idx) => {
        tree.rotation.z = Math.sin(nowMs * 0.0011 + idx * 0.8) * 0.045;
      });
    }
    if (cloudGroup) {
      cloudGroup.children.forEach((cloud, idx) => {
        cloud.position.x += Math.sin(nowMs * 0.00012 + idx) * 0.0009;
      });
    }
    if (flowerDots) {
      flowerDots.children.forEach((dot, idx) => {
        dot.material.opacity = 0.68 + Math.sin(nowMs * 0.002 + idx * 0.45) * 0.12;
      });
    }
    if (cartoonDecor) {
      cartoonDecor.visible = true;
    }

    const px = (state.point.x / ROOM_W_FT) * 12 - 6;
    const pz = 6 - (state.point.y / ROOM_H_FT) * 12;
    const py = clamp(Number.isFinite(state.zEstimate) ? state.zEstimate : 4.5, 0.15, totalHeight - 0.2);

    sensorA.material.color.set(activityColor(state.boardStatus.A));
    sensorB.material.color.set(activityColor(state.boardStatus.B));

    const measurement = {
      active: state.trackingEnabled && state.isLocked && (state.confidence >= LOCK_IN || !!state.directLock),
      position: new THREE.Vector3(px, py, pz),
      confidence: state.confidence,
      classification: state.spatialClass,
      detectedBy: state.directLock
        ? `ESP32-${state.directLock.sensor}`
        : state.ownership.active === "A"
          ? "ESP32-A"
          : state.ownership.active === "B"
            ? "ESP32-B"
            : "ESP32-A + ESP32-B",
      distanceFt: state.directLock
        ? state.directLock.rangeFt
        : state.ownership.active === "A"
          ? state.filteredDistances.A
          : state.ownership.active === "B"
            ? state.filteredDistances.B
            : Math.min(state.filteredDistances.A, state.filteredDistances.B),
      stillAnchor: !!state.stillAnchor,
      zone: state.currentZone,
      directLock: !!state.directLock,
      fusionLock: state.fusionLock,
      lockSource: state.directLock
        ? `ESP32-${state.directLock.sensor}`
        : state.ownership.active === "A"
          ? "ESP32-A"
          : state.ownership.active === "B"
            ? "ESP32-B"
            : "ESP32-A + ESP32-B",
      lockReason: state.directLock ? state.directLock.reason : "",
    };
    const sensorInput = {
      signalA: state.signal.A,
      signalB: state.signal.B,
      noise: state.wave,
      statusA: state.boardStatus.A,
      statusB: state.boardStatus.B,
    };
    trackManager.update(measurement, sensorInput, nowMs);
    const summary = trackManager.getPrimarySummary();
    state.trackView = { id: summary.id, state: summary.state, confidence: summary.confidence };
    const renderState = trackManager.getRenderState();
    state.trackDiagnostics = renderState;

    // Research overlays disabled in production monitoring mode.
    spectrumBubbleA.visible = false;
    spectrumBubbleB.visible = false;
    confirmBubbleA.visible = false;
    confirmBubbleB.visible = false;
    sweepA.visible = false;
    sweepB.visible = false;
    longRangeRingA.visible = false;
    longRangeRingB.visible = false;
    const quadrantColor = quadrantLaserColor(state.point, state.spatialClass);
    laserA.material.color.setHex(quadrantColor);
    laserB.material.color.setHex(quadrantColor);

    if (renderState.laser.target) {
      laserA.visible = renderState.laser.aVisible;
      laserB.visible = renderState.laser.bVisible;
      if (renderState.laser.aVisible) {
        laserA.geometry.setFromPoints([sensorA.position.clone(), renderState.laser.target.clone()]);
        laserA.material.opacity = renderState.laser.aOpacity;
      } else {
        laserA.material.opacity = 0;
      }
      if (renderState.laser.bVisible) {
        laserB.geometry.setFromPoints([sensorB.position.clone(), renderState.laser.target.clone()]);
        laserB.material.opacity = renderState.laser.bOpacity;
      } else {
        laserB.material.opacity = 0;
      }
    } else {
      laserA.visible = false;
      laserB.visible = false;
      laserA.material.opacity = 0;
      laserB.material.opacity = 0;
    }

    if (renderState.laser.target && renderState.primaryTrack) {
      trackedAvatar.visible = true;
      trackedAvatar.position.copy(renderState.laser.target);
      const cls = String(renderState.primaryTrack.classification || "UNKNOWN").toUpperCase();
      const avatarHeight = cls === "TOPSIDE" ? 1.45 : cls === "FLOOR_LEVEL" ? 0.72 : 1.15;
      trackedAvatar.scale.set(1, avatarHeight, 1);
      trackedAvatar.rotation.y = Math.sin(nowMs * 0.0023) * 0.35;
    } else {
      trackedAvatar.visible = false;
    }

    const outsideActive = state.spatialClass === "window_perimeter" || state.spatialClass === "outside";
    if (outsideActive) {
      const t = nowMs * 0.001;
      dogWalker.visible = true;
      golfCart.visible = true;
      dogWalker.position.set(-2.2 + Math.sin(t * 0.65) * 3.2, 0.04, -9.6 + Math.cos(t * 0.6) * 0.6);
      dogWalker.rotation.y = Math.sin(t * 0.35) * 0.4;

      // Cart traversal sim: slow pass from board A side to board B side.
      const passPhase = (t * 0.045) % 1;
      const passX = -4.9 + passPhase * 9.8;
      const passZ = -9.9 + Math.sin(t * 0.4) * 0.35;
      golfCart.position.set(passX, 0.02, passZ);
      golfCart.rotation.y = 0.18 + Math.sin(t * 0.35) * 0.08;

      cartPilot.visible = true;
      cartPilot.position.set(passX + 0.08, 0.02, passZ);
      cartPilot.rotation.y = golfCart.rotation.y;

      const dA = sensorA.position.distanceTo(golfCart.position);
      const dB = sensorB.position.distanceTo(golfCart.position);
      const sourceSensor = dA <= dB ? sensorA : sensorB;
      const cartQuadrantColor = quadrantLaserColor(
        {
          x: ((golfCart.position.x + 6) / 12) * ROOM_W_FT,
          y: ROOM_H_FT - ((golfCart.position.z + 6) / 12) * ROOM_H_FT,
        },
        "window_perimeter"
      );
      cartLaser.visible = true;
      cartLaser.material.opacity = 0.88;
      cartLaser.material.color.setHex(cartQuadrantColor);
      cartLaser.geometry.setFromPoints([
        sourceSensor.position.clone(),
        new THREE.Vector3(cartPilot.position.x, cartPilot.position.y + 0.58, cartPilot.position.z),
      ]);

      // Sensor ping highlight when cart is in local range.
      if (dA < 3.0) sensorA.material.color.set(0xff4da6);
      if (dB < 3.0) sensorB.material.color.set(0xff4da6);
    } else {
      dogWalker.visible = false;
      golfCart.visible = false;
      cartPilot.visible = false;
      cartLaser.visible = false;
      cartLaser.material.opacity = 0;
    }
    if (summary.id !== "--" && (summary.state !== state.lastTrackState || summary.classification !== state.lastTrackClassification)) {
      const descriptor = classificationDescriptor(summary.classification);
      pushEventThrottled(
        `track-${summary.id}-${summary.state}-${summary.classification}`,
        `TRACK ${summary.id} ${descriptor.eventLabel}`,
        nowMs,
        `${summary.classification.toUpperCase()} ${(summary.confidence * 100).toFixed(0)}%`,
        1200
      );
      state.lastTrackState = summary.state;
      state.lastTrackClassification = summary.classification;
      if (summary.state === "TRACKING" || summary.state === "ANCHORED" || summary.state === "DIRECT_LOCK" || summary.state === "FUSION_LOCK") {
        showConfirmationBanner({
          sensorId: renderState.primaryTrack?.lockSource || (renderState.sensorA.locked && renderState.sensorB.locked ? "ESP32-A + ESP32-B" : renderState.sensorA.locked ? "ESP32-A" : renderState.sensorB.locked ? "ESP32-B" : "UNKNOWN"),
          distance: renderState.sensorA.locked && Number.isFinite(renderState.sensorA.distanceFt)
            ? renderState.sensorA.distanceFt
            : renderState.sensorB.locked && Number.isFinite(renderState.sensorB.distanceFt)
              ? renderState.sensorB.distanceFt
              : renderState.primaryTrack?.distanceFt,
          zone: summary.classification,
          classification: summary.classification,
        });
      }
    }

    renderer.render(scene, camera);
  }

  function roomToScene(point) {
    const px = (point.x / ROOM_W_FT) * 2 - 1;
    const py = (point.y / ROOM_H_FT) * 2 - 1;
    const perspective = 1 - 0.12 * (point.y / ROOM_H_FT);
    return {
      x: px * 280 * perspective,
      y: py * 180 * perspective,
    };
  }

  function drawSkeletonHouse() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#07111e";
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.56;
    const cy = h * 0.57;
    const roomW = 430;
    const roomH = 300;
    const roofH = 130;
    const left = cx - roomW * 0.5;
    const right = cx + roomW * 0.5;
    const top = cy - roomH * 0.5;
    const bottom = cy + roomH * 0.5;
    const roofTop = top - roofH;

    ctx.strokeStyle = "rgba(124, 183, 255, 0.32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(cx, roofTop);
    ctx.lineTo(right, top);
    ctx.stroke();

    ctx.strokeStyle = "rgba(140, 205, 255, 0.55)";
    ctx.strokeRect(left, top, roomW, roomH);

    ctx.strokeStyle = "rgba(108, 255, 190, 0.25)";
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 6; i++) {
      const x = left + (roomW / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    for (let i = 1; i < 5; i++) {
      const y = top + (roomH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    const windowLeft = left + roomW * 0.26;
    const windowRight = left + roomW * 0.74;
    ctx.strokeStyle = "rgba(122, 202, 255, 0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(windowLeft, top + 2);
    ctx.lineTo(windowRight, top + 2);
    ctx.stroke();

    // Crown molding / sensor plane.
    const sensorA = roomToScene({ x: 1.2, y: ROOM_H_FT });
    const sensorB = roomToScene({ x: 10.8, y: ROOM_H_FT });
    ctx.fillStyle = "rgba(255, 221, 120, 0.9)";
    ctx.beginPath();
    ctx.arc(left + 45, roofTop + 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(right - 45, roofTop + 24, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(220,235,255,0.72)";
    ctx.font = "12px sans-serif";
    ctx.fillText("SENSOR A", left + 18, roofTop + 18);
    ctx.fillText("SENSOR B", right - 78, roofTop + 18);

    // Production skeleton-only view (no furniture clutter).

    return { left, top, right, bottom, roofTop, cx, cy, roomW, roomH };
  }

  function drawScenePoint(scene, point, color, radius = 10, alpha = 1) {
    const p = roomToScene(point);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(scene.cx + p.x, scene.cy + p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function isInsideZone(zone) {
    return String(zone || "").startsWith("inside") || String(zone || "").startsWith("interior_room");
  }

  function isOutsideZone(zone) {
    return String(zone || "").startsWith("outside") || String(zone || "").startsWith("window_perimeter");
  }

  function updateBoardStatus() {
    const sum = state.signal.A + state.signal.B;
    const ownershipDom = state.ownership?.active || "none";
    const dom = ownershipDom !== "none"
      ? ownershipDom
      : sum > 1e-6
        ? (state.signal.A > state.signal.B * 1.06 ? "A" : state.signal.B > state.signal.A * 1.06 ? "B" : "both")
        : "none";
    state.dominantBoard = dom;

    const outside = state.currentZone.startsWith("outside") || state.currentZone.startsWith("window_perimeter");
    const nearA = state.filteredDistances.A <= TOPSIDE_NEAR_FT;
    const nearB = state.filteredDistances.B <= TOPSIDE_NEAR_FT;

    const activeA = state.signal.A >= 0.10;
    const activeB = state.signal.B >= 0.10;

    state.boardStatus.A = nearA && activeA ? "topside" : outside && (dom === "A" || dom === "both") && activeA ? "outside" : activeA ? "inside" : "quiet";
    state.boardStatus.B = nearB && activeB ? "topside" : outside && (dom === "B" || dom === "both") && activeB ? "outside" : activeB ? "inside" : "quiet";

    const vm = state.verticalModel;
    const signalLift = clamp((state.signal.total - vm.groundSignalRef) / 0.65, -0.8, 1.4);
    const waveLift = clamp((state.wave - vm.groundWaveRef) / 0.45, -0.8, 1.2);
    vm.upScore = clamp(signalLift * 0.68 + waveLift * 0.32, -1, 1.4);
    const weightedZ = clamp(
      1.0 + (vm.upScore + 0.1) * (TOPSIDE_MONITOR_Z_MAX_FT - 1.0) * 0.52,
      ROOM_Z_MIN_FT - 1.2,
      TOPSIDE_MONITOR_Z_MAX_FT
    );
    state.zEstimate = weightedZ;
  }

  function estimateDirectLockPoint(sensorName, rangeFt) {
    const sensor = sensorName === "A" ? boardA : boardB;
    const center = { x: ROOM_W_FT * 0.5, y: ROOM_H_FT * 0.5 };
    const vx = center.x - sensor.x;
    const vy = center.y - sensor.y;
    const m = Math.hypot(vx, vy) || 1;
    const ux = vx / m;
    const uy = vy / m;
    return {
      x: clamp(sensor.x + ux * rangeFt, WORLD_MIN_X_FT, WORLD_MAX_X_FT),
      y: clamp(sensor.y + uy * rangeFt, WORLD_MIN_Y_FT - 1.5, WORLD_MAX_Y_FT + 1.5),
    };
  }

  function boxMuller() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function updateSimulation(nowMs) {
    if (!state.sim.running) return;
    const t = (nowMs * 0.001) * state.sim.speed;

    // Real-time motion loop for overlap vs edge testing.
    const tx = ROOM_W_FT / 2 + Math.cos(t * 0.72) * 3.1 + Math.cos(t * 1.7) * 0.55;
    const ty = ROOM_H_FT / 2 + Math.sin(t * 0.94) * 2.5 + Math.sin(t * 1.35) * 0.45;
    state.sim.truePoint.x = clamp(tx, 0.7, ROOM_W_FT - 0.7);
    state.sim.truePoint.y = clamp(ty, 0.7, ROOM_H_FT - 0.7);

    const noiseA = boxMuller() * state.sim.noiseFt;
    const noiseB = boxMuller() * state.sim.noiseFt;
    const dA = Math.hypot(state.sim.truePoint.x - boardA.x, state.sim.truePoint.y - boardA.y);
    const dB = Math.hypot(state.sim.truePoint.x - boardB.x, state.sim.truePoint.y - boardB.y);

    state.distances.A = clamp(dA + noiseA, 0.5, SENSOR_RANGE_FT);
    state.distances.B = clamp(dB + noiseB, 0.5, SENSOR_RANGE_FT);
    distAInput.value = state.distances.A.toFixed(1);
    distBInput.value = state.distances.B.toFixed(1);
  }

  function trilaterate2D(a, b, rA, rB, prevPoint) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= 1e-9) return null;

    if (rA + rB < d || Math.abs(rA - rB) > d) {
      return null;
    }

    const ex = { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
    const x = (rA * rA - rB * rB + d * d) / (2 * d);
    const y2 = rA * rA - x * x;
    const y = y2 > 0 ? Math.sqrt(y2) : 0;
    const ey = { x: -ex.y, y: ex.x };

    const p1 = { x: a.x + x * ex.x + y * ey.x, y: a.y + x * ex.y + y * ey.y };
    const p2 = { x: a.x + x * ex.x - y * ey.x, y: a.y + x * ex.y - y * ey.y };

    if (!prevPoint) return p1;
    const d1 = Math.hypot(p1.x - prevPoint.x, p1.y - prevPoint.y);
    const d2 = Math.hypot(p2.x - prevPoint.x, p2.y - prevPoint.y);
    return d1 <= d2 ? p1 : p2;
  }

  function enforceFeasibleDistances() {
    const d = Math.hypot(boardB.x - boardA.x, boardB.y - boardA.y);
    let a = clamp(state.distances.A, 0.5, SENSOR_RANGE_FT);
    let b = clamp(state.distances.B, 0.5, SENSOR_RANGE_FT);

    // Keep minimal floor only; do not force center bias.
    const minPractical = 0.8;
    a = Math.max(a, minPractical);
    b = Math.max(b, minPractical);

    const sum = a + b;
    const diff = Math.abs(a - b);

    if (sum < d) {
      const boost = (d - sum) * 0.5 + 0.05;
      a += boost;
      b += boost;
    }

    if (diff > d - 0.05) {
      const avg = (a + b) * 0.5;
      const maxDelta = (d - 0.05) * 0.5;
      a = avg - maxDelta;
      b = avg + maxDelta;
    }

    state.distances.A = clamp(a, 0.5, SENSOR_RANGE_FT);
    state.distances.B = clamp(b, 0.5, SENSOR_RANGE_FT);
  }

  function detectZone(point) {
    if (point.y >= ROOM_H_FT - 0.2) return "outside near window";
    if (point.y > ROOM_H_FT - 1.6) return "window_perimeter";
    if (point.y < 2.0) return "interior_room opposite wall";
    return "interior_room center";
  }

  function refreshSpatialClass() {
    const spatialTarget = {
      confidence: state.confidence,
      z: Number.isFinite(state.zEstimate) ? state.zEstimate : ROOM_VOLUME_Z_MAX_FT,
      zone: state.currentZone,
    };
    const spatialClass = classifyEvent(spatialTarget);
    state.spatialClass = state.stillAnchor ? "anchored" : spatialClass;
  }

  function updateModeButtons() {
    modeSimBtn.classList.toggle("active", state.mode === "simulation");
    modeBridgeBtn.classList.toggle("active", state.mode === "bridge");
    const isBridge = state.mode === "bridge";
    simControls.forEach((el) => {
      el.disabled = isBridge;
      if (el.parentElement) {
        el.parentElement.classList.toggle("sim-controls-disabled", isBridge && el === simRunBtn);
      }
    });
  }

  function updateMonitorStatus(nowMs) {
    const armedStable = state.monitorArmed && nowMs - state.monitorArmedAtMs >= ARM_SETTLE_MS;
    const occupiedNow = armedStable && state.trackingEnabled && state.signal.total >= PRESENCE_GATE_BRIDGE && state.spatialClass !== "clear" && state.isLocked;
    if (occupiedNow) {
      state.pendingClearSinceMs = 0;
      if (!state.occupiedSinceMs) {
        if (!state.pendingOccupiedSinceMs) state.pendingOccupiedSinceMs = nowMs;
        if (nowMs - state.pendingOccupiedSinceMs >= ENTRY_CONFIRM_MS) {
          state.occupiedSinceMs = nowMs;
          state.pendingOccupiedSinceMs = 0;
          pushEvent("ENTRY DETECTED", nowMs, `Zone ${state.currentZone}`);
        }
      }
    } else {
      state.pendingOccupiedSinceMs = 0;
      if (state.occupiedSinceMs) {
        if (!state.pendingClearSinceMs) state.pendingClearSinceMs = nowMs;
        if (nowMs - state.pendingClearSinceMs >= EXIT_CONFIRM_MS) {
          state.occupiedSinceMs = 0;
          state.pendingClearSinceMs = 0;
          pushEvent("EXIT DETECTED", nowMs, `Zone ${state.previousZone}`);
        }
      }
    }

    const occupied = !!state.occupiedSinceMs;
    if (occupied && state.currentZone !== state.previousZone) {
      const prev = state.previousZone;
      state.previousZone = state.currentZone;
      if (prev !== "unknown" && state.currentZone !== "unknown") {
        pushEventThrottled(
          "zone-shift",
          `ZONE ${state.currentZone.toUpperCase()}`,
          nowMs,
          `Confidence ${(state.confidence * 100).toFixed(0)}%`,
          2400
        );
      }
    } else if (!occupied) {
      state.previousZone = state.currentZone;
    }

    if (occupied && state.dominantBoard !== state.previousDominantBoard) {
      if (state.previousDominantBoard === "A" && state.dominantBoard === "B") {
        pushEventThrottled("cross-a-b", "TRACK CROSSED A -> B", nowMs, `Dominant board ${state.dominantBoard}`, 2500);
      } else if (state.previousDominantBoard === "B" && state.dominantBoard === "A") {
        pushEventThrottled("cross-b-a", "TRACK CROSSED B -> A", nowMs, `Dominant board ${state.dominantBoard}`, 2500);
      }
      state.previousDominantBoard = state.dominantBoard;
    }

    if (occupied && (state.boardStatus.A === "outside" || state.boardStatus.B === "outside")) {
      const b = state.boardStatus.A === "outside" ? "A" : "B";
      pushEventThrottled(`outside-${b}`, `OUTSIDE MOTION BOARD ${b}`, nowMs, `Signal ${(state.signal[b] * 100).toFixed(0)}%`, 3200);
    }

    if (occupied && (state.boardStatus.A === "topside" || state.boardStatus.B === "topside")) {
      const b = state.boardStatus.A === "topside" ? "A" : "B";
      pushEventThrottled(`topside-${b}`, `TOPSIDE MOTION BOARD ${b}`, nowMs, `Signal ${(state.signal[b] * 100).toFixed(0)}%`, 3200);
    }

    if (occupied && state.spatialClass === "floor_level") {
      pushEventThrottled("floor-level", "FLOOR LEVEL MOTION", nowMs, `Confidence ${(state.confidence * 100).toFixed(0)}%`, 2800);
    }

    if (occupied && state.spatialClass === "window_perimeter") {
      pushEventThrottled("window-perimeter", "WINDOW PERIMETER MOTION", nowMs, `Confidence ${(state.confidence * 100).toFixed(0)}%`, 2800);
    }

    if (occupied) {
      if (state.stillAnchor) {
        if (state.movementLabel !== "stationary") pushEvent("TARGET STATIONARY", nowMs, `Hold ${((nowMs - state.stillSinceMs) / 1000).toFixed(1)}s`);
        state.movementLabel = "stationary";
        state.entityClass = "anchored";
      } else if (state.speedEma > 0.34) {
        if (state.movementLabel !== "walking") pushEventThrottled("moving", "TARGET MOVING", nowMs, `Speed ${state.speedEma.toFixed(2)} ft/s`, 2800);
        state.movementLabel = "walking";
        state.entityClass = isOutsideZone(state.currentZone) ? "exterior" : "interior";
      } else {
        state.movementLabel = "slowing";
        state.entityClass = isOutsideZone(state.currentZone) ? "exterior" : isInsideZone(state.currentZone) ? "interior" : "searching";
      }
    } else {
      state.movementLabel = "none";
      state.entityClass = "none";
    }

    const statusText = !state.monitorArmed
      ? "CALIBRATING"
      : state.mode === "bridge" && state.topsideQualified && state.targetQualified
        ? "CEILING BREACH WATCH"
      : state.mode === "bridge" && !state.zoneQualified
        ? "ZONE QUALIFY"
      : state.mode === "bridge" && !state.targetQualified
        ? "TARGET FILTERED"
      : state.spatialClass === "clear"
        ? "CLEAR"
        : state.spatialClass === "topside"
          ? "ALERT"
          : state.spatialClass === "floor_level"
            ? "FLOOR WATCH"
            : state.spatialClass === "window_perimeter"
              ? "PERIMETER WATCH"
          : "ACTIVE";
    gadgetBannerEl.textContent = state.spatialClass === "clear"
      ? "COMMAND STATION ONLINE"
      : !state.monitorArmed
        ? "CALIBRATION IN PROGRESS"
        : state.mode === "bridge" && state.topsideQualified && state.targetQualified
          ? "ABOVE CEILING MONITOR LOCK"
        : state.mode === "bridge" && !state.zoneQualified
          ? "WINDOW ZONE QUALIFYING"
        : state.mode === "bridge" && !state.targetQualified
          ? "FILTERED: NON-HUMAN MOTION"
        : state.spatialClass === "topside"
          ? "TOPSIDE ALERT ACTIVE"
          : state.spatialClass === "floor_level"
            ? "FLOOR WATCH ACTIVE"
            : state.spatialClass === "window_perimeter"
              ? "WINDOW PERIMETER WATCH"
              : state.spatialClass === "outside"
                ? "EXTERIOR MOTION TRACKED"
                : state.spatialClass === "anchored"
                  ? "TRACK ANCHORED"
                  : "TRACKING ACTIVE";
    monitorOccupancyEl.textContent = `System Status: ${statusText}`;
    const count = state.trackingEnabled && state.spatialClass !== "clear" ? 1 : 0;
    const currentClass = state.trackDiagnostics?.primaryTrack?.classificationTitle || state.trackView.state;
    monitorTrackingEl.textContent = `Track ${state.trackView.id} | ${currentClass} | Count: ${count}`;
    monitorMovementEl.textContent = `Motion Class: ${state.trackingEnabled ? state.spatialClass : "standby"}`;
    monitorZoneEl.textContent = `Current Zone: ${state.currentZone}`;
    monitorTimeEl.textContent = `Time in room: ${state.occupiedSinceMs ? fmtElapsed(nowMs - state.occupiedSinceMs) : "00:00"}`;
    monitorLastEventEl.textContent = `Last event: ${state.lastEventLabel}`;

    const diag = state.trackDiagnostics;
    const track = diag?.primaryTrack;
    if (!track) {
      trackCardIdEl.textContent = "Track: --";
      trackCardStateEl.textContent = "State: CLEAR";
      trackCardPosEl.textContent = "Position: X -- | Y -- | Z --";
      trackCardConfEl.textContent = "Confidence: 0%";
      trackCardAEl.textContent = "ESP32-A: SEARCHING | Distance: --";
      trackCardBEl.textContent = "ESP32-B: SEARCHING | Distance: --";
      trackCardVolumeEl.textContent = "15 FT Volume: --";
      trackCardFirstSeenEl.textContent = "First Seen: --";
      trackCardEnteredEl.textContent = "Entered Zone: --";
      trackCardStoppedEl.textContent = "Stopped: --";
      trackCardDurationEl.textContent = "Duration: 00:00";
      if (acqStateEl) acqStateEl.textContent = "State: searching";
      if (acqSensorEl) acqSensorEl.textContent = "Sensor Source: --";
      if (acqDistanceEl) acqDistanceEl.textContent = "Distance: --";
      if (acqZoneEl) acqZoneEl.textContent = "Zone: --";
    } else {
      const bothInside = diag.sensorA.insideVolume && diag.sensorB.insideVolume;
      trackCardIdEl.textContent = `Track: ${track.id}`;
      trackCardStateEl.textContent = `State: ${track.classificationTitle || track.state}${track.lockSource ? ` (${track.lockSource})` : ""}`;
      trackCardPosEl.textContent = `Position: X ${track.position.x.toFixed(1)} | Y ${track.position.y.toFixed(1)} | Z ${track.position.z.toFixed(1)}`;
      trackCardConfEl.textContent = `Confidence: ${(track.confidence * 100).toFixed(0)}%`;
      trackCardAEl.textContent = `ESP32-A: ${diag.sensorA.locked ? "LOCKED" : "SEARCHING"} | Distance: ${Number.isFinite(diag.sensorA.distanceFt) ? `${diag.sensorA.distanceFt.toFixed(1)} ft` : "--"}`;
      trackCardBEl.textContent = `ESP32-B: ${diag.sensorB.locked ? "LOCKED" : "SEARCHING"} | Distance: ${Number.isFinite(diag.sensorB.distanceFt) ? `${diag.sensorB.distanceFt.toFixed(1)} ft` : "--"}`;
      trackCardVolumeEl.textContent = `15 FT Volume: ${bothInside ? "INSIDE" : "EDGE/OUT"}`;
      trackCardFirstSeenEl.textContent = `First Seen: ${track.firstSeenTs ? fmtClock(track.firstSeenTs) : "--"}`;
      trackCardEnteredEl.textContent = `Entered Zone: ${track.enteredZone || "unknown"}`;
      trackCardStoppedEl.textContent = `Stopped: ${track.stoppedAtTs ? fmtClock(track.stoppedAtTs) : "--"}`;
      const durationMs = track.firstSeenMs ? nowMs - track.firstSeenMs : 0;
      trackCardDurationEl.textContent = `Duration: ${fmtElapsed(durationMs)}`;

      if (acqStateEl) acqStateEl.textContent = `State: ${track.state}`;
      if (acqSensorEl) {
        const source = track.lockSource || (diag.sensorA.locked && diag.sensorB.locked ? "ESP32-A + ESP32-B" : diag.sensorA.locked ? "ESP32-A" : diag.sensorB.locked ? "ESP32-B" : "UNKNOWN");
        acqSensorEl.textContent = `Sensor Source: ${source}`;
      }
      if (acqDistanceEl) {
        const distance = Number.isFinite(diag.sensorA.distanceFt) && Number.isFinite(diag.sensorB.distanceFt)
          ? Math.min(diag.sensorA.distanceFt, diag.sensorB.distanceFt)
          : Number.isFinite(diag.sensorA.distanceFt)
            ? diag.sensorA.distanceFt
            : diag.sensorB.distanceFt;
        acqDistanceEl.textContent = `Distance: ${Number.isFinite(distance) ? `${distance.toFixed(1)} ft` : "--"}`;
      }
      if (acqZoneEl) acqZoneEl.textContent = `Zone: ${(track.classification || "UNKNOWN").toUpperCase()}`;
    }

    if (pipeIngressEl) pipeIngressEl.textContent = `Ingress: ${state.source ? "live bridge" : state.mode === "simulation" ? "simulation" : "waiting"}`;
    if (pipeClassifierEl) {
      pipeClassifierEl.textContent = state.targetQualified
        ? `Classifier: ${state.spatialClass}`
        : `Classifier: filtered (${state.targetFilterReason})`;
    }
    if (pipeTrackerEl) pipeTrackerEl.textContent = `Tracker: ${state.trackView.id !== "--" ? `track ${state.trackView.id} ${state.trackView.state}` : "idle"}`;
    if (pipeRendererEl) pipeRendererEl.textContent = `Renderer: ${state.trackView.id !== "--" ? "active" : "suppressed"}`;
    updateCoveragePosture(nowMs, diag);

    renderEventFeed();
  }

  function updateLabels(nowMs) {
    distALabel.textContent = `A: ${state.distances.A.toFixed(1)} ft`;
    distBLabel.textContent = `B: ${state.distances.B.toFixed(1)} ft`;
    modeStatus.textContent = `Mode: ${state.mode}`;
    bridgeStatus.textContent = `Bridge: ${state.source ? "connected" : "disconnected"}`;
    confidenceEl.textContent = `confidence: ${state.confidence.toFixed(2)}`;
    simSpeedLabel.textContent = `speed: ${state.sim.speed.toFixed(1)}x`;
    simNoiseLabel.textContent = `noise: ${state.sim.noiseFt.toFixed(2)} ft`;
    const spacing = Math.abs(boardB.x - boardA.x);
    boardSpacingLabel.textContent = `span: ${spacing.toFixed(1)} ft`;
    simRunBtn.textContent = state.sim.running ? "Pause Simulation" : "Resume Simulation";
    stateSummary.textContent = state.isLocked ? "state: locked" : state.ghostOpacity > 0.01 ? "state: ghost" : "state: idle";
    zoneStatusEl.textContent = `zone: ${state.currentZone}`;
    waveLevelEl.textContent = `wave: ${state.wave.toFixed(2)}`;
    const stillMs = state.stillSinceMs ? Math.max(0, performance.now() - state.stillSinceMs) : 0;
    const stillSec = stillMs / 1000;
    stillTimerEl.textContent = `still timer: ${stillSec.toFixed(1)}s / ${(STILLNESS_HOLD_MS / 1000).toFixed(1)}s`;
    if (state.stillAnchor) {
      stillnessEl.textContent = "stillness: stopped (X marked)";
    } else if (state.stillSinceMs) {
      stillnessEl.textContent = "stillness: holding for X marker";
    } else {
      stillnessEl.textContent = "stillness: moving";
    }

    if (state.calibrating) {
      const sec = Math.max(0, Math.ceil((state.calEndsAt - performance.now()) / 1000));
      calStatus.textContent = `Baseline: calibrating... ${sec}s`;
    } else if (state.baseline.A !== null && state.baseline.B !== null) {
      calStatus.textContent = `Baseline: calibrated A=${state.baseline.A.toFixed(4)} B=${state.baseline.B.toFixed(4)}`;
    } else {
      calStatus.textContent = "Baseline: not calibrated";
    }

    const elapsed = nowMs - state.packetStats.lastWindowAtMs;
    if (elapsed >= 1000) {
      state.packetStats.A.rate = Math.round((state.packetStats.A.countWindow * 1000) / elapsed);
      state.packetStats.B.rate = Math.round((state.packetStats.B.countWindow * 1000) / elapsed);
      state.packetStats.A.countWindow = 0;
      state.packetStats.B.countWindow = 0;
      state.packetStats.lastWindowAtMs = nowMs;
    }
    rawAEl.textContent = `ESP32-A: signal ${(state.signal.A * 100).toFixed(0)}% | dist ${state.filteredDistances.A.toFixed(2)}ft | pps ${state.packetStats.A.rate}`;
    rawBEl.textContent = `ESP32-B: signal ${(state.signal.B * 100).toFixed(0)}% | dist ${state.filteredDistances.B.toFixed(2)}ft | pps ${state.packetStats.B.rate}`;
    rawSolverEl.textContent = `Solver: ${state.isLocked ? "ACTIVE" : "IDLE"} | Renderer: ${state.trackView.id !== "--" ? "VISIBLE" : "SUPPRESSED"}${state.directLock ? " | DIRECT_LOCK" : ""} | UpAxis: ${state.verticalModel.upLocked ? "LOCKED" : "LEARNING"} (${(state.verticalModel.upScore || 0).toFixed(2)})`;

    updateModeButtons();
    updateMonitorStatus(nowMs);
  }

  function drawBoard(board, color, name) {
    const p = toPx(board);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d9e6ff";
    ctx.font = "12px sans-serif";
    ctx.fillText(name, p.x - 8, p.y - 12);
  }

  function drawCircle(board, rFt, color) {
    const center = toPx(board);
    const ref = toPx({ x: board.x + rFt, y: board.y });
    const radius = Math.abs(ref.x - center.x);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawConfidenceRing(point, confidence, color) {
    if (confidence < CONFIDENCE_RING_MIN) return;
    const p = toPx(point);
    const ring = 16 + confidence * 16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + confidence * 2;
    ctx.globalAlpha = clamp((confidence - CONFIDENCE_RING_MIN) / (CONFIDENCE_RING_MAX - CONFIDENCE_RING_MIN), 0.12, 0.85);
    ctx.beginPath();
    ctx.arc(p.x, p.y, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawTrail() {
    if (state.trail.length < 2) return;
    if (state.uiMode === "monitor") {
      for (let i = 0; i < state.trail.length; i++) {
        const p = state.trail[i];
        const xy = toPx(p);
        const alpha = (i + 1) / state.trail.length;
        ctx.fillStyle = `rgba(203,232,255,${0.06 + alpha * 0.34})`;
        ctx.beginPath();
        ctx.arc(xy.x, xy.y, 2 + alpha * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    ctx.strokeStyle = "rgba(255,160,105,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.trail.forEach((p, idx) => {
      const xy = toPx(p);
      if (idx === 0) ctx.moveTo(xy.x, xy.y);
      else ctx.lineTo(xy.x, xy.y);
    });
    ctx.stroke();
  }

  function drawTrackingBox(nowMs) {
    if (!state.isLocked || state.confidence < LOCK_IN) return;
    const p = toPx(state.point);
    const conf = clamp(state.confidence, 0, 1);
    const size = 26 + conf * 16;
    const lift = 18 + conf * 10;
    const skew = 12 + state.wave * 6;

    const fx = p.x;
    const fy = p.y;
    const bx = fx - skew;
    const by = fy - lift;

    ctx.strokeStyle = `rgba(255,178,120,${0.45 + conf * 0.5})`;
    ctx.lineWidth = 2;

    ctx.strokeRect(fx - size / 2, fy - size / 2, size, size);
    ctx.strokeRect(bx - size / 2, by - size / 2, size, size);

    ctx.beginPath();
    ctx.moveTo(fx - size / 2, fy - size / 2);
    ctx.lineTo(bx - size / 2, by - size / 2);
    ctx.moveTo(fx + size / 2, fy - size / 2);
    ctx.lineTo(bx + size / 2, by - size / 2);
    ctx.moveTo(fx - size / 2, fy + size / 2);
    ctx.lineTo(bx - size / 2, by + size / 2);
    ctx.moveTo(fx + size / 2, fy + size / 2);
    ctx.lineTo(bx + size / 2, by + size / 2);
    ctx.stroke();

    if (state.wave > 0.45) {
      ctx.strokeStyle = `rgba(96,235,255,${0.35 + state.wave * 0.45})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(fx, fy, size + 9 + Math.sin(nowMs * 0.015) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawStillnessMarker() {
    if (state.stillAnchor) {
      const p = toPx(state.stillAnchor);
      const s = 15;
      ctx.strokeStyle = "rgba(255,72,72,0.98)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.moveTo(p.x + s, p.y - s);
      ctx.lineTo(p.x - s, p.y + s);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,95,95,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (state.stillSinceMs && state.isLocked) {
      const p = toPx(state.point);
      const s = 11;
      ctx.strokeStyle = "rgba(255,140,90,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.moveTo(p.x + s, p.y - s);
      ctx.lineTo(p.x - s, p.y + s);
      ctx.stroke();
    }
  }

  function drawTarget(nowMs) {
    if (!state.isLocked || state.confidence < LOCK_IN) {
      state.ghostOpacity = 0;
      return;
    }
    const p = toPx(state.point);
    const alive = nowMs - state.lastStrongMs <= GHOST_MS;
    const opacity = alive ? clamp(1 - (nowMs - state.lastStrongMs) / GHOST_MS, 0.18, 1) : 0;
    state.ghostOpacity = opacity;
    if (opacity <= 0.01) return;

    const origin = toPx({ x: ROOM_W_FT / 2, y: ROOM_H_FT / 2 });
    ctx.fillStyle = "rgba(84,170,255,0.9)";
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 6, 0, Math.PI * 2);
    ctx.fill();

    const targetColor = state.spatialClass === "anchored"
      ? "rgba(255,255,255,"
      : state.spatialClass === "topside"
        ? "rgba(78,163,255,"
        : state.spatialClass === "floor_level"
          ? "rgba(255,214,77,"
          : state.spatialClass === "window_perimeter"
            ? "rgba(57,217,106,"
        : state.spatialClass === "outside"
          ? "rgba(57,217,106,"
          : "rgba(255,77,77,";

    ctx.fillStyle = `${targetColor}${opacity})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,188,142,${opacity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
    ctx.stroke();

    drawConfidenceRing(state.point, state.confidence, classifyColor(state.spatialClass));

    const floor = toPx({ x: state.point.x, y: Math.max(0, state.point.y - 0.9) });
    ctx.strokeStyle = `rgba(255,255,255,${opacity * 0.35})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 8);
    ctx.lineTo(floor.x, floor.y);
    ctx.stroke();

    if (state.stillAnchor) {
      const xAlpha = clamp((nowMs - state.stillSinceMs) / STILLNESS_HOLD_MS, 0.2, 1);
      ctx.strokeStyle = `rgba(255,255,255,${xAlpha})`;
      ctx.lineWidth = 3;
      const s = 12;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.moveTo(p.x + s, p.y - s);
      ctx.lineTo(p.x - s, p.y + s);
      ctx.stroke();
    }

    if (state.mode === "simulation") {
      const tp = toPx(state.sim.truePoint);
      ctx.fillStyle = "rgba(148,255,165,0.55)";
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBlueprint() {
    const scene = drawSkeletonHouse();

    if (state.isLocked) {
      const pulse = 0.18 + 0.11 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004));
      ctx.strokeStyle = `rgba(102,175,255,${pulse.toFixed(3)})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(scene.left + 2, scene.top + 2, scene.roomW - 4, scene.roomH - 4);
    }

    // Sensor spheres at crown molding.
    drawScenePoint(scene, { x: 1.2, y: ROOM_H_FT }, activityColor(state.boardStatus.A), 8, 0.9);
    drawScenePoint(scene, { x: 10.8, y: ROOM_H_FT }, activityColor(state.boardStatus.B), 8, 0.9);

    // 3D-ish shadow/floor projection for validated targets.
    if (state.confidence >= LOCK_IN && (state.isLocked || state.ghostOpacity > 0.01)) {
      const target = roomToScene(state.point);
      const px = scene.cx + target.x;
      const py = scene.cy + target.y;
      const zScale = clamp(1 - ((state.zEstimate ?? SENSOR_HEIGHT_FT) / (SENSOR_HEIGHT_FT + Z_MARGIN_FT)), 0.28, 1);
      const shadowY = py + 55 + (1 - zScale) * 26;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(px, shadowY, 18 + (1 - zScale) * 8, 8 + (1 - zScale) * 4, 0, 0, Math.PI * 2);
      ctx.fill();

      const classColor = classifyColor(state.spatialClass);
      ctx.fillStyle = classColor;
      ctx.globalAlpha = clamp(state.ghostOpacity || 0.9, 0.22, 0.95);
      ctx.beginPath();
      ctx.arc(px, py, 11 + state.confidence * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      drawConfidenceRing(state.point, state.confidence, classColor);

      if (state.stillAnchor) {
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px - 12, py - 12);
        ctx.lineTo(px + 12, py + 12);
        ctx.moveTo(px + 12, py - 12);
        ctx.lineTo(px - 12, py + 12);
        ctx.stroke();
      }
    }
  }

  function updateState(nowMs) {
    if (state.mode === "simulation") {
      updateSimulation(nowMs);
    }

    if (state.calibrating && nowMs >= state.calEndsAt) {
      state.baseline.A = median(state.calSamplesA);
      state.baseline.B = median(state.calSamplesB);
      state.calibrating = false;
      state.monitorArmed = true;
      state.monitorArmedAtMs = nowMs;
      state.entryGatePrimed = false;
      state.entrySatisfied = true;
      state.trackingEnabled = false;
      state.calSamplesA = [];
      state.calSamplesB = [];
      pushEvent("CALIBRATION COMPLETE", nowMs, `A ${state.baseline.A.toFixed(4)} B ${state.baseline.B.toFixed(4)}`);
      pushEvent("MONITOR ARMED", nowMs, "Live tracking armed");
    }

    enforceFeasibleDistances();
    distAInput.value = state.distances.A.toFixed(1);
    distBInput.value = state.distances.B.toFixed(1);

    state.filteredDistances.A = smoothDistance(state.filteredDistances.A, state.distances.A);
    state.filteredDistances.B = smoothDistance(state.filteredDistances.B, state.distances.B);
    const rA = clamp(state.filteredDistances.A, 0.5, SENSOR_RANGE_FT);
    const rB = clamp(state.filteredDistances.B, 0.5, SENSOR_RANGE_FT);

    const deltaA = state.filteredDistances.A - state.prevDist.A;
    const deltaB = state.filteredDistances.B - state.prevDist.B;
    const dStepA = Math.abs(deltaA);
    const dStepB = Math.abs(deltaB);
    const waveRaw = dStepA + dStepB;
    state.waveBuffer.push(waveRaw);
    if (state.waveBuffer.length > 16) state.waveBuffer.shift();
    const waveAvg = state.waveBuffer.reduce((sum, v) => sum + v, 0) / Math.max(1, state.waveBuffer.length);
    state.wave = clamp(waveAvg / 0.20, 0, 1);
    state.prevDist.A = state.filteredDistances.A;
    state.prevDist.B = state.filteredDistances.B;

    if (state.mode === "bridge" && Number.isFinite(state.baseline.A) && Number.isFinite(state.baseline.B)) {
      const devA = Math.abs(state.motion.A - state.baseline.A) / (Math.abs(state.baseline.A) * 0.32 + 0.20);
      const devB = Math.abs(state.motion.B - state.baseline.B) / (Math.abs(state.baseline.B) * 0.32 + 0.20);
      state.signal.A = clamp(devA, 0, 1.6);
      state.signal.B = clamp(devB, 0, 1.6);
      state.signal.total = clamp((state.signal.A + state.signal.B) * 0.5, 0, 1.6);
    } else {
      state.signal.A = clamp(dStepA / 0.22, 0, 1.2);
      state.signal.B = clamp(dStepB / 0.22, 0, 1.2);
      state.signal.total = clamp((state.signal.A + state.signal.B) * 0.5, 0, 1.2);
    }

    const proximityA = clamp(1 - rA / SENSOR_RANGE_FT, 0, 1);
    const proximityB = clamp(1 - rB / SENSOR_RANGE_FT, 0, 1);
    const trendTowardA = clamp((deltaB - deltaA) / 0.42, -1, 1);
    const trendTowardB = clamp((deltaA - deltaB) / 0.42, -1, 1);
    const scoreA = clamp(state.signal.A * 0.45 + proximityA * 0.45 + Math.max(0, trendTowardA) * 0.10, 0, 1.6);
    const scoreB = clamp(state.signal.B * 0.45 + proximityB * 0.45 + Math.max(0, trendTowardB) * 0.10, 0, 1.6);
    state.ownership.scoreA = scoreA;
    state.ownership.scoreB = scoreB;

    let proposedOwner = "both";
    if (scoreA > scoreB + DOMINANCE_SWITCH_MIN) proposedOwner = "A";
    else if (scoreB > scoreA + DOMINANCE_SWITCH_MIN) proposedOwner = "B";

    const trajectorySupports = (from, to) => {
      if (from === "A" && to === "B") return deltaA > 0.01 && deltaB < -0.01;
      if (from === "B" && to === "A") return deltaB > 0.01 && deltaA < -0.01;
      return true;
    };

    if (state.ownership.active === "none" && (proposedOwner === "A" || proposedOwner === "B")) {
      state.ownership.active = proposedOwner;
      state.ownership.lastSwitchMs = nowMs;
      state.ownership.candidate = "none";
      state.ownership.candidateSinceMs = 0;
    } else if (proposedOwner !== "both" && proposedOwner !== state.ownership.active) {
      if (state.ownership.candidate !== proposedOwner) {
        state.ownership.candidate = proposedOwner;
        state.ownership.candidateSinceMs = nowMs;
      } else if (
        nowMs - state.ownership.candidateSinceMs >= HANDOFF_DELAY_MS
        && trajectorySupports(state.ownership.active, proposedOwner)
      ) {
        state.ownership.active = proposedOwner;
        state.ownership.lastSwitchMs = nowMs;
        state.ownership.candidate = "none";
        state.ownership.candidateSinceMs = 0;
      }
    } else if (proposedOwner === state.ownership.active) {
      state.ownership.candidate = "none";
      state.ownership.candidateSinceMs = 0;
    }

    const directLockA = state.signal.A >= DIRECT_LOCK_SIGNAL && rA <= DIRECT_LOCK_RANGE_FT;
    const directLockB = state.signal.B >= DIRECT_LOCK_SIGNAL && rB <= DIRECT_LOCK_RANGE_FT;
    const directLockSource = directLockA || directLockB
      ? (state.signal.A >= state.signal.B ? "A" : "B")
      : null;

    const meet = trilaterate2D(boardA, boardB, rA, rB, state.point);
    if (!meet && !directLockSource && nowMs > state.directLockUntilMs) {
      state.confidence = 0;
      state.isLocked = false;
      state.directLock = null;
      state.zoneQualified = false;
      state.targetQualified = false;
      state.targetFilterReason = "no_solution";
      state.currentZone = "unknown";
      refreshSpatialClass();
      updateBoardStatus();
      return;
    }

    const estA = meet ? Math.hypot(meet.x - boardA.x, meet.y - boardA.y) : rA;
    const estB = meet ? Math.hypot(meet.x - boardB.x, meet.y - boardB.y) : rB;
    const err = Math.abs(estA - rA) + Math.abs(estB - rB);
    const consistency = clamp(1 - err / (DIST_THRESH_FT * 2.0), 0, 1);

    const estimateForGate = directLockSource
      ? estimateDirectLockPoint(directLockSource, directLockSource === "A" ? rA : rB)
      : (meet || state.point);
    const zoneEstimate = detectZone(estimateForGate);
    const topsideCandidate = (state.zEstimate ?? SENSOR_HEIGHT_FT) >= TOPSIDE_MIN_HEIGHT_FT;
    const perimeterCandidate = zoneEstimate.startsWith("window_perimeter") || zoneEstimate.startsWith("outside");
    const priorityZone = perimeterCandidate || topsideCandidate;
    if (priorityZone) {
      const zoneHold = topsideCandidate ? TOPSIDE_QUALIFY_HOLD_MS : ZONE_QUALIFY_HOLD_MS;
      if (!state.zoneCandidateSinceMs) state.zoneCandidateSinceMs = nowMs;
      state.zoneQualified = (nowMs - state.zoneCandidateSinceMs) >= zoneHold;
    } else {
      state.zoneCandidateSinceMs = 0;
      state.zoneQualified = false;
    }
    if (topsideCandidate) {
      if (!state.topsideCandidateSinceMs) state.topsideCandidateSinceMs = nowMs;
      state.topsideQualified = (nowMs - state.topsideCandidateSinceMs) >= TOPSIDE_QUALIFY_HOLD_MS;
    } else {
      state.topsideCandidateSinceMs = 0;
      state.topsideQualified = false;
    }

    const dtGate = Math.max(1, nowMs - state.prevNowMs) / 1000;
    const projectedSpeed = Math.hypot(estimateForGate.x - state.prevPoint.x, estimateForGate.y - state.prevPoint.y) / dtGate;

    const vm = state.verticalModel;
    const stableGroundCandidate = !topsideCandidate
      && state.wave <= 0.16
      && state.signal.total <= 0.24
      && projectedSpeed <= 0.24;
    if (stableGroundCandidate) {
      vm.groundSignalRef += (state.signal.total - vm.groundSignalRef) * 0.08;
      vm.groundWaveRef += (state.wave - vm.groundWaveRef) * 0.08;
      vm.groundConfidence = clamp(vm.groundConfidence + 0.025, 0, 1);
    } else {
      vm.groundConfidence = clamp(vm.groundConfidence - 0.01, 0, 1);
    }
    vm.upLocked = vm.groundConfidence >= 0.42;
    const zNow = state.zEstimate ?? SENSOR_HEIGHT_FT;
    const humanSized = zNow >= HUMAN_MIN_HEIGHT_FT;
    const topsideSized = zNow >= TOPSIDE_MIN_HEIGHT_FT;
    const signalQualified = state.signal.total >= HUMAN_MIN_SIGNAL_TOTAL;
    const signalTopsideQualified = state.signal.total >= TOPSIDE_MIN_SIGNAL_TOTAL;
    const confidenceQualified = consistency >= HUMAN_MIN_CONFIDENCE;
    const confidenceTopsideQualified = consistency >= TOPSIDE_MIN_CONFIDENCE;
    const motionQualified = state.wave >= HUMAN_MIN_WAVE || projectedSpeed >= HUMAN_MIN_SPEED_FTPS;
    const perimeterQualified = humanSized && signalQualified && confidenceQualified && motionQualified;
    const topsideQualified = state.topsideQualified && topsideSized && signalTopsideQualified && confidenceTopsideQualified;
    state.targetQualified = !!directLockSource || perimeterQualified || topsideQualified;
    if (state.targetQualified) {
      state.targetFilterReason = "qualified";
    } else if (state.topsideQualified && !topsideSized) {
      state.targetFilterReason = "topside_low_height";
    } else if (state.topsideQualified && !signalTopsideQualified) {
      state.targetFilterReason = "topside_low_signal";
    } else if (state.topsideQualified && !confidenceTopsideQualified) {
      state.targetFilterReason = "topside_low_confidence";
    } else if (!humanSized) {
      state.targetFilterReason = "low_profile_target";
    } else if (!signalQualified) {
      state.targetFilterReason = "low_signal";
    } else if (!confidenceQualified) {
      state.targetFilterReason = "low_confidence";
    } else {
      state.targetFilterReason = "slow_micro_motion";
    }

    const bridgeReady = state.monitorArmed && Number.isFinite(state.baseline.A) && Number.isFinite(state.baseline.B);
    const bridgeQualified = bridgeReady && state.signal.total >= PRESENCE_GATE_BRIDGE && state.zoneQualified && state.targetQualified;
    const presenceLikely = !!directLockSource || state.mode !== "bridge" || bridgeQualified;
    state.confidence = presenceLikely ? consistency : 0;
    state.fusionLock = presenceLikely
      && state.signal.A >= 0.14
      && state.signal.B >= 0.14
      && consistency >= 0.58
      && (Math.abs(scoreA - scoreB) <= 0.42 || state.ownership.active === "A" || state.ownership.active === "B");
    if (!presenceLikely) {
      state.isLocked = false;
      state.directLock = null;
      state.fusionLock = false;
      if (state.mode === "bridge" && state.monitorArmed) {
        pushEventThrottled(
          "human-filter",
          "SMALL/NON-HUMAN TARGET FILTERED",
          nowMs,
          `Reason ${state.targetFilterReason} | Zone ${zoneEstimate}`,
          3800
        );
      }
      state.currentZone = "unknown";
      refreshSpatialClass();
      updateBoardStatus();
      return;
    }

    if (state.topsideQualified && state.targetQualified) {
      pushEventThrottled(
        "ceiling-breach",
        "ABOVE CEILING SIGNATURE LOCK",
        nowMs,
        `Topside ${(state.signal.total * 100).toFixed(0)}% | z ${(state.zEstimate ?? 0).toFixed(1)} ft`,
        2600
      );
    }

    if (directLockSource) {
      state.directLock = {
        sensor: directLockSource,
        reason: "PROXIMITY_OVERRIDE",
        rangeFt: directLockSource === "A" ? rA : rB,
      };
      state.directLockUntilMs = nowMs + DIRECT_LOCK_HOLD_MS;
      state.isLocked = true;
      state.confidence = Math.max(state.confidence, 0.97);
    } else if (nowMs <= state.directLockUntilMs) {
      state.isLocked = true;
      state.confidence = Math.max(state.confidence, 0.82);
    } else {
      state.directLock = null;
      if (!state.isLocked && consistency >= LOCK_IN) state.isLocked = true;
      if (state.isLocked && consistency <= LOCK_OUT) state.isLocked = false;
    }

    if (state.isLocked) {
      const estimate = state.directLock
        ? estimateDirectLockPoint(state.directLock.sensor, state.directLock.rangeFt)
        : (meet || state.point);
      const alpha = state.directLock ? 0.46 : EMA_ALPHA;
      state.point.x += (estimate.x - state.point.x) * alpha;
      state.point.y += (estimate.y - state.point.y) * alpha;
      state.point.x = clamp(state.point.x, WORLD_MIN_X_FT, WORLD_MAX_X_FT);
      state.point.y = clamp(state.point.y, WORLD_MIN_Y_FT, WORLD_MAX_Y_FT);

      state.trail.push({ x: state.point.x, y: state.point.y });
      if (state.trail.length > MAX_TRAIL) state.trail.shift();
      state.lastStrongMs = nowMs;

      const dt = Math.max(1, nowMs - state.prevNowMs) / 1000;
      const speed = Math.hypot(state.point.x - state.prevPoint.x, state.point.y - state.prevPoint.y) / dt;
      state.speedEma = state.speedEma * 0.78 + speed * 0.22;
      const canHoldStill = state.speedEma <= STILLNESS_SPEED_FTPS && state.wave <= STILLNESS_WAVE_MAX && state.confidence >= STILLNESS_MIN_CONF;
      if (canHoldStill) {
        if (!state.stillSinceMs) state.stillSinceMs = nowMs;
        if (nowMs - state.stillSinceMs >= STILLNESS_HOLD_MS) {
          state.stillAnchor = { x: state.point.x, y: state.point.y };
        }
      } else {
        state.stillSinceMs = 0;
        state.stillAnchor = null;
      }
      state.prevPoint.x = state.point.x;
      state.prevPoint.y = state.point.y;
      state.prevNowMs = nowMs;
      state.currentZone = detectZone(state.point);
    } else {
      state.currentZone = state.ghostOpacity > 0.08 ? detectZone(state.point) : "unknown";
    }

    const armStable = state.monitorArmed && (nowMs - state.monitorArmedAtMs >= ARM_SETTLE_MS);
    state.trackingEnabled = armStable && (state.mode !== "bridge" || (state.zoneQualified && state.targetQualified));
    state.entryGatePrimed = armStable;
    state.entrySatisfied = armStable;

    updateBoardStatus();
    refreshSpatialClass();
  }

  function render(nowMs) {
    updateState(nowMs);
    if (state.three) {
      updateThreeScene(nowMs);
    } else {
      drawBlueprint();
      const showEngineeringLayers = state.uiMode === "developer";
      const showCommandEntity = state.confidence >= LOCK_IN && (state.isLocked || state.ghostOpacity > 0.01);

      if (showEngineeringLayers || showCommandEntity) {
        drawCircle(boardA, state.filteredDistances.A, activityColor(state.boardStatus.A));
        drawCircle(boardB, state.filteredDistances.B, activityColor(state.boardStatus.B));
        drawBoard(boardA, activityColor(state.boardStatus.A), "A (window corner)");
        drawBoard(boardB, activityColor(state.boardStatus.B), "B (window corner)");
      }

      if (showCommandEntity) {
        drawTrail();
        drawTarget(nowMs);
        drawTrackingBox(nowMs);
        drawStillnessMarker();
      }
    }
    updateLabels(nowMs);
    requestAnimationFrame(render);
  }

  function startCalibration() {
    state.calibrating = true;
    state.monitorArmed = false;
    state.monitorArmedAtMs = 0;
    state.entryGatePrimed = false;
    state.entrySatisfied = false;
    state.trackingEnabled = false;
    state.directLock = null;
    state.directLockUntilMs = 0;
    state.zoneQualified = false;
    state.zoneCandidateSinceMs = 0;
    state.topsideQualified = false;
    state.topsideCandidateSinceMs = 0;
    state.targetQualified = false;
    state.targetFilterReason = "none";
    state.verticalModel.groundSignalRef = 0.12;
    state.verticalModel.groundWaveRef = 0.08;
    state.verticalModel.groundConfidence = 0;
    state.verticalModel.upScore = 0;
    state.verticalModel.upLocked = false;
    state.occupiedSinceMs = 0;
    state.pendingOccupiedSinceMs = 0;
    state.pendingClearSinceMs = 0;
    state.calEndsAt = performance.now() + 4000;
    state.calSamplesA = [];
    state.calSamplesB = [];
    pushEvent("CALIBRATION STARTED", performance.now(), "Empty room baseline capture");
    showSystemBanner("CALIBRATION ACTIVE", "Recording room baseline noise...");
  }

  function parseBridgeLine(msg) {
    const line = String(msg || "").trim();
    const m = line.match(/motion\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/i);
    return m ? Number(m[1]) : null;
  }

  function connectBridge() {
    if (state.source) {
      state.source.close();
      state.source = null;
    }

    state.stillSinceMs = 0;
    state.stillAnchor = null;
    state.directLock = null;
    state.directLockUntilMs = 0;

    const es = new EventSource("http://127.0.0.1:8786/events");
    state.source = es;

    es.onopen = () => {
      bridgeStatus.textContent = "Bridge: connected";
    };

    es.onerror = () => {
      bridgeStatus.textContent = "Bridge: reconnecting / unavailable";
    };

    es.addEventListener("packet", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event_type !== "data") return;
        const motion = parseBridgeLine(payload.message);
        if (!Number.isFinite(motion)) return;

        if (payload.board === "A") {
          state.packetStats.A.countWindow += 1;
          state.motion.A = motion;
          if (state.calibrating) state.calSamplesA.push(motion);
          state.distances.A = mapMotionToDistance(motion, state.baseline.A);
          distAInput.value = state.distances.A.toFixed(1);
        }
        if (payload.board === "B") {
          state.packetStats.B.countWindow += 1;
          state.motion.B = motion;
          if (state.calibrating) state.calSamplesB.push(motion);
          state.distances.B = mapMotionToDistance(motion, state.baseline.B);
          distBInput.value = state.distances.B.toFixed(1);
        }
      } catch {
        // ignore malformed packet
      }
    });
  }

  distAInput.addEventListener("input", () => {
    state.distances.A = Number(distAInput.value);
    state.filteredDistances.A = state.distances.A;
  });

  distBInput.addEventListener("input", () => {
    state.distances.B = Number(distBInput.value);
    state.filteredDistances.B = state.distances.B;
  });

  simRunBtn.addEventListener("click", () => {
    state.sim.running = !state.sim.running;
  });

  simSpeedInput.addEventListener("input", () => {
    state.sim.speed = Number(simSpeedInput.value);
  });

  simNoiseInput.addEventListener("input", () => {
    state.sim.noiseFt = Number(simNoiseInput.value);
  });

  boardSpacingInput.addEventListener("input", () => {
    setBoardSpacing(Number(boardSpacingInput.value));
  });

  calibrateBtn.addEventListener("click", () => startCalibration());

  modeSimBtn.addEventListener("click", () => {
    state.mode = "simulation";
    if (state.source) {
      state.source.close();
      state.source = null;
    }
    bridgeStatus.textContent = "Bridge: disconnected";
    pushEvent("SIMULATION MODE", performance.now(), "Developer view");
  });

  modeBridgeBtn.addEventListener("click", () => {
    state.mode = "bridge";
    connectBridge();
    if (!(Number.isFinite(state.baseline.A) && Number.isFinite(state.baseline.B))) {
      startCalibration();
    }
    pushEvent("BRIDGE MODE", performance.now(), "Live bridge active");
  });

  uiMonitorBtn.addEventListener("click", () => {
    setUiMode("monitor");
  });

  uiDevBtn.addEventListener("click", () => {
    setUiMode("developer");
  });

  if (gadgetAgreedBtn && gadgetResponseEl) {
    gadgetAgreedBtn.addEventListener("click", () => {
      gadgetResponseEl.textContent = "Response: acknowledged";
      pushEvent("TARGET ACQUISITION ACK", performance.now(), "Operator acknowledged lock");
    });
  }

  if (gadgetDeniedBtn && gadgetResponseEl) {
    gadgetDeniedBtn.addEventListener("click", () => {
      gadgetResponseEl.textContent = "Response: hold";
      pushEvent("TRACK HOLD", performance.now(), "Operator hold requested");
    });
  }

  saveAttemptBtn.addEventListener("click", () => {
    const entry = {
      runId: nextRunId(),
      ts: new Date().toISOString(),
      result: attemptResultEl.value,
      notes: attemptNotesEl.value.trim(),
      mode: state.mode,
      spacingFt: Math.abs(boardB.x - boardA.x),
      simSpeed: state.sim.speed,
      simNoise: state.sim.noiseFt,
    };
    recorder.entries.push(entry);
    saveAttempts();
    renderAttemptList();
    attemptNotesEl.value = "";
  });

  exportAttemptsBtn.addEventListener("click", () => {
    exportAttemptsMarkdown();
  });

  clearAttemptsBtn.addEventListener("click", () => {
    recorder.entries = [];
    saveAttempts();
    renderAttemptList();
  });

  loadAttempts();
  renderAttemptList();
  initThreeScene();
  connectBridge();
  startCalibration();
  updateModeButtons();
  setUiMode("monitor");
  pushEvent("BRIDGE MODE", performance.now(), "Live bridge active");
  pushEvent("SYSTEM READY", performance.now(), "Command station ready");

  requestAnimationFrame(render);
})();
