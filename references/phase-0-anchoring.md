# Phase 0: 锚定（Analysis）

> Based on: ADDIE Analysis phase (Florida State Univ, 1975) +
> Backward Design Stage 1: Identify Desired Results (Wiggins & McTighe, 2005) +
> Knowledge Space Theory (Doignon & Falmagne, 1985) +
> Game skill tree UX (PoE/Diablo talent tree design)

## Step 0: Topic Triage

Before asking any questions, determine if the user's topic is vague or specific.

### VAGUE TOPIC → Generate Skill Tree First

**Triggers**: any topic that is a FIELD not a specific subject, such as "学AI",
"学心理学", "学摄影", "学英语", "学投资", "学历史", "学前端".

**Action**: Load `references/skill-tree.md`. Generate a domain skill tree using
the 3-tier structure, node status icons, and default RPG layer unless the user
has opted out. Present with guide text: "这就是 {领域} 的技能树。你现在站在哪？想往哪个方向走？"

If user picks a node that is still too broad (e.g., "AI" → picks "机器学习" → still broad), zoom in one more level.

### SPECIFIC TOPIC → Initialize Course-Local Tree Then Q1

**Triggers**: concrete topics such as "学 React Hooks", "学 PostgreSQL 索引",
"学水彩入门", "学微积分极限", "学英语口语发音".

**Action**: Do not skip the skill-tree feature. Initialize `domain-tree.json`
with defaults after route confirmation, but leave `nodes` empty until Module 00
and the syllabus are confirmed. If the user explicitly wants a preview before
that, show only a small "待生成" course tree, not invented module nodes.

### EDGE: User says "随便看看" / "有什么推荐"

Generate a skill tree for a popular matching domain, show hot paths (⭐ recommended nodes), let user explore.

## Protocol

## Anchoring Iron Law

No teaching without anchoring first. If the user has not confirmed a learning goal,
mode, baseline, materials/time constraints, and storage path, you have not earned
the right to teach. For explicitly tiny requests, confirm the narrow scope in one
sentence and proceed; the rule prevents sloppiness, not speed.

## Units and Course Size

- **一讲 (Lecture)**: about 10-25 minutes, 500-1500 Chinese characters plus examples, one main concept.
- **一模块 (Module)**: 2-5 lectures, one coherent sub-topic, about 0.5-3 hours.
- **一门课 (Course)**: at most 15 modules and 30 lectures. Split larger topics into multiple courses.

**Full mode（默认）:** Ask questions **one at a time**. Never batch multiple questions
in one message. Use user's answers to skip questions that are already answered.

**Lite mode（用户选 Quick Start / 速成 / 时间紧张时）:** Batch Q1+Q2+Q3 in one message.
Q4 follows separately. Don't repeat information the user already provided.

