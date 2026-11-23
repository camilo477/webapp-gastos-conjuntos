"""Reproduce the existing Lucide mountain in PNG using only Python's stdlib.

The opaque background and inset symbol keep the maskable safe area clear.
Original icon: Lucide 0.468.0, ISC (public/icons/LUCIDE-LICENSE).
"""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'icons'
POINTS = [(8, 3), (12, 11), (17, 6), (22, 21), (2, 21), (8, 3)]


def distance(x, y, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)))
    return ((x - a[0] - t * dx) ** 2 + (y - a[1] - t * dy) ** 2) ** .5


def png(size):
    rows = bytearray()
    # Icon occupies 60% of the square; all strokes fit inside the safe circle.
    scale = size * .6 / 24
    offset = size * .2
    points = [(offset + x * scale, offset + y * scale) for x, y in POINTS]
    for y in range(size):
        rows.append(0)
        for x in range(size):
            d = min(distance(x + .5, y + .5, a, b) for a, b in zip(points, points[1:]))
            opacity = max(0, min(1, scale - d + .5))
            rows.extend(round(bg * (1 - opacity) + fg * opacity) for bg, fg in zip((20, 99, 71), (255, 255, 255)))

    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))

    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')


if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    for filename, size in [('pwa-192.png', 192), ('pwa-512.png', 512), ('maskable-512.png', 512), ('apple-touch-icon.png', 180)]:
        (ROOT / filename).write_bytes(png(size))
