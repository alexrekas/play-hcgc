"""
Build per-hole "lie maps" from the hole artwork.

Each hole SVG is drawn with a fixed palette (rough, fairway checker, green,
fringe ring, sand, water, cart paths). This script renders every hole exactly
the way HoleDiagram does (a 240x480 canvas, artwork letterboxed with
preserveAspectRatio="xMidYMid meet"), samples the colour under each cell of a
grid, and writes src/data/lieMaps.ts — a compact run-length-encoded grid the
hole screen uses to pre-select the lie where the player tapped.

Re-run whenever the artwork in public/hole-layouts/ changes:

    pip install playwright pillow && python -m playwright install chromium
    python scripts/build-lie-maps.py

Optional: pass --debug DIR to also write a colour-coded PNG overlay per hole.
"""
import json, pathlib, re, sys
from collections import Counter, deque

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SVG_DIR = ROOT / "public" / "hole-layouts"
OUT = ROOT / "src" / "data" / "lieMaps.ts"
LAYOUTS = ROOT / "src" / "data" / "holeSvgLayouts.ts"

CANVAS_W, CANVAS_H = 240, 480          # must match src/data/holeLayouts.ts
GRID_W, GRID_H = 120, 240              # one cell = 2x2 canvas units
PX = 4                                 # render pixels per canvas unit
BACKDROP = (255, 0, 255)               # anything still magenta = outside the course

# Palette -> surface. "n" = neutral (paths, markers, labels): resolved later
# to the nearest real surface.
PALETTE = {
    (0x5f, 0x6e, 0x38): "r",                     # rough
    (0x9a, 0xa2, 0x55): "f", (0x8d, 0x95, 0x4b): "f",
    (0x85, 0x8c, 0x48): "f", (0x8c, 0x98, 0x4e): "f",   # fairway checker
    (0xa9, 0xb0, 0x5c): "g",                     # green (also tee boxes)
    (0x78, 0x84, 0x48): "e",                     # fringe ring ("edge")
    (0xff, 0xed, 0xcb): "s",                     # sand
    (0xaa, 0xd3, 0xdf): "w",                     # water
    BACKDROP: "o",                               # outside the course = OB
    (0xff, 0xff, 0xff): "n", (0xbb, 0xbb, 0xbb): "n", (0x8f, 0x8f, 0x8f): "n",
    (0xd9, 0xd0, 0xc9): "n", (0xb9, 0xa9, 0x9c): "n",
    (0xec, 0x1c, 0x24): "n", (0x00, 0x66, 0xcc): "n", (0x23, 0x1f, 0x20): "n",
}
MAX_DIST2 = 18 ** 2   # pixels further than this from every palette colour are edge blends; ignored


def classify(rgb):
    best, bd = None, 1 << 30
    for c, k in PALETTE.items():
        d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2
        if d < bd:
            best, bd = k, d
    return best if bd <= MAX_DIST2 else None


def green_centres():
    text = LAYOUTS.read_text()
    out = {}
    for m in re.finditer(r"(\d+):\s*\{[^\n]*?green:\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+)", text):
        out[int(m.group(1))] = (float(m.group(2)), float(m.group(3)))
    return out


def render_hole(page, n):
    """Render hole n exactly as HoleDiagram does (240x480 canvas, artwork
    letterboxed with xMidYMid meet) over a magenta backdrop; return RGBA bytes."""
    import io
    from PIL import Image
    svg_url = (SVG_DIR / f"hole{n}.svg").as_uri()
    page.set_viewport_size({"width": CANVAS_W * PX, "height": CANVAS_H * PX})
    html = (
        f"<body style='margin:0;background:rgb{BACKDROP}'>"
        f"<svg width='{CANVAS_W * PX}' height='{CANVAS_H * PX}' viewBox='0 0 {CANVAS_W} {CANVAS_H}'"
        f" style='display:block'>"
        f"<image href='{svg_url}' x='0' y='0' width='{CANVAS_W}' height='{CANVAS_H}'"
        f" preserveAspectRatio='xMidYMid meet'/></svg></body>"
    )
    page.set_content(html)
    page.wait_for_timeout(200)
    png = page.screenshot()
    return Image.open(io.BytesIO(png)).convert("RGBA").tobytes()


def build_grid(data):
    W = CANVAS_W * PX
    cell = PX * CANVAS_W // GRID_W     # pixels per grid cell edge
    grid = []
    for gy in range(GRID_H):
        row = []
        for gx in range(GRID_W):
            votes = Counter()
            for yy in range(gy * cell, gy * cell + cell):
                for xx in range(gx * cell, gx * cell + cell):
                    i = (yy * W + xx) * 4
                    k = classify((data[i], data[i + 1], data[i + 2]))
                    if k:
                        votes[k] += 1
            row.append(votes.most_common(1)[0][0] if votes else "n")
        grid.append(row)
    return grid


