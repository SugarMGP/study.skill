(function() {
  "use strict";

  let STATE = null;
  let QUESTIONS = [];
  let REVIEW_RATED = [];
  let EXERCISES = [];
  let CHECKPOINTS = [];
  let TOKEN = "";
  let SESSION_STARTED_AT = new Date().toISOString();
  let LAST_PAGE_KEY = "";
  const COMPLETED_PAGE_KEYS = new Set();
  const EXPANDED_MODULES = new Set();
  let isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const DIAGRAM_LANGS = new Set([
    "plantuml", "puml", "graphviz", "dot", "d2", "vega-lite", "vegalite",
    "vega", "svgbob", "pikchr", "structurizr"
  ]);
  const SKILL_TREE_STATUS = {
    mastered: { label: "已掌握", badge: "viewer-soft-badge is-success" },
    in_progress: { label: "进行中", badge: "viewer-soft-badge" },
    recommended: { label: "推荐", badge: "viewer-soft-badge" },
    available: { label: "可学习", badge: "viewer-soft-badge is-muted" },
    locked: { label: "未解锁", badge: "viewer-soft-badge is-muted" }
  };

  function tokenFromHash() {
    const hash = window.location.hash;
    const tokenMatch = hash.match(/token=([^&]+)/);
    return tokenMatch ? decodeURIComponent(tokenMatch[1]) : "";
  }

  function init() {
    const token = tokenFromHash();
    if (!token) {
      showError("打开方式不正确，请从课程入口重新打开。");
      return;
    }
    TOKEN = token;

    if (isDark) document.documentElement.classList.add("dark");
    updateThemeBtn();
    updateThemeAssets();

    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "strict"
    });

    marked.setOptions({
      gfm: true,
      breaks: false,
      pedantic: false,
      highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try { return hljs.highlight(code, { language: lang }).value; } catch(e) {}
        }
        try { return hljs.highlightAuto(code).value; } catch(e) {}
        return code;
      }
    });

    fetchInitialState(token);
    window.addEventListener("hashchange", reloadFromHash);
  }

  function reloadFromHash() {
    const token = tokenFromHash();
    if (!token) {
      showError("打开方式不正确，请从课程入口重新打开。");
      return;
    }
    if (token === TOKEN) return;
    TOKEN = token;
    LAST_PAGE_KEY = "";
    fetchInitialState(token);
  }

  async function fetchInitialState(token) {
    try {
      const resp = await fetch("/api/initial-state?token=" + encodeURIComponent(token));
      if (!resp.ok) throw new Error("HTTP " + resp.status + ": " + resp.statusText);
      STATE = await resp.json();
      renderAll();
    } catch(e) {
      showError("加载初始状态失败: " + e.message);
    }
  }

  function hydrateLearningRecord() {
    const record = STATE.learning_record || {};
    QUESTIONS = Array.isArray(record.questions_for_llm) ? record.questions_for_llm.slice() : [];
    REVIEW_RATED = ((record.review_summary || {}).items || []).slice();
    EXERCISES = Array.isArray(record.exercises) ? record.exercises.slice() : [];
    CHECKPOINTS = Array.isArray(record.legacy_checkpoints) ? record.legacy_checkpoints.slice() : [];
    seedCompletedPageKeys(record);
  }

  function seedCompletedPageKeys(record) {
    COMPLETED_PAGE_KEYS.clear();
    for (const page of record.pages || []) {
      if (!page || !page.completed_at) continue;
      COMPLETED_PAGE_KEYS.add(pageKeyFromParts(page.module, page.section, page.content_file));
    }
  }

  function showError(msg) {
    document.getElementById("content").innerHTML = '<div class="layui-card viewer-card"><div class="layui-card-body"><div class="error-box">' + escapeHtml(msg) + "</div></div></div>";
    notify(msg, "error");
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeJsArgAttr(s) {
    return escapeAttr(JSON.stringify(String(s)));
  }

  function notify(msg, type) {
    if (!window.layui || !layui.layer) return;
    const icon = type === "error" ? 2 : type === "success" ? 1 : 0;
    layui.layer.msg(msg, { icon: icon, time: type === "error" ? 2600 : 1600 });
  }

  function rerenderLayui() {
    if (!window.layui) return;
    layui.use(["element", "form"], function(){
      if (layui.element) layui.element.render();
      if (layui.form) layui.form.render();
    });
  }

  function renderLayuiCodeBlocks(root) {
    if (!window.layui) return;
    root.querySelectorAll("pre code").forEach(code => {
      const pre = code.parentElement;
      if (!pre || pre.dataset.layuiCode === "true") return;
      const langClass = Array.from(code.classList).find(name => name.startsWith("language-")) || "";
      const lang = langClass.replace(/^language-/, "");
      const safeLang = /^[A-Za-z0-9_+-]+$/.test(lang) ? lang : "text";
      const source = code.textContent || "";
      pre.textContent = source;
      pre.dataset.layuiCode = "true";
      pre.setAttribute("lay-options", "{copy: true, lang: '" + safeLang + "', theme: '" + (isDark ? "dark" : "light") + "'}");
      pre.classList.add("layui-code");
    });
    layui.use("code", function(){
      if (layui.code) {
        layui.code({
          elem: root.querySelectorAll(".markdown-body pre.layui-code"),
          theme: isDark ? "dark" : "light"
        });
        syncLayuiCodeTheme(root);
      }
    });
  }

  function syncLayuiCodeTheme(root) {
    root.querySelectorAll(".layui-code-view").forEach(el => {
      el.classList.toggle("layui-code-theme-dark", isDark);
    });
  }

  function ratingLabel(rating) {
    const labels = { 1: "忘了", 2: "记得一点", 3: "记得大部分", 4: "轻松想起" };
    return labels[rating] || String(rating);
  }

  function setupNavToggle() {
    const nav = document.getElementById("nav-list");
    if (!nav) return;
    nav.addEventListener("click", function(e) {
      const disabledLink = e.target.closest(".module-link.is-disabled, dd.is-locked > a");
      if (disabledLink && nav.contains(disabledLink)) {
        e.preventDefault();
        e.stopPropagation();
        showLockedModule();
        return;
      }
      const toggle = e.target.closest(".module-toggle");
      if (!toggle || !nav.contains(toggle)) return;
      const item = toggle.closest(".layui-nav-item");
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      item.classList.toggle("layui-nav-itemed");
      const moduleId = item.getAttribute("data-module-id");
      if (!moduleId) return;
      if (item.classList.contains("layui-nav-itemed")) {
        EXPANDED_MODULES.add(moduleId);
      } else {
        EXPANDED_MODULES.delete(moduleId);
      }
    }, true);
  }

  function renderAll() {
    if (window.__layuiLoadError) {
      showError("Layui 资源加载失败，请检查网络或 unpkg 访问。");
      return;
    }
    hydrateLearningRecord();
    renderQuestions();
    renderBreadcrumb();
    renderRPG();
    renderReviewBadge();
    renderNav();
    renderSkillTree();
    renderContent(STATE.current_content || STATE.readme || "");
    renderLearningOverview();
    renderReviewPanel();
    recordPageView();
    rerenderLayui();
  }

  function renderBreadcrumb() {
    const meta = STATE.meta || {};
    const name = meta.name || STATE.course_slug;
    const mod = STATE.current_module || "";
    const sectionTitle = STATE.current_section_title || "";
    const el = document.getElementById("breadcrumb");
    let text = '<a href="javascript:;">' + escapeHtml(name) + '</a>';
    if (mod) text += '<a href="javascript:;">' + escapeHtml(currentModuleLabel()) + "</a>";
    if (sectionTitle) text += '<a><cite>' + escapeHtml(sectionTitle) + "</cite></a>";
    el.innerHTML = text;
    document.title = name + (mod ? " / " + currentModuleLabel() : "") + (sectionTitle ? " / " + sectionTitle : "") + " - 课程播放器";
  }

  function renderRPG() {
    const tree = STATE.domain_tree || {};
    const rpg = tree.rpg;
    const meta = STATE.meta || {};
    const el = document.getElementById("rpg-status");
    if (!meta.rpg_enabled || !rpg) {
      el.classList.add("viewer-hidden");
      el.textContent = "";
      return;
    }
    el.classList.remove("viewer-hidden");
    let text = "Lv." + (rpg.level || 1) + " · " + (rpg.xp || 0) + " XP";
    if (rpg.title) text += " · 「" + rpg.title + "」";
    el.textContent = text;
  }

  function renderReviewBadge() {
    const badge = document.getElementById("review-badge");
    const due = (STATE || {}).due_reviews || { total: 0 };
    if ((STATE || {}).review_check_error) {
      badge.classList.remove("viewer-hidden");
      badge.textContent = "复习检查失败";
      return;
    }
    if (!due.total) {
      badge.classList.add("viewer-hidden");
      badge.textContent = "";
      return;
    }
    badge.classList.remove("viewer-hidden");
    badge.textContent = due.total + " 个待复习";
  }

  function renderNav() {
    const modules = STATE.modules || [];
    const current = STATE.current_module;
    const currentSection = STATE.current_section || "";
    const completed = (STATE.meta || {}).completed_modules || [];
    const treeNodes = ((STATE.domain_tree || {}).nodes) || {};
    const moduleProgress = getModuleProgress();
    const el = document.getElementById("nav-list");
    if (modules.length === 0) {
      el.innerHTML = '<li class="layui-nav-item"><a href="javascript:;">未找到模块</a></li>';
      return;
    }
    let html = "";
    for (const mod of modules) {
      const isActive = mod.id === current;
      if (isActive && (mod.sections || []).length > 0 && !EXPANDED_MODULES.has(mod.id)) {
        EXPANDED_MODULES.add(mod.id);
      }
      const isDone = completed.includes(mod.id);
      const isLocked = treeNodes[mod.id] && treeNodes[mod.id].status === "locked";
      const statusClass = isDone ? "done" : (isActive ? "active" : "");
      const cls = "layui-nav-item" + (EXPANDED_MODULES.has(mod.id) ? " layui-nav-itemed" : "");
      const label = mod.name || labelFromId(mod.id);
      const currentRowClass = isActive ? " is-current" : "";
      const lockRowClass = isLocked ? " is-locked" : "";
      const lockLinkClass = isLocked ? " is-disabled" : "";
      const moduleAction = isLocked ? "showLockedModule()" : ("switchModule(" + escapeJsArgAttr(mod.id) + ")");
      const progress = moduleProgress[mod.id] || { viewed: 0, total: 1, percent: 0 };
      html += '<li class="' + cls + '" data-module-id="' + escapeAttr(mod.id) + '"><div class="module-row' + currentRowClass + lockRowClass + '"><a class="module-link' + lockLinkClass +
        '" href="javascript:;" onclick="' + moduleAction +
        '"><div class="module-main"><div class="module-head"><span class="status-dot ' + statusClass + '"></span><span class="module-title">' +
        escapeHtml(label) + '</span></div><div class="module-progress" title="已看 ' + progress.viewed + '/' + progress.total +
        '"><span class="module-progress-track"><span class="module-progress-fill" style="width:' + progress.percent +
        '%"></span></span><span class="module-progress-text">' + progress.viewed + '/' + progress.total + "</span></div></div></a>";
      if ((mod.sections || []).length > 0) {
        html += '<button type="button" class="module-toggle" aria-label="展开或收起小节"><i class="layui-icon layui-icon-down"></i></button>';
      }
      html += "</div>";
      if ((mod.sections || []).length > 0) {
        html += '<dl class="layui-nav-child">';
        for (const section of mod.sections) {
          const sectionActive = section.id === currentSection;
          const sectionCls = (sectionActive ? "layui-this" : "") + (isLocked ? " is-locked" : "");
          const sectionAction = isLocked ? "showLockedModule()" : ("switchSection(" + escapeJsArgAttr(mod.id) + "," + escapeJsArgAttr(section.id) + ")");
          html += '<dd class="' + sectionCls + '"><a href="javascript:;" onclick="' + sectionAction + '">' +
            '<span class="section-title">' + escapeHtml(section.title || labelFromId(section.id)) + "</span></a></dd>";
        }
        html += "</dl>";
      }
      html += "</li>";
    }
    el.innerHTML = html;
    rerenderLayui();
  }

  function pageKeyFromParts(moduleId, sectionId, contentFile) {
    return [moduleId || "", sectionId || "", contentFile || ""].join("|");
  }

  function expectedLearningPages() {
    const pages = [];
    for (const mod of STATE.modules || []) {
      const sections = mod.sections || [];
      if (sections.length > 0) {
        for (const section of sections) {
          pages.push({
            module: mod.id,
            section: section.id,
            content_file: section.content_path || ""
          });
        }
      } else if (mod.has_content) {
        pages.push({
          module: mod.id,
          section: "",
          content_file: mod.content_path || ""
        });
      }
    }
    return pages;
  }

  function completedLearningPageKeys() {
    const pages = ((STATE.learning_record || {}).pages || []);
    const completedPages = new Set();
    for (const page of pages) {
      if (!page || !page.module) continue;
      if (page.completed_at) {
        completedPages.add(pageKeyFromParts(page.module, page.section, page.content_file));
      }
    }
    return completedPages;
  }

  function getModuleProgress() {
    const completedPages = completedLearningPageKeys();
    const progress = {};
    for (const mod of STATE.modules || []) {
      const expected = expectedPagesForModule(mod);
      const total = Math.max(1, expected.length);
      const viewed = expected.filter(page => completedPages.has(pageKeyFromParts(page.module, page.section, page.content_file))).length;
      progress[mod.id] = {
        viewed: viewed,
        total: total,
        percent: Math.round((viewed / total) * 100)
      };
    }
    return progress;
  }

  function expectedPagesForModule(mod) {
    const sections = mod.sections || [];
    if (sections.length > 0) {
      return sections.map(section => ({
        module: mod.id,
        section: section.id,
        content_file: section.content_path || ""
      }));
    }
    if (mod.has_content) {
      return [{
        module: mod.id,
        section: "",
        content_file: mod.content_path || ""
      }];
    }
    return [];
  }

  function labelFromId(id) {
    return String(id || "").replace(/^\d{2}-/, "").replace(/-/g, " ");
  }

  function currentModuleLabel() {
    const modules = STATE.modules || [];
    const current = STATE.current_module || "";
    const mod = modules.find(item => item.id === current);
    return mod ? (mod.name || labelFromId(mod.id)) : labelFromId(current);
  }

  function renderSkillTree() {
    const tree = STATE.domain_tree || {};
    if (!tree.enabled || !tree.nodes || Object.keys(tree.nodes).length === 0) return;
    const section = document.getElementById("skill-tree-section");
    section.classList.remove("viewer-hidden");
    const el = document.getElementById("skill-tree");
    el.className = "skill-tree-host";
    const items = Object.entries(tree.nodes).map(([id, node]) => {
      const status = node.status || "available";
      const statusMeta = SKILL_TREE_STATUS[status] || SKILL_TREE_STATUS.available;
      const progress = Math.max(0, Math.min(100, Number(node.progress || 0)));
      const name = (node.name || id).replace(/^\d{2}-/, "").replace(/-/g, " ");
      return '<div class="skill-map-item is-' + escapeAttr(status) + '">' +
        '<span class="skill-map-dot"></span>' +
        '<div class="skill-map-body">' +
        '<div class="skill-map-head"><span class="skill-map-name">' + escapeHtml(name) + '</span>' +
        '<span class="skill-map-status">' + statusMeta.label + (progress ? " " + progress + "%" : "") + '</span></div>' +
        '<div class="skill-map-bar"><span class="skill-map-fill" style="width:' + progress + '%"></span></div>' +
        '</div></div>';
    });
    el.innerHTML = items.join("");
  }

  async function renderContent(md) {
    const el = document.getElementById("content");
    if (!md) {
      el.innerHTML = '<div class="markdown-body"><p class="viewer-muted">暂无内容</p></div>';
      return;
    }
    const parts = splitStudyBlocks(md);
    let html = "";
    for (const part of parts) {
      if (part.type === "markdown") {
        html += renderMarkdown(part.content);
      } else if (part.type === "diagram") {
        html += renderDiagramBlock(part.lang, part.content);
      } else if (part.type === "study") {
        html += renderStudyBlock(part.lang, part.content);
      }
    }
    el.innerHTML = '<div class="markdown-body">' + html + "</div>";
    await postProcessContent(el);
    restoreSubmittedExercises(el);
    renderLayuiCodeBlocks(el);
    rerenderLayui();
    maybeRecordPageCompletion();
  }

  function restoreSubmittedExercises(root) {
    if (!Array.isArray(EXERCISES) || !EXERCISES.length) return;
    root.querySelectorAll(".study-block").forEach(block => {
      const id = block.getAttribute("data-study-id");
      const saved = EXERCISES.find(item =>
        item.id === id &&
        item.module === STATE.current_module &&
        (item.section || null) === (STATE.current_section || null)
      );
      if (!saved) return;
      applySavedAnswer(block, saved.user_answer || "");
      markStudyBlockSubmitted(block);
    });
  }

  function applySavedAnswer(block, userAnswer) {
    const type = block.getAttribute("data-study-type");
    if (type === "choice") {
      const values = String(userAnswer).split(",").map(item => item.trim()).filter(Boolean);
      block.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach(input => {
        input.checked = values.includes(input.value);
      });
      return;
    }
    if (type === "truefalse") {
      const normalized = userAnswer === "正确" ? "true" : userAnswer === "错误" ? "false" : String(userAnswer);
      block.querySelectorAll("input[type='radio']").forEach(input => {
        input.checked = input.value === normalized;
      });
      return;
    }
    const field = block.querySelector(".exercise-answer");
    if (field) field.value = userAnswer;
  }

  function splitStudyBlocks(md) {
    const parts = [];
    const regex = /```([A-Za-z0-9_-]+)\s*\n([\s\S]*?)```/g;
    let last = 0;
    let match;
    while ((match = regex.exec(md)) !== null) {
      const lang = match[1].toLowerCase();
      const content = match[2];
      if (lang === "mermaid" || DIAGRAM_LANGS.has(lang) || lang.startsWith("study-")) {
        if (match.index > last) {
          parts.push({ type: "markdown", content: md.slice(last, match.index) });
        }
        if (lang === "mermaid" || DIAGRAM_LANGS.has(lang)) {
          parts.push({ type: "diagram", lang: lang, content: content.trim() });
        } else {
          parts.push({ type: "study", lang: lang, content: content.trim() });
        }
        last = match.index + match[0].length;
      }
    }
    if (last < md.length) {
      parts.push({ type: "markdown", content: md.slice(last) });
    }
    return parts;
  }

  function renderMarkdown(md) {
    return marked.parse(md);
  }

  function renderDiagramBlock(lang, code) {
    const id = "diagram-" + Math.random().toString(36).slice(2, 10);
    return '<div class="diagram-container" data-diagram-id="' + escapeAttr(id) + '" data-diagram-lang="' + escapeAttr(lang) + '" data-diagram-code="' + escapeAttr(code) + '"><div class="loading">渲染图表...</div></div>';
  }

  function renderStudyBlock(lang, yamlContent) {
    let data;
    try {
      data = jsyaml.load(yamlContent);
    } catch(e) {
      return '<div class="error-box">这道练习暂时无法显示: ' + escapeHtml(e.message) + "<pre>" + escapeHtml(yamlContent) + "</pre></div>";
    }
    const type = lang.replace("study-", "");
    if (type === "choice") return renderChoiceQuestion(data, type);
    if (type === "truefalse") return renderTrueFalseQuestion(data, type);
    if (type === "input" || type === "short" || type === "explain") return renderInputQuestion(data, type);
    if (type === "recall" || type === "transfer") return renderInputQuestion(data, type);
    if (type === "feynman") return renderInputQuestion(normalizeFeynmanData(data), type);
    if (type === "checkpoint") return renderLegacyCheckpoint(data);
    return '<div class="error-box">这类练习暂时不支持显示: ' + escapeHtml(type) + "</div>";
  }

  function questionId(prefix, data) {
    return data.id || (prefix + "-" + Math.random().toString(36).slice(2, 8));
  }

  function normalizeFeynmanData(data) {
    return {
      id: data.id,
      title: data.title || "解释题",
      question: data.prompt || ("用自己的话解释: " + (data.concept || "")),
      answer: data.key_points ? ("参考要点: " + data.key_points) : (data.answer || ""),
      mode: "long",
      min_words: data.min_words || 30,
      mastery_tags: data.mastery_tags || ["explain"],
      concept: data.concept || ""
    };
  }

  function questionHeader(label, question, title) {
    const text = title || question || "";
    return '<div class="layui-card-header"><span class="study-type-badge">' + escapeHtml(label) +
      '</span><span class="study-title">' + escapeHtml(text) + "</span></div>";
  }

  function renderChoiceQuestion(data, rawType) {
    if (!data.question) return '<div class="error-box">这道选择题缺少题干</div>';
    if (!Array.isArray(data.options) || data.options.length < 2) return '<div class="error-box">这道选择题至少需要两个选项</div>';
    const id = questionId("choice", data);
    const multiple = data.multiple === true || Array.isArray(data.answer);
    const inputType = multiple ? "checkbox" : "radio";
    const name = "study-" + id;
    const options = data.options.map((option, index) => normalizeChoiceOption(option, index));
    const saved = savedExerciseFor(id);
    let optionsHtml = '<div class="choice-list">';
    for (const option of options) {
      const checked = saved && savedAnswerValues(saved.user_answer).includes(option.value) ? ' checked' : '';
      optionsHtml += '<label class="choice-option">' +
        '<input type="' + inputType + '" name="' + escapeAttr(name) + '" value="' + escapeAttr(option.value) + '" title="' + escapeAttr(option.label) + '"' + checked + '>' +
        (option.note ? '<div class="choice-note">' + escapeHtml(option.note) + "</div>" : "") +
        "</label>";
    }
    optionsHtml += "</div>";
    return '<div class="layui-card viewer-card study-block study-choice" data-study-id="' + escapeAttr(id) + '" data-study-type="' + escapeAttr(rawType) + '" ' +
      'data-study-question="' + escapeAttr(data.question) + '" data-study-answer="' + escapeAttr(normalizeAnswer(data.answer)) + '" ' +
      'data-study-explanation="' + escapeAttr(data.explanation || data.reason || "") + '" data-study-multiple="' + escapeAttr(multiple ? "true" : "false") + '" ' +
      'data-study-mastery-tags="' + escapeAttr(normalizeTags(data.mastery_tags || data.skill_tags)) + '">' +
      questionHeader(multiple ? "多选题" : "选择题", data.question, data.title || "") +
      '<div class="layui-card-body layui-form">' +
      '<div class="study-question">' + escapeHtml(data.question) + "</div>" +
      renderHintTools(data.hints) +
      optionsHtml +
      renderSubmitRow("提交作答") +
      renderAnswerPanel(data.answer, data.explanation || data.reason || "") +
      '<div class="assess-result"></div>' +
      '</div></div>';
  }

  function renderTrueFalseQuestion(data, rawType) {
    if (!data.question) return '<div class="error-box">这道判断题缺少题干</div>';
    const id = questionId("truefalse", data);
    const answerValue = normalizeBooleanAnswer(data.answer);
    const saved = savedExerciseFor(id);
    const savedValue = saved ? normalizeSavedTrueFalse(saved.user_answer) : "";
    return '<div class="layui-card viewer-card study-block study-truefalse" data-study-id="' + escapeAttr(id) + '" data-study-type="' + escapeAttr(rawType) + '" ' +
      'data-study-question="' + escapeAttr(data.question) + '" data-study-answer="' + escapeAttr(answerValue) + '" ' +
      'data-study-explanation="' + escapeAttr(data.explanation || data.reason || "") + '" ' +
      'data-study-mastery-tags="' + escapeAttr(normalizeTags(data.mastery_tags || data.skill_tags)) + '">' +
      questionHeader("判断题", data.question, data.title || "") +
      '<div class="layui-card-body layui-form">' +
      '<div class="study-question">' + escapeHtml(data.question) + "</div>" +
      renderHintTools(data.hints) +
      '<div class="choice-list">' +
      '<label class="choice-option"><input type="radio" name="' + escapeAttr("study-" + id) + '" value="true" title="正确"' + (savedValue === "true" ? " checked" : "") + '></label>' +
      '<label class="choice-option"><input type="radio" name="' + escapeAttr("study-" + id) + '" value="false" title="错误"' + (savedValue === "false" ? " checked" : "") + '></label>' +
      '</div>' +
      renderSubmitRow("提交作答") +
      renderAnswerPanel(answerValue === "true" ? "正确" : answerValue === "false" ? "错误" : data.answer, data.explanation || data.reason || "") +
      '<div class="assess-result"></div>' +
      '</div></div>';
  }

  function renderInputQuestion(data, rawType) {
    if (!data.question) return '<div class="error-box">这道开放题缺少题目</div>';
    const id = questionId("input", data);
    const mode = data.mode === "single" ? "single" : "multi";
    const minWords = data.min_words || data.min_chars || "";
    const placeholder = data.placeholder || (mode === "single" ? "写下你的答案..." : "写下你的思路、理由或解释...");
    const saved = savedExerciseFor(id);
    const savedAnswer = saved ? saved.user_answer || "" : "";
    const inputHtml = mode === "single"
      ? '<input type="text" class="layui-input exercise-answer" placeholder="' + escapeAttr(placeholder) + '" value="' + escapeAttr(savedAnswer) + '">'
      : '<textarea class="layui-textarea exercise-answer" placeholder="' + escapeAttr(placeholder) + '">' + escapeHtml(savedAnswer) + '</textarea>';
    const label = rawType === "recall" ? "开放题" : rawType === "transfer" ? "应用题" : rawType === "feynman" ? "解释题" : "开放题";
    return '<div class="layui-card viewer-card study-block study-input" data-study-id="' + escapeAttr(id) + '" data-study-type="' + escapeAttr(rawType) + '" ' +
      'data-study-question="' + escapeAttr(data.question) + '" data-study-answer="' + escapeAttr(data.answer || "") + '" ' +
      'data-study-explanation="' + escapeAttr(data.explanation || data.reason || "") + '" data-study-min-words="' + escapeAttr(minWords) + '" ' +
      'data-study-mastery-tags="' + escapeAttr(normalizeTags(data.mastery_tags || data.skill_tags)) + '" data-study-concept="' + escapeAttr(data.concept || "") + '">' +
      questionHeader(label, data.question, data.title || "") +
      '<div class="layui-card-body layui-form">' +
      '<div class="study-question">' + escapeHtml(data.question) + "</div>" +
      (data.prompt ? '<div class="viewer-muted study-prompt">' + escapeHtml(data.prompt) + "</div>" : "") +
      renderHintTools(data.hints) +
      inputHtml +
      (minWords ? '<div class="viewer-muted viewer-stack-sm">建议不少于 ' + escapeHtml(minWords) + " 字</div>" : "") +
      renderSubmitRow("提交作答") +
      renderAnswerPanel(data.answer, data.explanation || data.reason || "") +
      '<div class="assess-result"></div>' +
      '</div></div>';
  }

  function renderLegacyCheckpoint(data) {
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) return '<div class="error-box">这组检查题还没有配置检查项</div>';
    const id = data.module || questionId("checkpoint", data);
    let itemsHtml = "";
    for (const item of items) {
      itemsHtml += '<li>' + escapeHtml(item.type || "practice") + (item.ref ? " (" + escapeHtml(item.ref) + ")" : "") + "</li>";
    }
    return '<div class="layui-card viewer-card study-block study-legacy" data-study-id="' + escapeAttr(id) + '" data-study-type="checkpoint" ' +
      'data-study-total="' + escapeAttr(items.length) + '">' +
      questionHeader("旧版检查组", "本课程使用了旧版 checkpoint 块", "建议改成模块末尾的一组题型练习") +
      '<div class="layui-card-body">' +
      '<div class="study-question">本课程使用了旧版 checkpoint 块。播放器会保存检查记录，但新课程应改用选择题、判断题或开放题。</div>' +
      '<ul>' + itemsHtml + "</ul>" +
      '<div class="checkpoint-assess study-action-row">' +
      '<button type="button" class="layui-btn layui-btn-sm" onclick="submitCheckpoint(this.closest(\'.study-block\'))">保存检查记录</button>' +
      '</div>' +
      '<div class="assess-result"></div>' +
      '</div></div>';
  }

  function normalizeChoiceOption(option, index) {
    if (typeof option === "string" || typeof option === "number") {
      const value = String.fromCharCode(65 + index);
      return { value: value, label: value + ". " + String(option), note: "" };
    }
    const value = option.value != null ? String(option.value) : String.fromCharCode(65 + index);
    const text = option.text || option.label || option.title || value;
    return { value: value, label: value + ". " + text, note: option.note || option.hint || "" };
  }

  function savedExerciseFor(id) {
    if (!Array.isArray(EXERCISES)) return null;
    return EXERCISES.find(item =>
      String(item.id) === String(id) &&
      String(item.module || "") === String(STATE.current_module || "") &&
      String(item.section || "") === String(STATE.current_section || "")
    ) || null;
  }

  function savedAnswerValues(answer) {
    return String(answer || "").split(",").map(item => item.trim()).filter(Boolean);
  }

  function normalizeSavedTrueFalse(answer) {
    if (answer === "正确" || String(answer).toLowerCase() === "true") return "true";
    if (answer === "错误" || String(answer).toLowerCase() === "false") return "false";
    return "";
  }

  function normalizeAnswer(answer) {
    if (Array.isArray(answer)) return answer.map(item => String(item)).join(", ");
    if (answer === true) return "true";
    if (answer === false) return "false";
    return answer == null ? "" : String(answer);
  }

  function normalizeBooleanAnswer(answer) {
    if (answer === true || String(answer).toLowerCase() === "true" || String(answer) === "正确" || String(answer) === "对") return "true";
    if (answer === false || String(answer).toLowerCase() === "false" || String(answer) === "错误" || String(answer) === "错") return "false";
    return normalizeAnswer(answer);
  }

  function normalizeTags(tags) {
    if (!tags) return "";
    if (Array.isArray(tags)) return tags.map(item => String(item)).join(",");
    return String(tags);
  }

  function renderHintTools(hints) {
    if (!Array.isArray(hints) || !hints.length) return "";
    let html = '<div class="hint-tools">';
    for (let i = 0; i < hints.length; i++) {
      html += '<button type="button" class="layui-btn layui-btn-primary layui-btn-xs" onclick="toggleHint(this, ' + i + ')">提示 ' + (i + 1) + "</button> ";
    }
    html += '<div class="hints-container">';
    for (let i = 0; i < hints.length; i++) {
      html += '<div class="hint" data-hint="' + i + '">' + escapeHtml(hints[i]) + "</div>";
    }
    html += "</div></div>";
    return html;
  }

  function renderSubmitRow(text) {
    return '<div class="study-actions study-action-row">' +
      '<button type="button" class="layui-btn layui-btn-sm save-answer-btn" onclick="saveExerciseAnswer(this.closest(\'.study-block\'))">' + escapeHtml(text) + "</button>" +
      "</div>";
  }

  function renderAnswerPanel(answer, explanation) {
    const hasAnswer = answer !== undefined && answer !== null && String(answer).trim() !== "";
    const hasExplanation = explanation !== undefined && explanation !== null && String(explanation).trim() !== "";
    let body = "";
    if (hasAnswer) {
      body += '<div class="answer-section"><div class="answer-section-title">参考答案</div><div class="answer-section-content">' + renderMarkdown(String(answer)) + "</div></div>";
    }
    if (hasExplanation) {
      body += '<div class="answer-section"><div class="answer-section-title">解析</div><div class="answer-section-content">' + renderMarkdown(String(explanation)) + "</div></div>";
    }
    if (!body) body = '<div class="viewer-muted">这道题没有配置参考内容。</div>';
    return '<div class="answer-panel" data-answer-panel><div class="answer-header"><span>参考解析</span>' +
      '<button type="button" class="answer-toggle" title="展开或收起解析" onclick="toggleAnswerPanel(this)" aria-label="展开或收起解析">' +
      '<i class="layui-icon layui-icon-down"></i></button></div><div class="answer-body">' + body + "</div></div>";
  }

  async function postProcessContent(el) {
    const diagramContainers = el.querySelectorAll(".diagram-container");
    for (const container of diagramContainers) {
      const code = container.getAttribute("data-diagram-code");
      const lang = container.getAttribute("data-diagram-lang");
      try {
        if (lang === "mermaid") {
          const id = container.getAttribute("data-diagram-id");
          const { svg } = await mermaid.render(id, code);
          container.innerHTML = svg;
        } else {
          await renderRemoteDiagram(container, lang, code);
        }
      } catch(e) {
        container.innerHTML = '<div class="error-box">图表渲染失败: ' + escapeHtml(e.message) + "</div>";
      }
    }
    el.querySelectorAll("pre code").forEach(block => {
      if (!block.classList.contains("hljs")) {
        try { hljs.highlightElement(block); } catch(e) {}
      }
    });
    try {
      renderMathInElement(el);
    } catch(e) {}
    el.querySelectorAll("img").forEach(img => {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("http://") || src.startsWith("https://")) {
        img.onerror = function() {
          const link = document.createElement("a");
          link.href = src;
          link.textContent = "[图片加载失败: " + src + "]";
          link.target = "_blank";
          link.style.color = "var(--viewer-muted)";
          img.replaceWith(link);
        };
      } else if (src && !src.startsWith("/") && !src.startsWith("data:")) {
        img.setAttribute("src", resolveCourseAsset(src));
      }
    });
  }

  async function renderRemoteDiagram(container, lang, code) {
    const resp = await fetch("/api/render-diagram", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": TOKEN },
      body: JSON.stringify({ type: lang, source: code })
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data.error || "remote diagram render failed");
    }
    container.innerHTML = DOMPurify.sanitize(data.svg, {
      ADD_TAGS: ["svg", "path", "g", "circle", "ellipse", "line", "polyline", "polygon", "rect", "text", "tspan", "defs", "marker", "style", "title"],
      ADD_ATTR: ["viewBox", "d", "fill", "stroke", "transform", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "points", "font-size", "font-family", "text-anchor", "marker-end", "class", "style"]
    });
  }

  function resolveCourseAsset(src) {
    const file = STATE.current_content_file || "";
    const baseParts = file ? file.split("/") : [STATE.course_slug || ""];
    if (file) baseParts.pop();
    const parts = [];
    for (const part of baseParts.concat(src.split("/"))) {
      if (!part || part === ".") continue;
      if (part === "..") {
        if (parts.length > 1) parts.pop();
      } else {
        parts.push(part);
      }
    }
    return "/file/" + parts.map(encodeURIComponent).join("/");
  }

  function renderMathInElement(el) {
    el.querySelectorAll("code").forEach(code => {
      const text = code.textContent;
      if (text.startsWith("$$") && text.endsWith("$$")) {
        try {
          const html = katex.renderToString(text.slice(2, -2), { displayMode: true, throwOnError: false });
          const div = document.createElement("div");
          div.innerHTML = html;
          div.className = "math-display";
          code.parentElement.replaceWith(div);
        } catch(e) {}
      }
    });
  }

  function renderLearningOverview() {
    const current = STATE.current_module;
    const modules = STATE.modules || [];
    const completedPages = completedLearningPageKeys();
    const expectedPages = expectedLearningPages();
    const completedPageCount = expectedPages.filter(page => completedPages.has(pageKeyFromParts(page.module, page.section, page.content_file))).length;
    const learnableModules = modules.filter(mod => expectedPagesForModule(mod).length > 0);
    const completedModuleCount = learnableModules.filter(mod => {
      const expected = expectedPagesForModule(mod);
      return expected.length > 0 && expected.every(page => completedPages.has(pageKeyFromParts(page.module, page.section, page.content_file)));
    }).length;
    const el = document.getElementById("learning-overview");
    if (!current) {
      el.innerHTML = '<div class="viewer-muted">暂无学习进度</div>';
      return;
    }
    let html = '<div class="overview-metrics">';
    html += '<div class="overview-metric"><span class="value">' + completedModuleCount + "/" + learnableModules.length + '</span><span class="label">已学完章节</span></div>';
    html += '<div class="overview-metric"><span class="value">' + completedPageCount + "/" + expectedPages.length + '</span><span class="label">已学完知识点</span></div>';
    html += "</div>";
    el.innerHTML = html;
  }

  function renderReviewPanel() {
    const due = (STATE || {}).due_reviews || { total: 0, courses: [] };
    const el = document.getElementById("review-panel");
    if ((STATE || {}).review_check_error) {
      el.innerHTML = '<div class="error-box">复习检查失败: ' + escapeHtml(STATE.review_check_error) + "</div>";
      return;
    }
    if (due.total === 0) {
      el.innerHTML = '<div class="viewer-muted">当前课程暂无待复习项</div>';
      return;
    }
    let html = '<div><span class="viewer-soft-badge">' + due.total + '</span> 个知识点需要复习</div>' +
      '<div class="viewer-muted review-intro">先回想，再按真实感觉记录。</div>';
    for (const course of due.courses) {
      for (const item of course.items || []) {
        const rated = REVIEW_RATED.find(r => r.concept_id === item.id);
        if (rated) {
          html += '<div class="review-item">' +
            '<div class="review-name is-recorded">' + escapeHtml(item.name) + '</div>' +
            '<div class="viewer-muted"><span class="viewer-soft-badge is-success">已记录</span> ' + escapeHtml(ratingLabel(rated.rating)) +
            (rated.next_review ? ' · 下次 ' + escapeHtml(rated.next_review) : "") + '</div></div>';
        } else {
          html += '<div class="review-item" id="review-' + escapeAttr(item.id) + '">' +
            '<div class="review-name">' + escapeHtml(item.name) + '</div>' +
            (item.retrievability != null ? '<div class="viewer-muted review-strength">当前记忆强度约 ' + Math.round(item.retrievability * 100) + '%</div>' : "") +
            '<div class="layui-btn-container">' +
            '<button type="button" class="layui-btn layui-btn-primary layui-btn-xs" data-rating="1" onclick="rateReview(this, ' + escapeJsArgAttr(item.id) + ',1)">忘了</button>' +
            '<button type="button" class="layui-btn layui-btn-primary layui-btn-xs" data-rating="2" onclick="rateReview(this, ' + escapeJsArgAttr(item.id) + ',2)">一点</button>' +
            '<button type="button" class="layui-btn layui-btn-primary layui-btn-xs" data-rating="3" onclick="rateReview(this, ' + escapeJsArgAttr(item.id) + ',3)">大部分</button>' +
            '<button type="button" class="layui-btn layui-btn-primary layui-btn-xs" data-rating="4" onclick="rateReview(this, ' + escapeJsArgAttr(item.id) + ',4)">轻松</button>' +
            '</div>' +
            '<div class="review-feedback"></div></div>';
        }
      }
    }
    el.innerHTML = html;
  }

  window.rateReview = async function(button, conceptId, rating) {
    const container = document.getElementById("review-" + conceptId);
    if (!container) return;
    const feedback = container.querySelector(".review-feedback");
    const buttons = container.querySelectorAll("button[data-rating]");
    const oldText = button ? button.textContent : "";
    buttons.forEach(b => {
      b.disabled = true;
      b.classList.add("is-control-disabled");
    });
    if (button) {
      button.textContent = "保存中";
      button.classList.remove("layui-btn-primary");
      button.classList.remove("is-control-disabled");
    }
    feedback.style.display = "block";
    feedback.className = "review-feedback viewer-muted";
    feedback.textContent = "正在记录：" + ratingLabel(rating);
    try {
      const resp = await fetch("/api/review-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": TOKEN },
        body: JSON.stringify({ concept_id: conceptId, rating: rating })
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        const concept = data.concept || {};
        REVIEW_RATED.push({
          concept_id: conceptId,
          rating: rating,
          next_review: concept.next_review || ""
        });
        feedback.className = "review-feedback";
        feedback.textContent = "已记录：" + ratingLabel(rating) + (concept.next_review ? "，下次 " + concept.next_review : "");
        notify("复习记录已保存", "success");
        setTimeout(() => renderReviewPanel(), 900);
      } else {
        feedback.className = "review-feedback error-box";
        feedback.textContent = data.error || "记录失败";
        buttons.forEach(b => {
          b.disabled = false;
          b.classList.remove("is-control-disabled");
        });
        if (button) button.textContent = oldText;
      }
    } catch(e) {
      feedback.className = "review-feedback error-box";
      feedback.textContent = "网络错误: " + e.message;
      buttons.forEach(b => {
        b.disabled = false;
        b.classList.remove("is-control-disabled");
      });
      if (button) button.textContent = oldText;
    }
  };

  async function saveLearningRecord(event, payload) {
    const resp = await fetch("/api/learning-record", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": TOKEN },
      body: JSON.stringify({
        source: "study.skill.viewer",
        course_slug: STATE.course_slug,
        event: event,
        payload: payload
      })
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data.error || "学习记录保存失败");
    }
    if (data.record) STATE.learning_record = data.record;
    return data;
  }

  function currentPagePayload() {
    return {
      module: STATE.current_module,
      section: STATE.current_section || null,
      content_file: STATE.current_content_file || "",
      title: STATE.current_section_title || currentModuleLabel()
    };
  }

  function currentPageKey() {
    const page = currentPagePayload();
    return pageKeyFromParts(page.module, page.section, page.content_file);
  }

  function recordPageView() {
    if (!STATE || STATE.server_mode !== "interactive") return;
    const key = currentPageKey();
    if (!key || key === LAST_PAGE_KEY) return;
    LAST_PAGE_KEY = key;
    saveLearningRecord("page_view", currentPagePayload())
      .then(() => {
        renderNav();
        renderLearningOverview();
        maybeRecordPageCompletion();
      })
      .catch(e => notify(e.message, "error"));
  }

  function currentPageExerciseIds() {
    return Array.from(document.querySelectorAll("#content .study-block"))
      .map(block => block.getAttribute("data-study-id"))
      .filter(Boolean);
  }

  function submittedCurrentExerciseIds() {
    return EXERCISES
      .filter(item => item.module === STATE.current_module && (item.section || null) === (STATE.current_section || null))
      .map(item => String(item.id));
  }

  function allCurrentExercisesSubmitted() {
    const pageExerciseIds = currentPageExerciseIds();
    if (pageExerciseIds.length === 0) return true;
    const submitted = new Set(submittedCurrentExerciseIds().concat(
      CHECKPOINTS
        .filter(item => item.module === STATE.current_module && (item.section || null) === (STATE.current_section || null))
        .map(item => String(item.id))
    ));
    return pageExerciseIds.every(id => submitted.has(String(id)));
  }

  function currentPageRecorded() {
    const key = currentPageKey();
    return ((STATE.learning_record || {}).pages || []).some(page =>
      pageKeyFromParts(page.module, page.section, page.content_file) === key
    );
  }

  function isContentReadToEnd() {
    const content = document.getElementById("content");
    if (!content) return false;
    return content.scrollHeight <= content.clientHeight + 8 || content.scrollTop + content.clientHeight >= content.scrollHeight - 80;
  }

  function maybeRecordPageCompletion() {
    if (!STATE || STATE.server_mode !== "interactive") return;
    const key = currentPageKey();
    if (!key || COMPLETED_PAGE_KEYS.has(key)) return;
    if (!currentPageRecorded()) return;
    if (!isContentReadToEnd() || !allCurrentExercisesSubmitted()) return;
    COMPLETED_PAGE_KEYS.add(key);
    saveLearningRecord("completion", {
      module: STATE.current_module,
      section: STATE.current_section || null,
      content_file: STATE.current_content_file || "",
      started_at: SESSION_STARTED_AT,
      question_count: QUESTIONS.length,
      exercise_ids: submittedCurrentExerciseIds(),
      review_rated_count: REVIEW_RATED.length
    }).then(() => {
      renderNav();
      renderLearningOverview();
    }).catch(e => {
      COMPLETED_PAGE_KEYS.delete(key);
      notify(e.message, "error");
    });
  }

  function upsertById(list, id, record) {
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) {
      list[index] = record;
    } else {
      list.push(record);
    }
  }

  window.toggleAnswerPanel = function(btn) {
    const panel = btn.closest("[data-answer-panel]");
    if (!panel || !panel.classList.contains("is-unlocked")) return;
    const isOpen = panel.classList.toggle("is-open");
    btn.classList.toggle("is-open", isOpen);
  };

  window.saveExerciseAnswer = function(block) {
    const id = block.getAttribute("data-study-id");
    const type = block.getAttribute("data-study-type");
    const question = block.getAttribute("data-study-question");
    const answer = block.getAttribute("data-study-answer");
    const explanation = block.getAttribute("data-study-explanation") || "";
    const masteryTags = block.getAttribute("data-study-mastery-tags") || "";
    const result = block.querySelector(".assess-result");
    const userAnswer = readStudyAnswer(block);
    if (!userAnswer) {
      result.style.display = "block";
      result.className = "assess-result result-warning";
      result.textContent = "先写下答案，再保存";
      return;
    }
    upsertById(EXERCISES, id, {
      id: id,
      type: type,
      module: STATE.current_module,
      section: STATE.current_section || null,
      question: question,
      user_answer: userAnswer,
      reference_answer: answer,
      explanation: explanation,
      mastery_tags: masteryTags ? masteryTags.split(",").filter(Boolean) : [],
      time_spent_seconds: 0
    });
    const submittedExercise = EXERCISES.find(item => item.id === id);
    if (submittedExercise && STATE.server_mode === "interactive") {
      saveLearningRecord("exercise_submitted", {
        module: STATE.current_module,
        section: STATE.current_section || null,
        content_file: STATE.current_content_file || "",
        exercise: submittedExercise
      }).then(() => {
        maybeRecordPageCompletion();
      }).catch(e => {
        notify(e.message, "error");
      });
    }
    markStudyBlockSubmitted(block);
    rerenderLayui();
  };

  function markStudyBlockSubmitted(block) {
    block.setAttribute("data-answer-unlocked", "true");
    block.classList.add("is-submitted");
    block.querySelectorAll("input, textarea").forEach(input => {
      input.disabled = true;
    });
    const saveBtn = block.querySelector(".save-answer-btn");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "已提交";
      saveBtn.classList.add("layui-btn-disabled");
    }
    const answerPanel = block.querySelector("[data-answer-panel]");
    if (answerPanel) {
      answerPanel.classList.add("is-unlocked", "is-open");
      const toggle = answerPanel.querySelector(".answer-toggle");
      if (toggle) toggle.classList.add("is-open");
    }
    const result = block.querySelector(".assess-result");
    if (result) {
      result.style.display = "none";
      result.className = "assess-result";
      result.textContent = "";
    }
  }

  function readStudyAnswer(block) {
    const type = block.getAttribute("data-study-type");
    if (type === "choice") {
      const selected = Array.from(block.querySelectorAll("input[type='checkbox']:checked, input[type='radio']:checked"));
      return selected.map(input => input.value).join(", ");
    }
    if (type === "truefalse") {
      const selected = block.querySelector("input[type='radio']:checked");
      return selected ? (selected.value === "true" ? "正确" : "错误") : "";
    }
    const field = block.querySelector(".exercise-answer");
    return field ? field.value.trim() : "";
  }

  window.submitCheckpoint = function(block) {
    const id = block.getAttribute("data-study-id");
    const total = parseInt(block.getAttribute("data-study-total") || "0");
    const minPass = parseInt(block.getAttribute("data-study-min-pass") || "0");
    const result = block.querySelector(".assess-result");
    upsertById(CHECKPOINTS, id, {
      id: id,
      module: STATE.current_module,
      section: STATE.current_section || null,
      items_total: total,
      min_pass: minPass
    });
    const checkpoint = CHECKPOINTS.find(item => item.id === id);
    if (checkpoint && STATE.server_mode === "interactive") {
      saveLearningRecord("legacy_checkpoint_submitted", {
        module: STATE.current_module,
        section: STATE.current_section || null,
        content_file: STATE.current_content_file || "",
        checkpoint: checkpoint
      }).catch(e => {
        notify(e.message, "error");
      });
    }
    result.style.display = "none";
    result.className = "assess-result";
    result.textContent = "";
    block.querySelectorAll(".checkpoint-assess button").forEach(b => b.disabled = true);
    maybeRecordPageCompletion();
  };

  window.toggleHint = function(btn, index) {
    const container = btn.parentElement.querySelector(".hints-container");
    container.style.display = "block";
    const hint = container.querySelector('[data-hint="' + index + '"]');
    hint.style.display = hint.style.display === "none" ? "block" : "none";
  };

  window.switchModule = function(moduleId) {
    EXPANDED_MODULES.add(moduleId);
    fetch("/api/initial-state?token=" + encodeURIComponent(TOKEN) + "&module=" + encodeURIComponent(moduleId) + "&section=")
      .then(async r => {
        const state = await r.json();
        if (!r.ok) throw new Error(state.error || "切换模块失败");
        return state;
      })
      .then(state => {
        STATE = state;
        document.getElementById("content").scrollTop = 0;
        renderAll();
      })
      .catch(e => showError("切换模块失败: " + e.message));
  };

  window.switchSection = function(moduleId, sectionId) {
    EXPANDED_MODULES.add(moduleId);
    fetch("/api/initial-state?token=" + encodeURIComponent(TOKEN) +
      "&module=" + encodeURIComponent(moduleId) +
      "&section=" + encodeURIComponent(sectionId))
      .then(async r => {
        const state = await r.json();
        if (!r.ok) throw new Error(state.error || "切换小节失败");
        return state;
      })
      .then(state => {
        STATE = state;
        document.getElementById("content").scrollTop = 0;
        renderAll();
      })
      .catch(e => showError("切换小节失败: " + e.message));
  };

  window.showLockedModule = function() {
    notify("这个章节还未解锁，先完成前置章节。", "error");
  };

  window.toggleTheme = function() {
    isDark = !isDark;
    document.documentElement.classList.toggle("dark", isDark);
    updateThemeBtn();
    updateThemeAssets();
    mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default", securityLevel: "strict" });
    if (STATE) renderContent(STATE.current_content || STATE.readme || "");
  };

  function updateThemeAssets() {
    const link = document.getElementById("hljs-theme");
    link.href = isDark
      ? "https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css"
      : "https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css";
  }

  function updateThemeBtn() {
    document.getElementById("theme-btn").textContent = isDark ? "浅色" : "深色";
  }

  window.addQuestion = function() {
    const input = document.getElementById("question-input");
    const q = input.value.trim();
    if (!q) return;
    QUESTIONS.push(q);
    input.value = "";
    renderQuestions();
    persistQuestions();
  };

  function setupTextSelection() {
    const content = document.getElementById("content");
    let floatBtn = null;
    content.addEventListener("mouseup", function(e) {
      if (floatBtn) { floatBtn.remove(); floatBtn = null; }
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (text.length < 2) return;
      floatBtn = document.createElement("button");
      floatBtn.type = "button";
      floatBtn.className = "layui-btn layui-btn-xs text-select-btn";
      floatBtn.textContent = "问这个";
      floatBtn.style.left = (e.clientX - 40) + "px";
      floatBtn.style.top = (e.clientY - 36) + "px";
      floatBtn.onclick = function() {
        const snippet = text.length > 100 ? text.slice(0, 100) + "..." : text;
        const input = document.getElementById("question-input");
        input.value = "关于「" + snippet + "」：";
        input.focus();
        floatBtn.remove();
        floatBtn = null;
        window.getSelection().removeAllRanges();
      };
      document.body.appendChild(floatBtn);
      setTimeout(() => { if (floatBtn) { floatBtn.remove(); floatBtn = null; } }, 5000);
    });
    document.addEventListener("mousedown", function(e) {
      if (floatBtn && !floatBtn.contains(e.target)) {
        floatBtn.remove();
        floatBtn = null;
      }
    });
  }

  function renderQuestions() {
    const el = document.getElementById("question-list");
    if (QUESTIONS.length === 0) {
      el.innerHTML = '<div class="viewer-muted">暂无问题</div>';
      return;
    }
    let html = "";
    QUESTIONS.forEach((q, i) => {
      html += '<div class="question-row"><span>' +
        escapeHtml(q) + '</span><button type="button" class="layui-btn layui-btn-primary layui-btn-xs" onclick="removeQuestion(' + i + ')">删除</button></div>';
    });
    el.innerHTML = html;
  }

  window.removeQuestion = function(index) {
    QUESTIONS.splice(index, 1);
    renderQuestions();
    persistQuestions();
  };

  function persistQuestions() {
    if (!STATE || STATE.server_mode !== "interactive") return;
    saveLearningRecord("questions_snapshot", {
      module: STATE.current_module,
      section: STATE.current_section || null,
      content_file: STATE.current_content_file || "",
      questions: QUESTIONS.slice()
    }).catch(e => notify(e.message, "error"));
  }

  document.addEventListener("DOMContentLoaded", function() {
    init();
    renderQuestions();
    setupNavToggle();
    setupTextSelection();
    document.getElementById("content").addEventListener("scroll", maybeRecordPageCompletion, { passive: true });
  });

})();
