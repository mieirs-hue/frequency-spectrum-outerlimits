import * as THREE from "three";
import { Track } from "./Track.js";
import { ZoneClassifier } from "./ZoneClassifier.js";

export class TrackManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.tracks = new Map();
    this.nextID = 1;
    this.ceilingHeight = options.ceilingHeight ?? 8.5;
    this.roomBounds = options.roomBounds ?? { minX: 0, maxX: 12, minY: 0, maxY: 12 };
    this.matchRadius = options.matchRadius ?? 2.0;
    this.handoffDelayMs = options.handoffDelayMs ?? 2000;
    this.switchThreshold = options.switchThreshold ?? 0.08;
  }

  update(sensorSolutions = []) {
    for (const solution of sensorSolutions) {
      const track = this.findMatchingTrack(solution) || this.createTrack(solution);
      this.updateSensorOwnership(track, solution, solution.timestamp ?? Date.now());
      track.updatePosition(solution.xyz, solution.timestamp ?? Date.now());
      const zone = ZoneClassifier.classify(solution.xyz, this.ceilingHeight, this.roomBounds);
      track.zone = zone.type;
      track.classification = zone.type;
      track.laserColor = zone.color;
      track.updateState(solution.confidence ?? 0, solution.timestamp ?? Date.now());
    }

    this.cleanupLostTracks();
    return this.tracks;
  }

  createTrack(solution) {
    const id = `TRACK-${String(this.nextID++).padStart(2, "0")}`;
    const track = new Track(id);
    track.detectedBy = solution.detectedBy ?? null;
    track.fusionLock = false;
    track.ownership = {
      active: track.detectedBy ?? "UNKNOWN",
      candidate: null,
      candidateSince: 0,
      scoreA: 0,
      scoreB: 0,
    };
    this.tracks.set(id, track);
    if (this.scene && track.position instanceof THREE.Vector3) {
      // No-op: scene ownership is left to renderers.
    }
    return track;
  }

  findMatchingTrack(solution) {
    if (!solution?.xyz) return null;

    for (const track of this.tracks.values()) {
      if (!track.position) continue;
      const distance = track.position.distanceTo(solution.xyz);
      if (distance < this.matchRadius) {
        return track;
      }
    }

    return null;
  }

  cleanupLostTracks(now = Date.now()) {
    for (const [id, track] of this.tracks.entries()) {
      if (track.isExpired(now)) {
        this.tracks.delete(id);
      }
    }
  }

  updateSensorOwnership(track, solution, timestamp) {
    const scores = this.resolveSensorScores(solution);
    if (!scores) {
      track.detectedBy = solution.detectedBy ?? track.detectedBy;
      return;
    }

    track.ownership = track.ownership || {
      active: track.detectedBy ?? "UNKNOWN",
      candidate: null,
      candidateSince: 0,
      scoreA: 0,
      scoreB: 0,
    };

    track.ownership.scoreA = scores.A;
    track.ownership.scoreB = scores.B;

    let proposed = "BOTH";
    if (scores.A > scores.B + this.switchThreshold) proposed = "ESP32-A";
    else if (scores.B > scores.A + this.switchThreshold) proposed = "ESP32-B";

    const active = track.ownership.active || "UNKNOWN";
    if (active === "UNKNOWN" && proposed !== "BOTH") {
      track.ownership.active = proposed;
      track.ownership.candidate = null;
      track.ownership.candidateSince = 0;
    } else if (proposed !== "BOTH" && proposed !== active) {
      if (track.ownership.candidate !== proposed) {
        track.ownership.candidate = proposed;
        track.ownership.candidateSince = timestamp;
      } else if (timestamp - track.ownership.candidateSince >= this.handoffDelayMs) {
        track.ownership.active = proposed;
        track.ownership.candidate = null;
        track.ownership.candidateSince = 0;
      }
    } else if (proposed === active) {
      track.ownership.candidate = null;
      track.ownership.candidateSince = 0;
    }

    track.detectedBy = track.ownership.active;
    track.fusionLock = scores.A > 0.15 && scores.B > 0.15 && Math.abs(scores.A - scores.B) < 0.22;
  }

  resolveSensorScores(solution) {
    if (solution?.sensorScores && Number.isFinite(solution.sensorScores.A) && Number.isFinite(solution.sensorScores.B)) {
      return {
        A: Math.max(0, solution.sensorScores.A),
        B: Math.max(0, solution.sensorScores.B),
      };
    }

    const signalA = Number.isFinite(solution?.signalA) ? Math.max(0, solution.signalA) : 0;
    const signalB = Number.isFinite(solution?.signalB) ? Math.max(0, solution.signalB) : 0;
    const distanceA = Number.isFinite(solution?.distanceA) ? Math.max(0, solution.distanceA) : null;
    const distanceB = Number.isFinite(solution?.distanceB) ? Math.max(0, solution.distanceB) : null;
    if (!Number.isFinite(distanceA) || !Number.isFinite(distanceB)) {
      if (signalA <= 0 && signalB <= 0) return null;
      return { A: signalA, B: signalB };
    }

    const proximityA = 1 / (1 + distanceA);
    const proximityB = 1 / (1 + distanceB);
    return {
      A: signalA * 0.55 + proximityA * 0.45,
      B: signalB * 0.55 + proximityB * 0.45,
    };
  }
}
