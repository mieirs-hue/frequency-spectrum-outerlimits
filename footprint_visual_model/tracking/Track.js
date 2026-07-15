import { COLORS, ZoneClassifier } from "./ZoneClassifier.js";

export class Track {
  constructor(id) {
    this.id = id;
    this.state = "SEARCHING";
    this.position = null;
    this.xyz = null;
    this.previousPosition = null;
    this.velocity = 0;
    this.confidence = 0;
    this.zone = "UNKNOWN";
    this.classification = "UNKNOWN";
    this.laserColor = COLORS.UNKNOWN;
    this.detectedBy = null;
    this.firstSeenAt = null;
    this.lastSeenAt = null;
    this.lastUpdatedAt = null;
    this.anchoredAt = null;
    this.trail = [];
    this.history = this.trail;
    this.memoryTimeoutMs = 2500;
  }

  updatePosition(position, timestamp) {
    if (!position) return;

    if (this.position) {
      this.previousPosition = this.position.clone ? this.position.clone() : { ...this.position };
      if (typeof this.position.distanceTo === "function") {
        this.velocity = this.position.distanceTo(position);
      } else {
        const dx = (position.x ?? 0) - (this.position.x ?? 0);
        const dy = (position.y ?? 0) - (this.position.y ?? 0);
        const dz = (position.z ?? 0) - (this.position.z ?? 0);
        this.velocity = Math.hypot(dx, dy, dz);
      }
    }

    this.position = position.clone ? position.clone() : { ...position };
    this.xyz = this.position;
    this.lastUpdatedAt = timestamp;
    this.lastSeenAt = timestamp;
    if (!this.firstSeenAt) {
      this.firstSeenAt = timestamp;
    }

    this.trail.push(this.position.clone ? this.position.clone() : { ...this.position });
    if (this.trail.length > 100) {
      this.trail.shift();
    }
  }

  updateClassification(position, ceilingHeight = 8.5, roomBounds = null) {
    const classification = ZoneClassifier.classify(position, ceilingHeight, roomBounds);
    this.classification = classification.type;
    this.zone = classification.type;
    this.laserColor = classification.color;
    return classification;
  }

  updateState(confidence, timestamp = Date.now()) {
    this.confidence = confidence;

    if (confidence <= 0.01) {
      this.state = "CLEAR";
      return this.state;
    }

    if (confidence < 0.4) {
      this.state = this.state === "TRACKING" || this.state === "ANCHORED" ? "LOST" : "SEARCHING";
      return this.state;
    }

    if (this.velocity < 0.05) {
      this.state = "ANCHORED";
      if (!this.anchoredAt) {
        this.anchoredAt = timestamp;
      }
      return this.state;
    }

    this.state = "TRACKING";
    this.anchoredAt = null;
    return this.state;
  }

  isExpired(now = Date.now()) {
    if (!this.lastSeenAt) return false;
    return now - this.lastSeenAt > this.memoryTimeoutMs;
  }
}
