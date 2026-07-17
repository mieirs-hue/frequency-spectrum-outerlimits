export class ControlPanel {
  constructor() {
    this.state = {
      cameraMode: "orbit",
      targetFilter: 10,
      smoothing: 0.10,
      ceilingTransparency: 0.35,
      zPlaneSlice: 4.5,
      spectrumSphereScale: 1.50,
      showSpheres: true,
      showAvatars: true,
      showFloorZones: true,
      showSignalPaths: true,
      missionLogging: true,
      forceDebugAvatar: false,
      sensors: {
        A: true,
        B: true,
      },
    };

    this.listeners = [];
    this.#bind();
  }

  onChange(listener) {
    this.listeners.push(listener);
  }

  forceCameraMode(mode) {
    this.state.cameraMode = mode;
    this.#setActiveViewButton(mode);
    this.#emit(`view-${mode}`);
  }

  #emit(reason) {
    this.listeners.forEach((listener) => listener(this.state, reason));
  }

  #setActiveViewButton(mode) {
    const mapping = {
      top: "viewTop",
      above: "viewAbove",
      side: "viewSide",
      perspective: "viewPerspective",
      outer50: "viewOuter50",
      orbit: "viewOrbit",
    };

    ["viewTop", "viewAbove", "viewSide", "viewPerspective", "viewOuter50", "viewOrbit"].forEach((id) => {
      const node = document.getElementById(id);
      if (!node) return;
      node.classList.toggle("active", mapping[mode] === id);
    });
  }

  #bind() {
    const targetFilter = document.getElementById("targetFilter");
    const targetFilterValue = document.getElementById("targetFilterValue");
    const smoothing = document.getElementById("smoothing");
    const smoothingValue = document.getElementById("smoothingValue");
    const ceilingTransparency = document.getElementById("ceilingTransparency");
    const ceilingTransparencyValue = document.getElementById("ceilingTransparencyValue");
    const zPlaneSlice = document.getElementById("zPlaneSlice");
    const zPlaneSliceValue = document.getElementById("zPlaneSliceValue");
    const spectrumSphereScale = document.getElementById("spectrumSphereScale");
    const spectrumSphereScaleValue = document.getElementById("spectrumSphereScaleValue");

    targetFilter.addEventListener("input", (evt) => {
      this.state.targetFilter = Number(evt.target.value);
      targetFilterValue.textContent = `${this.state.targetFilter}%`;
      this.#emit("target-filter");
    });

    smoothing.addEventListener("input", (evt) => {
      this.state.smoothing = Number(evt.target.value);
      smoothingValue.textContent = this.state.smoothing.toFixed(2);
      this.#emit("smoothing");
    });

    ceilingTransparency.addEventListener("input", (evt) => {
      this.state.ceilingTransparency = Number(evt.target.value);
      ceilingTransparencyValue.textContent = this.state.ceilingTransparency.toFixed(2);
      this.#emit("ceiling-transparency");
    });

    zPlaneSlice.addEventListener("input", (evt) => {
      this.state.zPlaneSlice = Number(evt.target.value);
      zPlaneSliceValue.textContent = `${this.state.zPlaneSlice.toFixed(1)} ft`;
      this.#emit("z-plane-slice");
    });

    spectrumSphereScale.addEventListener("input", (evt) => {
      this.state.spectrumSphereScale = Number(evt.target.value);
      spectrumSphereScaleValue.textContent = `${this.state.spectrumSphereScale.toFixed(2)}x`;
      this.#emit("spectrum-sphere-scale");
    });

    const checkMap = [
      ["showSpheres", "showSpheres"],
      ["showAvatars", "showAvatars"],
      ["showFloorZones", "showFloorZones"],
      ["showSignalPaths", "showSignalPaths"],
      ["forceDebugAvatar", "forceDebugAvatar"],
    ];

    checkMap.forEach(([id, key]) => {
      const node = document.getElementById(id);
      node.addEventListener("change", (evt) => {
        this.state[key] = !!evt.target.checked;
        this.#emit(key);
      });
    });

    const cameraButtons = [
      ["viewTop", "top"],
      ["viewAbove", "above"],
      ["viewSide", "side"],
      ["viewPerspective", "perspective"],
      ["viewOuter50", "outer50"],
      ["viewOrbit", "orbit"],
    ];

    cameraButtons.forEach(([id, mode]) => {
      const node = document.getElementById(id);
      node.addEventListener("click", () => {
        this.state.cameraMode = mode;
        this.#setActiveViewButton(mode);
        this.#emit(`view-${mode}`);
      });
    });

    document.getElementById("resetCamera").addEventListener("click", () => {
      this.#emit("camera-reset");
    });

    document.getElementById("zoomIn").addEventListener("click", () => {
      this.#emit("zoom-in");
    });

    document.getElementById("zoomOut").addEventListener("click", () => {
      this.#emit("zoom-out");
    });

    document.getElementById("sensorAToggle").addEventListener("click", () => {
      this.state.sensors.A = !this.state.sensors.A;
      this.#emit("sensor-toggle-A");
    });

    document.getElementById("sensorBToggle").addEventListener("click", () => {
      this.state.sensors.B = !this.state.sensors.B;
      this.#emit("sensor-toggle-B");
    });

    document.getElementById("sensorACalibrate").addEventListener("click", () => {
      this.#emit("sensor-calibrate-A");
    });

    document.getElementById("sensorBCalibrate").addEventListener("click", () => {
      this.#emit("sensor-calibrate-B");
    });

    document.getElementById("toggleMissionLog").addEventListener("click", () => {
      this.state.missionLogging = !this.state.missionLogging;
      this.#updateMissionLogButton();
      this.#emit("mission-logging-toggle");
    });

    document.getElementById("openMissionLogPopout").addEventListener("click", () => {
      this.#emit("open-mission-log-popout");
    });

    this.#updateMissionLogButton();

    this.#setActiveViewButton(this.state.cameraMode);
  }

  #updateMissionLogButton() {
    const node = document.getElementById("toggleMissionLog");
    if (!node) return;
    node.textContent = this.state.missionLogging ? "MISSION LOG ON" : "MISSION LOG OFF";
    node.classList.toggle("active", this.state.missionLogging);
  }
}