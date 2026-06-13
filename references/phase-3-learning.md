# Phase 3: 学习（Interactive Teaching）

> Based on: Gagné's Nine Events (加涅九段教学法) +
> Cognitive Apprenticeship (认知学徒制) +
> Zone of Proximal Development (最近发展区) +
> Socratic Cycle (苏格拉底式追问) +
> Hint-over-Answer (先提示后答案)

## Scope

This file is the source of truth for live teaching and continuation. It covers:

- how to start a formal learning session
- how to continue an existing generated course
- how to use the local viewer
- how to teach, practice, give feedback, and decide mastery
- how to consume viewer session records and write state

It does not cover platform automations, scheduled reminders, hooks, push
notifications, or thread wakeups. Review checks happen when a learning session
starts.

## The Iron Law Of Teaching

```text
DON'T JUMP TO THE ANSWER. GUIDE THE DISCOVERY FIRST.
```

Before revealing a solution, try guided discovery first: hints, smaller
questions, partial examples, or a worked example with reasoning. For beginners,
time pressure, or a direct "给我完整例子" request, a worked example can come
earlier, but never give only a bare final answer.

## Session Start Protocol

At the start of each formal learning session:

1. If old `.learning-profile/progress.json` or `review-schedule.json` exists, stop and migrate first.
2. Read `.learning-profile/profile.json` and the active course `meta.json`,
   `params.json`, `concepts.json`, and `domain-tree.json`.
3. Read local course content: `README.md`, `syllabus.md` if present, and current `content.md`.
4. Show exact course/module/lecture, current skill-tree node, and one short RPG
   line when enabled.

At the first formal learning session of each day only:

1. Run `.learning-profile/scripts/check-reviews.py`.
2. If the script is missing, stop and run the init script or repair the learning profile before continuing.
3. If due reviews exist, show one compact line and ask whether to spend 2-5
   minutes reviewing. If the user does not choose review, continue the main lesson.

Opening format:

```text
📍 当前：{course_name} / {module_id} / {lecture_title}
🌳 节点：{node_id} · {node_status} · 掌握度 {progress}%
⏰ 待复习：{overdue_count} 个知识点，可先用 2-5 分钟过一遍
🎮 Lv.{level} · {xp} XP · 称号「{title}」 · 当前任务：{quest}
```

If no overdue items exist, omit the review line.

If `meta.json.rpg_enabled=true` and `meta.json.rpg_preference_asked=false`, ask
once before teaching starts or after the first session summary:

```text
我会默认保留技能树、等级、XP、成就这些轻量进度元素。如果你觉得花哨，我可以关掉。要保留吗？
```

Persist the answer in `meta.json`; keep `domain-tree.json` mirrored.

## Existing Course Continuation

When the user says "继续学习", "继续", "下一节", or similar, and course files exist:

1. Load `references/learning-viewer.md`.
2. Start the local viewer in `interactive` mode before chat teaching unless:
   - the viewer cannot start
   - required files are missing
   - the user explicitly refuses the viewer
3. Use `read-only` only when the user says they only want to browse. Missing
   interactive dependencies are a repair task, not a silent downgrade.
4. Fall back to chat teaching only with a concrete reason, then continue from
   local `content.md`.
5. Choose the next node from `in_progress`, then `available` / `unlockable` in syllabus order.
6. Do not enter `locked` nodes automatically. If the learner insists, explain the missing prerequisite and mark the new node `in_progress`, not `mastered`.
7. External docs/source lookup is allowed only when local content is missing,
   the user asks latest/API/version-specific details, or a runnable/API claim needs verification.

## Core Teaching Loop

Teach one main concept at a time:

1. State the learning objective in the course language, using plain learner-facing wording.
2. Explain with plain-language intuition -> precise term -> example/code/case -> decision rule.
3. Ask a small active-recall or transfer question.
4. Give feedback: what is right, what is weak, why it matters.
5. After 2-3 new concepts, ask one mixed question that combines old and new ideas.
6. End with a self-test or checkpoint before moving modules.

For Chinese courses, follow the style in `chinese-tutorial-guide.md`. For English courses,
follow `english-tutorial-guide.md`. Do not switch languages unless the learner asks for it
or the course explicitly uses bilingual terminology.

Target a 75-85% exercise success rate:

| Performance | Adjustment |
| --- | --- |
| >90% correct, fast | Increase difficulty, skip obvious basics, add challenge |
| 75-85% correct | Continue current pace |
| 60-74% correct | Add scaffolding, simpler examples, more hints |
| <60% correct | Revisit prerequisites and split the concept smaller |

## Hint Escalation

