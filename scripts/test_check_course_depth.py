#!/usr/bin/env python3

import importlib.util
import subprocess
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


class StrictDepthAndArchifyGateTest(unittest.TestCase):
    def test_detects_handwaving_and_archify_syntax_errors(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "content.md"
            path.write_text(
                "这里涉及底层状态转移，限于篇幅，读者可自行查阅源码。\n\n"
                "```archify\n"
                "type=unknown_kind id=bad-diag title=\"Bad\"\n"
                "| only_one_cell |\n"
                "```\n\n"
                "```study-steps\n"
                "diagram=nonexistent\n"
                "| s1 | 第一步 | 说明 | node1 |\n"
                "```\n\n"
                "```mermaid\n"
                "flowchart TD\n"
                "A --> B\n"
                "```\n",
                encoding="utf-8",
            )
            depths = [MODULE.MarkdownDepth(path=path, non_symbol_chars=500)]
            risk_findings = MODULE.scan_markdown_risks(depths)
            archify_findings = MODULE.scan_archify_blocks(depths)

        self.assertTrue(any(f.category == "handwaving-trace" for f in risk_findings))
        categories = [f.detail for f in archify_findings]
        self.assertTrue(any("invalid or missing archify type" in d for d in categories))
        self.assertTrue(any("malformed archify pipe row" in d for d in categories))
        self.assertTrue(any("unknown diagram id 'nonexistent'" in d for d in categories))
        self.assertTrue(any("legacy diagram fence ```mermaid" in d for d in categories))

    def test_strict_cli_fails_on_short_or_diagramless_module_and_passes_when_valid(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            mod_dir = Path(temp_dir) / "01-core-module"
            sec_dir = mod_dir / "01-first-section"
            sec_dir.mkdir(parents=True)
            (mod_dir / "content.md").write_text("# 模块一\n\n模块前言介绍核心问题。", encoding="utf-8")

            # Case 1: too short and no diagram
            (sec_dir / "content.md").write_text("# 第一节\n\n太短的内容。", encoding="utf-8")
            res_fail = subprocess.run(
                [sys.executable, str(SCRIPT), str(mod_dir), "--mode", "speedrun", "--strict"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(1, res_fail.returncode)
            self.assertIn("short-section", res_fail.stdout)
            self.assertIn("missing-diagram", res_fail.stdout)
            self.assertIn("missing-exercise", res_fail.stdout)

            # Case 2: sufficient prose (>= 800 chars for speedrun), valid archify diagram + study-steps + exercise
            long_prose = "这是一段深入拆解内部状态流转与工程边界的正文内容，包含具体输入数据与执行跟踪。" * 25
            valid_section = (
                f"# 第一节：缓存读取与穿透防护\n\n{long_prose}\n\n"
                "```archify\n"
                'type=sequence id=cache-flow title="Cache Miss Flow"\n'
                "| actor client | Client | frontend |\n"
                "| actor api | Order API | backend |\n"
                "| actor redis | Redis | database |\n"
                "| client | api | GET /orders/42 |\n"
                "| api | redis | GET order:42 |\n"
                "| redis | api | nil (miss) | return |\n"
                "```\n\n"
                "```study-steps\n"
                "diagram=cache-flow\n"
                "| s1 | 发起请求 | 客户端请求订单详情 | client,api |\n"
                "| s2 | 缓存未命中 | Redis 返回空结果触发回源 | redis |\n"
                "```\n\n"
                "```study-choice\n"
                "id: 01-cache-q1\n"
                "question: 当缓存未命中时，下一步是什么？\n"
                "options:\n"
                "  - value: A\n"
                "    text: 查询数据库并回填缓存\n"
                "  - value: B\n"
                "    text: 直接报错退出\n"
                "answer: A\n"
                "explanation: 缓存未命中时需要回源数据库并写回缓存。\n"
                "mastery_tags: [apply]\n"
                "```\n"
            )
            (sec_dir / "content.md").write_text(valid_section, encoding="utf-8")
            res_pass = subprocess.run(
                [sys.executable, str(SCRIPT), str(mod_dir), "--mode", "speedrun", "--strict"],
                capture_output=True,
                text=True,
            )
            res_sys_short = subprocess.run(
                [sys.executable, str(SCRIPT), str(mod_dir), "--mode", "system", "--strict"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(1, res_sys_short.returncode)
            self.assertIn("short-section", res_sys_short.stdout)
            self.assertEqual(0, res_pass.returncode, msg=res_pass.stdout + res_pass.stderr)
            self.assertIn("STRICT GATE PASSED.", res_pass.stdout)


if __name__ == "__main__":
    unittest.main()
