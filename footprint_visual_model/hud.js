export class MissionHUD {
  constructor() {
    this.bridgeStatus = document.getElementById("bridgeStatus");
    this.cameraModeLabel = document.getElementById("cameraModeLabel");
    this.zoneLabel = document.getElementById("zoneLabel");

    this.sensor = {
      A: {
        card: document.getElementById("sensorCardA"),
        connection: document.getElementById("sensorAConnection"),
        rssi: document.getElementById("sensorARssi"),
        quality: document.getElementById("sensorAQuality"),
      },
      B: {
        card: document.getElementById("sensorCardB"),
        connection: document.getElementById("sensorBConnection"),
        rssi: document.getElementById("sensorBRssi"),
        quality: document.getElementById("sensorBQuality"),
      },
    };

    this.targetLocation = document.getElementById("targetLocation");
    this.targetId = document.getElementById("targetId");
    this.targetAltitude = document.getElementById("targetAltitude");
    this.targetZone = document.getElementById("targetZone");
    this.targetConfidence = document.getElementById("targetConfidence");

    this.telemetryRate = document.getElementById("telemetryRate");
    this.renderRate = document.getElementById("renderRate");
    this.droppedPackets = document.getElementById("droppedPackets");
    this.cpuHealth = document.getElementById("cpuHealth");
    this.memoryHealth = document.getElementById("memoryHealth");

    this.logPanel = document.getElementById("missionLog");
    this.loggingEnabled = true;
    this.setLoggingEnabled(true);
    this.syncLogStorage();
  }

  log(message, isAlert = false) {
    if (!this.loggingEnabled) return;

    const line = document.createElement("div");
    line.className = `log-line${isAlert ? " alert" : ""}`;
    const ts = new Date().toTimeString().split(" ")[0];
    line.textContent = `[${ts}] ${message}`;
    this.logPanel.appendChild(line);
    this.logPanel.scrollTop = this.logPanel.scrollHeight;
    while (this.logPanel.childNodes.length > 80) {
      this.logPanel.removeChild(this.logPanel.firstChild);
    }

    this.syncLogStorage();
  }

  setLoggingEnabled(enabled) {
    this.loggingEnabled = !!enabled;
    try {
      localStorage.setItem("sf_mission_log_enabled", this.loggingEnabled ? "1" : "0");
      localStorage.setItem("sf_mission_log_updated_at", String(Date.now()));
    } catch {
      // Ignore storage errors in restricted browser contexts.
    }
  }

  syncLogStorage() {
    try {
      const entries = Array.from(this.logPanel.childNodes)
        .map((node) => String(node.textContent || "").trim())
        .filter(Boolean);
      localStorage.setItem("sf_mission_log_entries", JSON.stringify(entries));
      localStorage.setItem("sf_mission_log_updated_at", String(Date.now()));
    } catch {
      // Ignore storage errors in restricted browser contexts.
    }
  }

  setBridgeStatus(statusText, online) {
    this.bridgeStatus.textContent = statusText;
    this.bridgeStatus.style.color = online ? "#5df2a2" : "#ff6b8a";
  }

  setCameraMode(mode) {
    const labels = {
      top: "TOP VIEW",
      above: "ABOVE GROUND",
      side: "SIDE VIEW",
      perspective: "PERSPECTIVE",
      orbit: "3D ORBIT",
    };
    this.cameraModeLabel.textContent = labels[mode] || "3D ORBIT";
  }

  updateSensors(snapshot) {
    snapshot.forEach((node) => {
      const view = this.sensor[node.id];
      if (!view) return;

      view.card.classList.remove("online", "offline", "disabled");
      if (!node.enabled) {
        view.card.classList.add("disabled");
      } else if (node.online) {
        view.card.classList.add("online");
      } else {
        view.card.classList.add("offline");
      }

      const connection = node.enabled ? (node.online ? "ONLINE" : "OFFLINE") : "DISABLED";
      view.connection.textContent = connection;
      view.rssi.textContent = `RSSI: ${node.enabled ? node.rssi : "--"} dBm`;
      view.quality.textContent = `Signal: ${node.enabled ? node.quality : "--"}%`;
    });
  }

  updateTarget(snapshot) {
    if (!snapshot.active) {
      this.targetId.textContent = "TRACKER-IDLE";
      this.zoneLabel.textContent = snapshot.zone;
      this.targetLocation.textContent = "Location: --";
      this.targetAltitude.textContent = "Altitude: -- ft";
      this.targetZone.textContent = "Zone: --";
      this.targetConfidence.textContent = `Confidence: ${snapshot.confidence}% | Overlap: ${snapshot.overlapPct ?? 0}%`;
      return;
    }

    this.targetId.textContent = snapshot.trackerId || "TRACKER-AB";
    this.zoneLabel.textContent = snapshot.zone;
    this.targetLocation.textContent = `Location: ${snapshot.floor} | ${snapshot.sector}`;
    this.targetAltitude.textContent = `Altitude: ${snapshot.altitude} ft`;
    this.targetZone.textContent = `Zone: ${snapshot.zone} | Closest: ${snapshot.dominantSensor}`;
    this.targetConfidence.textContent = `Confidence: ${snapshot.confidence}% | Overlap: ${snapshot.overlapPct}%`;
  }

  updateRates(metrics) {
    this.telemetryRate.textContent = `Telemetry: ${metrics.telemetryHz} Hz`;
    this.renderRate.textContent = `Render: ${metrics.renderFps} FPS`;
    this.droppedPackets.textContent = `Dropped Packets: ${metrics.dropped} (total ${metrics.totalDropped})`;
  }

  updateSystemHealth(payload) {
    if (!payload || !payload.ok) return;
    this.cpuHealth.textContent = `Jetson CPU: ${payload.cpu_load_pct_est}%`;
    this.memoryHealth.textContent = `Memory: ${payload.mem_used_mb} / ${payload.mem_total_mb} MB`;
  }
}