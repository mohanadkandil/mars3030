"""
Annotate the tomato timelapse video with simulated AI detection overlays.

Draws bounding boxes, labels, confidence scores, corner brackets, scan lines,
and HUD text onto each frame — then exports as a new video file.

Usage:
    python scripts/annotate_tomato_video.py

Input:  assets/tomatoes_grow.mp4
Output: public/tomatoes_grow_annotated.mp4
"""

import cv2
import numpy as np
import math
import os

INPUT = os.path.join(os.path.dirname(__file__), "..", "assets", "tomatoes_grow.mp4")
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "public", "tomatoes_grow_annotated.mp4")

# ── Detection definitions ──────────────────────────────────────────────
# Each detection is anchored in normalised coords (0-1) so it scales to any resolution.
# growth_range: (min, max) fraction of video progress where this detection appears.

PLANT_ANCHORS = [
    {"cx": 0.13, "cy": 0.35, "w": 0.12, "h": 0.30},
    {"cx": 0.30, "cy": 0.30, "w": 0.13, "h": 0.35},
    {"cx": 0.50, "cy": 0.32, "w": 0.11, "h": 0.32},
    {"cx": 0.68, "cy": 0.30, "w": 0.10, "h": 0.33},
    {"cx": 0.82, "cy": 0.33, "w": 0.10, "h": 0.30},
    {"cx": 0.22, "cy": 0.60, "w": 0.11, "h": 0.25},
    {"cx": 0.42, "cy": 0.62, "w": 0.10, "h": 0.22},
    {"cx": 0.60, "cy": 0.58, "w": 0.10, "h": 0.24},
    {"cx": 0.78, "cy": 0.60, "w": 0.09, "h": 0.22},
]

GROWTH_STAGES = [
    # (progress_threshold, labels, color_bgr)
    (0.00, ["Seedling", "Cotyledon", "Emerging", "Sprout"], (180, 100, 200)),       # purple
    (0.20, ["First Leaf", "Leaf Node", "Stem Growth", "Vegetative"], (230, 165, 14)),  # blue
    (0.45, ["Branching", "Flower Bud", "Flowering", "New Truss"], (14, 200, 100)),   # teal
    (0.65, ["Green Fruit", "Fruit Setting", "Truss Dev", "Unripe"], (0, 200, 0)),    # green
    (0.80, ["Turning", "Breaker", "Ripening", "Orange Fruit"], (0, 165, 255)),        # orange
    (0.90, ["Ripe Fruit", "Mature", "HARVEST READY", "Red Fruit"], (0, 220, 0)),     # bright green
]

INFRA_DETECTIONS = [
    # (norm_x, norm_y, norm_w, norm_h, label, color_bgr, show_every_n_frames, offset)
    (0.02, 0.01, 0.96, 0.05, "LED Grow Light — Active", (200, 140, 255), 90, 0),
    (0.05, 0.85, 0.90, 0.06, "Drip Irrigation — Flow OK", (210, 180, 6), 90, 45),
    (0.02, 0.08, 0.15, 0.04, "Temp 22.4C", (100, 200, 100), 120, 20),
    (0.83, 0.08, 0.15, 0.04, "RH 68%", (100, 200, 100), 120, 60),
]


def get_stage(progress: float):
    """Return (labels, color) for the current growth progress."""
    result = GROWTH_STAGES[0]
    for threshold, labels, color in GROWTH_STAGES:
        if progress >= threshold:
            result = (labels, color)
    return result


def jitter(frame_idx: int, seed: int, amp: float = 3.0) -> float:
    """Small sinusoidal jitter to mimic real-time tracking noise."""
    return amp * math.sin(frame_idx * 0.15 + seed * 2.7)


def draw_corner_brackets(img, x1, y1, x2, y2, color, thickness=2, length=12):
    """Draw corner brackets around a bounding box."""
    cv2.line(img, (x1, y1), (x1 + length, y1), color, thickness)
    cv2.line(img, (x1, y1), (x1, y1 + length), color, thickness)
    cv2.line(img, (x2, y1), (x2 - length, y1), color, thickness)
    cv2.line(img, (x2, y1), (x2, y1 + length), color, thickness)
    cv2.line(img, (x1, y2), (x1 + length, y2), color, thickness)
    cv2.line(img, (x1, y2), (x1, y2 - length), color, thickness)
    cv2.line(img, (x2, y2), (x2 - length, y2), color, thickness)
    cv2.line(img, (x2, y2), (x2, y2 - length), color, thickness)


def draw_label(img, text, x, y, color, font_scale=0.5, thickness=1):
    """Draw a label with background above a bounding box."""
    (tw, th), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
    # Background
    cv2.rectangle(img, (x, y - th - 8), (x + tw + 8, y), color, -1)
    # Text
    cv2.putText(img, text, (x + 4, y - 4), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)


def draw_scanlines(overlay, h, w, alpha=0.03, spacing=4):
    """Draw subtle horizontal scanlines."""
    for y in range(0, h, spacing):
        cv2.line(overlay, (0, y), (w, y), (255, 255, 255), 1)


