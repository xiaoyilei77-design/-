#!/usr/bin/env python3
"""Generate a measurement-gated four-zone touch enclosure target for the website."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import cadquery as cq
from cadquery import exporters


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE_ROOT = Path(os.environ.get(
    "V01_SOURCE_ROOT",
    Path.home() / "Documents/ai语音单火开关/AI语音多路灯控开关_V01",
))
SOURCE_PARAMS = SOURCE_ROOT / "mechanical/params_v01_single_board_evt_c_4key.json"
SOURCE_VALIDATION = SOURCE_ROOT / "mechanical/generated_single_board_evt_c_4key/V01_single_board_enclosure_validation_EVT.json"

WIDTH = 86.0
HEIGHT = 86.0
PANEL_RADIUS = 5.0
FACE_THICKNESS = 2.6
TOUCH_GAP = 0.72
TOUCH_INSET = 2.1
TOUCH_WIDTH = (WIDTH - TOUCH_INSET * 2 - TOUCH_GAP * 3) / 4
REAR_SHELL_WIDTH = 75.0
REAR_SHELL_DEPTH = 36.0
PCB_THICKNESS = 1.6
PCB_OFFSET_FROM_FACE = 9.5


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_text_export(path: Path) -> None:
    """Keep generated text CAD artifacts deterministic and diff-clean."""
    lines = path.read_text(encoding="utf-8").splitlines()
    path.write_text("\n".join(line.rstrip() for line in lines) + "\n", encoding="utf-8")


def box(width: float, height: float, z0: float, z1: float, radius: float = 0.0) -> cq.Workplane:
    body = cq.Workplane("XY", origin=(0, 0, z0)).box(width, height, z1 - z0, centered=(True, True, False))
    if radius:
        body = body.edges("|Z").fillet(radius)
    return body


def front_frame() -> cq.Workplane:
    outer = box(WIDTH, HEIGHT, 0.0, FACE_THICKNESS, PANEL_RADIUS)
    opening = box(WIDTH - TOUCH_INSET * 2, HEIGHT - TOUCH_INSET * 2, -0.2, FACE_THICKNESS + 0.2, PANEL_RADIUS - 1.8)
    return outer.cut(opening)


def touch_tiles() -> list[cq.Workplane]:
    first_x = -WIDTH / 2 + TOUCH_INSET + TOUCH_WIDTH / 2
    tiles: list[cq.Workplane] = []
    for index in range(4):
        x = first_x + index * (TOUCH_WIDTH + TOUCH_GAP)
        tile = box(TOUCH_WIDTH, HEIGHT - TOUCH_INSET * 2, 0.18, FACE_THICKNESS - 0.12, 1.35).translate((x, 0, 0))
        tiles.append(tile)
    return tiles


def light_windows() -> cq.Workplane:
    first_x = -WIDTH / 2 + TOUCH_INSET + TOUCH_WIDTH / 2
    parts = []
    for index in range(4):
        x = first_x + index * (TOUCH_WIDTH + TOUCH_GAP)
        parts.append(cq.Workplane("XY", origin=(x, -19.0, FACE_THICKNESS - 0.02)).circle(1.35).extrude(0.6).val())
    return cq.Workplane(obj=cq.Compound.makeCompound(parts))


def microphone_duct() -> cq.Workplane:
    return cq.Workplane("XY", origin=(36.5, -35.8, FACE_THICKNESS - 0.02)).circle(0.85).extrude(2.2)


def carrier() -> cq.Workplane:
    outer = box(82.0, 82.0, -6.5, -4.1, 3.8)
    inner = box(72.0, 72.0, -6.7, -3.9, 1.8)
    return outer.cut(inner)


def pcb_placeholder() -> cq.Workplane:
    board = box(82.0, 82.0, -PCB_OFFSET_FROM_FACE - PCB_THICKNESS, -PCB_OFFSET_FROM_FACE, 1.1)
    for x in (-30.15, 30.15):
        slot = cq.Workplane("XY", origin=(x, 0, -PCB_OFFSET_FROM_FACE - PCB_THICKNESS - 0.2)).rect(6.4, 4.2).extrude(PCB_THICKNESS + 0.4)
        board = board.cut(slot)
    return board


def rear_shell() -> cq.Workplane:
    outer = box(REAR_SHELL_WIDTH, REAR_SHELL_WIDTH, -REAR_SHELL_DEPTH - 6.7, -6.7, 3.2)
    inner = box(REAR_SHELL_WIDTH - 5.0, REAR_SHELL_WIDTH - 5.0, -REAR_SHELL_DEPTH - 4.2, -6.3, 1.4)
    shell = outer.cut(inner)
    cable = cq.Workplane("XZ", origin=(0, REAR_SHELL_WIDTH / 2 - 1.0, -20.0)).rect(52.0, 20.0).extrude(4.0, both=True)
    return shell.cut(cable)


def touch_electrode_placeholder() -> cq.Workplane:
    """A thin copper-envelope placeholder, not a representation of the current PCB."""
    first_x = -WIDTH / 2 + TOUCH_INSET + TOUCH_WIDTH / 2
    parts = []
    for index in range(4):
        x = first_x + index * (TOUCH_WIDTH + TOUCH_GAP)
        parts.append(box(TOUCH_WIDTH - 3.2, 67.0, -2.45, -2.25, 1.0).translate((x, 2.0, 0)).val())
    return cq.Workplane(obj=cq.Compound.makeCompound(parts))


def exploded(shape: cq.Workplane, dz: float) -> cq.Workplane:
    return shape.translate((0, 0, dz))


def compound(parts: list[cq.Workplane]) -> cq.Workplane:
    return cq.Workplane(obj=cq.Compound.makeCompound([part.val() for part in parts]))


def export_svg(shape: cq.Workplane, destination: Path, projection: tuple[float, float, float], width: int, height: int) -> None:
    exporters.export(
        shape,
        str(destination),
        opt={
            "width": width,
            "height": height,
            "marginLeft": 30,
            "marginTop": 30,
            "projectionDir": projection,
            "showHidden": True,
            "strokeWidth": 0.62,
        },
    )


def main() -> None:
    if not SOURCE_PARAMS.exists() or not SOURCE_VALIDATION.exists():
        raise SystemExit("current V01 mechanical sources are missing")
    source_validation = json.loads(SOURCE_VALIDATION.read_text(encoding="utf-8"))
    if source_validation["project"]["pcb_uuid"] != "84c829ce819b8774":
        raise SystemExit("V01 identity guard rejected the current mechanical source")

    PUBLIC.mkdir(parents=True, exist_ok=True)
    frame = front_frame()
    tiles = touch_tiles()
    lights = light_windows()
    mic = microphone_duct()
    rear = rear_shell()
    mount = carrier()
    pcb = pcb_placeholder()

    front = compound([frame, *tiles, lights, mic])
    electrodes = touch_electrode_placeholder()
    assembly = compound([
        exploded(front, 12.0),
        exploded(electrodes, 5.0),
        pcb,
        exploded(mount, -7.0),
        exploded(rear, -16.0),
    ])

    front_svg = PUBLIC / "cad-touch-front-target.svg"
    assembly_svg = PUBLIC / "cad-touch-assembly-target.svg"
    step_file = PUBLIC / "cad-touch-enclosure-target.step"
    stl_file = PUBLIC / "cad-touch-enclosure-target.stl"
    dxf_file = PUBLIC / "cad-touch-front-profile-target.dxf"

    export_svg(front, front_svg, (0.0, 0.0, 1.0), 1200, 900)
    export_svg(assembly, assembly_svg, (1.0, -1.0, 0.72), 1200, 900)

    style_script = ROOT / "scripts/style_touch_cad_target.py"
    subprocess.run([sys.executable, style_script, front_svg, front_svg, "front"], check=True)
    subprocess.run([sys.executable, style_script, assembly_svg, assembly_svg, "assembly"], check=True)

    cq.Assembly(name="FOUR_ZONE_TOUCH_TARGET_MEASUREMENT_GATED") \
        .add(frame, name="FRONT_FRAME", color=cq.Color(0.90, 0.86, 0.76)) \
        .add(compound(tiles), name="TOUCH_TILES_1_TO_4", color=cq.Color(0.96, 0.94, 0.88)) \
        .add(lights, name="LIGHT_WINDOWS", color=cq.Color(0.92, 0.60, 0.18)) \
        .add(mic, name="MICROPHONE_DUCT", color=cq.Color(0.40, 0.35, 0.28)) \
        .add(mount, name="CARRIER", color=cq.Color(0.22, 0.26, 0.24)) \
        .add(electrodes, name="TOUCH_ELECTRODE_PLACEHOLDER", color=cq.Color(0.74, 0.53, 0.18)) \
        .add(pcb, name="PCB_PLACEHOLDER_TO_BE_ADAPTED", color=cq.Color(0.05, 0.42, 0.21)) \
        .add(rear, name="REAR_SHELL", color=cq.Color(0.18, 0.20, 0.19)) \
        .export(str(step_file), exportType="STEP", mode="default")

    printable = compound([frame, *tiles, rear, mount])
    exporters.export(printable, str(stl_file), tolerance=0.05, angularTolerance=0.1)
    exporters.exportDXF(front.faces(">Z"), str(dxf_file))
    normalize_text_export(step_file)
    normalize_text_export(dxf_file)

    tile_x = [round(tile.val().Center().x, 4) for tile in tiles]
    tile_widths = [round(tile.val().BoundingBox().xlen, 4) for tile in tiles]
    report = {
        "schema": "FOUR_ZONE_TOUCH_ENCLOSURE_TARGET_V1",
        "source_identity": source_validation["project"],
        "source_params_sha256": sha256(SOURCE_PARAMS),
        "status": "DIGITAL_DESIGN_CANDIDATE_MEASUREMENT_GATED",
        "purpose": "match the website hero's four equal vertical flush touch zones before the PCB is adapted",
        "geometry": {
            "faceplate_mm": [WIDTH, HEIGHT, FACE_THICKNESS],
            "corner_radius_mm": PANEL_RADIUS,
            "touch_zone_count": len(tiles),
            "touch_zone_widths_mm": tile_widths,
            "touch_zone_centers_x_mm": tile_x,
            "touch_gap_mm": TOUCH_GAP,
            "light_window_count": 4,
            "microphone_aperture_count": 1,
            "rear_shell_envelope_mm": [REAR_SHELL_WIDTH, REAR_SHELL_WIDTH, REAR_SHELL_DEPTH],
            "pcb_placeholder_mm": [82.0, 82.0, PCB_THICKNESS],
        },
        "checks": {
            "faceplate_86x86": WIDTH == 86.0 and HEIGHT == 86.0,
            "four_independent_tiles": len(tiles) == 4,
            "equal_tile_widths": max(tile_widths) - min(tile_widths) <= 0.001,
            "four_light_windows": len(light_windows().val().Solids()) == 4,
            "front_valid": front.val().isValid(),
            "assembly_valid": assembly.val().isValid(),
        },
        "release_boundaries": {
            "pcb_adapted": False,
            "physical_fit_verified": False,
            "mains_release": False,
            "tooling_release": False,
            "commercial_release": False,
            "note": "The PCB body is a placeholder for envelope planning only. Replace it with the future adapted PCB and rerun mechanical checks before any physical release.",
        },
        "artifacts": {},
    }
    for path in (front_svg, assembly_svg, step_file, stl_file, dxf_file):
        report["artifacts"][path.name] = {"bytes": path.stat().st_size, "sha256": sha256(path)}
    if not all(report["checks"].values()):
        raise SystemExit(json.dumps(report["checks"], ensure_ascii=False, indent=2))
    report_path = PUBLIC / "cad-touch-enclosure-target.validation.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"result": "PASS_WITH_MEASUREMENT_GATES", **report["geometry"], "report": str(report_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