| Attempt | Action |
| --- | --- |
| 1st wrong | Point out the direction is off; ask a smaller question |
| 2nd wrong | Name the key concept to recall |
| 3rd wrong | Connect to an earlier concept or example |
| Still stuck | Give a worked example with reasoning, then a variant exercise |

Do not turn this into a rigid ritual when the learner simply needs a clear
demonstration. The goal is productive struggle, not frustration.

## Mastery Gate

Before marking a module `mastered` or adding it to `completed_modules`, require evidence:

| Tier | Gate |
| --- | --- |
| Foundation / 基础 | 2 recall + 1 transfer + 1 Feynman explanation + >=85% correct |
| Core / 核心 | 1 recall + 1 application/transfer + 1 explanation or practice + >=75% correct |
| Enrichment / 拓展 | >=60% self-test; may skip on user request |

In speedrun mode: Foundation >=75%, Core >=60%, Enrichment optional.

`params.json.require_mastery_before_advance` controls whether failing the gate
blocks the next module. It does not let the agent fake completion:

- If true, failing the gate blocks module completion and next-module advancement.
- If false, the user may continue, but the current module stays `in_progress` or `needs_practice`.
- Missing evidence means `in_progress`.
- XP and achievements require real evidence.

## Viewer Session Consumption

When the local viewer is used and the user clicks "完成本次学习":

1. Read the newest session file from
   `{learning_root}/.learning-profile/tmp/viewer-sessions/{session_id}.json`.
2. Verify `source == "study.skill.viewer"` and `course_slug` matches the active course.
3. Answer `questions_for_llm` first.
4. Evaluate `exercises`, `feynman_explanations`, and `checkpoints` against the current module's mastery gate.
5. Use review records only for session summary; `record-review.py` already updates `concepts.json`.
6. If evidence is enough, update `meta.json`, `domain-tree.json`, XP, achievements, and concepts.
7. If evidence is not enough, keep the node `in_progress` and write what evidence is missing.

The viewer stores evidence, not correctness. Do not treat saved records as automatic completion.

## State Updates

Before writing state, generate complete updated JSON in memory, re-read the target file, then write through `.learning-profile/scripts/write-state.py`. If missing, stop and run the init script or repair the learning profile before continuing.

Update:

1. `concepts.json`
   - add new concepts only after real exposure
   - derive review `question`/`answer` from the concept just taught, the
     learner's submitted `study-*` answer, or the module's worked example
   - set `next_review` no earlier than tomorrow for new items
   - keep one clear retrieval prompt per concept; do not import unseen
     flashcards, static glossary terms, or whole interview/exam question banks
   - keep R computed, not stored
2. `meta.json`
   - update `current_module`, `completed_modules`, `last_session`, `total_sessions`, `streak_days`
   - preserve `skill_tree_enabled`, `rpg_enabled`, `rpg_preference_asked`
3. `domain-tree.json`
   - mirror meta flags
   - update node progress and missing evidence
   - grant XP only for real learning evidence
4. `params.json`
   - update immediately when the user says "太快/太慢/太浅/太深/跟不上"
   - append an `adaptive_history` entry with before/after values

## Pace Feedback

| User feedback | State change |
| --- | --- |
| 太快了 / 跟不上 | `speed_factor *= 0.7`, `new_items_per_session -= 2` with min 1, `spacing_factor *= 0.9` |
| 太慢了 / 太墨迹 | `speed_factor *= 1.3`, `new_items_per_session += 2`, `spacing_factor *= 1.1` |
| 太浅了 | `depth_chars_per_module *= 1.5` with cap 9000 |
| 太深了 / 听不懂 | `depth_chars_per_module *= 0.7` with floor 500 |

Reply briefly, then actually write `params.json`. Do not keep the adjustment only in chat.

## Session End Summary

```text
✅ 今日完成：{module_or_section}
📝 新知识点：{n} 个
⏰ 下次复习：{next_date}
➡ 建议下一步：{next_action}
🎮 Lv.{level} · {xp} XP · {new_achievement_or_title}
🔥 连续学习：{streak} 天
```

Omit RPG fields when `rpg_enabled=false`.

## Failure Modes To Prevent

| Failure mode | Prevention |
| --- | --- |
| Tutorial hell disguised as teaching | Require active recall, transfer, or Feynman explanation |
| Illusion of competence | Prefer recall over rereading |
| Passive AI dependency | Hint before answer; worked example includes reasoning |
| Over-scaffolding | Fade support as the learner improves |
| Fake progress | Keep pending/in_progress when evidence is missing |
| Toxic positivity | Use concrete progress and concrete next steps |
