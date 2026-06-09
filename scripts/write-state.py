#!/usr/bin/env python3
"""Safely write a study.skill JSON state file.

Usage:
  python scripts/write-state.py path/to/file.json < new-content.json

The script validates JSON from stdin, backs up the existing file to .bak, writes
to .tmp, then replaces the target.
"""

import json
import os
import sys
from pathlib import Path


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/write-state.py path/to/file.json < new-content.json", file=sys.stderr)
        return 2

    target = Path(sys.argv[1])
    raw = sys.stdin.read()
    data = json.loads(raw)

    target.parent.mkdir(parents=True, exist_ok=True)
    backup = target.with_suffix(target.suffix + ".bak")
    tmp = target.with_suffix(target.suffix + ".tmp")

    if target.exists():
        os.replace(target, backup)

    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, target)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
