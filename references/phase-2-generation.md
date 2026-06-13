# Phase 2: 生成（Course Generation）

> Based on: Backward Design Stage 3 (Wiggins & McTighe, 2005) +
> Gagné's Nine Events (Gagné, 1965) +
> Bloom's Taxonomy Revised (Anderson & Krathwohl, 2001) +
> Diataxis tutorials, Microsoft Learn, freeCodeCamp, The Odin Project +
> Chinese tutorial conventions (ai-agents-from-zero, rust-course, 极客时间)

## Prerequisites

Before entering this phase:

- Phase 0 completed: user confirmed the learning route.
- Phase 1 completed: user confirmed the research scope.
- Read `profile.json.learner_profile` when available; use it to adapt examples,
  analogies, prerequisites, and explanations.
- Load `references/courseware-format.md` for shared courseware rules.
- Load one language guide for learner-facing prose:
  - Chinese output: `references/chinese-tutorial-guide.md`
  - English output: `references/english-tutorial-guide.md`

Default course language follows the user's request and profile. If unclear, use Chinese. If the user explicitly asks for English or bilingual output, route to the English guide or ask once for the learner-facing language.

Do not start writing `README.md`, `syllabus.md`, or module `content.md` until `courseware-format.md` and the selected language guide have been read in this turn.

## Responsibility Boundary

This file is the source of truth for course generation: file layout, Module 00, module generation order, quality gate, course-size guard, verification rules, and generation sequence.

It does not define diagram syntax, image rules, or `study-*` block schemas. Those live in `courseware-format.md`. It does not define live teaching or mastery decisions. Those live in `phase-3-learning.md`.

Load `learning-viewer.md` only when exact player-supported syntax, viewer startup, or session records are needed.

## Completion Iron Law

Do not claim a course, module, code example, or exercise is complete until the relevant quality gate has been checked. If runnable code was not executed, say so explicitly and describe the alternative verification method.

## Template Compliance Rule

The templates in this file, `courseware-format.md`, and the selected language guide are mandatory structure, not inspiration. Keep wording natural, but do not omit learner-facing sections, required practice, required visuals, source notes, or course-size guards.

Generate from the required template first, then fill in content. Do not write a free-form module and "check it later." Before telling the user the course is ready, compare the generated files with this reference and fix missing required sections directly in the files.

## Output Standard

Generate real, runnable courses. Do not dump links or generic outlines.

Every module should contain:

- clear learning objectives
- plain-language intuition followed by precise terms
- examples, code, cases, or worked reasoning
- active recall or transfer practice
- decision criteria
- real pitfalls or misconceptions when the topic has source-backed or practice-backed ones
- concise recap and a concrete continuation action when useful
- source notes for non-trivial claims, code, images, diagrams, and data
- inline official or authoritative links near the concept they explain when they
  help the learner go deeper

Course files are for learners. Do not include design notes, generation rationale, tool choices, internal field names, or agent self-evaluation unless they are part of the hidden machine-readable exercise block format defined in `courseware-format.md`.

## Learner Profile Adaptation

Use `profile.json.learner_profile` as a teaching aid, not as a place to invent
facts. Apply only explicit profile data:

- `known_languages`: use brief transfer analogies when they reduce cognitive
  load. Example: if the learner knows Java and is learning Python decorators,
  compare decorator syntax to wrapping a method with an annotation-like idea,
  then explain where the analogy breaks.
- `weak_prereqs`: insert compact prerequisite refreshers before the concept that
  depends on them; do not turn the module into a different course.
- `analogy_preferences`: choose examples from the learner's familiar domain,
  such as backend, systems, math, design, or writing.
- `teaching_constraints`: obey exclusions and preferences explicitly. If the
  user said "不要把 Python 放进主线", use only the minimum Python syntax needed.

Every analogy must include its boundary when the boundary matters. Do not force
cross-language comparisons into every section; use them only where they shorten
the path to understanding.

