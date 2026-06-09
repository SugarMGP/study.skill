# 技能树（Skill Tree）

> Based on: Knowledge Space Theory (Doignon & Falmagne, 1985) +
> human-skill-tree (24kchengYe, 550★) +
> RPG progression mechanics (PoE/Diablo talent tree UX)

## Default Policy

Skill trees are default for every formal course, across all learnable domains:
programming, language learning, math, design, music, finance, writing, exam prep,
craft skills, and general knowledge.

Use a skill tree in two ways:

1. **Domain exploration tree**: for broad topics like "学AI", "学心理学", "学英语",
   "学摄影", "学投资", "学历史". Show branches so the user can choose a path.
2. **Course-local tree**: for specific topics like "学 React Hooks", "学微积分极限",
   "学水彩入门". Map the generated modules, prerequisites, locks, and progress.

Do not disable the tree because the topic is not programming. Disable only when
`meta.json.skill_tree_enabled` is `false` or the user explicitly says they do not
want a skill tree/map.

## RPG Defaults and Opt-Out

RPG progress is default on:

- levels
- XP
- titles
- achievements
- quests
- unlocks

Turn RPG off only when `meta.json.rpg_enabled` is `false` or the user explicitly
says they do not want game/entertainment/RPG elements. If the user opts out,
update `meta.json` immediately through `write-state.py` when available:

```json
{
  "skill_tree_enabled": true,
  "rpg_enabled": false,
  "rpg_preference_asked": true
}
```

If the user rejects the skill tree itself, set both flags to false:

```json
{
  "skill_tree_enabled": false,
  "rpg_enabled": false,
  "rpg_preference_asked": true
}
```

Ask whether to keep RPG either before teaching starts or after the first teaching
session. Ask once; after `rpg_preference_asked=true`, do not ask again unless the
user brings it up. Store the answer in `meta.json`, not only in chat context.

Suggested wording:

```text
我会默认保留技能树、等级、XP、成就这些轻量进度元素，方便你看到自己在往哪走。
如果你觉得花哨，我可以关掉娱乐元素，只保留正常学习进度。要保留吗？
```

If the user keeps RPG, set `rpg_preference_asked=true` and leave
`rpg_enabled=true`. If the user says no, set `rpg_enabled=false` and
`rpg_preference_asked=true`.

## Skill Tree Format

Use indented bullet-style with emoji status markers. No box-drawing characters
(╔══╗, ━━━) — these misalign across terminals and fonts. 3 tiers, 5-8 branches per tier.

```
🌳 {领域名} 技能树

> {一句话描述这个领域是干什么的}

### 📚 {TIER_1_NAME} — [████████░░] 80%

- ✅ {NODE_ID}: {Node Name} — 100%
  - 包含: {key topics}
- 🔄 {NODE_ID}: {Node Name} — [██████░░] 60%
  - {completed}/{total} 节
  - 包含: {key topics}
- ⬜ {NODE_ID}: {Node Name} — 0%
  - 包含: {key topics}
- 🔒 {NODE_ID}: {Node Name} — 0%
  - 需要: {prerequisite_node} ✅

### 🎯 {TIER_2_NAME} — [████░░░░] 40%

- 🔄 {NODE_ID}: {Node Name} — [████████] 80%
  - ✅ {sub_item}
  - 🔄 {sub_item} — [████░░░░] 40%
  - ⬜ {sub_item}
- ⬜ {NODE_ID}: {Node Name} — 0%
  - 需要: {prereq} (40%+)
- 🔒 {NODE_ID}: {Node Name} — 0%
  - 需要: {prereq_1} + {prereq_2}

### 🚀 {TIER_3_NAME} — [░░░░░░░░] 0%

- 🔒 {NODE_ID}: {Node Name} — 0%
  - 需要: {prereq_list}
- 🔒 {NODE_ID}: {Node Name} — 0%
  - 需要: {prereq_list}

---
💡 建议路径：{recommended_path}

🎮 进度：Lv.{level} · {xp} XP · 称号「{title}」
```

## Node Status Icons

| Icon | Status | Meaning |
|------|--------|---------|
| `✅` | Mastered | 100% complete, quiz passed |
| `🔄` | In Progress | Started but not finished |
| `⬜` | Available | All prerequisites met, ready to start |
| `🔒` | Locked | Missing prerequisites |
| `⭐` | Recommended | AI suggests this as best next step |

