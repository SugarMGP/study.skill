#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///

# How to run:
# 1. Install uv (if not installed):
#      curl -LsSf https://astral.sh/uv/install.sh | sh
# 2. Run directly (no venv, no pip install needed):
#      uv run scripts/check-course-depth.py path/to/course-or-module [--mode systematic] [--strict]
# 3. Or make executable and run:
#      chmod +x scripts/check-course-depth.py && ./scripts/check-course-depth.py path/to/course-or-module

"""Report depth, diagram, and risk diagnostics for generated study course Markdown files.

Usage:
  python scripts/check-course-depth.py path/to/course-or-module [--mode {system,systematic,exam,interview,speedrun}] [--strict]

By default the report is advisory (exit code 0). When --strict is passed,
blocking violations (sections below the mode character floor, main modules
with zero archify diagrams or zero exercises, handwaving phrases, extraction
traces, template placeholders, malformed math delimiters, or invalid archify
diagram syntax) return exit code 1.
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


MODE_MIN_SECTION_CHARS: Final[dict[str, int]] = {
    "system": 1600,
    "systematic": 1600,
    "exam": 1100,
    "interview": 1100,
    "speedrun": 800,
}
MIN_SECTION_CHARS: Final[int] = MODE_MIN_SECTION_CHARS["system"]
LEGACY_DIAGRAM_LANGS: Final[frozenset[str]] = frozenset({
    "mermaid",
    "plantuml",
    "puml",
    "graphviz",
    "dot",
    "d2",
    "vega-lite",
    "vegalite",
})
LONG_SECTION_CHARS: Final[int] = 5500
LONG_MODULE_CHARS: Final[int] = 25000
SUPPLEMENT_MODULE_ID: Final[str] = "99-content-supplements"
CONTENT_FILE_NAME: Final[str] = "content.md"
NON_SYMBOL_PATTERN: Final[re.Pattern[str]] = re.compile(r"[\w\u4e00-\u9fff]", re.UNICODE)
FENCED_BLOCK_PATTERN: Final[re.Pattern[str]] = re.compile(r"```.*?```", re.DOTALL)
FENCE_EXTRACT_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"^```([A-Za-z0-9_-]+)[ \t]*\n(.*?)^```[ \t]*$",
    re.MULTILINE | re.DOTALL,
)
EXTRACTION_TRACE_TERMS: Final[tuple[str, ...]] = tuple(
    "PPT 第|PPT第|原课件页|本页怎么学|原始内容整理|按页整理|抽取文本|抽取结果|本章对应 PPT|按 PPT 对应页学习|$\\(@\\{".split("|")
)
TEMPLATE_TRACE_TERMS: Final[tuple[str, ...]] = tuple(
    "先把这一页归到|它要么是在给定义，要么是在给公式|不要单独背这一页|输入、输出、核心思想、时间复杂度|参考答案应包含|参考思路|设计一道.*小规模手算题".split("|")
)
HANDWAVING_TERMS: Final[tuple[str, ...]] = tuple(
    "限于篇幅|此处不展开|这里不展开|读者可自行查阅|留给读者自己探索|具体实现略|细节略过|不再赘述底层".split("|")
)
PURE_PRACTICE_PATH_MARKERS: Final[tuple[str, ...]] = ("chapter-practice", "pure-practice", "only-questions")
PURE_PRACTICE_TITLE_MARKERS: Final[tuple[str, ...]] = tuple("纯题目|纯练习|只放题|章末练习|Chapter Practice".split("|"))
PURE_PRACTICE_FORBIDDEN_TERMS: Final[tuple[str, ...]] = tuple("本小节|先自己|做完|回看|参考答案|提示|解析".split("|"))
PURE_PRACTICE_FORBIDDEN_FIELDS: Final[tuple[str, ...]] = ("hints:",)
ANSWER_PLACEHOLDER_TERMS: Final[tuple[str, ...]] = tuple("参考答案应包含|参考思路|评分重点是|评分重点不是".split("|"))
SLIDE_HEADING_PATTERN: Final[re.Pattern[str]] = re.compile(r"^###\s*(原课件页|第\s*\d+\s*页|Page\s*\d+\s*of\s*PPT)", re.IGNORECASE)
MATH_COMMAND_DELIMITER_PATTERN: Final[re.Pattern[str]] = re.compile(r"(?<!\\)\\([()\[\]])")
DOUBLE_DOLLAR_PATTERN: Final[re.Pattern[str]] = re.compile(r"(?<!\\)(?<!\$)\$\$(?!\$)")
SINGLE_DOLLAR_PATTERN: Final[re.Pattern[str]] = re.compile(r"(?<!\\)(?<!\$)\$(?!\$)")
INLINE_CODE_PATTERN: Final[re.Pattern[str]] = re.compile(r"`[^`]*`")
CURRENCY_AMOUNT_PATTERN: Final[re.Pattern[str]] = re.compile(r"\d+(?:,\d{3})*(?:\.\d+)?")
REPEATED_LINE_MIN_CHARS: Final[int] = 28
REPEATED_LINE_MIN_COUNT: Final[int] = 3

ARCHIFY_TYPES: Final[frozenset[str]] = frozenset({
    "sequence",
    "workflow",
    "architecture",
    "dataflow",
    "lifecycle",
    "tree",
    "erd",
    "timeline",
    "waterfall",
})
KEY_VALUE_PATTERN: Final[re.Pattern[str]] = re.compile(r'([A-Za-z_][A-Za-z0-9_-]*)=("[^"]*"|\'[^\']*\'|\S+)')

# AI writing slop term patterns — advisory only
AI_SLOP_ZH_TERMS: Final[tuple[str, ...]] = tuple(
    "至关重要|深入探讨|格局|织锦|充满活力|在当今.*的背景下|"
    "随着.*的发展|人们越来越意识到|起到了.*的作用|为.*做出了贡献|"
    "面临着.*的挑战|具有重要的.*意义|展现出|蕴含着|下面我们将|在本文中|让我们深入探讨|"
    "我们来了解一下|继续加油|你已经很棒了|作为.*的证明|灵魂拷问|必背黄金|救命大招|一招破局|刻进脑海|考场死令|幸亏提前排了这个雷".split("|")
)
AI_SLOP_EN_TERMS: Final[tuple[str, ...]] = tuple(
    "showcase|tapestry[^a-z]|landscape[^a-z]|testament to|"
    "underscore|pivotal|delve into|foster|interplay|intricate|garner|enduring|"
    "vibrant|nestled|breathtaking|groundbreaking|renowned|stunning|seamless|"
    "intuitive|powerful|additionally|^crucial|highlight|align.with|enhancing|"
    "Here.s the thing|Let.s dive in|It.s not just|"
    "The question isn.t|I hope this helps|Great question".split("|")
)

STRICT_BLOCKING_CATEGORIES: Final[frozenset[str]] = frozenset({
    "short-section",
    "missing-diagram",
    "missing-exercise",
    "archify-syntax",
    "handwaving-trace",
    "extraction-trace",
    "template-trace",
    "template-answer",
    "pure-practice-risk",
    "math-delimiter",
    "slide-structure",
    "markdown-flatness",
})


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
    """Count letters, digits, underscores, and CJK characters outside non-prose fenced blocks."""
    def _keep_walkthrough(match: re.Match[str]) -> str:
        fence_line = match.group(0).splitlines()[0].lstrip("`").strip().lower()
        if fence_line in {"study-steps", "study-walkthrough", "study-tutor"}:
            return match.group(0)
        return ""
    text = FENCED_BLOCK_PATTERN.sub(_keep_walkthrough, markdown)
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


def malformed_math_lines(lines: list[VisibleLine]) -> list[int]:
    """Return lines with mismatched LaTeX command or single-dollar delimiters."""
    malformed: set[int] = set()
    stack: list[tuple[str, int]] = []
    closer_for = {"(": ")", "[": "]"}
    double_dollar_opened_at: int | None = None

    for line in lines:
        text = INLINE_CODE_PATTERN.sub("", line.text)
        for match in MATH_COMMAND_DELIMITER_PATTERN.finditer(text):
            token = match.group(1)
            if token in closer_for:
                stack.append((token, line.line_no))
            elif not stack or closer_for[stack[-1][0]] != token:
                malformed.add(line.line_no)
            else:
                stack.pop()

        for _ in DOUBLE_DOLLAR_PATTERN.finditer(text):
            if double_dollar_opened_at is None:
                double_dollar_opened_at = line.line_no
            else:
                double_dollar_opened_at = None

        dollars = [match for match in SINGLE_DOLLAR_PATTERN.finditer(text) if not is_currency_marker(text, match)]
        if dollars:
            malformed.add(line.line_no)

    malformed.update(line_no for _, line_no in stack)
    if double_dollar_opened_at is not None:
        malformed.add(double_dollar_opened_at)
    return sorted(malformed)


def is_currency_marker(text: str, marker: re.Match[str]) -> bool:
    """Return true for an unclosed dollar-prefixed amount such as '$5,' or '$5 USD'."""
    amount = CURRENCY_AMOUNT_PATTERN.match(text, marker.end())
    if amount is None:
        return False
    remainder = text[amount.end():]
    if not remainder:
        return True
    if remainder.startswith("$"):
        return False
    if remainder[0] in ",，。.!！?？;；:：/":
        return True
    if remainder[0].isspace():
        next_token = remainder.lstrip()
        return not next_token.startswith(("+", "-", "*", "/", "=", "^", "$"))
    return False


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
    return (root / CONTENT_FILE_NAME).exists() and any(
        child.is_dir() and (child / CONTENT_FILE_NAME).exists()
        for child in root.iterdir()
    )


def is_section_content(path: Path, root: Path) -> bool:
    """Return true for section pages, not module prefaces."""
    if path.name != CONTENT_FILE_NAME:
        return False
    if root.is_file():
        return True
    if path.parent == root:
        return not is_module_root(root) and not is_course_root(root)
    if is_course_root(root):
        return path.parent.parent != root
    if is_module_root(root):
        return path.parent.parent == root
    return True


def module_name_for_item(path: Path, root: Path) -> str:
    """Resolve the owning module directory name for a course Markdown file."""
    if root.is_file():
        return path.parent.parent.name if path.parent.name != root.parent.name else path.parent.name
    try:
        rel = path.relative_to(root)
    except ValueError:
        return path.parent.name
    parts = rel.parts
    if is_course_root(root):
        return parts[0] if len(parts) > 1 else "root"
    if is_module_root(root):
        return root.name
    return path.parent.name


def parse_header_kv(line: str) -> dict[str, str]:
    """Parse key=value pairs from an archify or study-steps header line."""
    attrs: dict[str, str] = {}
    for match in KEY_VALUE_PATTERN.finditer(line):
        key = match.group(1).lower()
        raw_val = match.group(2)
        if len(raw_val) >= 2 and raw_val[0] == raw_val[-1] and raw_val[0] in {'"', "'"}:
            raw_val = raw_val[1:-1]
        attrs[key] = raw_val.strip()
    return attrs


def scan_archify_blocks(depths: list[MarkdownDepth]) -> list[ScanFinding]:
    """Validate ```archify and ```study-steps syntax in course Markdown files."""
    findings: list[ScanFinding] = []
    for item in depths:
        markdown = item.path.read_text(encoding="utf-8-sig")
        diagram_ids: set[str] = set()
        step_targets: list[tuple[int, str]] = []

        for match in FENCE_EXTRACT_PATTERN.finditer(markdown):
            lang = match.group(1).strip().lower()
            body = match.group(2)
            start_line = markdown.count("\n", 0, match.start()) + 1
            raw_lines = [
                (start_line + idx, line.strip())
                for idx, line in enumerate(body.splitlines(), start=1)
                if line.strip() and not line.strip().startswith("#")
            ]

            if lang == "archify":
                if not raw_lines:
                    findings.append(ScanFinding(
                        path=item.path,
                        line_no=start_line,
                        category="archify-syntax",
                        detail="empty ```archify block; expected header 'type=<type> id=<id> title=\"...\"' and pipe rows",
                    ))
                    continue
                header_line_no, header_text = raw_lines[0]
                attrs = parse_header_kv(header_text)
                dtype = attrs.get("type", "").lower()
                did = attrs.get("id", "")
                if dtype not in ARCHIFY_TYPES:
                    findings.append(ScanFinding(
                        path=item.path,
                        line_no=header_line_no,
                        category="archify-syntax",
                        detail=f"invalid or missing archify type '{dtype}'; must be one of {sorted(ARCHIFY_TYPES)}",
                    ))
                if did:
                    if did in diagram_ids:
                        findings.append(ScanFinding(
                            path=item.path,
                            line_no=header_line_no,
                            category="archify-syntax",
                            detail=f"duplicate archify diagram id '{did}' in the same file",
                        ))
                    diagram_ids.add(did)
                pipe_rows = [row for row in raw_lines[1:] if "|" in row[1]]
                if not pipe_rows:
                    findings.append(ScanFinding(
                        path=item.path,
                        line_no=header_line_no,
                        category="archify-syntax",
                        detail="archify diagram has no pipe-separated data rows",
                    ))
                for row_line_no, row_text in pipe_rows:
                    stripped_row = row_text.strip("|").strip()
                    cells = [c.strip() for c in stripped_row.split("|")]
                    if len(cells) < 2 or not cells[0]:
                        findings.append(ScanFinding(
                            path=item.path,
                            line_no=row_line_no,
                            category="archify-syntax",
                            detail=f"malformed archify pipe row: '{row_text[:60]}'",
                        ))

            elif lang in LEGACY_DIAGRAM_LANGS:
                findings.append(ScanFinding(
                    path=item.path,
                    line_no=start_line,
                    category="archify-syntax",
                    detail=f"legacy diagram fence ```{lang} is not supported; use ```archify instead",
                ))

            elif lang == "study-steps":
                if not raw_lines:
                    findings.append(ScanFinding(
                        path=item.path,
                        line_no=start_line,
                        category="archify-syntax",
                        detail="empty ```study-steps block; expected 'diagram=<id>' header and step rows",
                    ))
                    continue
                header_line_no, header_text = raw_lines[0]
                attrs = parse_header_kv(header_text)
                target_diagram = attrs.get("diagram", "")
                if not target_diagram:
                    findings.append(ScanFinding(
                        path=item.path,
                        line_no=header_line_no,
                        category="archify-syntax",
                        detail="study-steps header missing 'diagram=<diagram-id>'",
                    ))
                else:
                    step_targets.append((header_line_no, target_diagram))
                step_rows = [row for row in raw_lines[1:] if "|" in row[1]]
                if not step_rows:
                    findings.append(ScanFinding(
                        path=item.path,
                        line_no=header_line_no,
                        category="archify-syntax",
                        detail="study-steps block has no pipe-separated step rows",
                    ))

        for line_no, target_diagram in step_targets:
            if target_diagram not in diagram_ids:
                findings.append(ScanFinding(
                    path=item.path,
                    line_no=line_no,
                    category="archify-syntax",
                    detail=f"study-steps references unknown diagram id '{target_diagram}' in this file",
                ))

    return findings


def scan_markdown_risks(depths: list[MarkdownDepth]) -> list[ScanFinding]:
    """Collect generation-quality risk clues from course Markdown."""
    findings: list[ScanFinding] = []
    repeated_lines: defaultdict[str, list[ScanFinding]] = defaultdict(list)

    for item in depths:
        markdown = item.path.read_text(encoding="utf-8-sig")
        lines = visible_lines(markdown)
        pure_practice = is_pure_practice_section(item.path, lines)
        for line_no in malformed_math_lines(lines):
            findings.append(
                ScanFinding(
                    path=item.path,
                    line_no=line_no,
                    category="math-delimiter",
                    detail="formula delimiter is unsupported or asymmetric; use \\(...\\), \\[...\\], or $$...$$ and keep single $ for currency",
                ),
            )

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
                if re.search(term, line.text):
                    findings.append(
                        ScanFinding(
                            path=item.path,
                            line_no=line.line_no,
                            category="template-trace",
                            detail=f"contains '{term}'",
                        ),
                    )
            for term in HANDWAVING_TERMS:
                if term in line.text:
                    findings.append(
                        ScanFinding(
                            path=item.path,
                            line_no=line.line_no,
                            category="handwaving-trace",
                            detail=f"contains handwaving shortcut '{term}'; expand the mechanism instead of skipping",
                        ),
                    )
            for term in AI_SLOP_ZH_TERMS:
                if re.search(term, line.text):
                    findings.append(
                        ScanFinding(
                            path=item.path,
                            line_no=line.line_no,
                            category="ai-slop-zh",
                            detail=f"contains AI writing pattern '{term}'",
                        ),
                    )
            for term in AI_SLOP_EN_TERMS:
                if re.search(term, line.text, re.IGNORECASE):
                    findings.append(
                        ScanFinding(
                            path=item.path,
                            line_no=line.line_no,
                            category="ai-slop-en",
                            detail=f"contains AI writing pattern '{term}'",
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


def scan_study_block_answers(depths: list[MarkdownDepth]) -> list[ScanFinding]:
    """Scan study-* blocks for template placeholder answers."""
    findings: list[ScanFinding] = []
    for item in depths:
        markdown = item.path.read_text(encoding="utf-8-sig")
        in_study_block = False
        for line_no, raw_line in enumerate(markdown.splitlines(), start=1):
            stripped = raw_line.strip()
            if stripped.startswith("```study-") and not stripped.startswith("```study-steps"):
                in_study_block = True
                continue
            if in_study_block and stripped == "```":
                in_study_block = False
                continue
            if in_study_block and stripped.startswith("answer:"):
                for term in ANSWER_PLACEHOLDER_TERMS:
                    if term in stripped:
                        findings.append(ScanFinding(
                            path=item.path,
                            line_no=line_no,
                            category="template-answer",
                            detail=f"study-* answer contains placeholder '{term}' instead of concrete answer",
                        ))
    return findings


def scan_markdown_flatness(depths: list[MarkdownDepth], root: Path) -> list[ScanFinding]:
    """Ensure non-practice section pages use ## subheadings, **bold** signposts, and lists/callouts instead of flat text walls."""
    findings: list[ScanFinding] = []
    for item in depths:
        if not is_section_content(item.path, root):
            continue
        mod_name = module_name_for_item(item.path, root)
        if mod_name == SUPPLEMENT_MODULE_ID or SUPPLEMENT_MODULE_ID in item.path.parts:
            continue
        markdown = item.path.read_text(encoding="utf-8-sig")
        lines = visible_lines(markdown)
        if is_pure_practice_section(item.path, lines):
            continue

        prose = FENCED_BLOCK_PATTERN.sub("", markdown)
        h2_count = len(re.findall(r"^##\s+\S+", prose, flags=re.MULTILINE))
        bold_count = len(re.findall(r"\*\*[^*\n]+\*\*", prose))
        list_count = len(re.findall(r"^\s*(?:[-*]|\d+\.)\s+\S+", prose, flags=re.MULTILINE))
        callout_count = len(re.findall(r"^>\s*\S+", prose, flags=re.MULTILINE))

        if h2_count == 0:
            findings.append(ScanFinding(
                path=item.path,
                category="markdown-flatness",
                detail="section has 0 '##' subheadings; use topic-specific '##' headings to structure the lesson and build page TOC",
            ))
        if bold_count == 0:
            findings.append(ScanFinding(
                path=item.path,
                category="markdown-flatness",
                detail="section has 0 '**bold**' spans; use bold for key terms, list anchors, and core takeaways instead of flat plain text",
            ))
        if list_count == 0 and callout_count == 0:
            findings.append(ScanFinding(
                path=item.path,
                category="markdown-flatness",
                detail="section has 0 bullet/numbered lists and 0 blockquotes/callouts; use lists or '> [!TIP]' callouts to break up plain paragraph walls",
            ))
    return findings


