#!/usr/bin/env python3
"""Style generated CAD SVG previews without changing their path geometry."""

from __future__ import annotations

import hashlib
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)


def geometry(root: ET.Element) -> tuple[int, str]:
    paths = [node.get("d", "") for node in root.iter(f"{{{SVG}}}path")]
    return len(paths), hashlib.sha256("\n".join(paths).encode()).hexdigest()


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: style_touch_cad_target.py INPUT.svg OUTPUT.svg front|assembly")
    source, destination, kind = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    root = ET.fromstring(source.read_text(encoding="utf-8"))
    before = geometry(root)
    root.set("role", "img")
    root.set("aria-labelledby", "cad-title cad-description")
    title = ET.Element(f"{{{SVG}}}title", {"id": "cad-title"})
    title.text = "四区齐平触控面目标结构" if kind == "front" else "四区齐平触控外壳目标装配"
    description = ET.Element(f"{{{SVG}}}desc", {"id": "cad-description"})
    description.text = "依据参数化 CAD 生成，匹配主页四块纵向齐平触控面；PCB 为后续适配占位体。"
    root.insert(0, description)
    root.insert(0, title)

    drawing = next(node for node in root if node.tag == f"{{{SVG}}}g")
    drawing.set("stroke-width", "0.58")
    drawing.set("stroke-linecap", "round")
    drawing.set("stroke-linejoin", "round")
    drawing.set("style", "filter:drop-shadow(0 1.5px 1.6px rgba(2,8,7,.58))")
    for group in drawing.iter(f"{{{SVG}}}g"):
        stroke = group.get("stroke", "")
        if stroke == "rgb(0,0,0)":
            group.set("stroke", "#d7b87e")
            group.set("opacity", "0.98")
        elif stroke == "rgb(160,160,160)":
            group.set("stroke", "#6f8579")
            group.set("opacity", "0.58")
    after = geometry(root)
    if before != after:
        raise SystemExit(f"CAD path geometry changed: {before} -> {after}")
    ET.indent(root, space="  ")
    ET.ElementTree(root).write(destination, encoding="utf-8", xml_declaration=True)
    print(f"styled {destination}: paths={after[0]} geometry_sha256={after[1]}")


if __name__ == "__main__":
    main()
