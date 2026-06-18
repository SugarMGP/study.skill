# Phase 0: 锚定（Analysis）

> Based on: ADDIE Analysis phase (Florida State Univ, 1975) +
> Backward Design Stage 1: Identify Desired Results (Wiggins & McTighe, 2005) +
> Knowledge Space Theory (Doignon & Falmagne, 1985) +
> Game skill tree UX (PoE/Diablo talent tree design)

## Step 0: Topic Triage

Before asking any questions, determine if the user's topic is vague or specific.

### VAGUE TOPIC → Generate Skill Tree First

**Triggers**: any topic that is a FIELD not a specific subject, such as "学AI", "学心理学", "学摄影", "学英语", "学投资", "学历史", "学前端".

**Action**: Load `references/skill-tree.md`. Generate a domain skill tree using the 3-tier structure, node status icons, and default RPG layer unless the user has opted out. Present with guide text: "这就是 {领域} 的技能树。你现在站在哪？想往哪个方向走？"

If user picks a node that is still too broad (e.g., "AI" → picks "机器学习" → still broad), zoom in one more level.

### SPECIFIC TOPIC → Initialize Course-Local Tree Then Q1

**Triggers**: concrete topics such as "学 React Hooks", "学 PostgreSQL 索引", "学水彩入门", "学微积分极限", "学英语口语发音".

**Action**: Do not skip the skill-tree feature. Initialize `domain-tree.json` with defaults after route confirmation, but leave `nodes` empty until Module 00 and the syllabus are confirmed. If the user explicitly wants a preview before that, show only a small "待生成" course tree, not invented module nodes.

### EDGE: User says "随便看看" / "有什么推荐"

Generate a skill tree for a popular matching domain, show hot paths (⭐ recommended nodes), let user explore.

## Protocol

## Anchoring Iron Law

No teaching without anchoring first. If the user has not confirmed a learning goal, mode, baseline, materials/time constraints, and storage path, you have not earned the right to teach. For explicitly tiny requests, confirm the narrow scope in one sentence and proceed; the rule prevents sloppiness, not speed.

## Units and Course Size

- **一小节 (Section)**: one main question or concept, stored as its own `{module}/{section}/content.md`. This is the primary reading page in the local viewer.
- **一模块 (Module)**: a collapsible chapter. It has a short preface in `{module}/content.md` and usually 2-7 section pages below it.
- **一门课 (Course)**: usually no more than 12 modules and 60 section pages. Split larger topics into a course series.

**Full mode（默认）:** Ask questions **one at a time**. Never batch multiple questions in one message. Use user's answers to skip questions that are already answered.

**Lite mode（用户选 Quick Start / 速成 / 时间紧张时）:** Batch Q1+Q2+Q3 in one message. Q4 follows separately. Don't repeat information the user already provided.