If arriving from skill tree navigation, Q1 is pre-answered (user's chosen node = their scope anchor).

### Default Skill Tree and RPG Policy

Skill tree and lightweight RPG progress are default features for every formal
course, not only programming topics.

- `skill_tree_enabled`: default `true`
- `rpg_enabled`: default `true`
- If user says "不要游戏化/不要娱乐元素/不要 RPG/别搞等级 XP 成就", set `rpg_enabled: false` in `meta.json`.
- If user says "不要技能树/不用地图", set `skill_tree_enabled: false` and `rpg_enabled: false` in `meta.json`.
- Ask whether to keep RPG either before the first teaching session starts or after
  the first teaching session ends. Do not ask repeatedly once `rpg_preference_asked` is true.
- Even when RPG is on, keep it lightweight: one short progress line, no long
  celebrations unless a real milestone happens.

### Quick Start Minimum Loop

Use this when the user explicitly wants speed over thoroughness:

1. Batch the 3 essential questions in one message: topic, baseline, time/materials.
2. Do Phase 1 Lite: 1-2 key sources and state what is missing.
3. Generate Module 00 only; user can decide whether to continue.
4. Preserve progress so the full flow can resume later.

Lite mode relaxes question batching and source count only. Module content quality and mastery gates stay the same.

### Q1: Scope — "想学到什么程度？"

Present these to the user — keep it short, no internal details. Remove day estimates
（每个人速度不同，无法预测）:

- 🏃 **速成导览** — 快速上手，能干活。适合紧急换技术栈。
- 📚 **系统精讲** — 从原理到实战全覆盖。适合深入掌握。
- 🎯 **面试冲刺** — 高频考点 + 手写题 + 项目追问。适合求职准备。
- 📝 **考试备考** — 对齐考纲，只学要考的。适合学校考试、考研考证。

If user's intent is unclear: "是工作需要快速上手，还是系统学？还是为了面试/考试？"

#### Agent Depth Rules (NOT shown to user)

These are internal quality constraints. Do NOT mention word counts or exercise counts
to the user — apply them silently when generating content.

| Mode | 字数/模块 | 思考题/模块 | 解释深度 |
|------|----------|------------|---------|
| 速成导览 | 800-2000 | 1-2 | 精简解释，跳过原理深挖和版本对比 |
| 系统精讲 | 2000-5000 | 3-5 | 3-5 个"为什么这样设计"，3-8 个对比表，常见误区+本章小结(5-7条) |
| 面试冲刺 | 500-1500 | 1 组追问 | 聚焦 1 个高频考点，含代码骨架+参考解法+追问+评分标准+面试陷阱 |
| 考试备考 | 800-2000 | 3-5 | 1-2 核心概念+推导，含练习题答案，标注考频和分值权重 |

Code examples and diagrams are NOT constrained — include whenever they aid understanding.

#### After Mode Selection: Prepare params.json

Once the user chooses a mode, keep the mode defaults as pending course state.
Do not write files yet unless `{learning_root}` and `{course-slug}` are already known.
After Q4 and route confirmation, create `{learning_root}/.learning-profile/courses/{course-slug}/params.json`
with these defaults. This persists across sessions and survives context compression.

```json
{
  "schema_version": 1,
  "mode": "speedrun",
  "mode_label": "速成导览",
  "depth_chars_per_module": 1200,
  "exercises_per_module": 2,
  "target_retention": 0.85,
  "new_items_per_session": 5,
  "spacing_factor": 1.0,
  "auto_advance": true,
  "require_mastery_before_advance": false,
  "speed_factor": 1.0,
  "last_speed_feedback": null,
  "last_speed_feedback_at": null,
  "adaptive_history": []
}
```

Mode defaults:

| Mode | depth_chars | exercises | target_retention | auto_advance | require_mastery |
|------|------------|-----------|-----------------|-------------|----------------|
| 速成导览 | 1200 | 2 | 0.85 | true | false |
| 系统精讲 | 3500 | 4 | 0.90 | false | true |
| 面试冲刺 | 1000 | 1组追问 | 0.90 | true | false |
| 考试备考 | 1500 | 4 | 0.90 | false | true |

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

If user selects 🟡 or 🔴, offer a pretest:
"要不要做个快速摸底？（3-5 题，2 分钟）这样我可以跳过你已经会的，不浪费时间。"
- If user accepts: generate 3-5 questions covering the topic's core concepts.
  Questions should test application, not trivia. Skip modules where user scores ≥85%.
- If user declines: proceed with self-reported level.

Implications:
- 零基础 → 更密集的类比，"先记住一句话"口诀，慢节奏
- 有基础 → 快速过基础，聚焦进阶和原理
- 熟练 → 跳过基础模块，直接进入原理、最佳实践、面试题

### Q3: Time — "每天能投入多少时间？总共预计学多久？"

Daily: 15 分钟 / 30 分钟 / 1 小时 / 2 小时+
Total: 3 天 / 1 周 / 2 周 / 1 个月 / 不限

Implications:
- 15min/day → micro-learning chunks (2-10 min per module), compact explanations
- 2h/day → full Gagné Nine Events cycle per session, deeper dives
- Short total → fewer modules, focus on essentials (80/20 principle)

### Q4: Location — "学习目录放哪里？"

This is the `{learning_root}` — a base directory that will contain ALL your
learning data. Structure: `{learning_root}/.learning-profile/` (state) +
`{learning_root}/courses/{course-slug}/` (course files).

Default: `{user_home}/learning` if not specified.
Never overwrite existing content.

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
模块一：{name} — {n} 讲
模块二：{name} — {n} 讲
模块三：{name} — {n} 讲
{For 考试备考:}
🎯 考试对标：覆盖 {exam_name} {topics_covered}
```

Ask: "这个路线 OK 吗？需要调整哪里？" — **Wait for user confirmation before Phase 1.**

After confirmation:
1. Initialize `{learning_root}/.learning-profile/` if missing.
2. Create the course directory under `.learning-profile/courses/{course-slug}/`.
3. Write `meta.json`, `params.json`, `domain-tree.json` with empty `nodes`, and an empty `concepts.json` using the schema in `state-schema.md`.
4. Use `write-state.py` when available; never overwrite existing state without reading it first.

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
| Topic too narrow (e.g., "学 React useState") | Offer: "这是个具体 API，我帮你做个快速教学（10分钟），还是扩展为 React Hooks 系统学习？" |
| User is a returning learner | Read `.learning-profile/courses/*/meta.json` first. Show progress. "上次你学到 {module}，继续还是换方向？" |
| User wants to switch path/mode | **正式流程**：展示当前模式→新模式的差异（字数/练习数/深度变化）→ 用户确认 → 更新 `params.json`（mode, depth_chars, exercises, target_retention）+ `meta.json`（mode, mode_label）→ 不改已生成内容，只影响后续模块。 |
| User says "看看进度" / "技能树" | Load `references/skill-tree.md`. Render current skill tree with all progress. |
| User opts out of RPG | Update `meta.json.rpg_enabled=false`, `meta.json.rpg_preference_asked=true`; keep skill tree unless they also reject it. |
| User opts out of skill tree | Update `meta.json.skill_tree_enabled=false`, `meta.json.rpg_enabled=false`, `meta.json.rpg_preference_asked=true`. |
| User completes a module | Update node progress. |
