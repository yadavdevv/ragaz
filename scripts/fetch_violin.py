"""Fetch the picked Saraga violin stems, retrying while Zenodo is flaky (504s).

    uv run python scripts/fetch_violin.py

Saraga 1.5 (Zenodo 10.5281/zenodo.4301737), CC BY-NC-SA 4.0: research / non-commercial.
"""

import time
from pathlib import Path

from remotezip import RemoteIOError, RemoteZip

URL = "https://zenodo.org/records/4301737/files/saraga1.5_carnatic.zip?download=1"
ROOT = Path("data/external/saraga")


def out_path(i: int, name: str) -> Path:
    return ROOT / "violin" / (f"{i:02d}_" + name.split("/")[1].split(" at ")[0].replace(" ", "_") + ".mp3")


def main(max_attempts: int = 12) -> None:
    picks = (ROOT / "violin_picks.txt").read_text().splitlines()
    (ROOT / "violin").mkdir(parents=True, exist_ok=True)
    todo = [(i, n) for i, n in enumerate(picks) if not out_path(i, n).exists()]
    for attempt in range(1, max_attempts + 1):
        if not todo:
            break
        try:
            with RemoteZip(URL) as z:
                while todo:
                    i, name = todo[0]
                    out_path(i, name).write_bytes(z.read(name))
                    print(f"got {out_path(i, name).name}", flush=True)
                    todo.pop(0)
        except (RemoteIOError, OSError) as e:
            wait = min(600, 30 * 2 ** (attempt - 1))
            print(f"attempt {attempt}: {str(e)[:80]} — retrying in {wait}s ({len(todo)} left)", flush=True)
            time.sleep(wait)
    print("done" if not todo else f"gave up with {len(todo)} files missing", flush=True)


if __name__ == "__main__":
    main()