If arriving from skill tree navigation, Q1 is pre-answered (user's chosen node = their scope anchor).

### Default Skill Tree and RPG Policy

Load `references/skill-tree.md` for the full default policy, opt-out wording, RPG behavior, and state integration. Phase 0 only owns when to initialize the tree:

- broad topic: generate a domain exploration tree before Q1.
- specific topic: initialize an empty course-local tree after route confirmation; fill nodes only after Module 00 and syllabus are confirmed.
- user opts out: write the `meta.json` flags exactly as `skill-tree.md` requires.

### Quick Start Minimum Loop

Use this when the user explicitly wants speed over thoroughness:

1. Batch the 3 essential questions in one message: topic, baseline, time/materials.
2. Do Phase 1 Lite: 1-2 key sources and state what is missing.
3. Generate Module 00 only; user can decide whether to continue.
4. Preserve progress so the full flow can resume later.

Lite mode relaxes question batching and source count only. Module content quality and mastery gates stay the same.

### Q1: Scope — "想学到什么程度？"

Present these to the user — keep it short, no internal details. Remove day estimates （每个人速度不同，无法预测）:

- 🏃 **速成导览** — 快速上手，能干活。适合紧急换技术栈。
- 📚 **系统精讲** — 从原理到实战全覆盖。适合深入掌握。
- 🎯 **面试冲刺** — 高频考点 + 手写题 + 项目追问。适合求职准备。
- 📝 **考试备考** — 对齐考纲，只学要考的。适合学校考试、考研考证。

If user's intent is unclear: "是工作需要快速上手，还是系统学？还是为了面试/考试？"

#### Agent Depth Rules (NOT shown to user)

These are internal quality constraints. Do NOT mention word counts or exercise counts to the user — apply them silently when generating content.

The selected mode's prose band is a post-generation diagnostic, not a generation cap. Generate enough learner-facing explanation, examples, transitions, diagrams, code, worked solutions, and practice first. After generation, use the band only to notice suspiciously thin or unusually verbose modules. A module is acceptable only when it satisfies the selected mode's structural coverage and teaches the source material clearly. Time is only a rough planning aid because reading speed, coding speed, and prior knowledge vary widely.

Counting rules:

- Chinese target counts learner-facing prose roughly. Code blocks, Mermaid, tables, images, and machine-readable `study-*` metadata do not count as prose, though their explanation does.
- English target counts learner-facing prose words. For mixed technical text, treat 1 English word as roughly 1.5-2 Chinese characters when choosing a comparable depth.
- Do not pad a module just to hit the target. If the structural coverage is complete and the learner's goal is narrow, shorter is acceptable.
- Section pages should be substantial enough to teach, not just outline. As a soft diagnostic, a normal section below roughly 1000 Chinese non-symbol characters / 600 English words is suspicious unless the section is a narrow recognition note, setup page, or recap. Do not merge unrelated content just to reach a number; expand with missing explanation, transitions, examples, worked steps, source excerpts, diagrams, or practice.
- If a section is very long, split it only when the learner question, worked example, prerequisite, procedure, or practice type changes. Do not cut useful examples just because a diagnostic band was exceeded.
- If the total module content exceeds the upper band, first consider whether the extra material is redundant. If it is not redundant, keep it or split the module; do not compress required teaching into a summary.

| Mode | 目标正文规模/模块 | 小节规模建议 | 结构覆盖/模块 | 粗略学习负荷 | 解释深度 |
|------|------------------|----------------|----------------|--------------|----------|
| 速成导览 | 中文 1800-3200 字；英文 900-1900 words | 2-3 节，每节中文 700-1400 字 / 英文 400-850 words | 1 条主路径；1 个可运行/可检查例子；1-2 个互动题 | 短到中；通常一坐能完成 | 精简解释，先跑通主路径，只讲会阻塞上手的原理 |
| 系统精讲 | 中文 6000-11000 字；英文 3600-6800 words | 4-7 节，每节中文 1000-2200 字 / 英文 650-1300 words | 3-6 个概念块；2 个以上例子/案例/代码；4-7 个互动题；必要时配图或对比表 | 长；适合分小节学习 | 深挖为什么、怎么选、边界和底层机制；讲清概念关系和迁移条件 |
| 面试冲刺 | 中文 2200-4500 字；英文 1200-2600 words | 2-4 节，每节中文 800-1800 字 / 英文 450-1000 words | 1 个高频考点簇；2-4 个追问；1 套回答评分标准；2-3 个面试型 `study-input` / `study-choice` | 中等；以输出答案为目标 | 用场景题组织回答要点、追问方向、反例和判断标准 |
| 考试备考 | 中文 3500-7000 字；英文 2000-4200 words | 3-6 节，每节中文 900-1900 字 / 英文 550-1150 words | 对齐考纲/材料；1-2 个完整例题；3-6 个考试型练习；给出评分点或判分依据 | 中到长；以做题和订正为目标 | 讲清定义、推导、题型、分值权重和易混点；不考的不展开 |

Code examples, diagrams, images, tables, formulas, and source excerpts are not constrained by prose length. Include them whenever they reduce cognitive load or make the learner's answer checkable.

#### After Mode Selection: Prepare Runtime Params

Once the user chooses a mode, keep the mode defaults as pending course state. Do not write files yet unless `{learning_root}` and `{course-slug}` are already known. After Q4 and route confirmation, create `{learning_root}/.learning-profile/courses/{course-slug}/params.json` with the runtime defaults below. Course size, prose depth, section split rules, and exercise density stay in this reference as generation rules; do not persist them into `params.json`.

```json
{
  "schema_version": 4,
  "target_retention": 0.85,
  "spacing_factor": 1.0,
  "require_mastery_before_advance": false,
  "last_pace_feedback": null,
  "last_pace_feedback_at": null,
  "adaptive_history": []
}
```

Runtime defaults:

| Mode | target_retention | require_mastery |
|------|------------------|----------------|
| 速成导览 | 0.85 | false |
| 系统精讲 | 0.90 | true |
| 面试冲刺 | 0.90 | false |
| 考试备考 | 0.90 | true |

When user gives speed/depth feedback during Phase 3, update params.json immediately.

### Q1.5: Materials — "手头有现成材料吗？"

Especially important for 考试备考 mode, but useful for any mode.

```
📎 有教学大纲、教材、考纲、课件、历年题吗？
   有的话给我看看（贴文本/给文件路径/给链接都行），
   我按材料来规划，只学要考的，不学多余的。
```

**What to accept:**
- 📄 教学大纲 / 考试大纲 — defines exact scope and topic list
- 📖 教材 / 电子书 — primary learning source
- 📝 课件 / 讲义 — topic ordering and emphasis
- 🎯 历年真题 — exam patterns, difficulty, question types
- 📋 课程要求 / 作业 — what's actually assessed

**If user provides materials:**
1. Read the material (file, pasted text, or URL)
2. Extract: topic list, ordering, depth, exam format, key concepts
3. The material becomes the **primary scope constraint** — don't add topics not in the syllabus
4. Skip Q1 if the material defines the scope (e.g., "covering Chapters 1-5 for midterm")
5. Continue to Q2 with the material as context

**If user doesn't have materials:** proceed to Q2 normally.

### Q2: Baseline — "当前基础怎么样？"

Options:
- 🟢 零基础：完全不熟悉这个领域
- 🟡 有相关经验：了解类似技术，或有编程基础
- 🔴 熟练但想深入：已经在用，想理解底层原理和最佳实践

If user selects 🟡 or 🔴, offer a pretest: "要不要做个快速摸底？（3-5 题，2 分钟）这样我可以跳过你已经会的，不浪费时间。"
- If user accepts: generate 3-5 questions covering the topic's core concepts. Questions should test application, not trivia. Skip modules where user scores ≥85%.
- If user declines: proceed with self-reported level.

Implications:
- 零基础 → 更密集的类比、自然建立直觉、慢节奏
- 有基础 → 快速过基础，聚焦进阶和原理
- 熟练 → 跳过基础模块，直接进入原理、最佳实践、面试题

### Q3: Time — "每天能投入多少时间？总共预计学多久？"

Daily: 15 分钟 / 30 分钟 / 1 小时 / 2 小时+ Total: 3 天 / 1 周 / 2 周 / 1 个月 / 不限

Implications:
- 15min/day → shorter learning sessions and earlier splits; reduce optional scope before reducing explanation depth for selected content
- 2h/day → full Gagné Nine Events cycle per session, deeper dives
- Short total → fewer modules and fewer optional branches; selected essentials still need explanation, examples, and checks

### Q4: Location — "学习目录放哪里？"

This is the `{learning_root}` — a base directory that will contain ALL your learning data. Structure: `{learning_root}/.learning-profile/` (state) + `{learning_root}/courses/{course-slug}/` (course files).

Default: `{user_home}/learning` if not specified. Never overwrite existing content.

### Gate: 学习路线图预览

After all questions answered, synthesize. Adapt format to mode:

```
📋 学习路线图：{topic}

👤 学习者画像：{baseline} → {scope}
⏱ 预计：{total_time}，每天 {daily_time}
📁 存放位置：{learning_root}

{If material-driven:}
📎 参考材料：{material_summary}
   → 课程范围：{extracted_scope}

🗺 路线概览：
模块一：{name} — {n} 小节
模块二：{name} — {n} 小节
模块三：{name} — {n} 小节
{For 考试备考:}
🎯 考试对标：覆盖 {exam_name} {topics_covered}
```

Ask: "这个路线 OK 吗？需要调整哪里？" — **Wait for user confirmation before Phase 1.**

After confirmation:
1. Initialize `{learning_root}/.learning-profile/` if missing.
2. Create the course directory under `.learning-profile/courses/{course-slug}/`.
3. Update `profile.json.learner_profile` with durable facts from anchoring: baseline, goals, known languages or skills, weak prerequisites, preferred analogies, teaching constraints, and material summary. Do not keep these only in chat context.
4. Write `meta.json`, `params.json`, `domain-tree.json` with empty `nodes`, an empty `concepts.json`, and an empty `learning-record.json` using the schema in `state-schema.md`.
5. Use `{skill_dir}/scripts/write-state.py`; never overwrite existing state without reading it first.

Example durable profile fields:

```json
{
  "learner_profile": {
    "known_languages": ["cpp", "go", "java"],
    "weak_prereqs": ["python"],
    "analogy_preferences": ["backend", "systems"],
    "teaching_constraints": [
      "不把 Python 教学放进主线",
      "遇到 Python 高级语法时用 C++/Go/Java 类比解释",
      "系统精讲为主，项目驱动为辅助",
      "每天默认学习 1 小时"
    ]
  }
}
```

Later teaching must respect these fields. For example, if Python is a weak prerequisite but excluded from the main path, explain only the necessary syntax and return to the current topic.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User provides syllabus but no time estimate | "考试/提交什么时候？" — use that as deadline |
| User provides materials in a format agent can't read | "这个格式我读不了。把关键内容贴给我就行：考哪些章节、什么题型、什么时候考？" |
| Materials are very long (>50 pages syllabus) | "材料挺多，我先扫一下结构。你告诉我重点看哪几部分？" |
| User has both a textbook AND wants to supplement | Phase 1: textbook = primary source, web research = supplementary exercises and explanations |
| User says "随便" / idk | Show a popular matching domain skill tree: "先看看这个领域的技能树？挑个感兴趣的方向？" |
| User has no time estimate | "先按一周每天30分钟规划，后面可以调整？" |
| Topic too broad (e.g., "学AI"/"学心理学") | **Generate skill tree first**. "这个领域太大了，先看看技能树，你想走哪个分支？" |
| User picks a node but it's still broad | Zoom in one more level. "这个分支也很大，我们再拆一层，你对哪个方向更感兴趣？" |
| Topic too narrow (e.g., "学 React useState") | Offer: "这是个具体 API，我可以做一个小节快速教学（约 1200-2200 字，时间只作粗参考），还是扩展为 React Hooks 系统学习？" |
| User is a returning learner | Read `.learning-profile/courses/*/meta.json` first. Show progress. "上次你学到 {module}，继续还是换方向？" |
| User wants to switch path/mode | **正式流程**：展示当前模式→新模式的差异（篇幅、练习密度、解释深度、掌握门槛）→ 用户确认 → 更新 `meta.json`（mode, mode_label）；如果新模式改变 `target_retention` 或 `require_mastery_before_advance`，同步更新 `params.json` → 不改已生成内容，只影响后续模块。 |
| User says "看看进度" / "技能树" | Load `references/skill-tree.md`. Render current skill tree with all progress. |
| User opts out of RPG | Load `skill-tree.md` and write the opt-out flags it defines; keep skill tree unless they also reject it. |
| User opts out of skill tree | Load `skill-tree.md` and write the skill-tree opt-out flags it defines. |
| User completes a module | Update node progress. |
