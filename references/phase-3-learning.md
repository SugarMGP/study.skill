# Phase 3: 学习（Interactive Teaching）

> Based on established teaching methodology: guided discovery, scaffolding, and active recall.

## Scope

This file is the source of truth for live teaching and continuation. It covers:

- how to start a formal learning session
- how to continue an existing generated course
- how to teach, practice, give feedback, and decide mastery
- how to use viewer evidence for mastery decisions and state writes

It does not cover platform automations, scheduled reminders, hooks, push notifications, or thread wakeups. Review checks happen when a learning session starts. Exact local viewer startup, supported syntax, learning-record fields, and chat handoff text live in `learning-viewer.md`.

## Teaching Rule

```text
DON'T JUMP TO THE ANSWER. GUIDE THE DISCOVERY FIRST.
```

Before revealing a solution, try guided discovery using the Hint Escalation table below. Skip directly to a worked example only when: the user explicitly asks for one ("给我完整例子"), is in speedrun mode, or has failed 3+ attempts on the same concept. Never give only a bare final answer.

## Session Start Protocol

At the start of each learning session (any turn where the user says "继续学习", "下一节", "开始学", or the agent begins teaching a new section):

1. If old `.learning-profile/progress.json` or `review-schedule.json` exists, stop and migrate first.
2. Read `.learning-profile/profile.json` and the active course `meta.json`, `params.json`, `concepts.json`, and `domain-tree.json`.
3. ⛔ Verify `meta.json.generation_status == "complete"`. If `"generating"` or `"pending_review"`, the course is not ready for learning. Halt and return to Phase 2 — complete the blocking learner-perspective review per `phase-2-generation.md §Blocker` before proceeding to Phase 3.
4. Read local course content: `README.md`, `syllabus.md` if present, current module `content.md`, and current section `content.md` when a section is open.
5. Show exact course/module/section, current skill-tree node, and one short RPG line when enabled.

At the first formal learning session of each day only:

1. Run `{skill_dir}/scripts/check-reviews.py {learning_root}/.learning-profile`.
2. If the skill script is missing, stop and repair the skill installation before continuing.
3. If due reviews exist, show one compact line and ask whether to spend 2-5 minutes reviewing. If the user does not choose review, continue the main lesson.

Opening format:

```text
📍 当前：{course_name} / {module_id} / {section_title}
🌳 节点：{node_id} · {node_status} · 掌握度 {progress}%
⏰ 待复习：{overdue_count} 个知识点，可先用 2-5 分钟过一遍
🎮 Lv.{level} · {xp} XP · 称号「{title}」 · 当前任务：{quest}
```

If no overdue items exist, omit the review line.

If `meta.json.rpg_enabled=true` and `meta.json.rpg_preference_asked=false`, ask the one-time RPG preference question before the first teaching session starts per `skill-tree.md`. ⛔ [BLOCKING] After asking, write the answer to `meta.json` immediately via `{skill_dir}/scripts/write-state.py`.

## Existing Course Continuation

When the user says "继续学习", "继续", "下一节", or similar, and course files exist:

1. Load `references/learning-viewer.md`.
2. Follow `learning-viewer.md` for startup mode, fallback conditions, and the short handoff message.
3. Choose the next node from `in_progress`, then `available` in syllabus order. Only when neither status exists, choose the first `unlockable` node by prerequisite chain. Find that node's first unfinished section, then start the viewer with explicit `--module` and `--section` arguments when the section exists; for a module-only course page, pass only `--module`. Do not rely on `learning-record.json.current`, which records the last page the viewer displayed and may still point to the just-completed section.
4. If the viewer starts successfully, make the viewer the primary learning surface. Do not continue with the full Core Teaching Loop in chat for the same lesson.
5. While the viewer is open, answer targeted questions from the learner, but do not re-teach the whole section unless the learner asks for a chat explanation or the viewer is unusable.
6. Fall back to chat teaching only with a concrete reason, then continue from the current module or section `content.md`.
7. Do not enter `locked` nodes automatically. If the learner insists, explain the missing prerequisite and mark the new node `in_progress`, not `mastered`.
8. External docs/source lookup is allowed only when local content is missing, the user asks latest/API/version-specific details, or a runnable/API claim needs verification.

