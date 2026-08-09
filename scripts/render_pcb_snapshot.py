#!/usr/bin/env python3
"""Render a presentation image directly from the saved V01 PCB route snapshot."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: render_pcb_snapshot.py INPUT.json OUTPUT.png")

    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    snapshot = json.loads(source.read_text(encoding="utf-8"))

    final_size = 1800
    supersample = 2
    canvas_size = final_size * supersample
    margin = 128 * supersample
    board_span = canvas_size - margin * 2
    board_mil = float(snapshot["board"]["widthMil"])
    scale = board_span / board_mil

    def point(x: float, y: float) -> tuple[int, int]:
        return (round(margin + x * scale), round(margin + y * scale))

    image = Image.new("RGB", (canvas_size, canvas_size), "#070b0a")
    backdrop = Image.new("RGBA", image.size, (0, 0, 0, 0))
    backdrop_draw = ImageDraw.Draw(backdrop)
    for radius, alpha in ((1450, 36), (1050, 42), (650, 36)):
        center = canvas_size // 2
        backdrop_draw.ellipse(
            (center - radius, center - radius, center + radius, center + radius),
            fill=(63, 126, 95, alpha),
        )
    backdrop = backdrop.filter(ImageFilter.GaussianBlur(210))
    image = Image.alpha_composite(image.convert("RGBA"), backdrop)

    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (margin + 34, margin + 48, canvas_size - margin + 34, canvas_size - margin + 48),
        radius=118,
        fill=(0, 0, 0, 190),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(54))
    image = Image.alpha_composite(image, shadow)

    draw = ImageDraw.Draw(image, "RGBA")
    board_box = (margin, margin, canvas_size - margin, canvas_size - margin)
    draw.rounded_rectangle(board_box, radius=104, fill="#15392f", outline="#77a48c", width=5)
    draw.rounded_rectangle(
        (margin + 24, margin + 24, canvas_size - margin - 24, canvas_size - margin - 24),
        radius=82,
        outline=(161, 204, 178, 50),
        width=3,
    )

    route_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    route_draw = ImageDraw.Draw(route_layer, "RGBA")
    route_colors = {1: (226, 111, 64, 220), 2: (83, 157, 207, 205)}
    glow_colors = {1: (235, 100, 51, 55), 2: (69, 144, 211, 45)}

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow, "RGBA")
    for route in snapshot["routes"]:
        for path in route["paths"]:
            coordinates = [point(x, y) for x, y in path["points"]]
            if len(coordinates) < 2:
                continue
            layer = int(path["layer"])
            width = max(5, round(float(path["widthMil"]) * scale))
            glow_draw.line(coordinates, fill=glow_colors[layer], width=width + 15, joint="curve")
            route_draw.line(coordinates, fill=route_colors[layer], width=width, joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(11))
    image = Image.alpha_composite(image, glow)
    image = Image.alpha_composite(image, route_layer)

    draw = ImageDraw.Draw(image, "RGBA")
    for pad in snapshot["pads"]:
        x, y = point(float(pad["x"]), float(pad["y"]))
        pad_width = max(10, round(float(pad["pad"][1]) * scale))
        pad_height = max(10, round(float(pad["pad"][2]) * scale))
        pad_box = (
            x - pad_width // 2,
            y - pad_height // 2,
            x + pad_width // 2,
            y + pad_height // 2,
        )
        if str(pad["pad"][0]).upper() in {"RECT", "ROUNDRECT"}:
            draw.rounded_rectangle(pad_box, radius=max(3, min(pad_width, pad_height) // 5), fill="#d9ad62", outline="#ffe1a6", width=2)
        else:
            draw.ellipse(pad_box, fill="#d9ad62", outline="#ffe1a6", width=2)

        hole = pad.get("hole")
        if hole and len(hole) >= 3 and float(hole[1]) > 0:
            hole_width = max(4, round(float(hole[1]) * scale))
            hole_height = max(4, round(float(hole[2]) * scale))
            draw.ellipse(
                (
                    x - hole_width // 2,
                    y - hole_height // 2,
                    x + hole_width // 2,
                    y + hole_height // 2,
                ),
                fill="#07100d",
            )

    for route in snapshot["routes"]:
        for via in route.get("vias", []):
            x, y = point(float(via["x"]), float(via["y"]))
            diameter = max(11, round(float(via["diameterMil"]) * scale))
            drill = max(5, round(float(via["drillMil"]) * scale))
            draw.ellipse(
                (x - diameter, y - diameter, x + diameter, y + diameter),
                fill="#d9ad62",
                outline="#ffe1a6",
                width=2,
            )
            draw.ellipse((x - drill, y - drill, x + drill, y + drill), fill="#07100d")

    image = image.convert("RGB").resize((final_size, final_size), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "PNG", optimize=True)


if __name__ == "__main__":
    main()
