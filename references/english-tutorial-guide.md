# English Tutorial Writing Guide

> Based on Diataxis tutorials, Google Developer Documentation Style Guide,
> Microsoft Learn, MDN Web Docs, freeCodeCamp, The Odin Project, and Open edX.

This file defines English prose, chapter structure, and learner-facing writing style. Shared courseware mechanics such as diagrams, images, code blocks, and `study-*` exercise blocks live in `courseware-format.md`.

## Core Shape

An English tutorial is a guided lesson, not a reference page. It must help the learner do something meaningful, see progress early, and check understanding before moving on.

Use this order:

```text
Goal -> prerequisites -> mental model -> guided example -> practice -> check -> recap -> next step
```

Keep the main path linear. Put optional branches and extra reading after the learner has completed the main task.

## Course Progression

**Technical topics:**

```text
Layer 1: Foundations (30%) -> build the mental model and run the first working example
Layer 2: Core practice (40%) -> apply the idea in realistic tasks
Layer 3: Advanced use (30%) -> trade-offs, failure cases, project/interview/exam practice
```

**General or academic topics:**

```text
Layer 1: Orientation (30%) -> define the problem and core vocabulary
Layer 2: Deep understanding (40%) -> theories, cases, arguments, evidence
Layer 3: Critical extension (30%) -> competing views, applications, current debates
```

## Natural Chapter Shape

Do not force every lesson into the same heading template. Keep the learning loop, but let the headings fit the subject.

A chapter maps to a collapsible module. The module-level `content.md` is a short preface:

- the core problem this chapter solves
- prerequisites and any small refresher the chapter will provide
- the section list and what each section is for; file layout and navigation rules come from `courseware-format.md`.
- what the learner should be able to judge, explain, or do by the end

The actual lesson body lives in section files. Section split, merge, and navigation-link rules come from `courseware-format.md`. This guide only controls English prose: each section should read like a complete lesson, not a thin outline.

A section should naturally include:

- a concrete problem, symptom, task, or surprising observation before terms
- plain-language intuition before precise terminology
- first-use concept introductions according to `courseware-format.md`
- a worked example with minimal data (2-5 items) before realistic scale
- a decision rule or boundary: when to use it, when not to, and what to compare it with
- a documented misconception near the relevant concept, only when found in Phase 1 research sources
- one active check or practice task when the learner should answer; exercise block rules come from `courseware-format.md`
- a concise recap at the end of every section

English lessons must apply the shared teaching completeness rules in `courseware-format.md`: teach the source material as a self-contained lesson, introduce new concepts on first use, preserve strong source fragments when allowed, and use complete demonstrations for procedural topics. This guide only controls the English prose shape.

## English Style Rules

### 1. Write for the learner at study

Use second person ("you"), active voice, and concrete instructions. The learner should know exactly what to do next.

Good:

> In this step, you will make the state visible so you can see when it changes.

Weak:

> We will delve into state visibility in modern application development.

### 2. Use plain language before terms

Introduce the idea first, then name the term.

Follow `courseware-format.md` for first-use concept introductions. In English prose, put the plain-language idea before the formal term.

Good:

> A closure is a function that keeps access to the variables around it. The formal term is lexical closure.

Weak:

> Lexical closures capture their lexical environment.

### 3. Keep steps small and visible

Each guided example should have:

- one sentence explaining what the step accomplishes
- the exact action or code
- the expected result
- one sentence explaining what changed

Do not ask the learner to copy a large final program without intermediate checks. For code, SQL, formulas, queries, or procedures, use the complete demonstration rule from `courseware-format.md`; keep each step small enough that the learner can see what changed.

### 4. Prefer active voice and second person

Use “you” when giving instructions. Prefer direct verbs.

Good:

> Run the test again. You should see one failing assertion.

Weak:

> The test should be run again so that one failing assertion can be observed.

### 5. Make prerequisites explicit

State what the learner needs before the chapter starts: prior concepts, installed tools, files, data, accounts, or time. If something is optional, mark it optional.

### 6. Show runnable examples honestly

For technical courses:

- list language/tool versions when they affect behavior
- include dependencies and setup commands only when the learner is expected to run the code
- show expected output
- run code before claiming it works
- follow `courseware-format.md` for the boundary between learner-facing setup and generator-side verification notes

### 7. Place source links where they help

Put short official or authoritative links next to the concept they clarify. Exact link placement, course-level source lists, and resource appendices are owned by `courseware-format.md`.

Good:

> Learn more: React's official [`useState`](https://react.dev/reference/react/useState)
> reference is useful for checking parameters, return values, and canonical usage.

Rules:

- Prefer official docs, standards, textbooks, papers, or source repositories.
- Say what the link documents (parameter, API signature, spec detail) in one sentence.
- Do not place more than one link per concept inside the lesson body; course-level link lists go in README.md or syllabus.md.

### 8. Use the learner profile when it reduces effort

Use explicit facts from `learner_profile` to choose examples and analogies:

- known programming languages
- weak prerequisites
- domain experience
- analogy preferences
- teaching constraints

If a Java developer is learning Python generators, compare one parallel (e.g., lazy iteration), then state one way the analogy breaks. Do not force an analogy into every section.

### 9. Use checks, not long quizzes

Use one study-* question after each concept. Choose the exact `study-*` block type and fields from `courseware-format.md`; this guide only controls the English wording. The prompt should name the task, evidence, constraints, and expected reasoning shape. Near the end of a chapter, use a small set of ordinary question blocks instead of a separate checkpoint block.

### 9.5 Present terms and practice in the lesson

The default file policy is owned by `courseware-format.md`; this guide only controls how terms, question banks, flashcards, and resources should appear in English prose.

Use these replacements:

- If a chapter has many terms, add a short chapter-local “Term check” without turning the lesson into a glossary.
- Put interview, exam, and end-of-chapter practice inside the relevant section using the saveable exercise blocks defined in `courseware-format.md`.
- Add spaced-review items to `concepts.json` during Phase 3 after the learner has encountered the concept; do not pre-generate cards for unseen content.

### 10. Keep optional depth out of the main path

Put background reading, alternative approaches, and deeper theory after the main exercise. Label them as optional.

### 11. Use concrete mistakes only when they are real

Write mistakes as symptoms the learner can recognize:

- “The command cannot find the file.”
- “The component renders twice.”
- “The answer explains the definition but not the trade-off.”

Avoid vague warnings such as “be careful with complexity.” Do not invent mistakes to fill a template. If the mistake matters, place it near the concept or example where the learner can act on it.

## Forbidden Patterns

- Do not front-load history, taxonomy, or theory before the learner has a task.
- Do not turn the chapter into API reference. Link to reference material instead.
- Do not hide prerequisites or expected outputs.
- Do not turn shared courseware rules from `courseware-format.md` into a separate English-only rule set.
- Do not let generator-side process notes leak into the English lesson body.
- Do not force repeated slogan headings such as "The idea in one minute".
- Do not add decorative diagrams or exercises that do not help the chapter goal.
- For AI writing patterns (buzzwords, sentence structures, forbidden phrases), see `references/anti-ai-writing.md`.
