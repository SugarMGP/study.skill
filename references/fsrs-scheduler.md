# Simplified Spaced Repetition (Based on FSRS Principles)

> Source: inspired by FSRS (Ye et al., KDD 2022 / TKDE 2023)
> This is a **simplified implementation** of the core concepts, not a full
> FSRS engine. For production use, consider integrating the fsrs-rs library.

## Storage: Per-Course concepts.json

Each course has its own `{learning_root}/.learning-profile/courses/{course-slug}/concepts.json`.
This enables independent review schedules and multi-course concurrent learning.

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
- `retired` — no longer relevant (topic removed from course)

**Note:** `target_retention` is not stored in concepts.json. It lives in `params.json`
to avoid duplication. When computing R, read `target_retention` from `params.json`.

## State Variables

| Variable | Meaning | Range | Initial |
|----------|---------|-------|---------|
| **D** (Difficulty) | How hard the concept is | [1, 10] | 4.0 or estimated |
| **S** (Stability) | Days until R drops to target_retention | [0, ∞] | 1.0 |
| **R** (Retrievability) | Current probability of recall | [0, 1] | Computed |

## Core Formulas

### Retrievability

This is a **simplified implementation** of the FSRS forgetting curve, not the
full FSRS scheduler. For production use, consider integrating the fsrs-rs library.

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

1. At the first formal learning session of each day, run `check-reviews.py` to read all active/completed courses and compute overdue items.
2. If `check-reviews.py` is missing, stop and repair the learning profile before continuing. Do not hand-compute due reviews as a normal fallback.
3. Present grouped by course: "React Hooks: 3 待复习 | Go并发: 2 待复习"
4. User picks a course (or "都过一遍")
5. Present in batches of 5-7
6. After each rating: run `record-review.py`; if it is missing, stop and repair the learning profile. Do not hand-write review updates.
7. Items with lapses >= 3 and R < 0.7: set `status: "needs_relearning"`

## Interleaving Strategy

The first formal learning session of the day must check due reviews, but review
does not own the session by default. Present due items as a one-line option;
continue the main lesson unless the user chooses review.

When the user chooses quick review, default to 2-5 minutes or 1-3 items before
returning to the main lesson. Expand only when the user explicitly asks for a
review session.

Priority within review: lowest R first → highest D first → fewest reviews.

## Same-Session vs. Review Boundary

In-session active recall and self-tests (Phase 3) are **teaching checks** — they
do NOT go into concepts.json. Only concepts from completed modules with ≥1 day
since first exposure are added. New items get `next_review` ≥ tomorrow.

## What NOT to Do

- Do NOT schedule reviews in the same session as first learning
- Do NOT present more than 7 review items at once
- Do NOT skip the daily session-start review check — present the option, let user decide
- Do NOT delete concepts — set status to "needs_relearning" instead
