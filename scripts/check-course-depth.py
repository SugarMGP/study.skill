#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///

# How to run:
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run directly (no venv, no pip install needed):
#      uv run scripts/check-course-depth.py path/to/course-or-module
# 3. Or make executable and run:
#      chmod +x scripts/check-course-depth.py && ./scripts/check-course-depth.py path/to/course-or-module

"""Report advisory depth counts for generated study course Markdown files.

Usage:
  python scripts/check-course-depth.py path/to/course-or-module

The report is advisory. It helps an agent notice thin sections or unusually
long modules after generation; it is not a hard validation gate.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Final


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


MIN_SECTION_CHARS: Final[int] = 1000
LONG_SECTION_CHARS: Final[int] = 2600
LONG_MODULE_CHARS: Final[int] = 12000
CONTENT_FILE_NAME: Final[str] = "content.md"
NON_SYMBOL_PATTERN: Final[re.Pattern[str]] = re.compile(r"[\w\u4e00-\u9fff]", re.UNICODE)
FENCED_BLOCK_PATTERN: Final[re.Pattern[str]] = re.compile(r"```.*?```", re.DOTALL)


@dataclass(frozen=True, slots=True)
class MarkdownDepth:
    path: Path
    non_symbol_chars: int


def count_non_symbol_chars(markdown: str) -> int:
    """Count letters, digits, underscores, and CJK characters outside fenced blocks."""
    text = FENCED_BLOCK_PATTERN.sub("", markdown)
    return len(NON_SYMBOL_PATTERN.findall(text))


def collect_markdown_depths(root: Path) -> list[MarkdownDepth]:
    """Collect depth counts for README, syllabus, module, and section Markdown files."""
    if root.is_file():
        paths = [root]
    else:
        paths = sorted(
            path
            for path in root.rglob("*.md")
            if path.name in {CONTENT_FILE_NAME, "README.md", "syllabus.md"}
        )

    return [
        MarkdownDepth(
            path=path,
            non_symbol_chars=count_non_symbol_chars(path.read_text(encoding="utf-8-sig")),
        )
        for path in paths
    ]


def is_course_root(root: Path) -> bool:
    """Return true when the checked root looks like a course directory."""
    return (root / "README.md").exists() or (root / "syllabus.md").exists()


def is_module_root(root: Path) -> bool:
    """Return true when the checked root looks like a module directory."""
    return (root / CONTENT_FILE_NAME).exists()


def is_section_content(path: Path, root: Path) -> bool:
    """Return true for section pages, not module prefaces."""
    if path.name != CONTENT_FILE_NAME or path.parent == root:
        return False
    if is_course_root(root):
        return path.parent.parent != root
    if is_module_root(root):
        return path.parent.parent == root
    return True


def relative_display(path: Path, root: Path) -> str:
    """Format paths relative to the checked root when possible."""
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Report advisory non-symbol character counts for study course Markdown.",
    )
    parser.add_argument("path", help="Course, module, section, or Markdown file to inspect.")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
        parser.error(f"path does not exist: {root}")

    depths = collect_markdown_depths(root)
    if not depths:
        print("No course Markdown files found.")
        return 0

    print("Advisory course depth report")
    print(f"Root: {root}")
    print(f"Section diagnostic: short < {MIN_SECTION_CHARS}, long > {LONG_SECTION_CHARS}")
    print()

    for item in depths:
        label = "ok"
        if is_section_content(item.path, root):
            if item.non_symbol_chars < MIN_SECTION_CHARS:
                label = "short: expand explanation/examples/practice unless intentionally narrow"
            elif item.non_symbol_chars > LONG_SECTION_CHARS:
                label = "long: consider split only if learner question changes"
        elif item.non_symbol_chars > LONG_MODULE_CHARS:
            label = "long module: trim redundancy or split mixed goals if needed"

        print(f"{relative_display(item.path, root)}\t{item.non_symbol_chars}\t{label}")

    print()
    print("This report is advisory. Keep useful source-backed material even if counts are high.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
