#!/usr/bin/env python3
"""Safely write a study.skill JSON state file.

Usage:
  python scripts/write-state.py path/to/file.json < new-content.json
  python scripts/write-state.py path/to/file.json --input-file new-content.json

The script validates JSON, writes to .tmp, verifies the written JSON, backs up
the existing file to .bak, then atomically replaces the target. This prevents
partial writes and corrupted state files. Always use this script instead of
writing JSON directly (echo, write_to_file, etc.) for state persistence.
"""

import argparse
import json
import os
import sys
from pathlib import Path


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def read_payload(input_file):
    if input_file:
        return Path(input_file).read_text(encoding="utf-8-sig")
    return sys.stdin.read().lstrip("\ufeff")


def validate_json_file(path: Path) -> None:
    with path.open("r", encoding="utf-8-sig") as f:
        json.load(f)


def main() -> int:
    parser = argparse.ArgumentParser(description="Safely write a study.skill JSON state file.")
    parser.add_argument("target", help="Target JSON state file.")
    parser.add_argument("--input-file", help="Read JSON payload from a UTF-8 file instead of stdin.")
    args = parser.parse_args()

    target = Path(args.target)
    raw = read_payload(args.input_file)
    data = json.loads(raw)

    target.parent.mkdir(parents=True, exist_ok=True)
    backup = target.with_suffix(target.suffix + ".bak")
    tmp = target.with_suffix(target.suffix + ".tmp")

    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    validate_json_file(tmp)

    if target.exists():
        os.replace(target, backup)
    os.replace(tmp, target)
    validate_json_file(target)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
