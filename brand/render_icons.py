from PIL import Image, ImageDraw

BG = (242, 237, 226)
LAYERS = [
    ((136, 164), (326, 486), (516, 164), (199, 213, 196)),
    ((152, 182), (342, 504), (532, 182), (127, 162, 141)),
    ((168, 200), (358, 522), (548, 200), (51, 96, 78)),
]
STROKE = 74
SIZE = 1024
PAD = 0.86

xs = [p[0] for layer in LAYERS for p in layer[:3]]
ys = [p[1] for layer in LAYERS for p in layer[:3]]
x0, x1 = min(xs) - STROKE / 2, max(xs) + STROKE / 2
y0, y1 = min(ys) - STROKE / 2, max(ys) + STROKE / 2
s = SIZE * PAD / max(x1 - x0, y1 - y0)
tx = (SIZE - (x1 - x0) * s) / 2 - x0 * s
ty = (SIZE - (y1 - y0) * s) / 2 - y0 * s


def T(pt):
    return (pt[0] * s + tx, pt[1] * s + ty)


def render(size):
    base = SIZE if size >= 128 else size * 8
    k = base / SIZE
    img = Image.new("RGB", (base, base), BG)
    d = ImageDraw.Draw(img)
    w = STROKE * s * k
    r = w / 2
    for a, b, c, color in LAYERS:
        pts = [T(a), T(b), T(c)]
        pts = [(p[0] * k, p[1] * k) for p in pts]
        d.line(pts, fill=color, width=int(round(w)), joint="curve")
        for p in pts:
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)
    if base != size:
        img = img.resize((size, size), Image.LANCZOS)
    return img


for size in (16, 32, 48, 128, 512):
    render(size).save(f"/Users/conghua/code/verbia/brand/icons/icon{size}.png")

print("done")