## Source Link Placement

Do not create a default `resources.md` just to store links. When a specific
source helps at the exact point of learning, place a short inline link beside
that concept. Course-level sources belong in `README.md` or `syllabus.md` as a
short, curated list; optional appendix files are allowed only when the user asks
for them or a runtime flow will link to and consume them.

Use this pattern sparingly:

```markdown
> 深入看：React 官方文档的 [`useState`](https://react.dev/reference/react/useState)
> 页面适合查参数、返回值和常见用法；先学完本节再看，不要一开始就陷进 API 细节。
```

Rules:

- Prefer official docs, standards, textbooks, papers, or source repositories for
  concept-level links.
- Place links next to the concept they explain, not only at the end of the
  course.
- Explain why the link is useful in one sentence: API reference, conceptual
  guide, source implementation, exercise set, or deeper background.
- Do not dump a broad link list inside the lesson body. Keep broad reading paths
  short and place them in Module 00 or `syllabus.md`; generate a separate
  appendix only when it will be linked from the learning path.
- For library/API topics, use the current official docs discovered in Phase 1.
  Example React official docs use `https://react.dev/reference/react/useState`
  for `useState` API reference and `https://react.dev/learn/state-a-components-memory`
  for the learner-facing state concept guide.

## Step 1: Generate Course Overview (Module 00)

Generate `{learning_root}/courses/{course-slug}/README.md`. This is the first learner-facing file.

Use the language selected for the course. For Chinese, use the wording pattern in `chinese-tutorial-guide.md`. For English, use the wording pattern in `english-tutorial-guide.md`.

Minimum content:

```markdown
# {Course title}

> {Short opening: why this course matters and what the learner will be able to do}

## Course Map

{Complete module index with links}

## Who This Is For

- {Learner profile}
- Prerequisites: {prerequisites}

## Learning Path

{Module tree with lectures/chapters and the rough role of each module}

{For tech topics:}
## Environment Setup

{Install instructions, versions, IDE/editor setup, expected first check}

{For general topics:}
## Core Materials

{Textbooks, courses, papers, reading path}

## Progress

{Progress tracking will be updated during Phase 3}

## Main Sources

- {Primary source and why it is useful}
- {Supplement source and why it is useful}
```

Wait for user review of Module 00 before generating remaining modules unless the user has already explicitly asked to skip further confirmations after route approval.

Chinese prompt: `课程大纲 OK 吗？我开始写具体内容？`

English prompt: `Does this outline look right? I can start writing the modules next.`

## Step 2: Generate Remaining Modules

After Module 00 is confirmed, generate `syllabus.md` and all remaining modules in
one pass. The Module 00 outline is the contract. No per-module confirmation is
needed unless the user pauses or asks to revise the outline.

`syllabus.md` minimum content:

- module order, lecture/chapter titles, and learning objectives
- prerequisites and unlock order when relevant
- mode-specific emphasis, such as interview follow-ups or exam question forms
- short course-level source list, limited to sources that actually shaped the
  syllabus
- links to optional appendices only when those appendices were explicitly
  requested or have a runtime consumer

**Size guard:** one course must stay within <=15 modules and <=30 lectures. If the outline exceeds either limit, split it into a series of separate courses before writing modules. Do not use "batch generation" to hide an oversized single course. Batches are only for context management inside a course that already passes the size guard.

For each module:

- Follow the selected language guide's chapter template.
- Follow `courseware-format.md` for diagrams, media, code examples, and saveable practice.
- Check mode-specific depth rules from `phase-0-anchoring.md`.
- Aim for `params.json.depth_chars_per_module` after mode selection. Treat it as
  a prose-size guard, not a substitute for examples, diagrams, worked solutions,
  and interactive questions. Do not use time estimates as the concrete sizing
  target.
- Apply `learner_profile` adaptations from this file before writing examples and
  explanations.

The four modes must produce visibly different files:

- 速成导览 / Speedrun: short path, fewer branches, practical first example, no long theory detour.
- 系统精讲 / Systematic: deeper why/how, concept contrasts, failure cases, diagrams, recall + transfer + Feynman + checkpoint evidence.
- 面试冲刺 / Interview: one high-frequency topic at a time, scoring criteria, follow-up questions, source-backed misconceptions, runnable/code-outline practice when applicable.
- 考试备考 / Exam: align to syllabus/materials, mark likely question forms, include worked solution steps and scoring points.

Do not let every mode collapse into the same shallow tutorial with different labels.

### Depth And Split Rule

Depth is measured by both prose size and learning activity coverage:

- prose size: learner-facing explanation should land near `depth_chars_per_module`
  and within the selected mode's band in Phase 0.
- concept coverage: each section should carry one main concept, not a bundle of
  unrelated facts.
- activity coverage: every module must include answerable practice through
  `study-*` blocks when answers should be saved or revealed after submission.
- evidence coverage: interview and exam modes must include scoring criteria,
  answer rubrics, or worked solution steps; system mode must include why/how,
  boundaries, and transfer checks.

If a draft needs more than 5 substantial sections, more than 5 interactive
questions, or more than about 125% of the selected mode's upper prose band, split
it before writing. Do not compress an oversized chapter by deleting examples or
practice; split the content instead.

## Step 3: Quality Gate

Before outputting any module, check against this tiered checklist.

**Foundation 模块 / Tier 1**: intro/basics.
**Core 模块 / Tier 2**: main content.
**Enrichment 模块 / Tier 3**: advanced/optional.

| Requirement | Foundation | Core | Enrichment |
|-------------|-----------|------|------------|
| Learning objectives | 2-3 at Understand/Apply | 3-5 at Apply/Analyze | 2-3 at Analyze/Evaluate |
| Language-specific chapter template | [MUST] | [MUST] | [MUST] |
| Plain explanation -> precise term -> example/case/code -> recap | [MUST] | [MUST] | [MUST] |
| Diagram or equivalent visual structure | [SHOULD] if structure is complex; else table/examples OK | [MUST] when content involves flow/architecture/hierarchy/contrast/dependency; else table/examples OK | [SHOULD] |
| Interactive recall/transfer practice | [MUST] 1-2 learner-answerable questions; use `study-*` when answer should be saved or unlocked after submit | [MUST] 2-3 learner-answerable questions, including recall + transfer/analyze; use `study-*` for saved practice | [SHOULD] 1-2 learner-answerable questions |
| Concrete continuation action | [SHOULD] only if it names a real action, variant, checkpoint, or next module bridge | [SHOULD] only if it names a real action, variant, checkpoint, or next module bridge | [OPTIONAL] |
| Source citations | [MUST] primary source | [MUST] primary + 1 supplement | [SHOULD] |
| Inline authoritative links | [SHOULD] for APIs/core concepts | [MUST] for official API/library concepts and important primary sources | [SHOULD] |
| Real pitfalls or misconceptions | [SHOULD] when source-backed or practice-backed; integrate near the relevant concept | [SHOULD] when source-backed or practice-backed; integrate near the relevant concept | [OPTIONAL] |
| Interview/exam practice | [SHOULD] in interview/exam mode | [MUST] in interview mode | [SHOULD] |
| Analogy or concrete mental model + decision criteria | [MUST] | [MUST] | [SHOULD] |
| Learner-profile adaptation | [SHOULD] when profile has relevant facts | [MUST] when profile has relevant known languages, weak prereqs, or constraints | [SHOULD] |
| Mode-specific depth coverage | [MUST] prose-size guard + structural coverage from Phase 0 | [MUST] prose-size guard + structural coverage from Phase 0 | [MUST] prose-size guard + structural coverage from Phase 0 |
| No AI writing traces | [MUST] | [MUST] | [MUST] |

**Quality gate protocol:** If any [MUST] item fails, fix and re-check. Max 2 retries. On the 3rd failure, present with a flagged warning instead of pretending the module is complete.

