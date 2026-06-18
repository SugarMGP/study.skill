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

Do not start writing `README.md`, `syllabus.md`, module `content.md`, or section
`content.md` files until `courseware-format.md` and the selected language guide
have been read in this turn.

## Responsibility Boundary

This file is the source of truth for course generation: file layout, Module 00, module generation order, quality gate, course-size guard, verification rules, and generation sequence.

It does not define diagram syntax, image rules, or `study-*` block schemas. Those live in `courseware-format.md`. It does not define live teaching or mastery decisions. Those live in `phase-3-learning.md`.

Load `learning-viewer.md` only when exact player-supported syntax, viewer startup, or learning records are needed.

## Completion Iron Law

Do not claim a course, module, code example, or exercise is complete until the relevant quality gate has been checked. If runnable code was not executed, say so in your chat handoff or internal completion note, not inside learner-facing course files.

## Natural Structure Rule

Do not force a repeated heading template. Keep the learning loop instead:
goal -> prerequisite -> concrete entry point -> explanation -> example/case/code
-> decision rule -> practice -> recap. Headings should fit the topic and
language. Do not require slogans such as "先记住一句话" or "The idea in one
minute".

Generation should transform sources into teachable courseware. First connect
the source material with transitions, prerequisites, concrete examples, and
plain-language explanations. Only compress or omit content when the learner's
goal, time budget, exam scope, pretest evidence, or explicit user instruction
justifies the trade-off. Non-essential compression is a quality failure.

Before telling the user the course is ready, compare the generated files with
this reference and fix missing learning-loop requirements directly in the files.

## Output Standard

Generate real, runnable courses. Do not dump links or generic outlines.

Every module should contain:

- clear learning objectives
- a short preface in `{module}/content.md`: core problem, prerequisites, section
  map, and end capability
- section pages under `{module}/{section}/content.md`; section split and merge
  rules come from `courseware-format.md`
- beginner-facing entry points before definitions in foundation sections
- plain-language intuition followed by precise terms
- examples, code, cases, or worked reasoning
- active recall or transfer practice
- decision criteria
- real pitfalls or misconceptions when the topic has source-backed or practice-backed ones
- concise recap and a concrete continuation action when useful
- source notes for non-trivial claims, code, images, diagrams, and data; link
  placement and export rules come from `courseware-format.md`

Course files are for learners. Do not include design notes, generation rationale, tool choices, internal field names, or agent self-evaluation unless they are part of the hidden machine-readable exercise block format defined in `courseware-format.md`.

Do not include agent/runtime verification notes in learner-facing files. Forbidden
phrases include "验证状态", "本机当前没有安装", "未执行验证", "code was not
executed", "not installed locally", or equivalent statements. Learners do not
need to see the generator's environment. Put that information in the chat
summary if it matters.

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

## Source Link Routing

Use the sources discovered in Phase 1, but follow `courseware-format.md` for
where links, citations, resources, terminology notes, and optional exports live.
This phase only decides whether a source item belongs in the course scope and
which module or section teaches it.

## Step 1: Generate Course Overview (Module 00)

Generate `{learning_root}/courses/{course-slug}/README.md`. This is the first learner-facing file.

Use the language selected for the course. For Chinese, use the wording pattern in `chinese-tutorial-guide.md`. For English, use the wording pattern in `english-tutorial-guide.md`.

Minimum content:

