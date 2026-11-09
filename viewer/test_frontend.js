const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const diagramsSource = fs.readFileSync(__dirname + "/assets/diagrams.js", "utf8");
const source = fs.readFileSync(__dirname + "/assets/viewer.js", "utf8").replace(
  /\}\)\(\);\s*$/,
  "window.__test = { renderMarkdown, splitStudyBlocks, renderArchifyBlock, renderStudyStepsBlock, COURSE_MATH_DELIMITERS, isCurrentLearningPage, mainCourseLearningPages, evidenceLabel, skillTreeStatus, skillNodeNextStep, masteryChallengeQuestion, currentSessionPageKey, hasCurrentPageView, countReviewForSession, beginReviewForSession, finishReviewForSession, persistQuestionChange, setState: value => { STATE = value; }, setSessionStartedAt: value => { SESSION_STARTED_AT = value; }, setLastPageSessionKey: value => { LAST_PAGE_SESSION_KEY = value; }, reviewCount: () => SESSION_REVIEW_RATED_COUNT, pendingReviewCount: () => SESSION_PENDING_REVIEW_COUNT, hasPendingQuestionSave: () => PENDING_QUESTION_SAVE_SESSION === SESSION_STARTED_AT }; })();"
);
const sandbox = {
  window: { matchMedia: () => ({ matches: false }) },
  document: { addEventListener: () => {} },
  marked: { parse: text => text.replace(/\\([\[\]()])/g, "$1") }
};
vm.runInNewContext(diagramsSource, sandbox);
sandbox.StudyDiagrams = sandbox.window.StudyDiagrams;
vm.runInNewContext(source, sandbox);

const api = sandbox.window.__test;
const diagrams = sandbox.window.StudyDiagrams;

// 1. Math & Markdown checks
assert.equal(api.renderMarkdown("\\[x + y\\] and \\(z\\)"), "\\[x + y\\] and \\(z\\)");
assert.equal(api.renderMarkdown("套餐 $5/月，另一个 $10/月"), "套餐 $5/月，另一个 $10/月");
assert.equal(api.COURSE_MATH_DELIMITERS.some(item => item.left === "$"), false);
assert.equal(api.COURSE_MATH_DELIMITERS.some(item => item.left === "$$"), true);

// 2. Archify 9 diagram types deterministic SVG & study-steps checks
const diagramFixtures = [
  {
    type: "sequence",
    raw: 'type=sequence id=seq-1 title="Sequence Demo"\n| actor client | 浏览器客户端 | frontend |\n| actor api | 订单服务 API | backend |\n| phase | 缓存查询阶段 |\n| client | api | GET /orders/42 |\n| api | client | 200 OK | return |',
    expectNodes: ["client", "api"]
  },
  {
    type: "workflow",
    raw: 'type=workflow id=wf-1 title="Workflow Demo"\n| lane gw | 网关层 |\n| req | 收到请求 | frontend | gw |\n| check | 签名有效? | decision | gw |\n| ok | 放行请求 | backend | gw |\n| req > check | |\n| check > ok | 是 | emphasis |',
    expectNodes: ["req", "check", "ok"]
  },
  {
    type: "architecture",
    raw: 'type=architecture id=arch-1 title="Arch Demo"\n| group core | 核心域 | backend |\n| web | 前端页面 | frontend |\n| svc | 业务服务 | backend | core |\n| db | 主数据库 | database | core |\n| web > svc | HTTPS |\n| svc > db | SQL | emphasis |',
    expectNodes: ["web", "svc", "db"]
  },
  {
    type: "dataflow",
    raw: 'type=dataflow id=df-1 title="Dataflow Demo"\n| raw | 原始输入 X | frontend | 0 |\n| enc | 编码层 | backend | 1 |\n| out | 预测分布 | database | 2 |\n| raw > enc | [B, L, D] |\n| enc > out | Logits [B, V] | emphasis |',
    expectNodes: ["raw", "enc", "out"]
  },
  {
    type: "lifecycle",
    raw: 'type=lifecycle id=lc-1 title="Lifecycle Demo"\n| main | closed > open > half_open |\n| closed | 闭合正常 | start |\n| open | 熔断打开 | failure |\n| half_open | 半开探测 | waiting |\n| closed > open | 错误率超标 | security |\n| open > half_open | 冷却到期 | dashed |',
    expectNodes: ["closed", "open", "half_open"]
  },
  {
    type: "tree",
    raw: 'type=tree id=tree-1 title="Tree Demo"\n| root | 索引类型 | - | database |\n| btree | B-Tree 索引 | root | backend |\n| gin | GIN 倒排索引 | root | cloud |',
    expectNodes: ["root", "btree", "gin"]
  },
  {
    type: "erd",
    raw: 'type=erd id=erd-1 title="ERD Demo"\n| entity users | 用户表 | 账户域 |\n| entity orders | 订单表 | 交易域 |\n| users.id | bigint | pk | |\n| orders.id | bigint | pk | |\n| orders.user_id | bigint | fk | users.id |\n| orders > users | many:one | 下单 |',
    expectNodes: ["users", "orders"]
  },
  {
    type: "timeline",
    raw: 'type=timeline id=tl-1 title="Timeline Demo"\n| lane ops | 运维时间轴 |\n| ev1 | 10:00 | 发布 v2 | ops | change |\n| ev2 | 10:05 | 错误率告警 | ops | alert |',
    expectNodes: ["ev1", "ev2"]
  },
  {
    type: "waterfall",
    raw: 'type=waterfall id=wf-trace title="Waterfall Demo"\n| root | 总请求 | 0 | 120 | - | frontend |\n| auth | 鉴权 | 0 | 20 | root | security |\n| query | 数据库查询 | 20 | 100 | root | database |',
    expectNodes: ["root", "auth", "query"]
  }
];

