export class ControlPanel {
  constructor() {
    this.state = {
      cameraMode: "orbit",
      targetFilter: 10,
      smoothing: 0.10,
      showSpheres: true,
      showAvatars: true,
      showFloorZones: true,
      showSignalPaths: true,
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
      orbit: "viewOrbit",
    };

    ["viewTop", "viewAbove", "viewSide", "viewPerspective", "viewOrbit"].forEach((id) => {
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

    this.#setActiveViewButton(this.state.cameraMode);
  }
}