```markdown
# {Course title}

> {Short opening: why this course matters and what the learner will be able to do}

## Course Map

{Complete module index. Use plain text module and section names; avoid Markdown
links to section files because the local viewer navigates through its course
tree.}

## Who This Is For

- {Learner profile}
- Prerequisites: {prerequisites}

## Learning Path

{Module tree with sections and the rough role of each module}

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

- module order, section titles, and learning objectives
- prerequisites and unlock order when relevant
- mode-specific emphasis, such as interview follow-ups or exam question forms
- short course-level source list, limited to sources that actually shaped the
  syllabus
- links to optional appendices only when those appendices were explicitly
  requested or have a runtime consumer

**Size guard:** one course should stay within <=12 modules and <=60 section
pages. If the outline exceeds either limit, split it into a series of separate
courses before writing modules. Do not use "batch generation" to hide an
oversized single course. Batches are only for context management inside a course
that already passes the size guard.

For each module:

- Write a module preface in `{module}/content.md`; keep it short and
  navigational. Follow `courseware-format.md` for section list and link rules.
- Write each teachable unit as `{module}/{section}/content.md`.
- Before writing section bodies, create a source-to-section map: each important
  material point, researched concept, worked example, procedure, API behavior,
  theorem, diagram, or question form must be assigned to exactly one section or
  deliberately marked as omitted with a reason grounded in the confirmed scope.
- Prefer rewriting, sequencing, bridging, and explaining over condensing. If a
  source item is important but dense, add a transition, a smaller example, or a
  prerequisite refresher before it; do not reduce it to one bullet unless it is
  explicitly low-priority.
- Follow the selected language guide's learner-facing prose rules.
- Follow `courseware-format.md` for diagrams, media, code examples, and saveable practice.
- Check mode-specific depth rules from `phase-0-anchoring.md`.
- Use the selected mode's prose band and split rules from
  `phase-0-anchoring.md` as the total prose-size guard for the module preface
  plus all section pages. This is not a substitute for examples, diagrams,
  worked solutions, and interactive questions. Do not use time estimates as the
  concrete sizing target.
- Apply `learner_profile` adaptations from this file before writing examples and
  explanations.
- For novice learners, weak prerequisites, or Tier 1 modules, start from a small
  concrete example in the relevant section before introducing abstract terms,
  formulas, real-scale systems, or official API detail.

The four modes must produce visibly different files:

- 速成导览 / Speedrun: short path, fewer branches, practical first example, no long theory detour.
- 系统精讲 / Systematic: deeper why/how, concept contrasts, failure cases, diagrams, and mixed evidence through recall/apply/explain `mastery_tags`.
- 面试冲刺 / Interview: one high-frequency topic at a time, scoring criteria, follow-up questions, source-backed misconceptions, runnable/code-outline practice when applicable.
- 考试备考 / Exam: align to syllabus/materials, mark likely question forms, include worked solution steps and scoring points.

Do not let every mode collapse into the same shallow tutorial with different labels.

### Exam Crash Course Depth Rule

When mode is `exam`, do not treat "快速备考" or "crash course" as a request for
short summaries. It means shorten the route by cutting non-priority material,
while expanding the named exam points enough that the learner knows how to answer
questions.

Use this source hierarchy:

1. Final-review deck, exam syllabus, past papers, or teacher-marked "重点/掌握/必考"
   items decide scope and priority.
2. Chapter decks, textbook chapters, and lecture notes provide teaching order,
   original terms, examples, diagrams, and exercises.
3. Non-exam chapters or concepts are omitted, or reduced to one-sentence
   recognition notes when they help choices or true/false questions.

For every item explicitly named by the final-review or exam-scope material, the
generated section must include:

- what it means in plain learner-facing language
- why it matters for this exam
- how it appears as a question form
- one worked example, SQL/formula/procedure, diagram reading, or judgment rule
  when the item requires solving, designing, querying, calculating, or comparing
- common confusion, scoring point, or answer keyword when the material or
  supplementary source supports it
- one exam-tagged `study-*` exercise when the item is likely to be tested

A section is too shallow if it only lists named concepts without showing how to
answer exam questions about them. If one material chapter contains many named
exam points, split by exam point cluster; do not pack the chapter into one
summary section.

### Depth And Split Rule

Depth is measured by both prose size and learning activity coverage:

- prose size: learner-facing explanation should fit the selected mode's module
  and section bands in Phase 0.
- concept coverage: each section page should carry one main concept or question,
  not a bundle of unrelated facts.
- source coverage: important source or research items must be taught, bridged,
  practiced, or explicitly omitted for a scoped reason; they must not disappear
  through silent summarization.
- activity coverage: every module must include answerable practice through
  `study-*` blocks when answers should be saved or revealed after submission.
- evidence coverage: interview and exam modes must include scoring criteria,
  answer rubrics, or worked solution steps; system mode must include why/how,
  boundaries, and transfer checks.
- exam priority coverage: exam mode must separate "重点掌握" from "了解"; high
  priority points get explanation plus exam handling, while low priority points
  stay short.

Split rules are hard:

- Split when two items answer different learner questions, use different worked
  examples, require different prerequisites, belong to different procedures, or
  would be practiced with different question types.
- Split when a section page needs more than 4 substantial subtopics or exceeds
  the selected mode's section-page guidance.
- Split the module when it needs more than 7 section pages, more than 7
  interactive questions, or more than about 125% of the selected mode's upper
  module prose band.
- Do not compress an oversized chapter by deleting examples, source-material
  transitions, worked steps, diagrams, practice, or answer rubrics. Split the
  content instead.

Merge rules are narrow: merge only when the items share the same main question,
same example or data, same decision rule, and same practice evidence. If the only
relationship is "they appear near each other in the source", do not merge.

## Step 3: Quality Gate

Before outputting any module, check against this tiered checklist.

**Foundation 模块 / Tier 1**: intro/basics.
**Core 模块 / Tier 2**: main content.
**Enrichment 模块 / Tier 3**: advanced/optional.

| Requirement | Foundation | Core | Enrichment |
|-------------|-----------|------|------------|
| Learning objectives | 2-3 at Understand/Apply | 3-5 at Apply/Analyze | 2-3 at Analyze/Evaluate |
| Beginner entry before definitions | [MUST] concrete scene/problem + why it matters | [SHOULD] unless prior module already prepared it | [OPTIONAL] |
| Language-specific natural writing rules | [MUST] | [MUST] | [MUST] |
| Plain explanation -> precise term -> example/case/code -> recap | [MUST] | [MUST] | [MUST] |
| Diagram or equivalent visual structure | [SHOULD] if structure is complex; else table/examples OK | [MUST] when content involves flow/architecture/hierarchy/contrast/dependency; else table/examples OK | [SHOULD] |
| Interactive practice | [MUST] 1-2 learner-answerable questions across the module; use `study-choice`, `study-truefalse`, or `study-input` when answer should be saved or unlocked after submit | [MUST] 3-6 learner-answerable questions across section pages, covering recall + apply/analyze/explain evidence through `mastery_tags` | [SHOULD] 1-2 learner-answerable questions |
| Concrete continuation action | [SHOULD] only if it names a real action, variant, self-test, or next module bridge | [SHOULD] only if it names a real action, variant, self-test, or next module bridge | [OPTIONAL] |
| Source citations | [MUST] primary source | [MUST] primary + 1 supplement | [SHOULD] |
| Inline authoritative links | [SHOULD] for APIs/core concepts | [MUST] for official API/library concepts and important primary sources | [SHOULD] |
| Real pitfalls or misconceptions | [SHOULD] when source-backed or practice-backed; integrate near the relevant concept | [SHOULD] when source-backed or practice-backed; integrate near the relevant concept | [OPTIONAL] |
| Interview/exam practice | [SHOULD] in interview/exam mode | [MUST] in interview mode | [SHOULD] |
| Analogy or concrete mental model + decision criteria | [MUST] | [MUST] | [SHOULD] |
| Source-to-section coverage | [MUST] important material points are taught or scoped out with reason | [MUST] every important researched/source point has a section home and enough explanation | [MUST] optional points are clearly marked as optional, not silently lost |
| Learner-profile adaptation | [SHOULD] when profile has relevant facts | [MUST] when profile has relevant known languages, weak prereqs, or constraints | [SHOULD] |
| Mode-specific depth coverage | [MUST] module + section prose-size guard and structural coverage from Phase 0 | [MUST] module + section prose-size guard and structural coverage from Phase 0 | [MUST] module + section prose-size guard and structural coverage from Phase 0 |
| No AI writing traces | [MUST] | [MUST] | [MUST] |

**Exam module quality gate:** In exam mode, also check:

- Does the module clearly separate high-priority "must master" content from
  low-priority recognition content?
- Are all final-review or syllabus named points assigned to a module and covered
  in the section body?
- Does each high-priority point include explanation plus exam handling, not just
  a definition?
- Are non-priority concepts compressed or removed instead of stealing space from
  tested points?
- Does the learner know what to write, calculate, query, design, or judge in an
  answer?
- Do calculation, design, SQL/query, proof, diagram-reading, or procedure topics
  include worked steps?

**Quality gate protocol:** If any [MUST] item fails, fix and re-check. Max 2 retries. On the 3rd failure, present with a flagged warning instead of pretending the module is complete.

**Bloom keywords:** Understand = describe/explain/summarize. Apply = implement/solve/modify/use. Analyze = compare/analyze/distinguish/classify. Evaluate = assess/judge/justify.

**Max course size:** 60 section pages total. Split into a series if larger.

## Verification Rules

- Runnable code must actually run before claiming it works.
- Non-runnable technical content must be checked against official docs/source.
- Do not write execution/verification caveats into `README.md`, `syllabus.md`,
  module `content.md`, or section `content.md`; report them to the user outside
  the course files.
- General or academic claims need source cross-checks.
- Exam-prep content must align with the syllabus or provided materials.
- Material-driven and research-driven courses must preserve important source
  points through the source-to-section map. If content was compressed or omitted,
  the reason must come from confirmed scope, not from convenience.
- Courseware structure must be checked against this file, `courseware-format.md`, and the selected language guide. Do not rely on a separate validation script as the primary quality mechanism.

## Step 4: File Output

Module 00 creates the root structure and course contract. After the user confirms Module 00, write all remaining module files in the same generation pass.

```text
{learning_root}/courses/{course-slug}/
├── README.md              # Course overview (Module 00)
├── syllabus.md             # Full syllabus with learning objectives per module
├── 01-{module-name}/
│   ├── content.md          # Module preface: problem, prerequisites, section map
│   ├── 01-{section-name}/
│   │   ├── content.md      # Section lesson body
│   │   └── images/         # Optional local assets for this section
│   └── 02-{section-name}/
│       └── content.md
├── 02-{module-name}/
│   ├── content.md
│   └── 01-{section-name}/
│       └── content.md
└── ...
```

Default course content must stay on the path that Phase 3 and the local viewer
actually read. Side artifacts and exports follow `courseware-format.md`.

## Generation Rules

1. **Module 00 first, confirmation second, remaining modules third.** If the user has explicitly waived later confirmations, use the confirmed route as the contract and continue.
2. Put learner-facing questions in the relevant module or section `content.md`; use `study-*` blocks for questions that should be saved or should reveal reference content only after the learner submits.
3. Do not create side files by default; terminology, links, interview/exam practice, review items, and exports follow `courseware-format.md`.
4. Generate or update `domain-tree.json` when `meta.json.skill_tree_enabled=true`. Nodes must mirror the confirmed syllabus. RPG fields are included by default when `meta.json.rpg_enabled=true`.
5. Depth per mode comes from `phase-0-anchoring.md` Q1. Use the selected mode's module/section prose bands together with structural coverage and split rules. Code examples and diagrams are not constrained by prose length; include them whenever they help understanding.
6. Before offering to start Module 01, self-check every generated file against the natural learning-loop requirements, quality gate, and `courseware-format.md`.

## Ownership Map

| Concern | Source of truth |
| --- | --- |
| Module 00, syllabus, course files, quality gate, course-size guard | this file |
| Shared Markdown, diagram, image, code, and `study-*` courseware rules | `courseware-format.md` |
| Chinese explanation style and natural chapter/section rules | `chinese-tutorial-guide.md` |
| English explanation style and natural chapter/section rules | `english-tutorial-guide.md` |
| Exact viewer startup, supported runtime syntax, learning record behavior | `learning-viewer.md` |
| Live teaching and mastery decision | `phase-3-learning.md` |
| Review scheduling and due-item checks | `phase-4-consolidation.md` + `fsrs-scheduler.md` |
