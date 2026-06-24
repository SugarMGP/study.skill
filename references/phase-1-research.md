# Phase 1: 调研（Research）

> Based on course-builder design patterns and structured research methodology.

## Research Strategy

## When To Enter Phase 1

Phase 1 is for building a new course from scratch. Do not enter Phase 1 when:

- The user says "继续学习" and a generated course exists — stay in Phase 3, use local course files.
- The user asks to modify or supplement an existing course — stay in Phase 3, use `99-content-supplements/` or explicit revision per the main-course freeze rule.
- The user asks a targeted question during learning — stay in Phase 3, answer from local content.

Enter Phase 1 only when the user confirms a new learning goal through Phase 0 and the course does not yet exist.

## Research Rule

No course generation without research first. Do not rely on memory alone for non-trivial courses. If the topic is a single concept, niche, material-driven, or exam-scoped, use 1-2 quality sources only with a clear note about what is missing.

### Step 0: Material-Driven Mode Check

If the user provided materials in Phase 0 (PPT, lecture notes, syllabus, textbook, exam outline, past papers, assignments, or classroom notes), enter **material-driven research mode**:

**Primary source** = the user's materials. The material defines the scope.

**Research scope is constrained to the user's material and confirmed goal.** Do not add an outside topic just because it belongs to the generic subject. For exam mode, this becomes "只学要考的": final-review decks, exam outlines, teacher-marked重点, and past papers decide priority.

**Research tasks (material-driven):**
1. Analyze the material for topic list, ordering, depth, priority language, and exam format
2. For each topic in the material, find 1-2 supplementary sources:
   - explanations or analogies in the course language for difficult concepts
   - Similar practice problems with solutions
   - Past exam papers from the same course/school if available
   - Official exercise answers if the material has exercises
3. For exam mode, extract an explicit **named exam point list** from final-review decks, syllabi, past papers, or teacher-marked "重点/掌握/必考" notes. Keep the original wording and source location when available.
4. Extract key concepts and their relationships from the material → Knowledge DAG
5. Map material chapters to learning modules
6. Preserve source teaching fragments: original examples, diagrams, screenshots, tables, formulas, long explanatory paragraphs, classroom wording, problem statements, and worked solutions. These fragments are the raw material for Phase 2 lessons, not optional citations.
7. When a formula, code sample, chart, table, question stem, or key data only exists in an image, preserve the source page or crop screenshot plus its source location and reading focus. Phase 2 should embed that artifact when reliable text extraction is not possible.