def resolve(grid, green_xy):
    H, W = len(grid), len(grid[0])
    # 1) Light-green patches. The putting green is the one ringed by fringe
    #    (the green always has a fringe); every other light-green patch is a
    #    tee box, which plays like fairway. Fallback if no patch touches
    #    fringe: the patch nearest the flag.
    gx = min(W - 1, int(green_xy[0] * W))
    gy = min(H - 1, int((1 - green_xy[1]) * H))
    seen = [[False] * W for _ in range(H)]
    comps = []
    for y in range(H):
        for x in range(W):
            if grid[y][x] != "g" or seen[y][x]:
                continue
            comp, q = [], deque([(x, y)])
            seen[y][x] = True
            edge = ringed = 0
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                outside = []
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if not (0 <= nx < W and 0 <= ny < H):
                        outside.append("o")
                        continue
                    if grid[ny][nx] in ("g", "n"):
                        if not seen[ny][nx]:
                            seen[ny][nx] = True
                            q.append((nx, ny))
                    else:
                        outside.append(grid[ny][nx])
                if outside:
                    edge += 1
                    ringed += all(t == "e" for t in outside)
            # A real green is ringed by fringe almost all the way round; a tee
            # box only picks up "fringe" from anti-aliased edges here and there.
            ringed_by_fringe = edge > 0 and ringed / edge >= 0.7
            near_flag = min(abs(cx - gx) + abs(cy - gy) for cx, cy in comp)
            comps.append((comp, ringed_by_fringe, near_flag))
    greens = [c for c in comps if c[1]] or sorted(comps, key=lambda c: c[2])[:1]
    green_ids = {id(c) for c in greens}
    for c in comps:
        if id(c) in green_ids:
            continue
        for cx, cy in c[0]:
            if grid[cy][cx] == "g":
                grid[cy][cx] = "t"
    for y in range(H):
        for x in range(W):
            if grid[y][x] == "t":
                grid[y][x] = "f"
    # 2) Neutral cells (cart paths, markers, labels): take the nearest real surface.
    q = deque((x, y) for y in range(H) for x in range(W) if grid[y][x] != "n")
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and grid[ny][nx] == "n":
                grid[ny][nx] = grid[y][x]
                q.append((nx, ny))
    return grid


def rle(grid):
    s = "".join("".join(r) for r in grid)
    out, i = [], 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        n = j - i
        out.append(f"{n}{s[i]}" if n > 1 else s[i])
        i = j
    return "".join(out)


DEBUG_COLORS = {"r": (95, 110, 56), "f": (154, 200, 85), "g": (60, 230, 120), "e": (30, 120, 60),
                "s": (255, 230, 150), "w": (80, 160, 230), "o": (230, 70, 70)}


def main():
    debug_dir = None
    if "--debug" in sys.argv:
        debug_dir = pathlib.Path(sys.argv[sys.argv.index("--debug") + 1])
        debug_dir.mkdir(parents=True, exist_ok=True)
    greens = green_centres()
    maps = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page()
        page.goto(SVG_DIR.as_uri() + "/")
        for n in range(1, 19):
            grid = resolve(build_grid(render_hole(page, n)), greens[n])
            maps[n] = rle(grid)
            if debug_dir:
                from PIL import Image
                im = Image.new("RGB", (GRID_W, GRID_H))
                im.putdata([DEBUG_COLORS[c] for r in grid for c in r])
                im.resize((GRID_W * 3, GRID_H * 3), Image.NEAREST).save(debug_dir / f"lie{n}.png")
        b.close()

    body = ",\n".join(f'  {n}: "{maps[n]}"' for n in range(1, 19))
    OUT.write_text(
        "// GENERATED by scripts/build-lie-maps.py from public/hole-layouts/*.svg — do not edit by hand.\n"
        "//\n"
        f"// Each entry is a run-length-encoded {GRID_W}x{GRID_H} grid over the {CANVAS_W}x{CANVAS_H} hole canvas,\n"
        "// row by row from the top (green end). Letters: r rough, f fairway, g green,\n"
        "// e fringe, s sand, w water, o out of bounds. A number before a letter repeats it.\n\n"
        f"export const LIE_GRID_W = {GRID_W};\n"
        f"export const LIE_GRID_H = {GRID_H};\n\n"
        "export const LIE_MAPS: Record<number, string> = {\n" + body + ",\n};\n"
    )
    total = sum(len(v) for v in maps.values())
    print(f"wrote {OUT.relative_to(ROOT)} ({total:,} chars)")


if __name__ == "__main__":
    main()
