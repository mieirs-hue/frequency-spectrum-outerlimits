export class CommandHUD {
  constructor(root = document) {
    this.root = root;
    this.statusEl = root.getElementById("monitorOccupancy");
    this.trackEl = root.getElementById("monitorTracking");
    this.zoneEl = root.getElementById("monitorZone");
    this.eventEl = root.getElementById("monitorLastEvent");
    this.cardStateEl = root.getElementById("trackCardState");
    this.cardPosEl = root.getElementById("trackCardPos");
    this.cardConfEl = root.getElementById("trackCardConf");
    this.cardAEl = root.getElementById("trackCardA");
    this.cardBEl = root.getElementById("trackCardB");
    this.cardVolumeEl = root.getElementById("trackCardVolume");
  }

  update(track) {
    if (!track) {
      if (this.statusEl) this.statusEl.textContent = "System Status: CLEAR";
      if (this.trackEl) this.trackEl.textContent = "Track -- | CLEAR | Count: 0";
      if (this.zoneEl) this.zoneEl.textContent = "Current Zone: unknown";
      if (this.cardStateEl) this.cardStateEl.textContent = "State: CLEAR";
      if (this.cardPosEl) this.cardPosEl.textContent = "Position: X -- | Y -- | Z --";
      if (this.cardConfEl) this.cardConfEl.textContent = "Confidence: 0%";
      if (this.cardAEl) this.cardAEl.textContent = "ESP32-A: SEARCHING | Distance: --";
      if (this.cardBEl) this.cardBEl.textContent = "ESP32-B: SEARCHING | Distance: --";
      if (this.cardVolumeEl) this.cardVolumeEl.textContent = "15 FT Volume: --";
      return;
    }

    const classification = String(track.classification || "UNKNOWN").toUpperCase();
    const confidencePct = Math.round((track.confidence ?? 0) * 100);
    const statusMap = {
      INTERIOR: "STATUS: INTERIOR TARGET",
      EXTERIOR: "STATUS: EXTERIOR PASS-BY",
      TOPSIDE: "STATUS: TOPSIDE SIGNATURE",
      UNKNOWN: "STATUS: AWAITING CLASSIFICATION",
    };

    if (this.statusEl) this.statusEl.textContent = statusMap[classification] || statusMap.UNKNOWN;
    if (this.trackEl) this.trackEl.textContent = `Track ${track.id} | ${track.state} | Count: 1`;
    if (this.zoneEl) this.zoneEl.textContent = `Current Zone: ${classification.toLowerCase()}`;
    if (this.eventEl) this.eventEl.textContent = `Last event: ${classification}`;
    if (this.cardStateEl) this.cardStateEl.textContent = `State: ${track.state} | ${classification}`;
    if (this.cardPosEl && track.xyz) {
      this.cardPosEl.textContent = `Position: X ${track.xyz.x.toFixed(1)} | Y ${track.xyz.y.toFixed(1)} | Z ${track.xyz.z.toFixed(1)}`;
    }
    if (this.cardConfEl) this.cardConfEl.textContent = `Confidence: ${confidencePct}%`;
    if (this.cardAEl) this.cardAEl.textContent = `ESP32-A: ${track.detectedBy === "ESP32-A" ? "LOCKED" : "SEARCHING"} | Distance: --`;
    if (this.cardBEl) this.cardBEl.textContent = `ESP32-B: ${track.detectedBy === "ESP32-B" ? "LOCKED" : "SEARCHING"} | Distance: --`;
    if (this.cardVolumeEl) this.cardVolumeEl.textContent = `15 FT Volume: ${classification === "INTERIOR" ? "INSIDE" : classification === "EXTERIOR" ? "EDGE/OUT" : classification === "TOPSIDE" ? "ABOVE" : "UNKNOWN"}`;
  }
}
