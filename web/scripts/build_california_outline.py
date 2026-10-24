"""Build lib/geo/california-outline.json from US Census Bureau boundaries.

Source: the Census Bureau's cartographic boundary file for states (2023,
1:20,000,000, KML), which is public domain:
https://www2.census.gov/geo/tiger/GENZ2023/kml/cb_2023_us_state_20m.zip

Usage (standard library only):
    python3 -I build_california_outline.py path/to/cb_2023_us_state_20m.kml \
        > ../lib/geo/california-outline.json
"""

import json
import sys
import xml.etree.ElementTree as ET

NS = {"k": "http://www.opengis.net/kml/2.2"}
# Douglas–Peucker tolerance in degrees (about 1 km): plenty for a small map.
TOLERANCE = 0.01
DECIMALS = 3


def california_polygons(kml_path):
    root = ET.parse(kml_path).getroot()
    for placemark in root.iterfind(".//k:Placemark", NS):
        names = {
            data.get("name"): data.text
            for data in placemark.iterfind(".//k:SimpleData", NS)
        }
        if names.get("STATEFP") == "06":
            return placemark.iterfind(
                ".//k:Polygon/k:outerBoundaryIs/k:LinearRing/k:coordinates", NS
            )
    raise SystemExit("California (STATEFP 06) not found")


def parse_ring(text):
    points = []
    for pair in text.split():
        lon, lat = pair.split(",")[:2]
        points.append((float(lon), float(lat)))
    return points


def perpendicular_distance(point, start, end):
    (x, y), (x1, y1), (x2, y2) = point, start, end
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    return abs(dy * x - dx * y + x2 * y1 - y2 * x1) / (dx * dx + dy * dy) ** 0.5


def simplify(points, tolerance):
    """Douglas–Peucker, iterative so long coastlines don't hit recursion limits."""
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        index, distance = None, 0.0
        for i in range(first + 1, last):
            d = perpendicular_distance(points[i], points[first], points[last])
            if d > distance:
                index, distance = i, d
        if index is not None and distance > tolerance:
            keep[index] = True
            stack += [(first, index), (index, last)]
    return [p for p, k in zip(points, keep) if k]


def main(kml_path):
    rings = []
    for element in california_polygons(kml_path):
        ring = simplify(parse_ring(element.text), TOLERANCE)
        if len(ring) >= 4:  # drops islets too small to draw
            rings.append([[round(lon, DECIMALS), round(lat, DECIMALS)] for lon, lat in ring])
    rings.sort(key=len, reverse=True)
    json.dump(
        {
            "source": "US Census Bureau, cb_2023_us_state_20m (public domain), "
            f"simplified to {TOLERANCE} degrees",
            "rings": rings,
        },
        sys.stdout,
        separators=(",", ":"),
    )
    sys.stdout.write("\n")


if __name__ == "__main__":
    main(sys.argv[1])