def scan_slide_structure(depths: list[MarkdownDepth]) -> list[ScanFinding]:
    """Detect slide-by-slide content organization (5+ consecutive page-numbered headings)."""
    findings: list[ScanFinding] = []
    for item in depths:
        markdown = item.path.read_text(encoding="utf-8-sig")
        consecutive = 0
        first_line = 0
        for line_no, raw_line in enumerate(markdown.splitlines(), start=1):
            if SLIDE_HEADING_PATTERN.match(raw_line.strip()):
                if consecutive == 0:
                    first_line = line_no
                consecutive += 1
            else:
                if consecutive >= 5:
                    findings.append(ScanFinding(
                        path=item.path,
                        line_no=first_line,
                        category="slide-structure",
                        detail=f"{consecutive} consecutive page-numbered headings; content may be per-slide dump instead of concept-organized",
                    ))
                consecutive = 0
        if consecutive >= 5:
            findings.append(ScanFinding(
                path=item.path,
                line_no=first_line,
                category="slide-structure",
                detail=f"{consecutive} consecutive page-numbered headings; content may be per-slide dump instead of concept-organized",
            ))
    return findings


def count_blocks_by_module(depths: list[MarkdownDepth], root: Path) -> tuple[dict[str, int], dict[str, int]]:
    """Count study-* exercise blocks and ```archify diagram blocks per module directory."""
    exercise_counts: dict[str, int] = defaultdict(int)
    diagram_counts: dict[str, int] = defaultdict(int)
    for item in depths:
        if item.path.name in {"README.md", "syllabus.md"}:
            continue
        mod = module_name_for_item(item.path, root)
        if mod == "root":
            continue
        exercise_counts.setdefault(mod, 0)
        diagram_counts.setdefault(mod, 0)
        markdown = item.path.read_text(encoding="utf-8-sig")
        for match in FENCE_EXTRACT_PATTERN.finditer(markdown):
            lang = match.group(1).strip().lower()
            if lang in {"study-choice", "study-truefalse", "study-input"}:
                exercise_counts[mod] += 1
            elif lang == "archify":
                diagram_counts[mod] += 1
    return dict(exercise_counts), dict(diagram_counts)


