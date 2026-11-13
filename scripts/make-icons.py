#!/usr/bin/env python3
"""Draw the app icons and the link-preview image: amber rings on near-black.

No dependencies — writes PNGs by hand. Run from the project root:

    python3 scripts/make-icons.py
"""
import math
import struct
import zlib

BG = (10, 10, 10)
AMBER = (255, 194, 51)


def png(path, width, height, pixel):
    rows = bytearray()
    for y in range(height):
        rows.append(0)
        for x in range(width):
            rows.extend(pixel(x, y))

    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)))
        f.write(chunk(b'IDAT', zlib.compress(bytes(rows), 9)))
        f.write(chunk(b'IEND', b''))


def rings(width, height, unit, specs, dot, glow=0.3):
    """specs: (radius, line width, strength) in `unit`s; dot: radius of the centre dot."""
    cx, cy = width / 2, height / 2

    def pixel(x, y):
        d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        light = 0.0
        # centre dot with a soft glow
        light += max(0.0, min(1.0, dot * unit - d + 0.5))
        light += glow * 1.5 * math.exp(-((d / (dot * unit * 2.4)) ** 2))
        for radius, line, strength in specs:
            off = abs(d - radius * unit)
            core = max(0.0, min(1.0, line * unit / 2 - off + 0.5))
            halo = glow * math.exp(-((off / (line * unit * 3.5)) ** 2))
            light += strength * (core + halo)
        light = min(1.0, light)
        return bytes(round(b + (a - b) * light) for a, b in zip(AMBER, BG))

    return pixel


ICON = [(0.20, 0.022, 0.95), (0.31, 0.016, 0.6), (0.42, 0.012, 0.32)]

for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
    png(f'public/{name}', size, size, rings(size, size, size, ICON, 0.07, glow=0.1))
    print('wrote', name)

OG = [(0.16, 0.006, 0.95), (0.30, 0.004, 0.6), (0.46, 0.004, 0.4), (0.64, 0.003, 0.26), (0.84, 0.003, 0.16)]
png('public/og.png', 1200, 630, rings(1200, 630, 630, OG, 0.035))
print('wrote og.png')
