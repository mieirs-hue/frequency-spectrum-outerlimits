import os
import sys

ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from scripts.reolink_rtsp_probe import main


if __name__ == "__main__":
    main()