## Node Metadata

Each node carries:

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Short machine-readable ID | `react-hooks`, `ds-algo` |
| `name` | Chinese display name | `React Hooks 核心` |
| `tier` | 1=Foundation, 2=Core, 3=Advanced | `1` |
| `difficulty` | Stars 1-5 | `★★☆☆☆` |
| `est_hours` | Estimated learning hours | `8h` |
| `prerequisites` | List of node IDs required | `["js-basics"]` |
| `soft_gate` | % needed in prerequisite (default 100) | `40` |
| `key_topics` | Keywords for what this covers | `["useState","useEffect","useRef"]` |
| `interview_weight` | Relevance to interviews (1-5) | `4` |

## Generating a Domain Tree from Broad Topics

### Step 1: Identify the domain

When user says "我想学编程", "学AI", "学心理学", "学英语", or any broad field:
- Recognize this as a FIELD, not a topic
- The domain is "编程" (Programming), which has many branches

### Step 2: Research the domain structure

Quickly research (no subagent needed, use training knowledge + web search if needed):
- What are the major branches/sub-fields?
- What is the logical prerequisite chain?
- What do real job descriptions / learning roadmaps look like?

### Step 3: Build the tree

- **Tier 1 (Foundation)**: What everyone in this domain must know first
- **Tier 2 (Core)**: The main branches — user picks ONE to focus on
- **Tier 3 (Advanced)**: Specializations that unlock after Tier 2

### Step 4: Present and guide

After presenting the tree:
```
这就是 {领域} 的技能树。你现在站在哪？想往哪个方向走？

💬 你可以：
  • 回复节点编号（如 "react-hooks"）深入了解那个分支
  • 说 "从零开始" 我帮你从最基础的节点开始
  • 说 "推荐路径" 我给你最优学习路线
```

### Step 5: Narrow down

Once user picks a branch:
- Zoom into that branch as a sub-tree
- Show only that branch + its prerequisites
- Proceed to normal Phase 0 Q1-Q4

## Generating a Course-Local Tree from Specific Topics

For a specific topic, generate a compact tree after Module 00 is confirmed:

```text
🌳 {课程名} 技能树

### 📚 基础层
- 🔄 module-01: {module_name} — 0%
  - 包含: {key_topics}

### 🎯 核心层
- 🔒 module-02: {module_name} — 0%
  - 需要: module-01

### 🚀 进阶层
- 🔒 module-03: {module_name} — 0%
  - 需要: module-02

🎮 进度：Lv.1 · 0 XP · 称号「学徒」
```

The course-local tree should mirror the generated syllabus. Do not invent extra
branches that are not part of the confirmed course.

## Example: "我想学大模型" Domain Map

```
🌳 大模型应用开发

> 从调用 API 到构建企业级 AI Agent 的完整技能体系

### 📚 基础层 — [░░░░░░░░] 0%

- ⬜ llm-basics: 大模型认知与基础 — ★★☆☆☆ 预计 4h
  - Transformer原理 · Token与上下文 · API调用方式
- ⬜ prompt-eng: 提示词工程 — ★★☆☆☆ 预计 6h
  - Few-shot · CoT · 结构化输出 · 提示词模板
- ⬜ tools-env: 工具链与环境搭建 — ★☆☆☆☆ 预计 2h
  - Python环境 · API Key管理 · 常用SDK

### 🎯 核心层（选择一个方向深入）— [░░░░░░░░] 0%

- ⬜ lowcode: 低代码Agent开发 — ★★☆☆☆ 预计 10h
  - 需要: llm-basics ✅, prompt-eng ✅
  - Coze · Dify · 工作流设计 · 企业部署
- ⬜ framework: 开发框架深入 — ★★★★☆ 预计 20h
  - 需要: llm-basics ✅, prompt-eng ✅
  - LangChain · LangGraph · MCP协议 · A2A协议
- ⬜ finetune: 模型微调实践 — ★★★★★ 预计 16h
  - 需要: llm-basics ✅
  - LoRA · QLoRA · 数据集构建 · 评估

### 🚀 进阶层 — [░░░░░░░░] 0%

- 🔒 rag-adv: 高级RAG架构 — ★★★★☆ 预计 12h
  - 需要: framework
- 🔒 agent-proj: 企业级Agent项目 — ★★★★★ 预计 24h
  - 需要: framework + lowcode
- 🔒 multi-agent: 多智能体系统 — ★★★★★ 预计 16h
  - 需要: framework

---
💡 建议路径：
  零基础：llm-basics → prompt-eng → lowcode → agent-proj
  有Python基础：跳过tools-env，从 llm-basics 开始
  已经在用API：直接进 framework 或 finetune
```