def relative_display(path: Path, root: Path) -> str:
    """Format paths relative to the checked root when possible."""
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Report depth, diagram, and risk diagnostics for study course Markdown.",
    )
    parser.add_argument("path", help="Course, module, section, or Markdown file to inspect.")
    parser.add_argument(
        "--mode",
        choices=tuple(MODE_MIN_SECTION_CHARS.keys()),
        default="system",
        help="Course mode used to select minimum section character threshold (default: systematic).",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with code 1 when blocking depth, diagram, or quality violations are found.",
    )
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
        parser.error(f"path does not exist: {root}")

    depths = collect_markdown_depths(root)
    if not depths:
        print("No course Markdown files found.")
        return 0

    min_chars = MODE_MIN_SECTION_CHARS[args.mode]
    mode_tag = "Strict gate" if args.strict else "Advisory"
    print(f"{mode_tag} course depth and risk report (mode={args.mode})")
    print(f"Root: {root}")
    print(f"Section diagnostic: short < {min_chars}, long > {LONG_SECTION_CHARS}")
    print()

    findings: list[ScanFinding] = []
    for item in depths:
        label = "ok"
        markdown = item.path.read_text(encoding="utf-8-sig")
        lines = visible_lines(markdown)
        pure_practice = is_pure_practice_section(item.path, lines)
        mod_name = module_name_for_item(item.path, root)
        is_supplement = mod_name == SUPPLEMENT_MODULE_ID or SUPPLEMENT_MODULE_ID in item.path.parts

        if is_section_content(item.path, root):
            if item.non_symbol_chars < min_chars and not pure_practice and not is_supplement:
                label = f"short (<{min_chars}): expand 4-layer concept anatomy, examples, walkthroughs, and edge cases"
                findings.append(ScanFinding(
                    path=item.path,
                    category="short-section",
                    detail=f"{item.non_symbol_chars} chars < {min_chars} required for mode '{args.mode}'",
                ))
            elif item.non_symbol_chars > LONG_SECTION_CHARS:
                label = "long: consider split only if learner question changes"
        elif item.non_symbol_chars > LONG_MODULE_CHARS:
            label = "long module: trim redundancy or split mixed goals if needed"

        print(f"{relative_display(item.path, root)}\t{item.non_symbol_chars}\t{label}")

    print()
    findings += scan_markdown_risks(depths)
    findings += scan_study_block_answers(depths)
    findings += scan_slide_structure(depths)
    findings += scan_markdown_flatness(depths, root)
    findings += scan_archify_blocks(depths)

    exercise_counts, diagram_counts = count_blocks_by_module(depths, root)
    for mod in sorted(set(exercise_counts) | set(diagram_counts)):
        if mod == SUPPLEMENT_MODULE_ID:
            continue
        mod_files = [d.path for d in depths if module_name_for_item(d.path, root) == mod and is_section_content(d.path, root)]
        if not mod_files:
            continue
        all_pure_practice = all(
            is_pure_practice_section(p, visible_lines(p.read_text(encoding="utf-8-sig")))
            for p in mod_files
        )
        anchor_path = mod_files[0]
        if exercise_counts.get(mod, 0) == 0:
            findings.append(ScanFinding(
                path=anchor_path,
                category="missing-exercise",
                detail=f"module '{mod}' has 0 study-* exercises",
            ))
        if diagram_counts.get(mod, 0) == 0 and not all_pure_practice:
            findings.append(ScanFinding(
                path=anchor_path,
                category="missing-diagram",
                detail=f"module '{mod}' has 0 ```archify diagrams; add visual explanations for flows/structures",
            ))

    print("Risk and quality scan:")
    if not findings:
        print("No risk patterns found.")
    else:
        for finding in findings:
            location = relative_display(finding.path, root)
            if finding.line_no is not None:
                location = f"{location}:{finding.line_no}"
            print(f"{finding.category}\t{location}\t{finding.detail}")

    if exercise_counts or diagram_counts:
        print()
        print("Module block summary (exercises / archify diagrams):")
        for mod in sorted(set(exercise_counts) | set(diagram_counts)):
            ex_cnt = exercise_counts.get(mod, 0)
            dg_cnt = diagram_counts.get(mod, 0)
            print(f"  {mod}: {ex_cnt} exercise(s), {dg_cnt} diagram(s)")

    if args.strict:
        blocking = [f for f in findings if f.category in STRICT_BLOCKING_CATEGORIES]
        if blocking:
            print()
            print(f"STRICT GATE FAILED: {len(blocking)} blocking issue(s) found.")
            return 1
        print()
        print("STRICT GATE PASSED.")
    else:
        print()
        print("This report is advisory unless --strict is enabled. It does not replace the blocking learner-perspective review.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
