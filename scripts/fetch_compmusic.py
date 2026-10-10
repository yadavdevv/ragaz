"""Download pitch + tonic features for our ragas from the CompMusic Hindustani raga dataset.

    uv run python scripts/fetch_compmusic.py

Source: "Indian Art Music Raga Recognition Dataset (features)", Gulati et al.,
Zenodo 10.5281/zenodo.7278506, CC BY 4.0. The archive is 3.6 GB; this reads its
table of contents over HTTP range requests and fetches only the `.pitch` and
`.tonicFine` files of the recordings we need (a few MB each).
"""

import json
from pathlib import Path

from remotezip import RemoteZip

URL = "https://zenodo.org/records/7278506/files/Indian%20Art%20Music%20Raga%20Recognition%20Dataset%20(features).zip?download=1"
OUT = Path("data/external/compmusic")
WANTED = {"Bhūp": "bhupali", "Yaman kalyāṇ": "yaman", "Mālkauns": "malkauns"}
SUFFIXES = (".pitch", ".tonicFine")


def main() -> None:
    names = json.loads((OUT / "ragaId_to_ragaName_mapping.json").read_text())
    ids = {raga_id: WANTED[name] for raga_id, name in names.items() if name in WANTED}
    manifest = []
    with RemoteZip(URL) as z:
        members = [
            info
            for info in z.infolist()
            if info.filename.startswith("RagaDataset/Hindustani/features/")
            and info.filename.endswith(SUFFIXES)
            and info.filename.split("/")[3] in ids
        ]
        total = sum(m.file_size for m in members)
        print(f"{len(members)} files, {total / 1e6:.0f} MB to download")
        for info in members:
            raga = ids[info.filename.split("/")[3]]
            stem = Path(info.filename).name
            target = OUT / "features" / raga / stem
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                target.write_bytes(z.read(info.filename))
            if stem.endswith(".pitch"):
                manifest.append({"raga": raga, "artist": info.filename.split("/")[4], "file": str(target)})
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False))
    for raga in sorted(set(ids.values())):
        print(f"{raga}: {sum(m['raga'] == raga for m in manifest)} recordings")


if __name__ == "__main__":
    main()
