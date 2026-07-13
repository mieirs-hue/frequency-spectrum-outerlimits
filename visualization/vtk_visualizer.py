from __future__ import annotations

import shutil
import subprocess
from typing import Callable


class VtkVisualizer:
    def __init__(self, device_positions, axis_limits, comparison_mode=False, always_on_top=False):
        try:
            import vtk  # type: ignore
        except Exception as exc:
            raise RuntimeError(
                "VTK is required for --visualizer vtk. Install with: python3 -m pip install vtk"
            ) from exc

        self.vtk = vtk
        self.device_positions = dict(device_positions)
        self.axis_limits = dict(axis_limits)
        self.comparison_mode = comparison_mode
        self.always_on_top = always_on_top

        self.render_window = vtk.vtkRenderWindow()
        self.render_window.SetWindowName("DensePose VTK Console")
        self.render_window.SetSize(1280, 820)

        self.interactor = vtk.vtkRenderWindowInteractor()
        self.interactor.SetRenderWindow(self.render_window)

        self.renderers = {}
        self.device_actors = {"main": {}, "compare": {}}
        self.motion_actors = {"main": {}, "compare": {}}
        self.trail_points = {"main": {}, "compare": {}}
        self.trail_lines = {"main": {}, "compare": {}}
        self.trail_poly_data = {"main": {}, "compare": {}}
        self.overlay_actors = {}

        if self.comparison_mode:
            main_renderer = vtk.vtkRenderer()
            compare_renderer = vtk.vtkRenderer()
            main_renderer.SetViewport(0.0, 0.0, 0.5, 1.0)
            compare_renderer.SetViewport(0.5, 0.0, 1.0, 1.0)
            self.render_window.AddRenderer(main_renderer)
            self.render_window.AddRenderer(compare_renderer)
            self.renderers["main"] = main_renderer
            self.renderers["compare"] = compare_renderer
        else:
            main_renderer = vtk.vtkRenderer()
            main_renderer.SetViewport(0.0, 0.0, 1.0, 1.0)
            self.render_window.AddRenderer(main_renderer)
            self.renderers["main"] = main_renderer

        for pane in self.renderers:
            self._setup_scene(pane)
            self._setup_camera(pane)

    def _create_sphere_actor(self, radius, color):
        vtk = self.vtk
        sphere = vtk.vtkSphereSource()
        sphere.SetRadius(radius)
        sphere.SetThetaResolution(24)
        sphere.SetPhiResolution(24)

        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputConnection(sphere.GetOutputPort())

        actor = vtk.vtkActor()
        actor.SetMapper(mapper)
        actor.GetProperty().SetColor(*color)
        return actor

    def _create_label_actor(self, text, position, renderer):
        vtk = self.vtk
        vector = vtk.vtkVectorText()
        vector.SetText(text)

        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputConnection(vector.GetOutputPort())

        actor = vtk.vtkFollower()
        actor.SetMapper(mapper)
        actor.SetScale(0.05, 0.05, 0.05)
        actor.SetPosition(position[0] + 0.06, position[1] + 0.04, position[2] + 0.03)
        actor.GetProperty().SetColor(0.95, 0.95, 0.95)
        actor.SetCamera(renderer.GetActiveCamera())
        return actor

    def _add_floor_grid(self, renderer):
        vtk = self.vtk
        xmin, xmax = self.axis_limits["x"]
        ymin, ymax = self.axis_limits["y"]
        zmin, _ = self.axis_limits["z"]

        append = vtk.vtkAppendPolyData()
        step = 0.2

        x = xmin
        while x <= xmax + 1e-9:
            line = vtk.vtkLineSource()
            line.SetPoint1(x, ymin, zmin)
            line.SetPoint2(x, ymax, zmin)
            append.AddInputConnection(line.GetOutputPort())
            x += step

        y = ymin
        while y <= ymax + 1e-9:
            line = vtk.vtkLineSource()
            line.SetPoint1(xmin, y, zmin)
            line.SetPoint2(xmax, y, zmin)
            append.AddInputConnection(line.GetOutputPort())
            y += step

        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputConnection(append.GetOutputPort())

        actor = vtk.vtkActor()
        actor.SetMapper(mapper)
        actor.GetProperty().SetColor(0.28, 0.28, 0.3)
        actor.GetProperty().SetLineWidth(1.0)
        renderer.AddActor(actor)

    def _create_overlay_actor(self, pane):
        vtk = self.vtk
        actor = vtk.vtkTextActor()
        actor.SetInput(f"{pane.upper()}\n(no frame yet)")
        actor.GetTextProperty().SetFontSize(16)
        actor.GetTextProperty().SetColor(0.95, 0.95, 0.95)
        actor.SetDisplayPosition(10, 10)
        return actor

    def _setup_scene(self, pane):
        vtk = self.vtk
        renderer = self.renderers[pane]

        axes = vtk.vtkAxesActor()
        axes.SetTotalLength(0.4, 0.4, 0.4)
        renderer.AddActor(axes)

        self._add_floor_grid(renderer)

        palette = [(1.0, 0.55, 0.1), (0.0, 0.76, 1.0)]
        for idx, (port, pos) in enumerate(sorted(self.device_positions.items())):
            color = palette[idx % len(palette)]

            device_actor = self._create_sphere_actor(radius=0.04, color=color)
            device_actor.SetPosition(*pos)
            renderer.AddActor(device_actor)
            self.device_actors[pane][port] = device_actor

            motion_actor = self._create_sphere_actor(radius=0.03, color=color)
            motion_actor.SetPosition(*pos)
            motion_actor.GetProperty().SetOpacity(0.92)
            renderer.AddActor(motion_actor)
            self.motion_actors[pane][port] = motion_actor

            label_actor = self._create_label_actor(port, pos, renderer)
            renderer.AddActor(label_actor)

            points = vtk.vtkPoints()
            lines = vtk.vtkCellArray()
            poly = vtk.vtkPolyData()
            poly.SetPoints(points)
            poly.SetLines(lines)

            mapper = vtk.vtkPolyDataMapper()
            mapper.SetInputData(poly)

            trail_actor = vtk.vtkActor()
            trail_actor.SetMapper(mapper)
            trail_actor.GetProperty().SetColor(*color)
            trail_actor.GetProperty().SetLineWidth(2.0)
            trail_actor.GetProperty().SetOpacity(0.45)
            renderer.AddActor(trail_actor)

            self.trail_points[pane][port] = points
            self.trail_lines[pane][port] = lines
            self.trail_poly_data[pane][port] = poly

        overlay = self._create_overlay_actor(pane)
        renderer.AddActor2D(overlay)
        self.overlay_actors[pane] = overlay

        renderer.SetBackground(0.07, 0.08, 0.11)

    def _setup_camera(self, pane):
        renderer = self.renderers[pane]
        xmin, xmax = self.axis_limits["x"]
        ymin, ymax = self.axis_limits["y"]
        zmin, zmax = self.axis_limits["z"]

        cx = 0.5 * (xmin + xmax)
        cy = 0.5 * (ymin + ymax)
        cz = 0.5 * (zmin + zmax)

        camera = renderer.GetActiveCamera()
        camera.SetPosition(cx + 2.0, cy + 1.8, cz + 1.6)
        camera.SetFocalPoint(cx, cy, cz)
        camera.SetViewUp(0.0, 0.0, 1.0)

    def _format_overlay(self, scene_frame):
        parser_metric = scene_frame.metrics.get("parser")
        calibration_metric = scene_frame.metrics.get("calibration")
        filter_metric = scene_frame.metrics.get("filter")
        detector_metric = scene_frame.metrics.get("detector")
        total_metric = scene_frame.metrics.get("total")

        parser_ms = parser_metric.avg_ms if parser_metric is not None else 0.0
        calibration_ms = calibration_metric.avg_ms if calibration_metric is not None else 0.0
        filter_ms = filter_metric.avg_ms if filter_metric is not None else 0.0
        detector_ms = detector_metric.avg_ms if detector_metric is not None else 0.0
        total_ms = total_metric.avg_ms if total_metric is not None else 0.0

        queue_lag = scene_frame.queue_lag_ms if scene_frame.queue_lag_ms is not None else 0.0
        health = scene_frame.health.state if scene_frame.health is not None else "UNKNOWN"
        breach_lines = []
        for name, metric in (
            ("parser", parser_metric),
            ("calibration", calibration_metric),
            ("filter", filter_metric),
            ("detector", detector_metric),
            ("total", total_metric),
        ):
            if metric is not None and metric.is_breached:
                breach_lines.append(
                    f"[!] {name} avg={metric.avg_ms:.2f}ms > budget={metric.budget_ms:.2f}ms"
                )

        breach_text = ""
        if breach_lines:
            breach_text = "\n" + "\n".join(breach_lines)

        return (
            f"source={scene_frame.source}\n"
            f"confidence={scene_frame.confidence:.2f} motion={scene_frame.motion_score:.1f}\n"
            f"parser={parser_ms:.3f}ms calib={calibration_ms:.3f}ms\n"
            f"filter={filter_ms:.3f}ms detector={detector_ms:.3f}ms total={total_ms:.3f}ms\n"
            f"queue_lag={queue_lag:.2f}ms health={health}{breach_text}"
        )

    def _update_pane(self, pane, scene_frame):
        vtk = self.vtk

        for port, point in scene_frame.points_by_port.items():
            if port in self.motion_actors[pane]:
                self.motion_actors[pane][port].SetPosition(*point)

        for port, trail in scene_frame.trails_by_port.items():
            if port not in self.trail_points[pane]:
                continue
            points = self.trail_points[pane][port]
            lines = self.trail_lines[pane][port]
            poly = self.trail_poly_data[pane][port]

            points.Reset()
            lines.Reset()

            if len(trail) >= 2:
                poly_line = vtk.vtkPolyLine()
                poly_line.GetPointIds().SetNumberOfIds(len(trail))

                for idx, xyz in enumerate(trail):
                    pid = points.InsertNextPoint(*xyz)
                    poly_line.GetPointIds().SetId(idx, pid)

                lines.InsertNextCell(poly_line)

            poly.Modified()

        self.overlay_actors[pane].SetInput(self._format_overlay(scene_frame))

    def update(self, scene_frame, compare_scene_frame=None):
        self._update_pane("main", scene_frame)
        if self.comparison_mode and compare_scene_frame is not None:
            self._update_pane("compare", compare_scene_frame)

        self.render_window.Render()

    def run(self, poll_callback: Callable, interval_ms=33):
        self.interactor.AddObserver("TimerEvent", poll_callback)
        self.interactor.CreateRepeatingTimer(int(interval_ms))
        self.render_window.Render()
        if self.always_on_top:
            self._try_set_always_on_top()
        self.interactor.Initialize()
        self.interactor.Start()

    def _try_set_always_on_top(self):
        # Best effort for Linux/X11 desktops. Safe no-op when wmctrl is unavailable.
        if shutil.which("wmctrl") is None:
            return
        try:
            subprocess.Popen(
                ["wmctrl", "-r", "DensePose VTK Console", "-b", "add,above"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            pass