for (const item of diagramFixtures) {
  const res = diagrams.renderArchifySvg(item.raw);
  assert.equal(res.type, item.type);
  assert.equal(res.width > 400, true, `${item.type} width should be positive`);
  assert.equal(res.height > 120, true, `${item.type} height should be positive`);
  assert.equal(res.svg.includes("NaN"), false, `${item.type} SVG must not contain NaN coordinates`);
  for (const nodeId of item.expectNodes) {
    assert.equal(res.svg.includes(`data-node-id="${nodeId}"`), true, `${item.type} missing data-node-id=${nodeId}`);
  }
}

const stepsParsed = diagrams.parseStudyStepsBlock(
  "diagram=seq-1\n| s1 | 第一步 | 客户端发起请求 | client,api |\n| s2 | 第二步 | 返回响应 | api |"
);
assert.equal(stepsParsed.diagram, "seq-1");
assert.equal(stepsParsed.steps.length, 2);
assert.deepEqual(Array.from(stepsParsed.steps[0].targets), ["client", "api"]);

const splitBlocks = api.splitStudyBlocks(
  "Intro\n```archify\ntype=tree id=t1 title=\"T\"\n| a | Root | - |\n```\n```study-steps\ndiagram=t1\n| s1 | Step | Detail | a |\n```\n```study-input\nid: q1\nquestion: Q?\nanswer: A\n```"
);
assert.deepEqual(Array.from(splitBlocks, b => b.type), ["markdown", "archify", "steps", "study"]);
assert.equal(api.renderArchifyBlock('type=tree id=t1 title="T"\n| a | Root | - |').includes('data-archify-card-id="t1"'), true);
assert.equal(api.renderStudyStepsBlock('diagram=t1\n| s1 | Step | Detail | a |').includes('data-steps-for="t1"'), true);

// 3. Learning state & skill tree checks
api.setState({
  current_module: "01-basics",
  current_section: "",
  current_content_file: "demo/01-basics/content.md",
  modules: [{
    id: "01-basics",
    has_content: true,
    content_path: "demo/01-basics/content.md",
    sections: [{ id: "01-lesson", content_path: "demo/01-basics/01-lesson/content.md" }]
  }]
});
assert.equal(api.isCurrentLearningPage(), false);

api.setState({
  current_module: "01-basics",
  current_section: "01-lesson",
  current_content_file: "demo/01-basics/01-lesson/content.md",
  modules: [{
    id: "01-basics",
    has_content: true,
    content_path: "demo/01-basics/content.md",
    sections: [{ id: "01-lesson", content_path: "demo/01-basics/01-lesson/content.md" }]
  }]
});
assert.equal(api.isCurrentLearningPage(), true);