## Zoom-In: Sub-Tree View

When user picks a node (e.g., types `lowcode` or clicks on it):

```
🔍 低代码Agent开发 — ★★☆☆☆ — 预计 10h

📋 前置：llm-basics ✅ | prompt-eng ✅

📖 包含模块：
- 1. Coze平台入门 — 创建第一个Bot
- 2. 工作流与插件 — 设计复杂Agent逻辑
- 3. 知识库与变量 — 让Agent记住信息
- 4. Dify自部署 — Docker部署开源方案
- 5. 企业级发布 — API接入 + 监控

🎯 学完你能：独立在 Coze/Dify 上构建和部署 AI Agent

💬 要开始学这个吗？输入 "开始" 或选其他节点。
```

## RPG Mechanics

Keep RPG lightweight. It should make progress visible, not interrupt teaching.
Do not turn every message into a game UI.

### 等级系统（Level System）

- 1 Level = 1000 XP
- XP from: completing modules (+100), passing quizzes (+50), review streaks (+20/day)
- Level up on milestone: display ASCII celebration

```
🎉 升级！ Lv.3 → Lv.4
---
📚 已解锁核心层技能树
🔥 获得称号：「初出茅庐」
```

### 任务系统（Quest System）

- **每日任务**: "完成 2 节" / "复习 5 个知识点" (reward: +50 XP)
- **节点任务**: "学完 llm-basics" (reward: +200 XP + 解锁下一层)
- **成就任务**: "连续学习 7 天" / "完成第一个实战项目" (reward: +500 XP + 称号)

### 称号系统（Title System）

| 条件 | 称号 |
|------|------|
| 完成第一个模块 | 「学徒」 |
| 完成一个完整技能树 | 「出师」 |
| 连续学习 30 天 | 「苦行僧」 |
| 完成 3 个实战项目 | 「实战派」 |
| 累计 10000 XP | 「大师兄」 |

### 路径选择（Build System）

When tree has multiple paths, offer Build options:

```
🎯 选择你的路线：

🏃 速成路线：llm-basics → prompt-eng(精简) → lowcode
   ⏱ 目标是尽快做出第一个可用作品

📚 精进路线：llm-basics → prompt-eng(深入) → framework → rag-adv
   ⏱ 适合想深入原理、做复杂系统的

🎯 面试路线：llm-basics → prompt-eng → framework(原理重点) + 面试题库
   ⏱ 每个模块都附带面试追问和手写题
```

## State Integration

The skill tree state lives in `.learning-profile/courses/{course-slug}/domain-tree.json`.
`meta.json` is the source of truth for `skill_tree_enabled` and `rpg_enabled`;
`domain-tree.json` mirrors those values for display.

```json
{
  "schema_version": 1,
  "course_slug": "llm-app-dev",
  "domain": "大模型应用开发",
  "enabled": true,
  "rpg": {
    "enabled": true,
    "level": 4,
    "xp": 3420,
    "title": "初出茅庐",
    "achievements": ["first_module", "foundation_complete"],
    "quests": []
  },
  "path": "精进路线",
  "nodes": {
    "llm-basics": {"status": "mastered", "progress": 100, "started": "2026-06-01", "completed": "2026-06-03"},
    "prompt-eng": {"status": "mastered", "progress": 100, "started": "2026-06-04", "completed": "2026-06-07"},
    "lowcode": {"status": "available", "progress": 0},
    "framework": {"status": "in_progress", "progress": 40, "started": "2026-06-08"},
    "finetune": {"status": "available", "progress": 0},
    "rag-adv": {"status": "locked", "progress": 0},
    "agent-proj": {"status": "locked", "progress": 0},
    "multi-agent": {"status": "locked", "progress": 0}
  },
  "stats": {
    "total_sessions": 12,
    "total_hours": 18.5,
    "best_streak": 7,
    "fastest_module": "tools-env (1.5h)"
  }
}
```