def draw_hud(img, frame_idx, total_frames, progress, w, h):
    """Draw HUD text overlay."""
    font = cv2.FONT_HERSHEY_SIMPLEX
    # Top-left: zone info
    cv2.putText(img, f"ZONE A | TOMATO | 25m2", (15, 28),
                font, 0.5, (255, 255, 255, 80), 1, cv2.LINE_AA)
    # Bottom-left: model info
    sol = int(progress * 450)
    cv2.putText(img, f"REDHARVESTER CV v2.1 | YOLOv8-Crop | FPS 30 | SOL {sol} | FRAME {frame_idx}",
                (15, h - 15), font, 0.45, (200, 200, 200), 1, cv2.LINE_AA)
    # Top-right: REC indicator
    if (frame_idx // 15) % 2 == 0:  # blink
        cv2.circle(img, (w - 30, 22), 6, (0, 0, 255), -1)
        cv2.putText(img, "REC", (w - 70, 28), font, 0.45, (0, 0, 255), 1, cv2.LINE_AA)


def annotate_frame(img, frame_idx, total_frames):
    """Add all detection overlays to a single frame."""
    h, w = img.shape[:2]
    progress = frame_idx / max(total_frames - 1, 1)
    labels_list, det_color = get_stage(progress)

    # Scanline overlay (very subtle)
    scanline_overlay = np.zeros_like(img)
    draw_scanlines(scanline_overlay, h, w, spacing=4)
    cv2.addWeighted(scanline_overlay, 0.03, img, 1.0, 0, img)

    # Plant detections — cycle visibility so not all show every frame
    cycle = (frame_idx // 20) % 3  # cycle group every ~0.7s
    for i, anchor in enumerate(PLANT_ANCHORS):
        # Skip some detections each cycle for a scanning effect
        if (i + cycle) % 4 == 0:
            continue

        # Box grows with progress
        scale = 0.4 + progress * 0.6
        bw = int(anchor["w"] * w * scale)
        bh = int(anchor["h"] * h * scale)
        cx = int(anchor["cx"] * w + jitter(frame_idx, i, 3))
        cy = int(anchor["cy"] * h + jitter(frame_idx, i + 10, 2))
        x1 = max(0, cx - bw // 2)
        y1 = max(0, cy - bh // 2)
        x2 = min(w, cx + bw // 2)
        y2 = min(h, cy + bh // 2)

        label = labels_list[i % len(labels_list)]
        conf = 0.78 + (i % 7) * 0.03 + progress * 0.05
        conf = min(0.99, conf)
        label_text = f"{label} {conf * 100:.0f}%"

        # Semi-transparent fill inside box
        overlay = img.copy()
        cv2.rectangle(overlay, (x1, y1), (x2, y2), det_color, -1)
        cv2.addWeighted(overlay, 0.08, img, 0.92, 0, img)

        # Box outline
        cv2.rectangle(img, (x1, y1), (x2, y2), det_color, 1)

        # Corner brackets
        bracket_len = min(15, bw // 3, bh // 3)
        draw_corner_brackets(img, x1, y1, x2, y2, det_color, thickness=2, length=bracket_len)

        # Label
        draw_label(img, label_text, x1, y1, det_color, font_scale=0.45, thickness=1)

    # Infrastructure detections (periodic)
    for nx, ny, nw, nh, lbl, col, period, offset in INFRA_DETECTIONS:
        if (frame_idx + offset) % period < period // 3:
            ix1 = int(nx * w)
            iy1 = int(ny * h)
            ix2 = int((nx + nw) * w)
            iy2 = int((ny + nh) * h)
            cv2.rectangle(img, (ix1, iy1), (ix2, iy2), col, 1)
            draw_label(img, f"{lbl} 98%", ix1, iy1, col, font_scale=0.4, thickness=1)

    # HUD
    draw_hud(img, frame_idx, total_frames, progress, w, h)

    # Vignette
    vignette = np.zeros((h, w), dtype=np.float32)
    cv2.circle(vignette, (w // 2, h // 2), int(max(w, h) * 0.6), 1.0, -1)
    vignette = cv2.GaussianBlur(vignette, (301, 301), 0)
    vignette = np.clip(vignette * 0.5 + 0.5, 0.3, 1.0)  # lighten center, darken edges
    for c in range(3):
        img[:, :, c] = (img[:, :, c].astype(np.float32) * vignette).astype(np.uint8)

    return img


def main():
    cap = cv2.VideoCapture(INPUT)
    if not cap.isOpened():
        print(f"ERROR: Cannot open {INPUT}")
        return

    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"Input: {w}x{h} @ {fps:.1f}fps, {total} frames")
    print(f"Output: {OUTPUT}")

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(OUTPUT, fourcc, fps, (w, h))

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        annotated = annotate_frame(frame, frame_idx, total)
        out.write(annotated)

        frame_idx += 1
        if frame_idx % 50 == 0:
            pct = frame_idx / total * 100
            print(f"  {frame_idx}/{total} ({pct:.0f}%)")

    cap.release()
    out.release()
    print(f"Done! Wrote {frame_idx} frames to {OUTPUT}")


if __name__ == "__main__":
    main()
