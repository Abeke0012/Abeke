"""Render the SELF burger commercial locally from the three keyframes.

Free fallback for the Higgsfield generation: camera moves, whip/zoom
transitions and a branded end card, 12 s, 1280x720, 30 fps.
Usage: python3 render.py  ->  self_burger.mp4
"""
import math
import os
import subprocess

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, DUR = 1280, 720, 30, 12.0
FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
RED = (214, 40, 40)


def load(name):
    img = Image.open(os.path.join(HERE, "keyframes", name)).convert("RGB")
    # Cover-fit to 16:9 with headroom for zooming.
    s = max(W * 1.35 / img.width, H * 1.35 / img.height)
    return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


K1, K2, K3 = load("k1_burger.png"), load("k2_explode.png"), load("k3_box_open.png")


def ease(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def cam(img, zoom=1.0, dx=0.0, dy=0.0, rot=0.0):
    """Crop a W x H view: zoom >= 1 pushes in, dx/dy pan in view fractions."""
    base = min(img.width / W, img.height / H) / 1.1  # keep a margin for pans
    cw, ch = W * base / zoom, H * base / zoom
    cx = min(max(img.width / 2 + dx * cw, cw / 2), img.width - cw / 2)
    cy = min(max(img.height / 2 + dy * ch, ch / 2), img.height - ch / 2)
    src = img
    if rot:
        src = img.rotate(rot, resample=Image.BICUBIC, center=(cx, cy))
    box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
    return src.resize((W, H), Image.BICUBIC, box=box)


def smear(frame, amount, vertical=True):
    """Directional motion blur by squashing and re-stretching."""
    if amount < 0.02:
        return frame
    k = 1 + amount * 24
    if vertical:
        small = frame.resize((W, max(8, round(H / k))), Image.BILINEAR)
    else:
        small = frame.resize((max(8, round(W / k)), H), Image.BILINEAR)
    return small.resize((W, H), Image.BILINEAR)


def zoom_blur(frame, amount):
    if amount < 0.02:
        return frame
    out = frame
    for i in range(1, 5):
        z = 1 + amount * 0.06 * i
        out = Image.blend(out, cam(frame, zoom=z), 0.35)
    return out


def end_card(bg, a):
    """Darken the closing box shot and draw the SELF wordmark."""
    dark = Image.blend(bg, Image.new("RGB", (W, H), (18, 10, 6)), 0.55 * a)
    d = ImageDraw.Draw(dark)
    rise = (1 - a) * 30
    big = ImageFont.truetype(FONT, 190)
    mid = ImageFont.truetype(FONT, 46)
    small = ImageFont.truetype(FONT, 30)

    def text(y, s, font, fill):
        w = d.textlength(s, font=font)
        col = tuple(round(c * a + 18 * (1 - a)) for c in fill)
        d.text(((W - w) / 2, y + rise), s, font=font, fill=col)
        return w

    wlen = text(210, "SELF", big, (255, 255, 255))
    # Red star after the wordmark.
    sx, sy, r = (W + wlen) / 2 + 42, 260 + rise, 26
    pts = [(sx + (r if i % 2 == 0 else r * 0.45) * math.cos(math.pi / 2 + i * math.pi / 5),
            sy - (r if i % 2 == 0 else r * 0.45) * math.sin(math.pi / 2 + i * math.pi / 5))
           for i in range(10)]
    d.polygon(pts, fill=tuple(round(c * a) for c in RED))
    text(420, "BURGERS", mid, RED)
    d.line([(W / 2 - 230, 485 + rise), (W / 2 + 230, 485 + rise)],
           fill=tuple(round(c * a) for c in RED), width=3)
    text(505, "MADE FRESH. MADE BOLD.", small, (240, 225, 205))
    return dark


def frame_at(t):
    # 0-3.2 s: burger rotates faster, lifts, camera pushes in and orbits.
    if t < 3.2:
        p = t / 3.2
        spin = math.sin(p * p * 14) * (1.5 + 4 * p)
        return cam(K1, zoom=1.0 + 0.3 * ease(p), dx=0.04 * math.sin(p * 3),
                   dy=0.06 * ease(p), rot=spin)
    # 3.2-4.0 s: zoom-punch into the explosion.
    if t < 4.0:
        p = (t - 3.2) / 0.8
        a = cam(K1, zoom=1.3 + 0.6 * p, dy=0.06, rot=6 * p)
        b = cam(K2, zoom=1.45 - 0.35 * ease(p))
        return zoom_blur(Image.blend(a, b, ease(p)), math.sin(p * math.pi))
    # 4.0-6.4 s: layers float, camera drifts up the stack.
    if t < 6.4:
        p = (t - 4.0) / 2.4
        return cam(K2, zoom=1.1 + 0.08 * p, dy=0.05 - 0.1 * ease(p),
                   rot=1.2 * math.sin(p * 2 * math.pi))
    # 6.4-7.4 s: everything falls; whip down onto the box.
    if t < 7.4:
        p = ease((t - 6.4) / 1.0)
        canvas = Image.new("RGB", (W, H * 2))
        canvas.paste(cam(K2, zoom=1.18, dy=-0.05), (0, 0))
        canvas.paste(cam(K3, zoom=1.3), (0, H))
        view = canvas.crop((0, round(p * H), W, round(p * H) + H))
        return smear(view, math.sin(p * math.pi))
    # 7.4-10.4 s: slow push-in on the open box.
    if t < 10.4:
        p = (t - 7.4) / 3.0
        return cam(K3, zoom=1.3 - 0.18 * ease(p), dx=0.03 * ease(p), rot=-1.5 * ease(p))
    # 10.4-12 s: end card over the box shot.
    p = (t - 10.4) / 1.6
    return end_card(cam(K3, zoom=1.12 + 0.05 * p, dx=0.03, rot=-1.5), ease(p * 1.6))


def main():
    out = os.path.join(HERE, "self_burger.mp4")
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
           "-preset", "medium", "-movflags", "+faststart", out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(int(DUR * FPS)):
        proc.stdin.write(frame_at(i / FPS).tobytes())
    proc.stdin.close()
    proc.wait()
    print(out)


if __name__ == "__main__":
    main()
