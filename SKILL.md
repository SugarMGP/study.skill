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

## Always Load The Right Reference

Most agents only read the first ~160 lines. Use this table before doing anything substantial.

| Situation | Must load |
| --- | --- |
| Existing `.learning-profile/progress.json` or `review-schedule.json` | `references/migration-guide.md`; migration is blocking |
| Existing state with `schema_version` lower than current `state-schema.md` | `references/migration-guide.md`; upgrade before writing state |
| Existing `.learning-profile/` state, any state write, mode switch, progress update | `references/state-schema.md` |
| User says "继续学习" and course files already exist | `references/phase-3-learning.md`; local course content is primary |
| User says "继续学/打开课程/可视化学习/看课件" and course exists | `references/learning-viewer.md`; start local viewer in `interactive` mode. Fall back to chat only if unavailable |
| Any formal course, progress map, skill tree, XP, levels, achievements | `references/skill-tree.md`; skill tree and RPG are default on |
| Goal anchoring, mode choice, materials, baseline, time, storage path | `references/phase-0-anchoring.md` |
| Research before course generation | `references/phase-1-research.md` |
| Course/module generation | `references/phase-2-generation.md` + `references/chinese-tutorial-guide.md` |
| Live teaching, exercises, speed/depth feedback | `references/phase-3-learning.md` |
| Review reminder, review session, learning bulletin | `references/phase-4-consolidation.md` + `references/fsrs-scheduler.md` |
| Platform reminders / hooks / scheduled tasks | `references/automation/README.md` |

**Script shortcuts:** use `scripts/check-reviews.py` for due reviews, `scripts/record-review.py` for review ratings, `scripts/write-state.py` for JSON state writes, and `scripts/migrate-profile.py` for old state migration.

## Core Contract

Pipeline:

```text
锚定 -> 调研 -> 生成 -> 学习 -> 巩固
```

Units:

- **一讲 (Lecture)**: ~10-25 minutes, one main concept.
- **一模块 (Module)**: 2-5 lectures, one coherent sub-topic.
- **一门课 (Course)**: <=15 modules and <=30 lectures; split larger topics.

Iron Law:

```text
NO TEACHING WITHOUT ANCHORING FIRST.
NO GENERATION WITHOUT RESEARCH FIRST.
NO COMPLETION CLAIMS WITHOUT VERIFICATION.
```

Escape hatch: for explicitly tiny requests such as "just teach useState in 5 minutes", confirm the narrow scope in one sentence and teach directly. The rule prevents sloppiness, not speed.

## Session Start Checklist

Before answering a learning request:

1. If `.learning-profile/progress.json` or `review-schedule.json` exists, stop normal teaching. Load `migration-guide.md`, run migration when possible, verify it, and continue only after the old files are gone.
2. If existing state files use a lower `schema_version` than `state-schema.md`, stop state writes, load `migration-guide.md`, upgrade and verify first.
3. If `.learning-profile/` exists, read `.learning-profile/courses/*/meta.json` for active/completed courses; run `.learning-profile/scripts/check-reviews.py` when present.
4. Read `profile.json` when present; respect `learner_profile` constraints and `preferences.automation_declined`.
5. Respect `meta.json.skill_tree_enabled` and `meta.json.rpg_enabled`; if missing, default both to `true`.
6. If no confirmed learning goal exists, start Phase 0.

## Phase 0: Anchor

Load `references/phase-0-anchoring.md`.

Ask questions one at a time by default. Determine:

- scope: 速成导览 / 系统精讲 / 面试冲刺 / 考试备考
- materials: syllabus, textbook, slides, past papers, links, local files
- baseline: zero / related experience / advanced
- time budget and deadline
- `{learning_root}` storage path

Load `skill-tree.md` for any formal course. Show a domain tree for broad fields. For specific topics, initialize course-local tree state now, but fill its module nodes only after Module 00/syllabus is confirmed. RPG elements (XP, levels, titles, achievements, quests) are on by default; if the user says no game/entertainment/RPG elements, persist `rpg_enabled: false` in `meta.json`.

