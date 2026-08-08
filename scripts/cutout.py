import cv2
import numpy as np
from PIL import Image


def grabcut_alpha(bgr, rect_frac, iters=8):
    h, w = bgr.shape[:2]
    x0, y0, x1, y1 = rect_frac
    rect = (int(w * x0), int(h * y0), int(w * (x1 - x0)), int(h * (y1 - y0)))
    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, rect, bgd_model, fgd_model, iters, cv2.GC_INIT_WITH_RECT)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    return fg


def cutout(src_path, dst_path, rect_frac, pad_frac=0.03, feather=2.0):
    bgr = cv2.imread(src_path, cv2.IMREAD_COLOR)
    fg = grabcut_alpha(bgr, rect_frac)

    kernel = np.ones((3, 3), np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, kernel, iterations=1)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, kernel, iterations=2)

    n, labels, stats, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)
    if n > 1:
        largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        fg = np.where(labels == largest, 255, 0).astype(np.uint8)

    alpha = cv2.GaussianBlur(fg, (0, 0), feather)

    ys, xs = np.where(alpha > 10)
    if len(xs) == 0:
        raise RuntimeError(f'no foreground found in {src_path}')
    h, w = bgr.shape[:2]
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    pad_x = int((x1 - x0) * pad_frac) + 6
    pad_y = int((y1 - y0) * pad_frac) + 6
    x0 = max(0, x0 - pad_x)
    y0 = max(0, y0 - pad_y)
    x1 = min(w, x1 + pad_x)
    y1 = min(h, y1 + pad_y)

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    rgba = np.dstack([rgb, alpha])[y0:y1, x0:x1]
    out = Image.fromarray(rgba, mode='RGBA')
    out.save(dst_path)
    print(f'{src_path} -> {dst_path} {out.size}')


if __name__ == '__main__':
    # rect_frac = (x0, y0, x1, y1), 원본 이미지 대비 비율. 피사체를 넉넉히 감싸되
    # 배경 캔버스 텍스처는 최대한 rect 밖에 두어 grabCut이 배경/전경을 잘 분리하게 한다.
    jobs = [
        ('Generated Image August 08, 2026 - 8_35AM (1).jpg', 'public/tree-seed.png', (0.20, 0.15, 0.75, 0.85)),
        ('Generated Image August 08, 2026 - 8_35AM (2).jpg', 'public/tree-sprout.png', (0.28, 0.15, 0.68, 0.88)),
        ('Generated Image August 08, 2026 - 8_35AM (4).jpg', 'public/tree-full.png', (0.26, 0.05, 0.75, 0.90)),
        ('Generated Image August 08, 2026 - 8_35AM (5).jpg', 'public/tree-fruit.png', (0.24, 0.05, 0.73, 0.92)),
        ('Generated Image August 08, 2026 - 8_35AM.jpg', 'public/plant-tulip.png', (0.22, 0.12, 0.75, 0.90)),
        ('Generated Image August 08, 2026 - 8_35AM (3).jpg', 'public/plant-clover.png', (0.30, 0.20, 0.68, 0.85)),
        ('Generated Image August 08, 2026 - 8_35AM (6).jpg', 'public/plant-sunflower.png', (0.32, 0.06, 0.66, 0.92)),
        ('Generated Image August 08, 2026 - 8_36AM.jpg', 'public/pond.png', (0.02, 0.32, 0.98, 0.96)),
        ('Generated Image August 08, 2026 - 8_41AM.jpg', 'public/plant-rose.png', (0.30, 0.05, 0.67, 0.95)),
        ('Generated Image August 08, 2026 - 8_42AM.jpg', 'public/plant-hibiscus.png', (0.28, 0.06, 0.72, 0.95)),
    ]
    for src, dst, rect in jobs:
        cutout(src, dst, rect)
