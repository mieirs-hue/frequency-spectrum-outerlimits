import {
  ROOM_BOUNDS,
  SENSOR_RADIUS_FT,
  SPLIT_INDOOR_SIDE,
  SPLIT_WALL_AXIS,
  SPLIT_WALL_VALUE,
} from "./sensors.js";

const TRACKING_AXIS = {
  // Keep these runtime constants easy to tune during physical calibration.
  invertX: false,
  invertZ: false,
};

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function hexToCss(color) {
  return `#${Number(color).toString(16).padStart(6, "0")}`;
}

function trilaterateXZ(anchorA, anchorB) {
  const boundaryPenalty = (candidate) => {
    const overXMin = Math.max(0, 0 - candidate.x);
    const overXMax = Math.max(0, candidate.x - ROOM_BOUNDS.width);
    const overZMin = Math.max(0, 0 - candidate.z);
    const overZMax = Math.max(0, candidate.z - ROOM_BOUNDS.depth);
    return overXMin + overXMax + overZMin + overZMax;
  };

  const centerDistance = (candidate) => {
    const centerX = ROOM_BOUNDS.width * 0.5;
    const centerZ = ROOM_BOUNDS.depth * 0.5;
    return Math.hypot(candidate.x - centerX, candidate.z - centerZ);
  };

  const indoorSidePenalty = (candidate) => {
    const coord = SPLIT_WALL_AXIS === "x" ? candidate.x : candidate.z;
    if (SPLIT_INDOOR_SIDE === "high") {
      return Math.max(0, SPLIT_WALL_VALUE - coord);
    }
    return Math.max(0, coord - SPLIT_WALL_VALUE);
  };

  const dx = anchorB.position.x - anchorA.position.x;
  const dz = anchorB.position.z - anchorA.position.z;
  const baseline = Math.hypot(dx, dz);
  if (baseline < 0.001) return null;

  const x = ((anchorA.distance ** 2) - (anchorB.distance ** 2) + (baseline ** 2)) / (2 * baseline);
  const zSquared = (anchorA.distance ** 2) - (x ** 2);

  if (zSquared < 0) {
    const wa = 1 / Math.max(0.01, anchorA.distance);
    const wb = 1 / Math.max(0.01, anchorB.distance);
    const t = wb / (wa + wb);
    return {
      x: anchorA.position.x + (dx * t),
      z: anchorA.position.z + (dz * t),
    };
  }

  const z = Math.sqrt(zSquared);
  const ux = dx / baseline;
  const uz = dz / baseline;

  const c1 = {
    x: anchorA.position.x + (x * ux) + (z * (-uz)),
    z: anchorA.position.z + (x * uz) + (z * ux),
  };
  const c2 = {
    x: anchorA.position.x + (x * ux) - (z * (-uz)),
    z: anchorA.position.z + (x * uz) - (z * ux),
  };

  const p1 = boundaryPenalty(c1);
  const p2 = boundaryPenalty(c2);
  if (p1 !== p2) return p1 < p2 ? c1 : c2;

  const i1 = indoorSidePenalty(c1);
  const i2 = indoorSidePenalty(c2);
  if (i1 !== i2) return i1 < i2 ? c1 : c2;

  return centerDistance(c1) <= centerDistance(c2) ? c1 : c2;
}

export class TrackingEngine {
  constructor(sensorNetwork) {
    this.sensorNetwork = sensorNetwork;
    this.smoothed = {
      x: ROOM_BOUNDS.width / 2,
      y: ROOM_BOUNDS.height + 2,
      z: ROOM_BOUNDS.depth / 2,
    };
    this.lastUpdateMs = Date.now();
    this.lastSpeedFtPerSec = 0;
  }

  getClassification(x, y, z, roomX, roomY, roomZ) {
    // Expand the effective office square to reduce edge-dropouts on the south side.
    const wallThickness = 3.0;

    // Check if target is horizontally inside the room footprint.
    const isInsideX = x >= -wallThickness && x <= (roomX + wallThickness);
    const isInsideZ = z >= -wallThickness && z <= (roomZ + wallThickness);

    // ZONE 1: OUTSIDE PERIMETER (Dog Walkers / Golf Carts)
    if (!isInsideX || !isInsideZ) {
      return {
        key: "OUTSIDE_PERIMETER",
        zone: "OUTSIDE PERIMETER",
        floor: "Perimeter",
        color: 0x00f3ff,
        visible: true,
      };
    }

    // ZONE 2: BRICK FEET BAND (the gap between 1st floor ceiling and 2nd floor)
    if (y >= roomY && y <= (roomY + 2.0)) {
      return {
        key: "BRICK_FEET_BAND",
        zone: "BRICK FEET BAND",
        floor: "Ceiling Gap",
        color: 0xd2691e,
        visible: true,
      };
    }

    // ZONE 3: UPPER LEVEL (anything strictly above the brick band)
    if (y > (roomY + 2.0)) {
      return {
        key: "UPPER_LEVEL",
        zone: "UPPER LEVEL",
        floor: "Floor 2",
        color: 0xffaa00,
        visible: true,
      };
    }

    // ZONE 4: VAULT INTERIOR (office / trampoline space)
    return {
      key: "VAULT_INTERIOR",
      zone: "VAULT INTERIOR",
      floor: "Floor 1",
      color: 0x39ff14,
      visible: true,
    };
  }

