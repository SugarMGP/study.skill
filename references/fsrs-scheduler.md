# Simplified Spaced Repetition (Based on FSRS Principles)

> Source: inspired by FSRS (Ye et al., KDD 2022 / TKDE 2023)
> This is a **simplified implementation** of the core concepts, not a full
> FSRS engine. For production use, consider integrating the fsrs-rs library.
> Label: "间隔复习排期" in user-facing messages — not "FSRS".

## State Variables

Per knowledge item tracked in `.learning-profile/review-schedule.json`:

| Variable | Meaning | Range | Initial |
|----------|---------|-------|---------|
| **D** (Difficulty) | How hard the item is | [1, 10] | 4.0 or estimated from metadata |
| **S** (Stability) | How long memory lasts (days until R=0.9) | [0, ∞] | 1.0 (1 day) |
| **R** (Retrievability) | Probability of recall at current time | [0, 1] | 1.0 (just reviewed) |
| **last_review** | ISO date of last review | date | session date |
| **next_review** | ISO date of next scheduled review | date | computed |
| **reviews** | Total review count | int | 0 |
| **lapses** | Times forgotten (rated 1 or 2) | int | 0 |

## Core Formulas

### Retrievability

```
R(t, S) = e^(ln(0.9) * t / S)
```

Where t = days elapsed since last_review. On session start, compute R for all items. Items with R < target_retention (default 0.9) are "due for review."

### After Review: Update S and D

Rating scale (user provides after each review):

| Rating | Meaning | Score (G) |
|--------|---------|-----------|
| 完全忘了 | Complete blackout | 1 |
| 记得一点 | Recalled correctly but with great difficulty | 2 |
| 记得大部分 | Recalled with slight hesitation | 3 |
| 轻松想起 | Perfect recall | 4 |

**Difficulty update:**

```
D' = clamp(D - 0.5 * (G - 3), 1, 10)
```

- G=4 (easy): D decreases by 0.5 → item becomes slightly easier
- G=3 (medium): D unchanged
- G=2 (hard): D increases by 0.5 → item becomes harder
- G=1 (forgot): D increases by 1.0 → item becomes significantly harder
- D always clamped to [1, 10]

**Stability update (successful recall, G >= 3):**

Simplified rule of thumb:
- Higher D → smaller S increase (hard items stabilize slower)
- Higher S → smaller S increase (already stable = harder to improve further)
- Lower R → larger S increase (overdue reviews give bigger stability boost if successful)

**Post-lapse stability (forgotten, G < 3):**

S drops significantly. New S is small (typically 1-2 days). Recovery is gradual.

### Next Interval

```
I(S, target_R=0.9) ≈ S
```

Simplified: schedule next review when elapsed time ≈ stability.

## Simplified Scheduling Parameters

```
difficulty_step = 0.5           # How much D changes per rating level
target_retention = 0.9          # Target recall probability
initial_stability = 1.0         # S for new items (1 day)
initial_difficulty = 4.0        # D for new items (moderate)
max_review_batch = 7            # Cognitive load limit
```

## Review Schedule Storage Format

`.learning-profile/review-schedule.json`:

```json
{
  "target_retention": 0.9,
  "items": [
    {
      "id": "concept-id",
      "course_slug": "example-course",
      "concept": "Concept name in Chinese",
      "question": "Review prompt/question",
      "answer": "Expected recall content",
      "D": 4.2,
      "S": 12.5,
      "R": 0.85,
      "last_review": "2026-06-08",
      "next_review": "2026-06-20",
      "reviews": 3,
      "lapses": 0,
      "module": "01-basics"
    }
  ]
}
```

## Review Session Protocol

1. On session start, read `review-schedule.json`
2. For each item, compute `R = e^(ln(0.9) * days_since_review / S)`
3. Items with `R < target_retention` (0.9) are due
4. Present in batches of 5-7 (cognitive load limit)
5. After each rating, recompute D, S, R, next_review
6. Write back to `review-schedule.json`
7. Items with R < 0.7 and lapses >= 3: set `status: "needs_relearning"`, preserve
   the item record (don't delete). These concepts should be re-introduced in
   a future learning session rather than recycled through review.

## Interleaving Strategy

Do NOT block all reviews together. Per session:
- 60% new content learning
- 40% review items

Within the 40% review allocation, prioritize:
1. Most overdue (lowest R)
2. Highest difficulty (highest D) among equally overdue
3. Lowest review count (least practiced) as tiebreaker

## Flashcard Generation

During Phase 2 (course generation), for each module, extract 3-8 knowledge items as flashcards:
- Question format: short prompt that requires active recall
- Answer format: concise, one key idea
- Each item tagged with `module` for interleaving
- Output to `flashcards.csv`:

```csv
id,module,question,answer,difficulty
"useState-basics","01-react-hooks","useState 返回什么？","返回一个数组：[当前状态值, 更新函数]。更新函数触发重新渲染。",4
```

## What NOT to do

- Do NOT schedule reviews during the same session as learning the concept (minimum 1 day gap)
- Do NOT present more than 7 review items at once
- Do NOT skip review because "the user seems busy" — present the option, let user decide
- Do NOT delete review items without marking for re-learning
