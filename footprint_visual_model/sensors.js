export const ROOM_BOUNDS = {
  width: 12,
  height: 9,
  depth: 12,
};

export const SENSOR_RADIUS_FT = 20;

// Layout calibration: sensors are mounted on the east wall.
export const SENSOR_WALL_AXIS = "x";
export const SENSOR_WALL_VALUE = ROOM_BOUNDS.width;

// Indoor/outdoor split is invisible and near the sensor/window wall, not room center.
export const SPLIT_WALL_AXIS = "x";
export const SPLIT_WALL_VALUE = ROOM_BOUNDS.width - 3;
export const SPLIT_INDOOR_SIDE = "low";

const SENSOR_LAYOUT = {
  A: {
    id: "A",
    label: "ESP32-S3 A",
    color: "#ff6b8a",
    position: { x: SENSOR_WALL_VALUE, y: 8.5, z: 0 },
  },
  B: {
    id: "B",
    label: "ESP32-S3 B",
    color: "#ffc567",
    position: { x: SENSOR_WALL_VALUE, y: 8.5, z: ROOM_BOUNDS.depth },
  },
};

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

export function parseSignalValue(rawMessage) {
  const text = String(rawMessage || "").trim();
  if (!text) return null;

  const numbers = text.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
  if (numbers.length >= 3) {
    const a = Number(numbers[0]);
    const b = Number(numbers[1]);
    const c = Number(numbers[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
      return Math.abs((a + b + c) / 3);
    }
  }

  if (numbers.length >= 1) {
    const first = Number(numbers[0]);
    if (Number.isFinite(first)) return Math.abs(first);
  }

  return null;
}

export class SensorNetwork {
  constructor() {
    this.showSpheres = true;
    this.nodes = {};

    Object.keys(SENSOR_LAYOUT).forEach((id) => {
      this.nodes[id] = this.#createNode(SENSOR_LAYOUT[id]);
    });
  }

  #createNode(definition) {
    const node = {
      id: definition.id,
      label: definition.label,
      color: definition.color,
      position: { ...definition.position },
      enabled: true,
      online: false,
      lastSeenMs: 0,
      signal: 0,
      minObserved: Number.POSITIVE_INFINITY,
      maxObserved: Number.NEGATIVE_INFINITY,
      normalized: 0,
      distance: null,
      quality: 0,
      rssi: -99,
    };
    return node;
  }

  setEnabled(id, enabled) {
    const node = this.nodes[id];
    if (!node) return;
    node.enabled = !!enabled;
    this.#syncNodeVisual(node);
  }

  setSpheresVisible(show) {
    this.showSpheres = !!show;
    Object.values(this.nodes).forEach((node) => this.#syncNodeVisual(node));
  }

  calibrate(id) {
    const node = this.nodes[id];
    if (!node) return;
    node.minObserved = node.signal;
    node.maxObserved = node.signal + 0.001;
  }

  ingestPacket(boardId, payload) {
    const id = String(boardId || "A").toUpperCase() === "B" ? "B" : "A";
    const node = this.nodes[id];
    if (!node || !node.enabled) return;

    node.lastSeenMs = Date.now();
    node.online = true;

    const raw = parseSignalValue(payload && payload.message);
    if (raw == null) {
      this.#syncNodeVisual(node);
      return;
    }

    const alpha = 0.24;
    node.signal = node.signal === 0 ? raw : node.signal + ((raw - node.signal) * alpha);
    node.minObserved = Math.min(node.minObserved, node.signal);
    node.maxObserved = Math.max(node.maxObserved, node.signal);

    const floor = Number.isFinite(node.minObserved) ? node.minObserved : 0;
    const ceil = Number.isFinite(node.maxObserved) ? node.maxObserved : floor + 1;
    const span = Math.max(0.001, ceil - floor);

    node.normalized = clamp((node.signal - floor) / span, 0, 1);
    node.distance = clamp(2 + ((1 - node.normalized) * SENSOR_RADIUS_FT), 2, SENSOR_RADIUS_FT);
    node.quality = Math.round(node.normalized * 100);
    node.rssi = Math.round(-95 + (node.normalized * 53));
    this.#syncNodeVisual(node);
  }

  tick(nowMs) {
    Object.values(this.nodes).forEach((node) => {
      node.online = node.enabled && ((nowMs - node.lastSeenMs) <= 2500);
      this.#syncNodeVisual(node);
    });
  }

  getSnapshot() {
    return Object.values(this.nodes).map((node) => ({
      id: node.id,
      label: node.label,
      enabled: node.enabled,
      online: node.online,
      rssi: node.rssi,
      quality: node.quality,
      distance: node.distance,
    }));
  }

  getAnchors() {
    return Object.values(this.nodes)
      .filter((node) => node.enabled && node.online && Number.isFinite(node.distance))
      .map((node) => ({
        id: node.id,
        position: { ...node.position },
        distance: node.distance,
        normalized: node.normalized,
      }));
  }

  #syncNodeVisual() {}
}