**Bloom keywords:** Understand = describe/explain/summarize. Apply = implement/solve/modify/use. Analyze = compare/analyze/distinguish/classify. Evaluate = assess/judge/justify.

**Max course size:** 30 lectures total. Split into a series if larger.

## Verification Rules

- Runnable code must actually run before claiming it works.
- Non-runnable technical content must be checked against official docs/source and labeled as not executed.
- General or academic claims need source cross-checks.
- Exam-prep content must align with the syllabus or provided materials.
- Courseware structure must be checked against this file, `courseware-format.md`, and the selected language guide. Do not rely on a separate validation script as the primary quality mechanism.

## Step 4: File Output

Module 00 creates the root structure and course contract. After the user confirms Module 00, write all remaining module files in the same generation pass.

```text
{learning_root}/courses/{course-slug}/
├── README.md              # Course overview (Module 00)
├── syllabus.md             # Full syllabus with learning objectives per module
├── 01-{module-name}/
│   └── content.md          # Module body
├── 02-{module-name}/
│   └── content.md
└── ...
```

Default course content must stay on the path that Phase 3 and the local viewer
actually read. Do not create orphan side files such as `flashcards.csv`,
`practice.md`, `interview-qa.md`, `exam-practice.md`, `glossary.md`, or
`resources.md` by default. If an appendix/export is useful, create it only when:

- the user explicitly asks for that export, such as an Anki deck or a printable
  formula sheet; or
- the file has a concrete runtime consumer and is linked from `README.md`,
  `syllabus.md`, or a module `content.md`.

## Generation Rules

1. **Module 00 first, confirmation second, remaining modules third.** If the user has explicitly waived later confirmations, use the confirmed route as the contract and continue.
2. Put learner-facing questions inside `content.md`; use `study-*` blocks for questions that should be saved or should reveal reference content only after the learner submits.
3. Do not generate `flashcards.csv` by default. Spaced review items live in `concepts.json` and are added during Phase 3 only after the learner has actually encountered the concept.
4. Do not generate `glossary.md` by default. Explain terms when first introduced; if a module has many terms, add a short module-local "术语速查" / "Term check" section inside that module's `content.md`.
5. Do not generate `interview-qa.md` or `exam-practice.md` by default. In interview/exam modes, put questions, prompts, scoring points, follow-ups, and worked solutions into the relevant module as `study-transfer` or `study-checkpoint`.
6. Do not generate `resources.md` by default. Put concept-level links beside the relevant explanation and course-level source lists in Module 00 or `syllabus.md`. Create a separate resource appendix only on explicit request or when it is linked and consumed.
7. Generate or update `domain-tree.json` when `meta.json.skill_tree_enabled=true`. Nodes must mirror the confirmed syllabus. RPG fields are included by default when `meta.json.rpg_enabled=true`.
8. Depth per mode comes from `phase-0-anchoring.md` Q1 and persists in `params.json.depth_chars_per_module`. Use it together with the selected mode's structural coverage and split rules. Code examples and diagrams are not constrained by prose length; include them whenever they help understanding.
9. Before offering to start Module 01, self-check every generated file against the mandatory template, quality gate, and `courseware-format.md`.

## Ownership Map

| Concern | Source of truth |
| --- | --- |
| Module 00, syllabus, course files, quality gate, course-size guard | this file |
| Shared Markdown, diagram, image, code, and `study-*` courseware rules | `courseware-format.md` |
| Chinese explanation style and Chinese chapter template | `chinese-tutorial-guide.md` |
| English explanation style and English chapter template | `english-tutorial-guide.md` |
| Exact viewer startup, supported runtime syntax, session file behavior | `learning-viewer.md` |
| Live teaching and mastery decision | `phase-3-learning.md` |
| Review scheduling and due-item checks | `phase-4-consolidation.md` + `fsrs-scheduler.md` |