## Supplemental Content During Learning

When the learner says a generated course section is too thin, asks for a deeper explanation, requests more examples, wants a practice paper, or needs a wrong-answer review, do not silently rewrite the main course files. Follow the main-course freeze rule in `courseware-format.md`: append a new section under `99-content-supplements/` unless the learner explicitly asks to modify the original module or section.

Supplement examples:

- “这里再细讲一下” -> create the next `99-content-supplements/{NN}-{topic}/content.md` section and state which original module/section it supplements.
- “再出十道题” -> create a supplement section that can be all exercises, with `study-*` blocks when answers should be saved or revealed after submission.
- “原文写错了，改掉” -> revise the original file, then check that syllabus/module preface/progress references still match.

## Core Teaching Loop

Teach one main concept at a time:

1. State the learning objective in the course language, using plain learner-facing wording.
2. Explain with plain-language intuition -> precise term -> example/code/case -> decision rule.
3. Ask a small active-recall or transfer question.
4. Give feedback: what is right, what is weak, why it matters.
5. After 2-3 new concepts, ask one mixed question that combines old and new ideas.
6. End with a small self-test made of ordinary question blocks before moving modules.

For Chinese courses, follow the style in `chinese-tutorial-guide.md`. For English courses, follow `english-tutorial-guide.md`. Do not switch languages unless the learner asks for it or the course explicitly uses bilingual terminology.

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

When the learner has failed 3+ attempts on the same concept, skip the remaining hint escalation steps and give a worked example directly. The goal is productive struggle, not frustration.

## Mastery Gate

Before marking a module `mastered` or adding it to `completed_modules`, require evidence:

| Tier | Gate |
| --- | --- |
| Foundation / 基础 | evidence tagged as 2 recall + 1 apply/analyze + 1 explain + >=85% correct |
| Core / 核心 | evidence tagged as 1 recall + 1 apply/analyze + 1 explain or practice + >=75% correct |
| Enrichment / 拓展 | >=60% self-test; may skip on user request |

In speedrun mode: Foundation >=75%, Core >=60%, Enrichment optional.

`params.json.require_mastery_before_advance` controls whether failing the gate blocks the next module. It does not let the agent fake completion:

- If true, failing the gate blocks module completion and next-module advancement.
- If false, the user may continue, but the current module stays `in_progress` or `needs_practice`.
- Missing evidence means `in_progress`.
- XP and achievements require real evidence.

## Viewer Learning Record Consumption

When the local viewer is used and the learner comes back after reading and submitting exercises:

1. Follow `learning-viewer.md` to read the current course `learning-record.json`, validate the record source, answer learner questions, clear answered `questions_for_llm`, and locate the latest completed page.
2. Evaluate the matching exercise evidence against the current module's mastery gate. Use `mastery_tags` to identify recall, apply/analyze, explain, interview, or exam evidence. For old courses, also read `legacy_checkpoints` if present.
3. Use review records only for session summary; `record-review.py` already updates `concepts.json`.
4. If evidence is enough, update `meta.json`, `domain-tree.json`, XP, achievements, and concepts.
5. If evidence is not enough, keep the node `in_progress` and write what evidence is missing.

The viewer stores reading and answer evidence, not correctness. Page completion is not mastery.

## State Updates

Before writing state, generate complete updated JSON in memory, re-read the target file, then write through `{skill_dir}/scripts/write-state.py`. If the script is missing, stop and repair the skill installation before continuing.

Update:

1. `concepts.json`
   - add new concepts only after real exposure
   - derive review `question`/`answer` from the concept just taught, the learner's submitted `study-*` answer, or the module's worked example
   - set `next_review` no earlier than tomorrow for new items
   - keep one clear retrieval prompt per concept; do not import unseen flashcards, static glossary terms, or whole interview/exam question banks
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
   - write `last_pace_feedback`, `last_pace_feedback_at`, and append an `adaptive_history` entry with the trigger and the next teaching adjustment
   - do not invent numeric tuning fields just to make the feedback look automated
 5. `learning-record.json`
    - after answering `questions_for_llm`, remove answered questions and write the updated record back through `{skill_dir}/scripts/write-state.py`
    - ⛔ **If answered questions are not cleared, they will repeat in the next session.**
    - keep unanswered questions only when the agent explicitly did not answer them
    - write the updated list (or `[]` when all are resolved) back immediately