api.setState({
  current_module: "99-content-supplements",
  current_section: "01-extra",
  current_content_file: "demo/99-content-supplements/01-extra/content.md",
  modules: [
    {
      id: "01-basics",
      has_content: true,
      content_path: "demo/01-basics/content.md",
      sections: [{ id: "01-lesson", title: "先看一个失败请求", content_path: "demo/01-basics/01-lesson/content.md" }]
    },
    {
      id: "99-content-supplements",
      has_content: true,
      content_path: "demo/99-content-supplements/content.md",
      sections: [{ id: "01-extra", content_path: "demo/99-content-supplements/01-extra/content.md" }]
    }
  ],
  domain_tree: {
    nodes: {
      "01-basics": { name: "请求基础", status: "available" },
      "02-core": { name: "核心机制", status: "locked", prerequisites: ["01-basics"] },
      "99-content-supplements": { name: "内容补充", status: "available" }
    }
  },
  learning_record: { pages: [] }
});
assert.deepEqual(Array.from(api.mainCourseLearningPages(), page => page.module), ["01-basics"]);
assert.equal(api.isCurrentLearningPage(), true);
assert.equal(api.skillTreeStatus("unlockable").label, "可挑战");
assert.equal(api.evidenceLabel("exam"), "应试作答");
assert.equal(api.evidenceLabel("field-investigation"), "field investigation");

const startStep = api.skillNodeNextStep("01-basics", {
  name: "请求基础",
  status: "available",
  missing_evidence: ["recall", "apply", "explain"]
}, "available");
assert.equal(startStep.kind, "navigate");
assert.equal(startStep.label, "开始「先看一个失败请求」");

const lockedStep = api.skillNodeNextStep("02-core", {
  name: "核心机制",
  status: "locked",
  prerequisites: ["01-basics"]
}, "locked");
assert.equal(lockedStep.kind, "note");
assert.equal(lockedStep.label, "先完成「请求基础」后解锁");

api.setState({
  modules: [{
    id: "01-basics",
    has_content: true,
    content_path: "demo/01-basics/content.md",
    sections: [{ id: "01-lesson", title: "先看一个失败请求", content_path: "demo/01-basics/01-lesson/content.md" }]
  }],
  domain_tree: { nodes: { "01-basics": { name: "请求基础", status: "in_progress" } } },
  learning_record: {
    pages: [{
      module: "01-basics",
      section: "01-lesson",
      content_file: "demo/01-basics/01-lesson/content.md",
      completed_at: "2026-07-26T00:00:00Z"
    }]
  }
});
const challengeStep = api.skillNodeNextStep("01-basics", {
  name: "请求基础",
  status: "in_progress",
  mastery_gate: { apply: 1, explain: 1 },
  missing_evidence: ["apply", "explain"]
}, "in_progress");
assert.equal(challengeStep.kind, "challenge");
assert.equal(challengeStep.label, "申请掌握挑战");
assert.equal(challengeStep.detail, "掌握挑战：独立完成 1 道应用题、用自己的话讲清 1 个核心概念");
assert.equal(
  api.masteryChallengeQuestion("请求基础", challengeStep.detail),
  "请在内容补充中为「请求基础」添加掌握挑战：独立完成 1 道应用题、用自己的话讲清 1 个核心概念，并带我开始。"
);

api.setSessionStartedAt("2026-07-26T01:00:00Z");
const firstSession = api.currentSessionPageKey();
api.setLastPageSessionKey(firstSession);
assert.equal(api.hasCurrentPageView(), true);
assert.equal(api.countReviewForSession(firstSession), true);
assert.equal(api.reviewCount(), 1);
assert.equal(api.beginReviewForSession(firstSession), true);
assert.equal(api.pendingReviewCount(), 1);
assert.equal(api.finishReviewForSession(firstSession), true);
assert.equal(api.pendingReviewCount(), 0);

api.setSessionStartedAt("2026-07-26T02:00:00Z");
assert.equal(api.hasCurrentPageView(), false);
assert.equal(api.countReviewForSession(firstSession), false);
assert.equal(api.beginReviewForSession(firstSession), false);
assert.equal(api.finishReviewForSession(firstSession), false);
assert.equal(api.reviewCount(), 1);
assert.equal(api.pendingReviewCount(), 0);

(async () => {
  api.setState({
    server_mode: "interactive",
    course_slug: "demo",
    current_module: "01-basics",
    current_section: "01-lesson",
    current_content_file: "demo/01-basics/01-lesson/content.md"
  });
  sandbox.fetch = () => Promise.reject(new Error("temporary failure"));
  await assert.rejects(api.persistQuestionChange("question_added", "retry me", true), /temporary failure/);
  assert.equal(api.hasPendingQuestionSave(), false);
  console.log("viewer frontend behavior checks passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
