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

"""Report advisory depth and risk clues for generated study course Markdown files.

Usage:
  python scripts/check-course-depth.py path/to/course-or-module

The report is advisory. It helps an agent notice thin sections, unusually long
modules, extraction traces, practice-section guidance leakage, or repeated lines
after generation; it is not a hard validation gate.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
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
EXTRACTION_TRACE_TERMS: Final[tuple[str, ...]] = tuple("PPT 第|PPT第|本页怎么学|原始内容整理|按页整理|抽取文本|抽取结果".split("|"))
TEMPLATE_TRACE_TERMS: Final[tuple[str, ...]] = tuple("先把这一页归到|它要么是在给定义，要么是在给公式|不要单独背这一页|输入、输出、核心思想、时间复杂度|参考答案应包含".split("|"))
PURE_PRACTICE_PATH_MARKERS: Final[tuple[str, ...]] = ("chapter-practice", "pure-practice", "only-questions")
PURE_PRACTICE_TITLE_MARKERS: Final[tuple[str, ...]] = tuple("纯题目|纯练习|只放题|章末练习|Chapter Practice".split("|"))
PURE_PRACTICE_FORBIDDEN_TERMS: Final[tuple[str, ...]] = tuple("本小节|先自己|做完|回看|参考答案|提示|解析".split("|"))
PURE_PRACTICE_FORBIDDEN_FIELDS: Final[tuple[str, ...]] = ("hints:",)
REPEATED_LINE_MIN_CHARS: Final[int] = 28
REPEATED_LINE_MIN_COUNT: Final[int] = 3


@dataclass(frozen=True, slots=True)
class MarkdownDepth:
    path: Path
    non_symbol_chars: int


@dataclass(frozen=True, slots=True)
class VisibleLine:
    line_no: int
    text: str


@dataclass(frozen=True, slots=True)
class ScanFinding:
    path: Path
    category: str
    detail: str
    line_no: int | None = None


def count_non_symbol_chars(markdown: str) -> int:
    """Count letters, digits, underscores, and CJK characters outside fenced blocks."""
    text = FENCED_BLOCK_PATTERN.sub("", markdown)
    return len(NON_SYMBOL_PATTERN.findall(text))


def visible_lines(markdown: str) -> list[VisibleLine]:
    """Return Markdown lines outside fenced code or study blocks."""
    lines: list[VisibleLine] = []
    in_fence = False
    for line_no, line in enumerate(markdown.splitlines(), start=1):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            lines.append(VisibleLine(line_no=line_no, text=line.strip()))
    return lines


def is_pure_practice_section(path: Path, lines: list[VisibleLine]) -> bool:
    """Return true when a section declares itself as question-only practice."""
    path_text = "/".join(part.lower() for part in path.parts)
    if any(marker in path_text for marker in PURE_PRACTICE_PATH_MARKERS):
        return True

    heading_text = "\n".join(line.text for line in lines[:8])
    return any(marker in heading_text for marker in PURE_PRACTICE_TITLE_MARKERS)


def repeated_line_key(text: str) -> str | None:
    """Normalize a learner-facing line for repeated-template detection."""
    normalized = re.sub(r"\s+", " ", text).strip()
    if len(normalized) < REPEATED_LINE_MIN_CHARS:
        return None
    if normalized.startswith(("#", "|", ">", "---")):
        return None
    return normalized


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


def scan_markdown_risks(depths: list[MarkdownDepth]) -> list[ScanFinding]:
    """Collect advisory generation-quality risk clues from course Markdown."""
    findings: list[ScanFinding] = []
    repeated_lines: defaultdict[str, list[ScanFinding]] = defaultdict(list)

    for item in depths:
        markdown = item.path.read_text(encoding="utf-8-sig")
        lines = visible_lines(markdown)
        pure_practice = is_pure_practice_section(item.path, lines)

        for line in lines:
            for term in EXTRACTION_TRACE_TERMS:
                if term in line.text:
                    findings.append(
                        ScanFinding(
                            path=item.path,
                            line_no=line.line_no,
                            category="extraction-trace",
                            detail=f"contains '{term}'",
                        ),
                    )
            for term in TEMPLATE_TRACE_TERMS:
                if term in line.text:
                    findings.append(
                        ScanFinding(
                            path=item.path,
                            line_no=line.line_no,
                            category="template-trace",
                            detail=f"contains '{term}'",
                        ),
                    )
            key = repeated_line_key(line.text)
            if key is not None:
                repeated_lines[key].append(
                    ScanFinding(
                        path=item.path,
                        line_no=line.line_no,
                        category="repeated-line",
                        detail=key,
                    ),
                )
        if pure_practice:
            for line in lines:
                for term in PURE_PRACTICE_FORBIDDEN_TERMS:
                    if term in line.text:
                        findings.append(
                            ScanFinding(
                                path=item.path,
                                line_no=line.line_no,
                                category="pure-practice-risk",
                                detail=f"question-only section has visible guidance '{term}'",
                            ),
                        )
            for line_no, raw_line in enumerate(markdown.splitlines(), start=1):
                for field in PURE_PRACTICE_FORBIDDEN_FIELDS:
                    if raw_line.strip().startswith(field):
                        findings.append(
                            ScanFinding(
                                path=item.path,
                                line_no=line_no,
                                category="pure-practice-risk",
                                detail=f"question-only study block uses pre-submit guidance field '{field}'",
                            ),
                        )

    for line, locations in repeated_lines.items():
        if len(locations) >= REPEATED_LINE_MIN_COUNT:
            first = locations[0]
            findings.append(
                ScanFinding(
                    path=first.path,
                    line_no=first.line_no,
                    category="repeated-line",
                    detail=f"same learner-facing line appears {len(locations)} times: {line[:100]}",
                ),
            )

    return findings


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

    print("Advisory course depth and risk report")
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
    findings = scan_markdown_risks(depths)
    print("Advisory risk scan:")
    if not findings:
        print("No extraction traces, pure-practice guidance leakage, or repeated lines found.")
    else:
        for finding in findings:
            location = relative_display(finding.path, root)
            if finding.line_no is not None:
                location = f"{location}:{finding.line_no}"
            print(f"{finding.category}\t{location}\t{finding.detail}")

    print()
    print("This report is advisory. It does not replace the blocking learner-perspective review.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
