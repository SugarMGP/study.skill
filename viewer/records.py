"""Learning record read, write, and event merge logic."""

import json
from datetime import datetime, timezone
from pathlib import Path

from utils import load_json


SCHEMA_VERSION = 5
RECORD_SOURCE = "study.skill.viewer"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def default_learning_record(course_slug: str, timestamp: str) -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "source": RECORD_SOURCE,
        "course_slug": course_slug,
        "created_at": timestamp,
        "updated_at": timestamp,
        "current": {
            "module": None,
            "section": None,
            "content_file": None,
            "updated_at": None,
        },
        "pages": [],
        "questions_for_llm": [],
        "exercises": [],
        "legacy_checkpoints": [],
        "review_summary": {
            "rated_count": 0,
            "items": [],
        },
        "completions": [],
    }


def load_learning_record(path: Path, course_slug: str) -> dict:
    if not path.exists():
        return default_learning_record(course_slug, now_iso())
    record = load_json(path)
    if record.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"learning-record.json schema_version must be {SCHEMA_VERSION}")
    if record.get("source") != RECORD_SOURCE:
        raise ValueError("learning-record.json source mismatch")
    if record.get("course_slug") != course_slug:
        raise ValueError("learning-record.json course_slug mismatch")
    return record


def write_learning_record(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(record, ensure_ascii=False, indent=2)
    tmp_file = path.with_suffix(".tmp")
    tmp_file.write_text(data, encoding="utf-8")
    json.loads(tmp_file.read_text(encoding="utf-8"))
    tmp_file.replace(path)


def upsert_record_item(items: list, key_fields: tuple[str, ...], item: dict) -> None:
    for index, existing in enumerate(items):
        if all(existing.get(field) == item.get(field) for field in key_fields):
            merged = dict(existing)
            merged.update(item)
            items[index] = merged
            return
    items.append(item)


def merge_learning_record_event(record: dict, event: str, payload: dict, timestamp: str) -> dict:
    record["updated_at"] = timestamp
    module = payload.get("module")
    section = payload.get("section")
    content_file = payload.get("content_file")

    page_started_at = payload.get("started_at") if event == "page_view" else None
    if event == "page_view" and not page_started_at:
        raise ValueError("page_view requires started_at")
    current_updated_at = (record.get("current") or {}).get("updated_at")
    is_latest_page = event == "page_view" and (
        not current_updated_at or (
            datetime.fromisoformat(str(page_started_at).replace("Z", "+00:00"))
            >= datetime.fromisoformat(str(current_updated_at).replace("Z", "+00:00"))
        )
    )
    if event == "page_view" and is_latest_page and (module or section or content_file):
        record["current"] = {
            "module": module,
            "section": section,
            "content_file": content_file,
            "updated_at": page_started_at or timestamp,
        }

    if event == "page_view":
        merge_page_view(record, payload, timestamp)
    elif event == "question_added":
        question = str(payload.get("question") or "").strip()
        if not question:
            raise ValueError("question_added requires question")
        questions = record.setdefault("questions_for_llm", [])
        if question not in questions:
            questions.append(question)
    elif event == "question_removed":
        question = str(payload.get("question") or "").strip()
        if not question:
            raise ValueError("question_removed requires question")
        record["questions_for_llm"] = [
            item for item in record.setdefault("questions_for_llm", []) if item != question
        ]
    elif event == "exercise_submitted":
        exercise = dict(payload.get("exercise") or {})
        if not exercise.get("id"):
            raise ValueError("exercise_submitted requires exercise.id")
        exercise["submitted_at"] = timestamp
        upsert_record_item(record.setdefault("exercises", []), ("module", "section", "id"), exercise)
    elif event == "review_rated":
        item = dict(payload.get("item") or {})
        if not item.get("concept_id"):
            raise ValueError("review_rated requires item.concept_id")
        item["rated_at"] = timestamp
        summary = record.setdefault("review_summary", {"rated_count": 0, "items": []})
        upsert_record_item(summary.setdefault("items", []), ("concept_id",), item)
        summary["rated_count"] = len(summary["items"])
    elif event == "legacy_checkpoint_submitted":
        checkpoint = dict(payload.get("checkpoint") or {})
        if not checkpoint.get("id"):
            raise ValueError("legacy_checkpoint_submitted requires checkpoint.id")
        checkpoint["submitted_at"] = timestamp
        upsert_record_item(record.setdefault("legacy_checkpoints", []), ("module", "section", "id"), checkpoint)
    elif event == "completion":
        merge_completion(record, payload, timestamp)
    else:
        raise ValueError(f"unsupported learning record event: {event}")

    return record


def merge_page_view(record: dict, payload: dict, timestamp: str) -> None:
    page = {
        "module": payload.get("module"),
        "section": payload.get("section"),
        "content_file": payload.get("content_file"),
        "title": payload.get("title"),
        "last_opened_at": timestamp,
        "opens": 1,
    }
    existing_pages = record.setdefault("pages", [])
    for existing in existing_pages:
        if (
            existing.get("module") == page["module"]
            and existing.get("section") == page["section"]
            and existing.get("content_file") == page["content_file"]
        ):
            existing["title"] = page["title"]
            existing["last_opened_at"] = timestamp
            existing["opens"] = int(existing.get("opens", 0)) + 1
            return
    page["first_opened_at"] = timestamp
    existing_pages.append(page)


def merge_completion(record: dict, payload: dict, timestamp: str) -> None:
    completion = {
        "module": payload.get("module"),
        "section": payload.get("section"),
        "content_file": payload.get("content_file"),
        "started_at": payload.get("started_at"),
        "completed_at": timestamp,
        "question_count": payload.get("question_count", 0),
        "exercise_ids": payload.get("exercise_ids", []),
        "review_rated_count": payload.get("review_rated_count", 0),
    }
    completions = record.setdefault("completions", [])
    existing_completion = next((item for item in completions if (
        completion["started_at"]
        and item.get("module") == completion["module"]
        and item.get("section") == completion["section"]
        and item.get("content_file") == completion["content_file"]
        and item.get("started_at") == completion["started_at"]
    )), None)
    if existing_completion:
        existing_completion.update(completion)
    else:
        completions.append(completion)
    for page in record.setdefault("pages", []):
        if (
            page.get("module") == completion["module"]
            and page.get("section") == completion["section"]
            and page.get("content_file") == completion["content_file"]
        ):
            page["completed_at"] = timestamp
            return
