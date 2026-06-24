# Simplified Spaced Repetition (Based on FSRS Principles)

> This is a simplified implementation of FSRS core concepts. It is not a full FSRS engine and does not require the fsrs-rs library.

## Storage: Per-Course concepts.json

Each course has its own `{learning_root}/.learning-profile/courses/{course-slug}/concepts.json`. This enables independent review schedules and multi-course concurrent learning.

```json
{
  "schema_version": 4,
  "course_slug": "react-hooks",
  "last_review_session": "2026-06-09",
  "concepts": [
    {
      "id": "useState-basics",
      "name": "useState 基础用法",
      "module": "01-useState",
      "status": "learning",
      "D": 4.2,
      "S": 12.5,
      "last_review": "2026-06-08",
      "next_review": "2026-06-20",
      "reviews": 3,
      "lapses": 0,
      "first_seen": "2026-06-01",
      "question": "useState 返回什么？",
      "answer": "返回 [state, setState] 数组，setState 触发重新渲染"
    }
  ]
}
```

**Status values:**
- `learning` — actively being learned or reviewed
- `mastered` — consistently recalled, low review frequency
- `needs_relearning` — lapsed (R < 0.7 and lapses >= 3), needs re-teaching
- `retired` — set by agent when a module is removed from the course scope and the concept is no longer needed

**Note:** `target_retention` is not stored in concepts.json. It lives in `params.json` to avoid duplication. When computing R, read `target_retention` from `params.json`.

## State Variables

| Variable | Meaning | Range | Initial |
|----------|---------|-------|---------|
| **D** (Difficulty) | How hard the concept is | [1, 10] | 4.0 or estimated |
| **S** (Stability) | Days until R drops to target_retention | [0, ∞] | 1.0 |
| **R** (Retrievability) | Current probability of recall | [0, 1] | Computed |

## Core Formulas

### Retrievability

This is a **simplified implementation** of the FSRS forgetting curve, not the full FSRS scheduler. For production use, consider integrating the fsrs-rs library.

```
R = (1 + FACTOR * t / S) ^ DECAY
```

Where:
- `t` = days since last review
- `S` = stability
- `DECAY = -0.1542` (FSRS default)
- `FACTOR = 0.9 ^ (1/DECAY) - 1 ≈ 0.98`

When `t = 0`, `R = 1.0` (just reviewed). When `t = S`, `R ≈ 0.9`.

### After Review: Update S and D

Rating scale:

| Rating | Meaning | Score (G) |
|--------|---------|-----------|
| 完全忘了 | Complete blackout | 1 |
| 记得一点 | Recalled with difficulty | 2 |
| 记得大部分 | Recalled with hesitation | 3 |
| 轻松想起 | Perfect recall | 4 |

**Difficulty update:**
```
D' = clamp(D - 0.5 * (G - 3), 1, 10)
```

**Stability update (G >= 3):**
```
G=4: S' = S * 1.3 * (1 + 0.5 * max(0, 1 - R))
G=3: S' = S * 1.1 * (1 + 0.5 * max(0, 1 - R))
```

Caps: S' ≤ S * 2 (for D≥8), S' ≤ S + 30.

**Post-lapse (G < 3):**
```
S' = max(1, S * 0.2 * G)
```

### Next Interval

```
next_review = today + S' days
```

## Review Session Protocol

This file owns the scheduling algorithm and storage fields. Load `phase-4-consolidation.md` for the learner-facing review session flow, daily session-start check, and progress bulletin text.

Algorithm-side rules:

1. `check-reviews.py` reads all active/completed courses and computes overdue items.
2. If `check-reviews.py` is missing from the skill directory, stop and repair the skill installation. Do not hand-compute due reviews as a normal fallback.
3. After each rating, run `record-review.py`; if it is missing from the skill directory, stop and repair the skill installation. Do not hand-write review updates.
4. Items with lapses >= 3 and R < 0.7 become `needs_relearning`.

## Interleaving Strategy

The first formal learning session of the day check and quick-review pacing are defined in `phase-4-consolidation.md`.

Priority within review: lowest R first → highest D first → fewest reviews.

## Same-Session vs. Review Boundary

In-session active recall and self-tests (Phase 3) are **teaching checks** — they do NOT go into concepts.json. Only concepts from completed modules with ≥1 day since first exposure are added. New items get `next_review` ≥ tomorrow.

## What NOT to Do

- Do NOT schedule reviews in the same session as first learning
- Do NOT delete concepts — set status to "needs_relearning" instead


## Concept Question Guidelines

When writing `question` and `answer` fields in `concepts.json`, follow these rules:

- **question**: Write a retrieval prompt that forces recall. It should name the concept and ask for the key judgment, step, rule, or behavior — not just ask for a definition. Good: "useState 返回什么？写 state 更新时 React 会做什么？" Bad: "什么是 useState？"
- **answer**: Give the critical information in the course language. Keep it to 1-3 sentences. Include the judgment rule or key distinction when that is the point of the concept. If the concept is procedural (SQL, code, formula), include the minimal correct form.
- **Language**: Use the course language. If the course is Chinese, the question/answer should be in Chinese (with code/API names in English as needed).
- **Scope**: One Q/A pair per concept. Do not import the section's entire exercise bank. Pick the single most important retrieval point.

Example (Chinese course, React Hooks topic):

```json
{
  "id": "useState-basics",
  "question": "useState 返回什么？调用 setState 后组件会发生什么？",
  "answer": "返回 [state, setState] 数组。setState 触发组件重新渲染，新渲染中使用更新后的 state 值。"
}
```