# Phase 2: 生成（Course Generation）

> Based on: Backward Design Stage 3 (Wiggins & McTighe, 2005) +
> Gagné's Nine Events (Gagné, 1965) +
> Bloom's Taxonomy Revised (Anderson & Krathwohl, 2001) +
> Chinese tutorial conventions (ai-agents-from-zero, rust-course, 极客时间)

## Prerequisites

Before entering this phase:
- Phase 0 completed: user confirmed 学习路线图
- Phase 1 completed: user confirmed research scope
- Load `references/chinese-tutorial-guide.md` for writing standards

Do not start writing `README.md`, `syllabus.md`, or module `content.md` until
`references/chinese-tutorial-guide.md` has been read in this turn. That file is
the writing standard for learner-facing Chinese course files.

## Completion Iron Law

Do not claim a course, module, code example, or exercise is complete until the
relevant quality gate has been checked. If runnable code was not executed, say so
explicitly and describe the alternative verification method.

## Generation Pipeline

## Output Standard

Generate real, runnable Chinese-language courses in the style of 极客时间,
rust-course, CS-Notes, JavaGuide, and ai-agents-from-zero:

- Do not dump links or generic outlines.
- Each module should teach with 大白话 -> 术语 -> example/code -> exercise -> summary.
- Technical examples that claim to run must be runnable and verified.
- Course files should leave clear next-step pointers so the learner can continue.
- Course files are for learners. Do not include design notes, implementation
  rationale, tool choices, or internal field names unless they are inside hidden
  machine-readable exercise blocks.

### Step 1: Generate Course Overview (Module 00)

Generate the course README.md. This is the first thing the user sees.
Write to `{learning_root}/courses/{course-slug}/README.md`.

```markdown
# {课程名} 从零到一学习指南

> **开篇词：** {why learn this? what will you be able to do after? —— 极客时间模式}

## 📖 课程地图

{complete module index with links — CS-Notes/JavaGuide 模式}

## 🔰 适合人群

- ✅ {who should take this}
- ⚠ 前置知识：{prerequisites}

## 🗺 学习路线图

```
模块一：{name}（基础入门，30%）
  ├── 第1讲：{title}
  ├── 第2讲：{title}
  └── ...

模块二：{name}（核心能力，40%）
  └── ...

模块三：{name}（进阶深入，30%）
  └── ...
```

{For tech topics:}
## 🛠 环境准备

{install instructions, versions, IDE setup}

{For general topics:}
## 📖 推荐阅读/资源

{textbooks, courses, papers, reading paths}

## 📊 学习进度

{progress tracking will be auto-generated during Phase 3}

## 📚 资源索引

{For tech topics:}
- [官方文档]({url})

{For any topic:}
- [术语表](./glossary.md)

{For interview-oriented tech topics:}
- [面试题库](./interview-qa.md)

- [扩展资源](./resources.md)
```

Wait for user to review Module 00 before generating remaining modules.
Ask: "课程大纲 OK 吗？我开始写具体内容？"

### Step 2: Generate All Remaining Modules

After Module 00 is confirmed, generate all remaining modules in one pass.
The Module 00 outline is the contract — execute it. No per-module confirmation needed.

**Size guard:** One course must stay within <=15 modules and <=30 讲. If the
outline exceeds either limit, split it into a series of separate courses before
writing modules. Do not use "batch generation" to hide an oversized single
course. Batches are only allowed for context management inside a course that is
already within the size limit.

For each module, follow the chapter template in `references/chinese-tutorial-guide.md`
and check against the mode-specific depth rules from `references/phase-0-anchoring.md`
(word count, exercise count, explanation depth vary by mode).

### Step 3: Quality Gate (Single Source of Truth)

Before outputting any module, check against this tiered checklist.
**Foundation 模块** (intro/basics, Tier 1): use Foundation column.
**Core 模块** (main content, Tier 2): use Core column.
**Enrichment 模块** (advanced/optional, Tier 3): use Enrichment column.

| Requirement | Foundation | Core | Enrichment |
|-------------|-----------|------|------------|
| **Learning objectives** | 2-3 at Understand/Apply | 3-5 at Apply/Analyze | 2-3 at Analyze/Evaluate |
| **Diagram** | [SHOULD] if structure complex; else table/examples OK | [MUST] if content involves流程/架构/层级/对比/依赖; else table/examples OK | [SHOULD] |
| **大白话→术语→例子/代码→小结** | [MUST] | [MUST] | [MUST] |
| **思考题 + 可保存练习** | [MUST] 1-2 questions | [MUST] 2-3 (1 recall + 1 apply/analyze) | [SHOULD] 1-2 |
| **建议下一步** | [MUST] | [MUST] | [MUST] |
| **Source citations** | [MUST] primary source | [MUST] primary + 1 supplement | [SHOULD] |
| **踩坑指南** | [MUST] ≥2 pitfalls | [MUST] ≥2 pitfalls | [SHOULD] |
| **面试题/考试题** | [SHOULD] in 面试/考试 mode | [MUST] in 面试 mode | [SHOULD] |
| **Analogy + decision criteria** | [MUST] | [MUST] | [SHOULD] |
| **No AI writing traces** | [MUST] | [MUST] | [MUST] |