  update(options) {
    const anchors = this.sensorNetwork.getAnchors();
    if (anchors.length < 2) {
      return {
        id: "TARGET-001",
        trackerId: "TRACKER-IDLE",
        dominantSensor: "--",
        overlapPct: 0,
        active: false,
        zone: "NO TARGET",
        floor: "--",
        confidence: 0,
        altitude: 0,
        sector: "--",
      };
    }

    const rawPos = trilaterateXZ(anchors[0], anchors[1]);
    if (!rawPos) {
      return {
        id: "TARGET-001",
        trackerId: "TRACKER-IDLE",
        dominantSensor: "--",
        overlapPct: 0,
        active: false,
        zone: "NO TARGET",
        floor: "--",
        confidence: 0,
        altitude: 0,
        sector: "--",
      };
    }

    const avgSignal = (anchors[0].normalized + anchors[1].normalized) * 0.5;
    const spread = Math.abs(anchors[0].normalized - anchors[1].normalized);
    const aNorm = anchors.find((anchor) => anchor.id === "A")?.normalized ?? 0;
    const bNorm = anchors.find((anchor) => anchor.id === "B")?.normalized ?? 0;
    const overlapPct = Math.round(clamp(Math.min(aNorm, bNorm) * 100, 0, 100));

    let dominantSensor = "SHARED_AB";
    if (Math.abs(aNorm - bNorm) > 0.08) {
      dominantSensor = aNorm > bNorm ? "ESP32-S3 A" : "ESP32-S3 B";
    }

    const trackerId = dominantSensor === "SHARED_AB"
      ? "TRACKER-AB"
      : (dominantSensor === "ESP32-S3 A" ? "TRACKER-A" : "TRACKER-B");

    const mappedX = TRACKING_AXIS.invertX ? (ROOM_BOUNDS.width - rawPos.x) : rawPos.x;
    const mappedZ = TRACKING_AXIS.invertZ ? (ROOM_BOUNDS.depth - rawPos.z) : rawPos.z;

    const raw = {
      x: clamp(mappedX, -20, 32),
      // Two sensors only provide strong horizontal cues; keep altitude in realistic indoor band.
      y: clamp((ROOM_BOUNDS.height * 0.42) + ((avgSignal - 0.5) * 1.6), 0.8, ROOM_BOUNDS.height - 0.6),
      z: clamp(mappedZ, -20, 32),
    };

    const smooth = clamp(options.smoothing, 0.05, 0.6);
    const prev = { ...this.smoothed };
    this.smoothed.x += (raw.x - this.smoothed.x) * smooth;
    this.smoothed.y += (raw.y - this.smoothed.y) * smooth;
    this.smoothed.z += (raw.z - this.smoothed.z) * smooth;

    const nowMs = Date.now();
    const dt = Math.max(0.001, (nowMs - this.lastUpdateMs) / 1000.0);
    const travel = Math.hypot(this.smoothed.x - prev.x, this.smoothed.y - prev.y, this.smoothed.z - prev.z);
    const speedFtPerSec = travel / dt;
    this.lastUpdateMs = nowMs;
    this.lastSpeedFtPerSec = speedFtPerSec;

    const zone = this.getClassification(
      this.smoothed.x,
      this.smoothed.y,
      this.smoothed.z,
      ROOM_BOUNDS.width,
      ROOM_BOUNDS.height,
      ROOM_BOUNDS.depth
    );

    const detected = anchors.some((anchor) => anchor.distance <= SENSOR_RADIUS_FT);
    const confidence = Math.round(clamp(((avgSignal * 0.72) + ((1 - spread) * 0.28)) * 100, 0, 100));
    const debugForced = !!options.forceDebugAvatar;
    const visible = (
      options.showAvatars &&
      (debugForced || (detected && zone.visible && confidence >= options.targetFilter))
    );

    const paths = anchors.map((anchor) => ({
      id: anchor.id,
      from: { ...anchor.position },
      to: { ...this.smoothed },
      visible: !!(visible && options.showSignalPaths),
    }));

    return {
      id: "TARGET-001",
      trackerId,
      dominantSensor,
      overlapPct,
      active: visible,
      zone: zone.zone,
      floor: zone.floor,
      confidence,
      altitude: Number(this.smoothed.y.toFixed(2)),
      sector: this.smoothed.x < (ROOM_BOUNDS.width / 2) ? "West Sector" : "East Sector",
      position: { ...this.smoothed },
      paths,
      zoneKey: zone.key,
      zoneColor: hexToCss(zone.color),
      speedFtPerSec: Number(speedFtPerSec.toFixed(2)),
      movementClass: this.#classifyMovement(zone.key, speedFtPerSec, confidence),
      visibilityReason: debugForced ? "FORCED_DEBUG_MODE" : "NORMAL_FILTERING",
    };
  }

  #classifyMovement(zoneKey, speedFtPerSec, confidence) {
    if (zoneKey === "OUTSIDE_PERIMETER") {
      if (speedFtPerSec >= 7.5 && confidence >= 45) return "GOLF_CART_OR_VEHICLE";
      if (speedFtPerSec >= 1.0 && speedFtPerSec <= 5.0) return "DOG_WALKER_OR_PEDESTRIAN";
      return "PERIMETER_ACTIVITY";
    }

    if (zoneKey === "BRICK_FEET_BAND") return "UPSTAIRS_BRICKFEET_BAND";
    if (zoneKey === "VAULT_INTERIOR") return "UNCLE_JESSE_INDOOR";
    if (zoneKey === "UPPER_LEVEL") return "UPSTAIRS_ACTIVITY";
    return "UNCLASSIFIED";
  }
}