Gate: present 学习路线图预览 and wait for confirmation. After confirmation, initialize `.learning-profile/` if needed, write course state from `state-schema.md` with skill tree/RPG defaults, and do not overwrite existing state.

## Phase 1: Research

Load `references/phase-1-research.md`.

Research before new course generation. Do not rerun Phase 1 just because the user says "继续学习" for an already generated course. Use user materials as primary scope when provided. For tech topics, prefer official docs and source code; for academic/general topics, prefer textbooks, syllabi, surveys, and strong Chinese resources when available.

Gate: present sources, conflicts, core concept structure, and proposed course shape. Wait for user confirmation before Phase 2.

## Phase 2: Generate

Load `references/phase-2-generation.md` and `references/chinese-tutorial-guide.md`.

Generate Module 00 first: course overview, syllabus, learning map, resources, and file layout. After the user confirms Module 00, generate remaining modules in one pass; split only for size (>15 modules or >30 lectures). Follow the quality gate in `phase-2-generation.md`.

After generation, offer to start Module 01.

## Phase 3: Teach

Load `references/phase-3-learning.md`.

For generated courses, read the local README/syllabus/current `content.md` first and teach from that. External docs are only supplemental for missing content, explicit latest/API/version questions, or verification. Teach with explanation -> practice -> feedback -> self-test. Use worked examples when helpful, but avoid answer-only responses. Target 75-85% exercise success; adjust scaffolding, speed, and depth from `params.json`.

Every formal session must show course/module/lecture, current skill-tree node, a one-line RPG state when enabled, and a one-line due-review prompt. Review is optional and short by default; continue the main lesson unless the user chooses review.

When the user says "太快/太慢/太浅/太深/跟不上", update `params.json` immediately through `write-state.py` and append `adaptive_history`.

At session end, update `meta.json` and `concepts.json` using `state-schema.md`; write through `write-state.py` when available.

## Phase 4: Consolidate

Load `references/phase-4-consolidation.md` and `references/fsrs-scheduler.md`.

At session start, prefer `.learning-profile/scripts/check-reviews.py`. During review, present 5-7 items at a time. After each rating, prefer `.learning-profile/scripts/record-review.py`; R is computed, not stored.

After first course creation or first learning session, ask once whether to create a daily platform reminder unless `profile.json.preferences.automation_declined=true`. Local `concepts.json.next_review` is a review plan, not system automation. If the user wants reminders or automation, load `references/automation/README.md` and then the platform-specific file.

## Verification

- Runnable code must actually run before claiming it works.
- Non-runnable technical content must be checked against docs/source and labeled as not executed.
- General/academic claims need source cross-checks.
- Exam prep must be checked against the syllabus or provided materials.

## Red Flags

| If you think... | Reality |
| --- | --- |
| "This is simple; skip research." | Research first unless the request is explicitly tiny. |
| "User said continue, so I should research the topic again." | Continue from local course files; use external docs only as a supplement. |
| "The user probably wants depth X." | Ask or use the selected mode from `params.json`. |
| "I can keep using old progress files." | Old state migration is blocking; continue only after old files are removed. |
| "Skill trees are only for programming." | Skill trees apply to any learnable domain. |
| "RPG needs explicit opt-in." | RPG is on by default; turn it off only when the user asks or meta says false. |
| "I can hand-write state quickly." | Use `state-schema.md` and `write-state.py`. |
| "next_review exists, so reminders are automated." | `concepts.json` is local review state; platform automation must be created separately. |
| "I can compute reviews in prose." | Prefer `check-reviews.py` and `record-review.py`. |
| "One source is enough." | Target 3 quality sources; accept fewer only with a reason. |
| "More praise means more motivation." | Use concrete progress, not empty praise. |

## Motivation

Learning is becoming, not consuming. Progress markers help only when they reflect real capability. Keep the tone warm, specific, and honest: show what changed, what is still weak, and what to do next.
