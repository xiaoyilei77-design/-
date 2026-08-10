#!/usr/bin/env python3
"""Render a premium presentation image from the saved V01 PCB route snapshot."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


FINAL_SIZE = 2400
SUPERSAMPLE = 2
CANVAS_SIZE = FINAL_SIZE * SUPERSAMPLE
BOARD_LEFT = 245 * SUPERSAMPLE
BOARD_TOP = 338 * SUPERSAMPLE
BOARD_SIZE = 1910 * SUPERSAMPLE


def load_font(size: int, serif: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        ["/System/Library/Fonts/Supplemental/Songti.ttc", "/System/Library/Fonts/Songti.ttc"]
        if serif
        else [
            "/System/Library/Fonts/Hiragino Sans GB.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def radial_glow(size: tuple[int, int], center: tuple[int, int], radius: int, color: tuple[int, int, int], alpha: int) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = center
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(*color, alpha))
    return layer.filter(ImageFilter.GaussianBlur(radius // 2))


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: render_pcb_snapshot.py INPUT.json OUTPUT.png")

    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    snapshot = json.loads(source.read_text(encoding="utf-8"))
    route_count = len(snapshot["routes"])
    path_count = sum(len(route["paths"]) for route in snapshot["routes"])
    via_count = sum(len(route.get("vias", [])) for route in snapshot["routes"])
    pad_count = len(snapshot["pads"])

    expected = {
        "routeCount": route_count,
        "pathCount": path_count,
        "viaCount": via_count,
        "padCount": pad_count,
    }
    for key, actual in expected.items():
        declared = int(snapshot.get(key, actual))
        if declared != actual:
            raise SystemExit(f"snapshot count mismatch: {key} declared={declared} actual={actual}")

    board_mil = float(snapshot["board"]["widthMil"])
    scale = BOARD_SIZE / board_mil

    def point(x: float, y: float) -> tuple[int, int]:
        return (round(BOARD_LEFT + x * scale), round(BOARD_TOP + y * scale))

    image = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), "#050908")
    image = Image.alpha_composite(
        image,
        radial_glow(image.size, (CANVAS_SIZE // 2, 1120 * SUPERSAMPLE), 1450 * SUPERSAMPLE, (26, 98, 72), 56),
    )
    image = Image.alpha_composite(
        image,
        radial_glow(image.size, (1840 * SUPERSAMPLE, 560 * SUPERSAMPLE), 720 * SUPERSAMPLE, (145, 86, 40), 18),
    )

    draw = ImageDraw.Draw(image, "RGBA")
    grid_step = 120 * SUPERSAMPLE
    for value in range(0, CANVAS_SIZE + 1, grid_step):
        draw.line((value, 0, value, CANVAS_SIZE), fill=(166, 195, 178, 10), width=1)
        draw.line((0, value, CANVAS_SIZE, value), fill=(166, 195, 178, 10), width=1)

    title_font = load_font(54 * SUPERSAMPLE, serif=True)
    meta_font = load_font(19 * SUPERSAMPLE)
    legend_font = load_font(18 * SUPERSAMPLE)
    draw.text((BOARD_LEFT, 110 * SUPERSAMPLE), "PCB 全网路由", font=title_font, fill=(239, 229, 208, 244))
    draw.text(
        (BOARD_LEFT, 215 * SUPERSAMPLE),
        f"86 × 86 毫米  ·  {route_count} 个网络  ·  {path_count} 段走线  ·  {via_count} 个过孔",
        font=meta_font,
        fill=(174, 188, 178, 185),
    )

    legend_y = 203 * SUPERSAMPLE
    legend_items = (((225, 111, 61), "顶层走线"), ((74, 151, 213), "底层走线"), ((216, 173, 98), "焊盘 / 过孔"))
    legend_x = 1460 * SUPERSAMPLE
    for color, label in legend_items:
        draw.ellipse(
            (legend_x, legend_y, legend_x + 12 * SUPERSAMPLE, legend_y + 12 * SUPERSAMPLE),
            fill=(*color, 255),
        )
        draw.text((legend_x + 22 * SUPERSAMPLE, legend_y - 7 * SUPERSAMPLE), label, font=legend_font, fill=(188, 195, 188, 205))
        legend_x += 210 * SUPERSAMPLE

    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (
            BOARD_LEFT + 30 * SUPERSAMPLE,
            BOARD_TOP + 42 * SUPERSAMPLE,
            BOARD_LEFT + BOARD_SIZE + 30 * SUPERSAMPLE,
            BOARD_TOP + BOARD_SIZE + 42 * SUPERSAMPLE,
        ),
        radius=62 * SUPERSAMPLE,
        fill=(0, 0, 0, 206),
    )
    image = Image.alpha_composite(image, shadow.filter(ImageFilter.GaussianBlur(44 * SUPERSAMPLE)))

    board_box = (BOARD_LEFT, BOARD_TOP, BOARD_LEFT + BOARD_SIZE, BOARD_TOP + BOARD_SIZE)
    board_fill = Image.new("RGBA", image.size, (0, 0, 0, 0))
    board_draw = ImageDraw.Draw(board_fill, "RGBA")
    board_draw.rounded_rectangle(board_box, radius=52 * SUPERSAMPLE, fill=(16, 55, 45, 255), outline=(115, 160, 136, 210), width=3 * SUPERSAMPLE)
    board_draw.rounded_rectangle(
        (
            BOARD_LEFT + 17 * SUPERSAMPLE,
            BOARD_TOP + 17 * SUPERSAMPLE,
            BOARD_LEFT + BOARD_SIZE - 17 * SUPERSAMPLE,
            BOARD_TOP + BOARD_SIZE - 17 * SUPERSAMPLE,
        ),
        radius=40 * SUPERSAMPLE,
        outline=(190, 218, 199, 38),
        width=2 * SUPERSAMPLE,
    )
    image = Image.alpha_composite(image, board_fill)

    route_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    route_draw = ImageDraw.Draw(route_layer, "RGBA")
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow, "RGBA")
    route_colors = {1: (232, 112, 61, 232), 2: (74, 151, 213, 220)}
    route_highlights = {1: (255, 168, 112, 105), 2: (137, 202, 247, 90)}
    glow_colors = {1: (238, 102, 46, 50), 2: (64, 141, 218, 42)}

    for route in snapshot["routes"]:
        for path in route["paths"]:
            coordinates = [point(float(x), float(y)) for x, y in path["points"]]
            if len(coordinates) < 2:
                continue
            layer = int(path["layer"])
            width = max(5 * SUPERSAMPLE, round(float(path["widthMil"]) * scale))
            glow_draw.line(coordinates, fill=glow_colors[layer], width=width + 13 * SUPERSAMPLE, joint="curve")
            route_draw.line(coordinates, fill=route_colors[layer], width=width, joint="curve")
            route_draw.line(coordinates, fill=route_highlights[layer], width=max(2 * SUPERSAMPLE, width // 5), joint="curve")
    image = Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(9 * SUPERSAMPLE)))
    image = Image.alpha_composite(image, route_layer)

    details = Image.new("RGBA", image.size, (0, 0, 0, 0))
    detail_draw = ImageDraw.Draw(details, "RGBA")
    for pad in snapshot["pads"]:
        x, y = point(float(pad["x"]), float(pad["y"]))
        pad_width = max(10 * SUPERSAMPLE, round(float(pad["pad"][1]) * scale))
        pad_height = max(10 * SUPERSAMPLE, round(float(pad["pad"][2]) * scale))
        pad_box = (x - pad_width // 2, y - pad_height // 2, x + pad_width // 2, y + pad_height // 2)
        if str(pad["pad"][0]).upper() in {"RECT", "ROUNDRECT"}:
            detail_draw.rounded_rectangle(
                pad_box,
                radius=max(3 * SUPERSAMPLE, min(pad_width, pad_height) // 5),
                fill=(210, 163, 87, 255),
                outline=(255, 224, 165, 245),
                width=2 * SUPERSAMPLE,
            )
        else:
            detail_draw.ellipse(pad_box, fill=(210, 163, 87, 255), outline=(255, 224, 165, 245), width=2 * SUPERSAMPLE)

        hole = pad.get("hole")
        if hole and len(hole) >= 3 and float(hole[1]) > 0:
            hole_width = max(4 * SUPERSAMPLE, round(float(hole[1]) * scale))
            hole_height = max(4 * SUPERSAMPLE, round(float(hole[2]) * scale))
            detail_draw.ellipse(
                (x - hole_width // 2, y - hole_height // 2, x + hole_width // 2, y + hole_height // 2),
                fill=(4, 11, 9, 255),
                outline=(255, 231, 186, 105),
                width=SUPERSAMPLE,
            )

    for route in snapshot["routes"]:
        for via in route.get("vias", []):
            x, y = point(float(via["x"]), float(via["y"]))
            radius = max(6 * SUPERSAMPLE, round(float(via["diameterMil"]) * scale / 2))
            drill = max(3 * SUPERSAMPLE, round(float(via["drillMil"]) * scale / 2))
            detail_draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(211, 166, 93, 255), outline=(255, 227, 174, 245), width=2 * SUPERSAMPLE)
            detail_draw.ellipse((x - drill, y - drill, x + drill, y + drill), fill=(4, 11, 9, 255))

    image = Image.alpha_composite(image, details)
    image = image.convert("RGB").resize((FINAL_SIZE, FINAL_SIZE), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "PNG", optimize=True)
    print(f"rendered {destination}: routes={route_count} paths={path_count} vias={via_count} pads={pad_count} size={FINAL_SIZE}x{FINAL_SIZE}")


if __name__ == "__main__":
    main()
