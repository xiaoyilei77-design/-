#!/usr/bin/env python3
"""Polish a CAD SVG while preserving every source path exactly."""

from __future__ import annotations

import hashlib
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)


def path_digest(root: ET.Element) -> tuple[int, str]:
    paths = [node.get("d", "") for node in root.iter(f"{{{SVG}}}path")]
    digest = hashlib.sha256("\n".join(paths).encode("utf-8")).hexdigest()
    return len(paths), digest


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: style_cad_snapshot.py INPUT.svg OUTPUT.svg")

    source = Path(sys.argv[1])
    destination = Path(sys.argv[2])
    root = ET.fromstring(source.read_text(encoding="utf-8"))
    before = path_digest(root)

    root.set("viewBox", "0 0 1200 900")
    root.set("role", "img")
    root.set("aria-labelledby", "cad-title cad-description")
    title = ET.Element(f"{{{SVG}}}title", {"id": "cad-title"})
    title.text = "方言语音控制开关外壳装配 CAD"
    description = ET.Element(f"{{{SVG}}}desc", {"id": "cad-description"})
    description.text = "依据当前工程 CAD 直接呈现的外框、载板、四键与导光结构装配关系。"
    root.insert(0, description)
    root.insert(0, title)

    outer_group = next(node for node in root if node.tag == f"{{{SVG}}}g")
    outer_group.set("stroke-width", "0.52")
    outer_group.set("stroke-linecap", "round")
    outer_group.set("stroke-linejoin", "round")
    outer_group.set("style", "filter:drop-shadow(0 1.5px 1.3px rgba(3,9,8,.55))")

    for node in outer_group.iter(f"{{{SVG}}}g"):
        stroke = node.get("stroke", "")
        if stroke == "rgb(0,0,0)":
            node.set("stroke", "#d7b87e")
            node.set("opacity", "0.96")
        elif stroke == "rgb(160,160,160)":
            node.set("stroke", "#6d7e75")
            node.set("opacity", "0.62")

    after = path_digest(root)
    if before != after:
        raise SystemExit(f"CAD geometry changed: before={before} after={after}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    ET.indent(root, space="  ")
    ET.ElementTree(root).write(destination, encoding="utf-8", xml_declaration=True)
    print(f"styled {destination}: paths={after[0]} geometry_sha256={after[1]}")


if __name__ == "__main__":
    main()
