import * as THREE from "three";

function avatarGeometryForClassification(classification) {
  switch (String(classification || "UNKNOWN").toUpperCase()) {
    case "INTERIOR":
      return new THREE.SphereGeometry(0.18, 16, 16);
    case "EXTERIOR":
      return new THREE.BoxGeometry(0.2, 0.3, 0.2);
    case "TOPSIDE":
      return new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12);
    default:
      return new THREE.OctahedronGeometry(0.1);
  }
}

function avatarMaterialForClassification(classification) {
  switch (String(classification || "UNKNOWN").toUpperCase()) {
    case "INTERIOR":
      return new THREE.MeshBasicMaterial({ color: 0xff4d4d });
    case "EXTERIOR":
      return new THREE.MeshBasicMaterial({ color: 0x39d96a });
    case "TOPSIDE":
      return new THREE.MeshBasicMaterial({ color: 0x4ea3ff });
    default:
      return new THREE.MeshBasicMaterial({ color: 0xf5f8ff });
  }
}

export class TrackVisual {
  constructor(track) {
    this.trackId = track.id;
    this.group = new THREE.Group();
    this.classification = null;
    this.avatar = null;
    this.trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0x9ed8ff, transparent: true, opacity: 0.0 })
    );
    this.group.add(this.trail);
    this.heading = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 0.45, 0xffffff, 0.16, 0.08);
    this.group.add(this.heading);
    this.createAvatar(track.classification);
  }

  createAvatar(classification) {
    if (this.avatar) {
      this.group.remove(this.avatar);
    }

    this.avatar = new THREE.Mesh(
      avatarGeometryForClassification(classification),
      avatarMaterialForClassification(classification)
    );

    this.group.add(this.avatar);
    this.classification = String(classification || "UNKNOWN").toUpperCase();
  }

  update(track) {
    const time = performance.now();
    if (String(track.classification || "UNKNOWN").toUpperCase() !== this.classification) {
      this.createAvatar(track.classification);
    }

    if (track.xyz) {
      this.group.position.set(track.xyz.x, track.xyz.y, track.xyz.z);
    }

    this.group.visible = track.state !== "SEARCHING" && track.state !== "CLEAR";

    if (this.avatar) {
      const pulse = track.state === "TRACKING"
        ? 1 + Math.sin(time * 0.005) * 0.15
        : track.state === "ANCHORED"
          ? 1.03
          : 1;
      this.avatar.scale.set(pulse, pulse, pulse);
    }

    const history = Array.isArray(track.history) && track.history.length ? track.history : track.trail || [];
    if (history.length > 1) {
      const points = history.map((point) => new THREE.Vector3(point.x - track.xyz.x, point.y - track.xyz.y, point.z - track.xyz.z));
      this.trail.geometry.setFromPoints(points);
      this.trail.material.opacity = track.state === "TRACKING" ? 0.48 : track.state === "ANCHORED" ? 0.28 : 0.18;
    }

    if (track.velocity != null) {
      const direction = new THREE.Vector3(0, 0, 1);
      if (history.length > 1) {
        const prev = history[history.length - 2];
        const last = history[history.length - 1];
        const vx = (last.x ?? 0) - (prev.x ?? 0);
        const vy = (last.y ?? 0) - (prev.y ?? 0);
        const vz = (last.z ?? 0) - (prev.z ?? 0);
        direction.set(vx, vy, vz);
        if (direction.lengthSq() > 1e-6) direction.normalize();
      }
      this.heading.setDirection(direction);
      this.heading.setLength(Math.max(0.25, Math.min(0.9, 0.25 + (track.velocity || 0) * 0.2)), 0.16, 0.08);
      this.heading.position.set(0, 0.08, 0);
      this.heading.visible = track.state === "TRACKING" || track.state === "ANCHORED";
      this.heading.line.material.color.setHex(track.laserColor ?? 0xffffff);
      this.heading.cone.material.color.setHex(track.laserColor ?? 0xffffff);
    }
  }
}
