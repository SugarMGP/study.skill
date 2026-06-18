"""Shared file and text helpers for the study.skill viewer."""

import json
import os
import re
from pathlib import Path
from urllib.parse import unquote


CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".md": "text/plain; charset=utf-8",
    ".json": "application/json; charset=utf-8",
}


def validate_slug(slug: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9._-]+$", slug))


def safe_resolve(base: Path, relative_path: str) -> Path:
    clean = unquote(relative_path).replace("\\", "/")
    clean = os.path.normpath(clean)
    if clean.startswith(".."):
        raise ValueError("path traversal")
    target = (base / clean).resolve()
    try:
        target.relative_to(base.resolve())
    except ValueError as exc:
        raise ValueError("path traversal") from exc
    return target


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def load_text(path: Path) -> str:
    with path.open("r", encoding="utf-8-sig") as file:
        return file.read()


def title_from_markdown(path: Path, fallback: str) -> str:
    if not path.exists():
        return fallback
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        text = line.strip()
        if text.startswith("# "):
            return text[2:].strip() or fallback
    return fallback


def label_from_id(identifier: str) -> str:
    return re.sub(r"^\d{2}-", "", identifier).replace("-", " ")


def content_type_for(path: Path) -> str:
    return CONTENT_TYPES.get(path.suffix.lower(), "application/octet-stream")