**Source count**: 1 primary (user's material) + 1-2 supplementary. Flag what's missing.

**If no materials provided**: proceed with standard research below.

### Source Priority (Standard Research)

Adapt sources to topic type. Default target: 3 quality sources (see Quality Rules below for screening criteria). Material-driven, niche topics, or exam-prep scenarios may use fewer — flag what's missing.

**For tech/programming topics**（默认）:
1. **官方文档** — Always first. Use available documentation or web fetch tools. Note version, changelog, API.
2. **优质源码** — Read core modules on GitHub. Extract architecture patterns, key designs.
3. **优质教程/课程** — Choose by course language and source quality. Chinese output can use mature long-form courses such as Rust 语言圣经、现代 C++ 教程、动手学深度学习、极客兔兔专题、GitHub high-star Chinese repos, 掘金/CSDN/知乎 high bookmarks, 极客时间目录; English output can use official tutorials, MDN, Microsoft Learn, freeCodeCamp, The Odin Project, university course notes, and reputable engineering blogs.
4. **补充**: arXiv, interview banks, standards documents, issue discussions

**For general/academic topics**（如学历史、学经济学、学心理学）:
1. **权威教材/课程大纲** — Top university syllabus, standard textbooks, MOOC structure
2. **优质学习资料** — Choose by output language: Chinese courses, 知乎专栏, B站高播放课程, 豆瓣高分书单; or English university notes, OpenStax, MIT OCW, Stanford/Harvard/Yale course pages, reputable learning platforms.
3. **学术综述/入门论文** — arXiv or CNKI survey papers for the field
4. **补充**: 得到/极客时间相关专栏目录, Wikipedia knowledge structure, professional association resources

**Source count:** Default target: 3 sources meeting the Quality Rules screening criteria below. Accept 1-2 sources when the topic is material-driven, narrow scope, or exam-scoped; note what is covered by which source. Never pad with sources that fail the Quality Rules screening criteria below.

### Parallel Research Dispatch

If your platform supports subagents: dispatch in parallel. If not: research sequentially and clearly label the order. Never claim you dispatched subagents when you didn't.

Adapt dispatches to topic type: select sources by **quality**, not by tool name.

| Topic type | Primary source (must have) | Supplements |
|-----------|---------------------------|-------------|
| Tech API / library | Official docs (latest version) | Source code (architecture only), community tutorials |
| Tech architecture / principle | Source code of reference implementation | Official docs, architecture blog posts |
| Academic subject | Standard textbook / top university syllabus | Survey papers (arXiv/CNKI), quality learning resources in the course language |
| Exam prep | User's syllabus/past papers | Textbook, exam prep guides |

Source count and language preferences are defined in the Source Priority section above. For Chinese courses, prefer Chinese sources when available; for English courses, prefer English sources — this is embedded in the source-type lists. Do not run additional dispatches solely to reach a source count; use the source-count rule above.

### What to Extract

For each source, extract:

| Extraction | Purpose |
|-------------|---------|
| Core concepts and their relationships | → Knowledge Graph DAG nodes |
| Prerequisites (what must be learned first) | → DAG edges (requires relation) |
| Difficulty estimate (1-10 scale per concept) | → initial D value for spaced repetition |
| Real pitfalls and misconceptions | → Inline warnings or learner-facing misconception notes, only when source-backed or practice-backed |
| Complete teaching example per concept/procedure | → Best runnable or guided example, including input/data/schema, expected result, and why each step matters |
| Failure or counterexample | → Common wrong answer, error symptom, invalid case, or misconception the learner must recognize |
| Source fragment worth preserving | → Original wording, paragraph, diagram, table, image, formula, problem statement, or worked solution worth preserving or adapting |
| Version-specific notes | → Version comparison tables |
| Interview / exam question patterns | → Module-local `study-input`, `study-choice`, or `study-truefalse` practice with scoring points and reference answers |
| Source exercises and worked solutions | → Adapted practice, answer rubrics, or step-by-step solution notes |
| Learning time estimates | → Module scheduling |
| Diagrams, screenshots, visual examples | → course images or text diagram choices |

**Added for material-driven mode:**

| Extraction | Purpose |
|-------------|---------|
| Material chapter/section mapping | → module outline aligned with textbook |
| Named exam points / final-review items | → required coverage list for exam-mode generation |
| Exam format and question types | → module-local exam-style `study-*` practice |
| Grading criteria / 评分标准 | → what to emphasize in answers |
| Topic weight in exam | → module priority (high-weight topics first) |
| Priority labels such as 重点掌握/理解/了解 | → separate full teaching from one-sentence recognition notes |
| Source examples, classroom examples, diagrams, exercises, and sample answers | → reuse or adapt into section bodies; if a high-priority point lacks an example, create a minimal worked example grounded in the source concept |
| **Diagrams & visuals** | **→ collect quality existing images for reuse. Note URL + description. Prioritize: architecture diagrams, flowcharts, comparison tables, data visualizations.** |

For code, SQL, formula, query, design, or procedure topics, the research summary must preserve enough raw teaching material to write a self-contained lesson: the concrete task, full example, sample data or inputs, expected output or failure, and at least one learner exercise. Do not extract only headings or keywords; that forces Phase 2 to write shallow summaries.

Source fragment worth preservings should be copied into the research notes with source location. If the source is user-provided, public-domain, permissively licensed, or explicitly allowed by the user, preserve longer original passages or images when they teach better than a paraphrase. For other external sources, preserve the structure, example data, formula, diagram description, and short quotes, then rewrite the lesson in the course voice with attribution.

### Output: Research Summary

Present findings. Adapt the format to topic type.

Present findings in this format. Adapt the labels (📊信息来源, 🎯建议课程结构, 💡调研笔记) as needed for the topic type — the structure is the same regardless of whether the course is tech, academic, or material-driven.

**Standard template:**

```
🔍 调研结果：{topic}

📊 信息来源：
- ...（按来源类型列出）

🧩 核心知识结构 / 概念关系：
- ...

⚠ 常见误区：
- ...

🎯 建议课程结构：
模块一：... ({n} 小节，难度 ★★☆☆☆)
模块二：... ({n} 小节，难度 ★★★☆☆)

💡 调研笔记：
- ...
```


**Material-driven mode additions:**

When the course is material-driven, add these sections to the standard template above:

- 📎 参考材料 section listing the user's provided materials.
- 📋 考试信息 section (exam mode) with question types, weighted topics, and exam strategy.
- 📋 核心概念与章节映射 section mapping source chapters to key concepts.
- 💡 备考笔记 section with exam-specific priorities.

The standard template's 📊信息来源, 🧩核心知识结构, ⚠常见误区, and 🎯建议课程结构 sections remain the same.

### Gate

Ask: "这个范围和结构符合你的预期吗？需要增加/删除什么？"

### Quality Rules

- MUST cite specific URLs or identifiers, not generic references
- MUST note version/year of sources used
- **Source quality screening:** Prioritize official docs, textbooks, course syllabi, active repos with ≥1k stars (for popular topics; stars are a signal, not a threshold), peer-reviewed papers. Avoid unsourced articles, outdated versions without warnings, and AI-generated slop.
- For conflicting sources, flag both with attribution and let user decide if scope is affected
