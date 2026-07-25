#!/usr/bin/env python3

import sys
import unittest

from records import default_learning_record, merge_learning_record_event


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


class LearningRecordCompletionTest(unittest.TestCase):
    def test_page_view_does_not_complete_learning_page(self):
        record = default_learning_record("demo", "2026-07-25T00:00:00+00:00")
        page = {
            "module": "01-basics",
            "section": "01-evidence",
            "content_file": "demo/01-basics/01-evidence/content.md",
            "title": "Evidence",
            "started_at": "2026-07-25T00:00:00+00:00",
        }

        merge_learning_record_event(record, "page_view", page, "2026-07-25T00:01:00+00:00")
        self.assertNotIn("completed_at", record["pages"][0])
        self.assertEqual([], record["completions"])

        merge_learning_record_event(record, "completion", page, "2026-07-25T00:02:00+00:00")
        self.assertEqual("2026-07-25T00:02:00+00:00", record["pages"][0]["completed_at"])
        self.assertEqual(1, len(record["completions"]))

        merge_learning_record_event(record, "completion", page, "2026-07-25T00:03:00+00:00")
        self.assertEqual(1, len(record["completions"]))

        page["started_at"] = "2026-07-26T00:00:00+00:00"
        merge_learning_record_event(record, "completion", page, "2026-07-26T00:02:00+00:00")
        self.assertEqual("2026-07-26T00:02:00+00:00", record["pages"][0]["completed_at"])
        self.assertEqual(2, len(record["completions"]))

    def test_question_events_preserve_external_queue_updates(self):
        record = default_learning_record("demo", "2026-07-25T00:00:00+00:00")
        record["questions_for_llm"] = []  # Agent already consumed and cleared older questions.

        merge_learning_record_event(
            record,
            "question_added",
            {"question": "请给我一道新的掌握挑战"},
            "2026-07-25T00:01:00+00:00",
        )
        merge_learning_record_event(
            record,
            "question_added",
            {"question": "请给我一道新的掌握挑战"},
            "2026-07-25T00:02:00+00:00",
        )
        self.assertEqual(["请给我一道新的掌握挑战"], record["questions_for_llm"])

        merge_learning_record_event(
            record,
            "question_removed",
            {"question": "请给我一道新的掌握挑战"},
            "2026-07-25T00:03:00+00:00",
        )
        self.assertEqual([], record["questions_for_llm"])

        with self.assertRaisesRegex(ValueError, "unsupported learning record event"):
            merge_learning_record_event(
                record,
                "questions_snapshot",
                {"questions": ["answered-old-question"]},
                "2026-07-25T00:04:00+00:00",
            )

    def test_delayed_page_event_does_not_move_current_page_back(self):
        record = default_learning_record("demo", "2026-07-25T00:00:00+00:00")
        page_a = {
            "module": "01-basics",
            "section": "01-a",
            "content_file": "demo/01-basics/01-a/content.md",
            "started_at": "2026-07-25T00:01:00.000Z",
        }
        page_b = {
            "module": "01-basics",
            "section": "02-b",
            "content_file": "demo/01-basics/02-b/content.md",
            "started_at": "2026-07-25T00:02:00.000Z",
        }

        merge_learning_record_event(record, "page_view", page_a, "2026-07-25T00:01:00+00:00")
        merge_learning_record_event(record, "page_view", page_b, "2026-07-25T00:02:00+00:00")
        merge_learning_record_event(record, "page_view", page_a, "2026-07-25T00:03:00+00:00")
        merge_learning_record_event(
            record,
            "question_added",
            {**page_a, "question": "A 页的延迟问题"},
            "2026-07-25T00:03:00+00:00",
        )

        self.assertEqual("02-b", record["current"]["section"])


if __name__ == "__main__":
    unittest.main()
