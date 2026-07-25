#!/usr/bin/env python3

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

SCRIPT = Path(__file__).with_name("check-course-depth.py")
SPEC = importlib.util.spec_from_file_location("check_course_depth", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class FormulaDelimiterRiskTest(unittest.TestCase):
    def test_reports_asymmetric_inline_formula_once_per_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "content.md"
            path.write_text("错误：(V\\)；另一个：(q\\)。\n正确：\\(U=qV\\)。", encoding="utf-8")
            depths = [MODULE.MarkdownDepth(path=path, non_symbol_chars=0)]

            findings = MODULE.scan_markdown_risks(depths)

        math_findings = [item for item in findings if item.category == "math-delimiter"]
        self.assertEqual(1, len(math_findings))
        self.assertEqual(1, math_findings[0].line_no)

    def test_reports_mixed_and_unclosed_math_delimiters(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "content.md"
            path.write_text(
                "混用：\\[x + y\\)\n未闭合：$x + y\n",
                encoding="utf-8",
            )
            depths = [MODULE.MarkdownDepth(path=path, non_symbol_chars=0)]

            findings = MODULE.scan_markdown_risks(depths)

        math_findings = [item for item in findings if item.category == "math-delimiter"]
        self.assertEqual([1, 2], [item.line_no for item in math_findings])

    def test_reports_unclosed_double_dollar_math(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "content.md"
            path.write_text("$$\nx + y\n", encoding="utf-8")
            depths = [MODULE.MarkdownDepth(path=path, non_symbol_chars=0)]

            findings = MODULE.scan_markdown_risks(depths)

        math_findings = [item for item in findings if item.category == "math-delimiter"]
        self.assertEqual([1], [item.line_no for item in math_findings])

    def test_reports_single_dollar_math_even_when_paired(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "content.md"
            path.write_text("公式：$2x + 1$。\n", encoding="utf-8")
            depths = [MODULE.MarkdownDepth(path=path, non_symbol_chars=0)]

            findings = MODULE.scan_markdown_risks(depths)

        math_findings = [item for item in findings if item.category == "math-delimiter"]
        self.assertEqual([1], [item.line_no for item in math_findings])

    def test_accepts_multiline_display_math(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "content.md"
            path.write_text(
                "\\[\nx + y\n\\]\n"
                "$$\nx^2 + y^2\n$$\n"
                "套餐 $5/月，另一个 $10/月。\n",
                encoding="utf-8",
            )
            depths = [MODULE.MarkdownDepth(path=path, non_symbol_chars=0)]

            findings = MODULE.scan_markdown_risks(depths)

        self.assertFalse(any(item.category == "math-delimiter" for item in findings))


if __name__ == "__main__":
    unittest.main()