## Pace Feedback

| User feedback | State change | Next teaching behavior |
| --- | --- | --- |
| 太快了 / 跟不上 | `last_pace_feedback="too_fast"` | Split the next concept smaller, add prerequisite refreshers and more guided questions |
| 太慢了 / 太墨迹 | `last_pace_feedback="too_slow"` | Skip obvious scaffolding, use denser examples, and move to application sooner |
| 太浅了 | `last_pace_feedback="too_shallow"` | Add mechanism, boundary, trade-off, or harder transfer examples within the selected mode |
| 太深了 / 听不懂 | `last_pace_feedback="too_deep"` | Return to concrete examples, reduce abstraction, and repair missing prerequisites before continuing |

⛔ **[BLOCKING] Write `params.json` now — do not defer.** After replying, immediately update `params.json` with `last_pace_feedback`, `last_pace_feedback_at`, and an `adaptive_history` entry via `{skill_dir}/scripts/write-state.py`. If the feedback contradicts the selected mode (e.g. "太浅了" in 速成 mode), ask whether to switch mode instead. Skipping this write causes the pace adjustment to be lost.

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
| Tutorial hell disguised as teaching | Require saved questions with recall, apply/analyze, or explain evidence |
| Illusion of competence | Prefer recall over rereading |
| Passive AI dependency | Hint before answer; worked example includes reasoning |
| Over-scaffolding | Fade support as the learner improves |
| Fake progress | Keep pending/in_progress when evidence is missing |
| Toxic positivity | Use concrete progress and concrete next steps |

## Agent 答疑增强

当学习者在 Phase 3 中提出具体问题时，agent 的答疑必须超越常规教学，利用已生成课程的结构优势：

### 1. 优先引用课程原文

回答问题时必须引用具体小节路径，而非凭空解释。可以说："建议回看 `03-useContext / 01-provider` 中关于 Provider 的完整示范，那里我们一步步走过了整个流程。"——不给模糊的"回去看看那章"。

### 2. 交叉引用 concepts.json

回答 A 概念时，检查 `concepts.json` 中的相关概念（同模块、同 mastery_tags），主动提及："这个问题还和 `useEffect 依赖数组` 有关，你在 02-useEffect 学过。"这促进交错检索，提升长期记忆。

### 3. 主动提议补充小节

当同一概念被提问 3 次及以上，或学习者在练习中反复出错时，主动提议："我发现你在这个知识点上反复提问，要不要我在 `99-content-supplements/` 里给你加一节专门讲这个？"

### 4. 匹配课程教学风格

答疑时观察当前小节的正文教学模式——如果课用了痛苦先行结构、代码走读或嵌入式预判提问，agent 的回答也应沿用同样的模式。风格一致性降低认知摩擦。

### 5. 利用教学记录中的信号

如果发现学习者多次重读同一节、或练习提交率明显偏低，在答疑前主动询问："这部分是不是有点绕？要不要我换一种方式讲？"

### 协议约束

以下约束确保答疑增强不与现有教学协议冲突：

1. **聊天教学模式**（无查看器）：遵循 Hint Escalation 优先于直接给答案。先引导方向（"这里的核心概念是什么？"），2-3 次尝试失败后再给完整示例。不因为"答疑增强"而跳过引导步骤。

2. ⛔ **查看器模式**：查看器会话进行中时，不做主动答疑。学习者在查看器里阅读和提交练习，agent 仅做交接和紧急问题处理。正式答疑在学习者结束查看器会话、回来反馈后进行——此时消费 `learning-record.json` 中的 `questions_for_llm`。

3. **questions_for_llm 生命周期**：回答完待问清单后，立即通过 `{skill_dir}/scripts/write-state.py` 写回：已回答的问题从 `questions_for_llm` 删除；全部答完写 `[]`。⛔ 忘记清空会导致已回答问题在下次会话重复出现。
