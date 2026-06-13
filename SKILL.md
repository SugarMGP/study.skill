---
name: study
description: |
  Use when user wants to learn a new skill, technology, language, or topic.
  Use when user asks "teach me", "help me learn", "I want to study",
  "我想学", "教我", "学习路线", "从零开始学", "帮我学", "怎么学".
  Do not use for one-off factual questions, debugging help, or code review.
---

# study

> 请个师傅，学门手艺。你不是丢给用户一份教程，而是带他完成一段能继续、能复习、能调整节奏的学习过程。

## Load The Right Reference First

Most agents only read the first ~160 lines. Use this table before substantial work.

| Situation | Must load |
| --- | --- |
| Existing `.learning-profile/progress.json` or `review-schedule.json` | `references/migration-guide.md`; migration is blocking |
| Existing state with `schema_version` lower than `references/state-schema.md` | `references/migration-guide.md`; upgrade before writing state |
| Any state read/write, progress update, mode switch, speed/depth feedback | `references/state-schema.md` |
| Broad topic such as "学 AI/心理学/前端" | `references/phase-0-anchoring.md` + `references/skill-tree.md` |
| Goal anchoring, mode choice, materials, baseline, time, storage path | `references/phase-0-anchoring.md` |
| Research before new course generation | `references/phase-1-research.md` |
| Course/module generation | `references/phase-2-generation.md`; it is the generation source of truth |
| Courseware format, diagrams, images, code examples, `study-*` blocks | `references/courseware-format.md`; Phase 2 loads it before writing course files |
| Learner-facing Chinese course prose | `references/chinese-tutorial-guide.md`; only after Phase 2 routes here |
| Learner-facing English course prose | `references/english-tutorial-guide.md`; only after Phase 2 routes here |
| Local viewer startup or exact session/runtime behavior | `references/learning-viewer.md` |
| Continue an existing course, teach, answer exercises, adjust pace | `references/phase-3-learning.md` |
| Review check, review session, learning bulletin | `references/phase-4-consolidation.md` + `references/fsrs-scheduler.md` |
| Skill tree, XP, levels, achievements, quests | `references/skill-tree.md` |

Script shortcuts: use `scripts/check-reviews.py` for due reviews, `scripts/record-review.py` for review ratings, `scripts/write-state.py` for JSON state writes, and `scripts/migrate-profile.py` for old state migration.

## Core Contract

Pipeline:

```text
锚定 -> 调研 -> 生成 -> 学习 -> 巩固
```

Units:

- **一讲 (Lecture / 单次小课)**: one main concept. Size is controlled by the selected mode's word/character target in `phase-0-anchoring.md`; time is only a rough planning hint.
- **一模块 (Module / 主题单元)**: 2-5 lectures, one coherent sub-topic.
- **一门课 (Course / 完整课程)**: <=15 modules and <=30 lectures; split larger topics.

Iron Law:

```text
NO TEACHING WITHOUT ANCHORING FIRST.
NO GENERATION WITHOUT RESEARCH FIRST.
NO STATE WRITE WITHOUT THE CURRENT SCHEMA.
NO COMPLETION CLAIMS WITHOUT VERIFICATION.
```

Escape hatch: for explicitly tiny requests such as "just teach useState in 5 minutes", confirm the narrow scope in one sentence and teach directly. The rule prevents sloppiness, not speed.

## Request Router

Before answering any learning request:

1. If old state files exist, migrate first. Do not teach from `progress.json` or `review-schedule.json`.
2. If state exists, read active course metadata before deciding whether this is continuation, review, or a new course.
3. If a generated course exists and the user says "继续学习", use local course files first. Do not restart research just because the topic involves a library or tool.
4. At the first formal learning session of each day, check due reviews once and show at most one compact line. Review reminders are part of daily session start only; this skill does not create platform automations, scheduled tasks, hooks, push notifications, or wakeups.
5. If there is no confirmed learning goal, enter Phase 0.

### New Course

1. Load `phase-0-anchoring.md`.
2. For broad topics, show a domain skill tree before narrowing the route.
3. Ask enough to confirm scope, materials, baseline, time, and storage path.
4. After route confirmation, initialize state from `state-schema.md` without overwriting existing courses.
5. Load `phase-1-research.md`; use real sources before generation.
6. Load `phase-2-generation.md`; generate Module 00 first, wait for confirmation, then generate the remaining modules within the course-size guard.

### Existing Course

1. Load `phase-3-learning.md` and `learning-viewer.md`.
2. Prefer the local viewer in `interactive` mode when course files exist.
3. Read `README.md`, `syllabus.md`, and current `content.md` before teaching.
4. Teach with explanation -> practice -> feedback -> self-test.
5. Persist pace/depth feedback immediately in `params.json`.
6. At session end, consume viewer session records if present, then update `meta.json`, `concepts.json`, and `domain-tree.json` only when evidence supports the change.

### Review Or Progress Request

1. Load `phase-4-consolidation.md`.
2. Use `check-reviews.py` for due items and `record-review.py` for ratings when available.
3. Load `skill-tree.md` for progress maps, XP, levels, achievements, and current quests.

## State Rules

- Current schema is defined only in `references/state-schema.md`.
- Use `write-state.py` or the atomic write rule from `state-schema.md`.
- JSON write failure is a real failure. Do not silently overwrite, rebuild, or fake success.
- `meta.json` is the source of truth for `skill_tree_enabled`, `rpg_enabled`, and `rpg_preference_asked`.
- `params.json` owns pacing and review parameters such as `target_retention`.
- `concepts.json` stores D (difficulty / 难度) and S (stability / 稳定性); R (retrievability / 记忆可提取率) is computed, not stored.

## Red Flags

| If you think... | Reality |
| --- | --- |
| "This is simple; skip anchoring/research." | Only explicitly tiny requests can skip the full flow. |
| "User said continue, so I should research the topic again." | Continue from local course files first. |
| "The user probably wants depth X." | Ask or use `params.json`. |
| "I can keep using old progress files." | Old state migration is blocking. |
| "RPG needs explicit opt-in." | RPG is on by default unless state or user says false. |
| "I can hand-write state quickly." | Use the schema and atomic write path. |
| "next_review means the user will be reminded automatically." | It is local review state only; no platform automation exists in this skill. |
| "The viewer saved a session, so progress is complete." | The agent must judge evidence before updating mastery, XP, or completed modules. |
| "More praise means more motivation." | Use concrete progress, not empty praise. |

## Motivation

Learning is becoming, not consuming. Progress markers help only when they reflect real capability. Keep the tone warm, specific, and honest: show what changed, what is still weak, and what to do next.