**Diagram rules** (3-tier priority):
1. Reuse existing quality images from research sources → `![](path)` + cite source
2. Platform image gen for complex diagrams (>15 nodes, UI mockups, visual explanations) → `![](path)` + Mermaid source in `<details>`
3. Mermaid code block (universal fallback)

**Quality gate protocol:** If any [MUST] item fails → fix and re-check. Max 2 retries. On 3rd failure, present with flagged warning.

**Bloom keywords:** Understand = 描述 解释 总结. Apply = 实现 解决 修改 操作. Analyze = 对比 分析 区分 归类. Evaluate = 评估 判断 论证.

**Max course size:** 30 讲 total. Split into series if larger.

### Verification Rules

- Runnable code must actually run before claiming it works.
- Non-runnable technical content must be checked against official docs/source and labeled as not executed.
- General/academic claims need source cross-checks.
- Exam-prep content must align with the syllabus or provided materials.

### Step 4: File Output (Incremental)

Course directory grows module by module. After each confirmed module, append
its content to the course directory. Module 00 creates the root structure;
subsequent modules add their files incrementally.

```
{learning_root}/courses/{course-slug}/
├── README.md              # Course overview (Module 00)
├── syllabus.md             # Full syllabus with learning objectives per module
├── 01-{module-name}/
│   ├── content.md          # Module body
├── 02-{module-name}/
│   └── content.md
├── ...
├── flashcards.csv          # Knowledge items for spaced repetition (appended incrementally)
├── interview-qa.md         # Interview Q&A (面试冲刺 mode, appended incrementally)
├── exam-practice.md        # Exam practice problems (考试备考 mode, appended incrementally)
├── glossary.md             # 术语表 (appended incrementally)
└── resources.md            # Further reading / reference links (appended incrementally)
```

### Generation Rules

1. **Module 00 first, get confirmation, then generate all remaining modules in one pass.**
   The outline IS the contract. No per-module confirmation.
2. **Generate flashcards.csv** — 3-8 items per module as the course is generated
3. **Generate interview-qa.md** only if 面试冲刺 mode
4. **Generate exam-practice.md** only if 考试备考 mode — practice problems aligned with exam format
5. **Generate glossary.md** as terminology is introduced
6. **Do NOT create separate exercises/solution.md by default.** Put learner-facing
   questions inside `content.md`. Use `study-*` blocks only for questions that
   should be captured by the local player.
7. **Generate or update `domain-tree.json`** when `meta.json.skill_tree_enabled=true`.
   Its nodes should mirror the confirmed syllabus. RPG fields are included by default
   when `meta.json.rpg_enabled=true`.
8. **Depth per mode:** See `phase-0-anchoring.md` Q1 for per-mode word count and exercise count.
   Code examples and diagrams are NOT constrained by mode — include them whenever they
   aid understanding. Only word count and exercise density vary by mode.

### Interactive Practice Blocks

Use plain learner-facing headings and explanation first. Add a `study-*` fenced
block immediately after a question only when the answer should be saved by the
local player. These blocks should not contain design notes.

Priority:

1. `study-recall` — quick retrieval after one concept.
2. `study-transfer` — applying the concept in a new scenario; prefer this for
   core modules.
3. `study-feynman` — user explains an important concept in their own words.
4. `study-checkpoint` — module-level evidence bundle. Use once near the end of
   a module, not after every small section.

Minimum pattern:

````markdown
### 小练习：{用户能看懂的题目名}

{一句话说明要做什么。}

```study-recall
id: 01-topic-recall-1
question: {题目}
answer: {参考答案或参考思路}
```
````

Supported block shapes:

````markdown
```study-recall
id: 01-loss-recall
question: 损失函数在训练里负责什么？
answer: 它把模型输出和目标答案之间的差距变成一个可优化的数值。
```

```study-transfer
id: 01-loss-transfer
question: 如果验证集损失上升、训练集损失下降，你会怀疑什么？
hints:
  - 对比训练集和验证集代表什么
  - 想想模型是不是只记住了训练数据
answer: 优先怀疑过拟合，需要检查正则化、数据量、训练轮数或模型容量。
```

```study-feynman
id: 01-gradient-feynman
concept: 梯度下降
prompt: 用自己的话解释为什么梯度能告诉模型往哪里改参数
key_points: 损失函数、斜率、更新方向、学习率
```

```study-checkpoint
module: 01-training-basics
items:
  - type: recall
    ref: 01-loss-recall
  - type: transfer
    ref: 01-loss-transfer
  - type: feynman
    ref: 01-gradient-feynman
min_pass: 2
```
````

Rules:

- `id` must be stable and unique inside the course, using lowercase letters,
  numbers, and hyphens.
- Keep `question` and `answer` understandable to the learner.
- For `study-transfer`, include 1-3 `hints`.
- For `study-feynman`, use `concept`, optional `prompt`, and optional
  `key_points`.
- For `study-checkpoint`, list refs to earlier `study-*` block ids and set
  `min_pass`.
- Do not store correctness, pass/fail, XP, or mastery state in course files.
- Blocks are optional. If a question is only for reading or discussion, write it
  as normal Markdown instead of adding a block.
