#!/usr/bin/env python3
"""
Makes your website photos small and fast. Your ORIGINAL photos are never touched.

How to use (in the VS Code terminal, inside your website folder):
    pip install pillow          (only the first time)
    python3 optimize_images.py images gallery

It creates new folders  images-fast  and  gallery-fast  with the same file names.
For the images folder it ALSO makes small copies in  images-fast/thumbs  (used by the
shop grid, so the page opens much faster).
Check a few photos, then copy everything from the "-fast" folders over the ones in
images/ and gallery/:
    cp -r images-fast/. images/
    cp -r gallery-fast/. gallery/
(same names, so nothing in your Google Sheet changes).

Sizes used:  product photos   max 1000 px wide
             gallery-N.jpg    max 1920 px wide   (laptop banner)
             mobile-N.jpg     max 1000 px wide   (phone banner)
"""
import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Please run this first:  pip install pillow")

QUALITY = 80
EXTS = (".jpg", ".jpeg", ".png")


def max_width(name):
    n = name.lower()
    if n.startswith("gallery-"):
        return 1920
    return 1000


THUMB_W = 500
THUMB_QUALITY = 78


def make_thumb(src, dst):
    im = ImageOps.exif_transpose(Image.open(src))
    if im.width > THUMB_W:
        im = im.resize((THUMB_W, round(im.height * THUMB_W / im.width)), Image.LANCZOS)
    if im.mode != "RGB":
        im = im.convert("RGB")
    # small copies are always JPEG data, saved under the SAME file name the site expects
    im.save(dst, "JPEG", quality=THUMB_QUALITY, optimize=True, progressive=True)


def fmt(b):
    return "%.0f KB" % (b / 1024) if b < 1024 * 1024 else "%.1f MB" % (b / 1024 / 1024)


def process(src, dst):
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)  # phone photos: keep them the right way up
    limit = max_width(os.path.basename(src))
    if im.width > limit:
        im = im.resize((limit, round(im.height * limit / im.width)), Image.LANCZOS)
    if src.lower().endswith(".png"):
        im.save(dst, "PNG", optimize=True)
    else:
        if im.mode != "RGB":
            im = im.convert("RGB")
        im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    # never make a file bigger than it was
    if os.path.getsize(dst) >= os.path.getsize(src):
        with open(src, "rb") as a, open(dst, "wb") as b:
            b.write(a.read())


def main(folders):
    before = after = count = 0
    for folder in folders:
        if not os.path.isdir(folder):
            print("Folder not found:", folder)
            continue
        out = folder.rstrip("/\\") + "-fast"
        os.makedirs(out, exist_ok=True)
        is_gallery = os.path.basename(os.path.abspath(folder)).lower() == "gallery"
        if not is_gallery:
            os.makedirs(os.path.join(out, "thumbs"), exist_ok=True)
        for name in sorted(os.listdir(folder)):
            if not name.lower().endswith(EXTS):
                continue
            src, dst = os.path.join(folder, name), os.path.join(out, name)
            try:
                process(src, dst)
            except Exception as e:
                print("  skipped", name, "-", e)
                continue
            b, a = os.path.getsize(src), os.path.getsize(dst)
            if not is_gallery:
                try:
                    make_thumb(src, os.path.join(out, "thumbs", name))
                except Exception as e:
                    print("  no small copy for", name, "-", e)
            before += b
            after += a
            count += 1
            print("  %-40s %9s -> %9s" % (name, fmt(b), fmt(a)))
            if name.lower().endswith(".png") and b > 200 * 1024:
                print("    tip: this is a PNG photo. Save it as .jpg for a much smaller file (then use the .jpg name in your sheet).")
    if count:
        print("\nDone: %d photos, %s -> %s (%.0f%% smaller)" % (count, fmt(before), fmt(after), 100 - 100 * after / max(before, 1)))
        print("Now copy them over your originals:")
        print("    cp -r images-fast/. images/")
        print("    cp -r gallery-fast/. gallery/")
    else:
        print("No photos found.")


if __name__ == "__main__":
    main(sys.argv[1:] or ["images", "gallery"])
