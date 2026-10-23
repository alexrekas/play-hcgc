"""
Find where each tee set and the hole (pin) are on every hole map, and write
src/data/holeGeometry.ts.

How it reads the artwork (public/hole-layouts/holeN.svg):
  • Tee markers are pairs of tiny squares on the light-green tee boxes:
      blue #06c, white #fff, black #000. Each tee set = the midpoint of its pair.
  • The flag is the red pennant (#ec1c24); the pin is the bottom of its pole.
  • Diamond tees are not drawn on the maps, so the app starts Diamond from the
    Black markers (see src/lib/holeGeometry.ts).

Holes are rendered exactly the way HoleDiagram draws them (a 240x480 canvas,
artwork letterboxed with preserveAspectRatio="xMidYMid meet"), so the output
is in the app's normalized coords (x 0..1, y 0 = tee end, 1 = green end).

Re-run whenever the artwork changes:

    pip install playwright pillow && python -m playwright install chromium
    python scripts/build-hole-geometry.py [--debug DIR]
"""
import io, pathlib, sys
from collections import deque

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SVG_DIR = ROOT / "public" / "hole-layouts"
OUT = ROOT / "src" / "data" / "holeGeometry.ts"

W, H, PX = 240, 480, 6                       # canvas size (src/data/holeLayouts.ts) and render scale
TEEBOX = (0xa9, 0xb0, 0x5c)
FLAG = (0xec, 0x1c, 0x24)
MARKERS = {"blue": (0x00, 0x66, 0xcc), "white": (0xff, 0xff, 0xff), "black": (0x0a, 0x0a, 0x0a)}


def d2(c, ref):
    return sum((a - b) ** 2 for a, b in zip(c, ref))


def components(mask, w, h):
    seen = bytearray(w * h)
    for i in range(w * h):
        if not mask[i] or seen[i]:
            continue
        q = deque([i]); seen[i] = 1; pts = []
        while q:
            j = q.popleft(); pts.append(j)
            x, y = j % w, j // w
            for k in ((j + 1) if x + 1 < w else -1, (j - 1) if x > 0 else -1,
                      j + w if y + 1 < h else -1, j - w if y > 0 else -1):
                if k >= 0 and mask[k] and not seen[k]:
                    seen[k] = 1; q.append(k)
        yield pts


def render(page, n):
    url = (SVG_DIR / f"hole{n}.svg").as_uri()
    page.set_content(
        f"<body style='margin:0;background:#f0f'><svg width='{W*PX}' height='{H*PX}' "
        f"viewBox='0 0 {W} {H}' style='display:block'><image href='{url}' width='{W}' "
        f"height='{H}' preserveAspectRatio='xMidYMid meet'/></svg></body>")
    page.wait_for_timeout(250)
    return Image.open(io.BytesIO(page.screenshot())).convert("RGB")


def analyse(im):
    w, h = im.size
    data = list(im.getdata())
    red = [i for i, c in enumerate(data) if d2(c, FLAG) < 900]
    fx = sum(i % w for i in red) / len(red)
    fy = sum(i // w for i in red) / len(red)
    # Pin = lowest dark (pole) pixel just below/left of the pennant.
    pole = [(x, y) for y in range(int(fy), min(h, int(fy) + 20 * PX))
            for x in range(max(0, int(fx) - 8 * PX), min(w, int(fx) + 2 * PX))
            if sum(data[y * w + x]) < 200]
    pin = max(pole, key=lambda p: p[1]) if pole else (fx, fy)

    tees = {}
    for name, ref in MARKERS.items():
        mask = bytearray(1 if d2(c, ref) < 1600 else 0 for c in data)
        dots = []
        for pts in components(mask, w, h):
            if not (6 <= len(pts) <= 900):
                continue
            xs = [q % w for q in pts]; ys = [q // w for q in pts]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
            if x1 - x0 > 30 or y1 - y0 > 30:
                continue                                   # cart paths, labels
            cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
            if abs(cx - fx) < 25 * PX and abs(cy - fy) < 25 * PX:
                continue                                   # flagpole / green
            ring = [(x, y) for x in range(x0 - 2, x1 + 3) for y in (y0 - 2, y1 + 2)] + \
                   [(x, y) for y in range(y0 - 2, y1 + 3) for x in (x0 - 2, x1 + 2)]
            ring = [r for r in ring if 0 <= r[0] < w and 0 <= r[1] < h]
            on_box = sum(1 for (x, y) in ring if d2(data[y * w + x], TEEBOX) < 400)
            if ring and on_box / len(ring) > 0.3:          # sits on a tee box
                dots.append((cx, cy))
        if len(dots) != 2:
            raise SystemExit(f"hole: expected 2 {name} tee markers, found {len(dots)}")
        tees[name] = (sum(d[0] for d in dots) / 2, sum(d[1] for d in dots) / 2)
    return pin, tees


def norm(p):
    return f"{{ x: {p[0] / PX / W:.4f}, y: {1 - p[1] / PX / H:.4f} }}"


def main():
    debug = None
    if "--debug" in sys.argv:
        debug = pathlib.Path(sys.argv[sys.argv.index("--debug") + 1]); debug.mkdir(parents=True, exist_ok=True)
    lines = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": W * PX, "height": H * PX})
        page.goto(SVG_DIR.as_uri() + "/")      # same origin as the artwork so <image> loads
        for n in range(1, 19):
            im = render(page, n)
            pin, tees = analyse(im)
            lines.append(
                f"  {n}: {{ pin: {norm(pin)}, tees: {{ "
                + ", ".join(f"{k}: {norm(tees[k])}" for k in ("black", "blue", "white"))
                + " } },")
            if debug:
                dr = ImageDraw.Draw(im)
                for k, (x, y) in tees.items():
                    dr.ellipse([x - 18, y - 18, x + 18, y + 18], outline={"blue": "#00f", "white": "#fff", "black": "#000"}[k], width=5)
                dr.ellipse([pin[0] - 12, pin[1] - 12, pin[0] + 12, pin[1] + 12], outline="#f00", width=5)
                im.resize((im.width // 3, im.height // 3)).save(debug / f"hole{n}.png")
        b.close()
    OUT.write_text(
        "// GENERATED by scripts/build-hole-geometry.py from public/hole-layouts/*.svg — do not edit by hand.\n"
        "//\n"
        "// Pin (bottom of the flagpole) and the midpoint of each tee set's two markers,\n"
        "// in engine-normalized coords: x 0..1 left→right, y 0 = tee end, 1 = green end.\n\n"
        "export type MarkedTee = \"black\" | \"blue\" | \"white\";\n"
        "type Pt = { x: number; y: number };\n\n"
        "export const HOLE_GEOMETRY: Record<number, { pin: Pt; tees: Record<MarkedTee, Pt> }> = {\n"
        + "\n".join(lines) + "\n};\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
