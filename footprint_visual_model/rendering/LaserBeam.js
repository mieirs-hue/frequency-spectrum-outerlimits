import * as THREE from "three";

export class LaserBeam {
  constructor(sensorPosition) {
    this.sensorPosition = sensorPosition; // {x, y, z}

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 1.0,
      linewidth: 2,
    });
    this.mesh = new THREE.Line(this.geometry, this.material);

    // Persistence decay per update tick.
    this.fadeSpeed = 0.05;
  }

  update(track) {
    if (!track) return;

    const xyz = track.xyz || track.position;
    if (xyz) {
      const points = [
        new THREE.Vector3(this.sensorPosition.x, this.sensorPosition.y, this.sensorPosition.z),
        new THREE.Vector3(xyz.x, xyz.y, xyz.z),
      ];
      this.geometry.setFromPoints(points);
      if (this.geometry.attributes.position) {
        this.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Strict color binding from Track brain.
    this.material.color.setHex(track.laserColor ?? 0xffffff);

    const state = String(track.state || "").toUpperCase();
    if (state === "CLEAR" || state === "LOST") {
      // Decay phase.
      this.material.opacity = Math.max(0, this.material.opacity - this.fadeSpeed);
      this.mesh.visible = this.material.opacity > 0;
    } else {
      // Active phase.
      this.material.opacity = 1.0;
      this.mesh.visible = !!xyz;
    }
  }
}
