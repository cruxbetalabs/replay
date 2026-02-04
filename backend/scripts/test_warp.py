import sys
from pathlib import Path

from cruxes import Cruxes

REF_IMAGE = (
    "/Users/tommyjtl/Documents/Crux Beta Labs LLC/projects/web/data/1/problem.jpg"
)
VIDEOS = [
    "/Users/tommyjtl/Documents/Crux Beta Labs LLC/projects/web/data/1/1.mov",
    "/Users/tommyjtl/Documents/Crux Beta Labs LLC/projects/web/data/1/2.mov",
]
WARP_TYPE = "fixed"  # either `dynamic` or `fixed`


def main() -> int:
    ref_image = Path(REF_IMAGE).expanduser().resolve()
    if not ref_image.exists():
        print(f"Reference image not found: {ref_image}")
        return 1

    cruxes = Cruxes()
    for video in VIDEOS:
        video_path = Path(video).expanduser().resolve()
        if not video_path.exists():
            print(f"Video not found: {video_path}")
            continue

        kwargs = {"warp_type": WARP_TYPE, "blend_mode": "none"}

        print(f"Warping {video_path} using {ref_image}...")
        cruxes.warp_video(str(ref_image), str(video_path), **kwargs)

    return 0


if __name__ == "__main__":
    sys.exit(main())
