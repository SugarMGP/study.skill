# 数据模型 Schema

> schema_version: 5

## 目录结构

```
{learning_root}/
├── .learning-profile/
│   ├── profile.json                  # 全局偏好
│   └── courses/
│       └── {course-slug}/
│           ├── meta.json             # 课程元数据
│           ├── params.json           # 自适应参数
│           ├── concepts.json         # 知识点状态
│           ├── domain-tree.json      # 技能树与 RPG 进度
│           └── learning-record.json  # 播放器浏览、作答和完成证据
└── courses/
    └── {course-slug}/                # 课程内容（学习资料）
```

---

## profile.json（全局偏好）

```json
{
  "schema_version": 5,
  "learner_id": "default",
  "created_at": "2026-06-09T10:00:00+08:00",
  "updated_at": "2026-06-09T10:00:00+08:00",
  "preferences": {
    "native_language": "zh",
    "daily_time_budget_minutes": 30,
    "feedback_style": "normal",
    "correction_mode": "inline"
  },
  "learner_profile": {
    "baseline": null,
    "goals": [],
    "known_languages": [],
    "weak_prereqs": [],
    "analogy_preferences": [],
    "teaching_constraints": [],
    "materials_summary": null,
    "updated_at": null
  }
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:---:|--------|------|
| learner_id | string | ✅ | "default" | 学习者标识 |
| created_at | ISO 8601 | ✅ | 初始化时间 | 创建时间 |
| updated_at | ISO 8601 | ✅ | 初始化时间 | 最后更新 |
| preferences.native_language | string | ✅ | "zh" | 母语 |
| preferences.daily_time_budget_minutes | int | ✅ | 30 | 每日学习时长（分钟） |
| preferences.feedback_style | enum | ✅ | "normal" | `minimal` / `normal` / `detailed` |
| preferences.correction_mode | enum | ✅ | "inline" | `inline`（即时纠错）/ `batch`（会话末纠错） |
| learner_profile.baseline | string/null | — | null | 学习基础画像，例如“有后端经验” |
| learner_profile.goals | string[] | ✅ | [] | 长期学习目标 |
| learner_profile.known_languages | string[] | ✅ | [] | 已掌握语言或工具，例如 `cpp`、`go`、`java` |
| learner_profile.weak_prereqs | string[] | ✅ | [] | 薄弱前置知识，例如 `python` |
| learner_profile.analogy_preferences | string[] | ✅ | [] | 类比偏好，例如 `backend`、`systems` |
| learner_profile.teaching_constraints | string[] | ✅ | [] | 教学约束，例如“不把 Python 放进主线” |
| learner_profile.materials_summary | string/null | — | null | 用户提供材料的摘要 |
| learner_profile.updated_at | ISO 8601/null | — | null | 学习者画像最后更新时间 |

`learner_profile` 只保存用户明确给出的事实或从材料中能直接确认的信息。不清楚就保持空值，不要脑补。

---

## meta.json（课程元数据）

```json
{
  "schema_version": 5,
  "slug": "react-hooks",
  "name": "React Hooks 从零到一",
  "status": "active",
  "generation_status": "generating",
  "mode": "system",
  "mode_label": "系统精讲",
  "current_module": "03-useContext",
  "completed_modules": ["01-useState", "02-useEffect"],
  "last_session": "2026-06-09T14:30:00+08:00",
  "total_sessions": 5,
  "streak_days": 3,
  "skill_tree_enabled": true,
  "rpg_enabled": true,
  "rpg_preference_asked": false,
  "storage_path": "/home/user/learning/courses/react-hooks",
  "created_at": "2026-06-01T10:00:00+08:00"
}
```

| 字段 | 类型 | 必填 | 默认值 | 范围 | 说明 |
|------|------|:---:|--------|------|------|
| slug | string | ✅ | — | — | 课程标识（目录名） |
| name | string | ✅ | — | — | 课程显示名称 |
| status | enum | ✅ | "active" | active/paused/completed/archived | 课程学习状态 |
| generation_status | enum | ✅ | "generating" | generating/pending_review/complete | 课程生成状态。agent 必须在对应阶段同步更新此字段 |
| mode | enum | ✅ | — | speedrun/system/interview/exam | 学习模式 |
| mode_label | string | ✅ | — | — | 模式显示名（用于展示，可按课程语言写） |
| current_module | string | — | null | — | 当前正在学习的模块 |
| completed_modules | string[] | ✅ | [] | — | 已完成模块列表 |
| last_session | ISO 8601 | — | null | — | 最后学习时间 |
| total_sessions | int | ✅ | 0 | ≥0 | 总学习会话数 |
| streak_days | int | ✅ | 0 | ≥0 | 连续学习天数 |
| skill_tree_enabled | bool | ✅ | true | — | 是否启用技能树/学习地图 |
| rpg_enabled | bool | ✅ | true | — | 是否启用等级、XP、称号、成就、任务等轻量游戏化元素 |
| rpg_preference_asked | bool | ✅ | false | — | 是否已经询问过用户要不要保留游戏化元素 |
| storage_path | string | ✅ | — | — | 课程内容存储路径 |
| created_at | ISO 8601 | ✅ | 初始化时间 | — | 课程创建时间 |

**status 枚举说明：**
- `active`：正在进行，参与复习调度和每日快报
- `paused`：暂停学习，不参与复习调度，保留进度
- `completed`：已完成全部模块，复习项仍在调度中
- `archived`：已归档，不参与任何调度

**generation_status 枚举说明（⛔ BLOCKING）：**
- `generating`：课程初始化后（Phase 0 确认路线），写入此状态。表示模块正在生成中。
- `pending_review`：所有模块已写入，但阻塞审查尚未通过。**此状态下禁止声称课程已完成，禁止进入 Phase 3 正式学习。** 上下文压缩后 agent 读取到此状态即知审查未完成。
- `complete`：阻塞审查全部 13 项通过，课程生成完成。**只有在此状态下才能进入 Phase 3 学习。**

状态流转：`generating` → `pending_review` → `complete`

Agent 必须在以下时机通过 `write-state.py` 写入状态变更：
- Phase 0 路线确认后 → 初始化为 `generating`
- 全部模块生成完 → 写入 `pending_review`
- 阻塞审查通过 → 写入 `complete`

---

## params.json（自适应参数）

```json
{
  "schema_version": 5,
  "target_retention": 0.90,
  "spacing_factor": 1.0,
  "require_mastery_before_advance": true,
  "last_pace_feedback": null,
  "last_pace_feedback_at": null,
  "adaptive_history": []
}
```

| 字段 | 类型 | 必填 | 默认值 | 范围 | 说明 |
|------|------|:---:|--------|------|------|
| target_retention | float | ✅ | 0.90 | [0.70, 0.98] | 目标记忆保持率 |
| spacing_factor | float | ✅ | 1.0 | [0.3, 3.0] | 复习间隔乘数 |
| require_mastery_before_advance | bool | ✅ | true | — | 必须通过掌握度检查才前进 |
| last_pace_feedback | enum/string | — | null | — | 最近一次节奏或深度反馈，例如 too_fast/too_slow/too_shallow/too_deep |
| last_pace_feedback_at | ISO 8601 | — | null | — | 反馈时间 |
| adaptive_history | array | ✅ | [] | — | 节奏/深度反馈历史记录 |

`params.json` 只保存运行期会被脚本或学习流程消费的参数。课程模式、显示名和已确认路线放在 `meta.json` 与课程文件中；课程规模、正文长度和题量是 `phase-0-anchoring.md` / `phase-2-generation.md` 的生成规则，不再持久化到 `params.json`。

**模式默认值：**

| 模式 | target_retention | require_mastery |
|------|------------------|----------------|
| speedrun | 0.85 | false |
| system | 0.90 | true |
| interview | 0.90 | false |
| exam | 0.90 | true |

每次节奏或深度反馈后写入 `adaptive_history` 数组：
```json
{
  "at": "2026-06-09T14:30:00+08:00",
  "trigger": "too_fast",
  "note": "下节拆小概念，先补前置，再给更多引导题"
}
```

---

## concepts.json（知识点状态）

```json
{
  "schema_version": 5,
  "course_slug": "react-hooks",
  "last_review_session": "2026-06-09T14:30:00+08:00",
  "concepts": [
    {
      "id": "useState-basics",
      "name": "useState 基础用法",
      "module": "01-useState",
      "status": "learning",
      "D": 4.2,
      "S": 12.5,
      "last_review": "2026-06-08T10:00:00+08:00",
      "next_review": "2026-06-20T10:00:00+08:00",
      "reviews": 3,
      "lapses": 0,
      "first_seen": "2026-06-01T10:00:00+08:00",
      "question": "useState 返回什么？",
      "answer": "返回 [state, setState] 数组，setState 触发重新渲染"
    }
  ]
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:---:|--------|------|
| course_slug | string | ✅ | — | 所属课程标识 |
| last_review_session | ISO 8601 | — | null | 最后一次复习会话时间 |
| concepts[].id | string | ✅ | — | 知识点唯一标识 |
| concepts[].name | string | ✅ | — | 知识点名称（按课程语言写） |
| concepts[].module | string | ✅ | — | 所属模块 ID |
| concepts[].status | enum | ✅ | "learning" | learning/mastered/needs_relearning/retired |
| concepts[].D | float | ✅ | 4.0 | 难度 [1, 10] |
| concepts[].S | float | ✅ | 1.0 | 稳定性（天），S 越大记忆越持久 |
| concepts[].last_review | ISO 8601 | — | null | 最后复习时间 |
| concepts[].next_review | ISO 8601 | — | null | 下次计划复习时间 |
| concepts[].reviews | int | ✅ | 0 | 总复习次数 |
| concepts[].lapses | int | ✅ | 0 | 遗忘次数（评分 1-2） |
| concepts[].first_seen | ISO 8601 | ✅ | — | 首次学习时间 |
| concepts[].question | string | ✅ | — | 复习提问内容 |
| concepts[].answer | string | ✅ | — | 参考答案 |

**status 枚举说明：**
- `learning`：正在学习或复习中，参与复习调度
- `mastered`：连续多次正确回忆，降低复习频率
- `needs_relearning`：已遗忘（R < 0.7 且 lapses ≥ 3），需要重新教学
- `retired`：不再相关（如模块被移除），不参与调度

**注意：** `target_retention` 不在 concepts.json 中。以 `params.json.target_retention` 为准，避免两处冲突。

---

## domain-tree.json（技能树）

默认生成。结构参考 `references/skill-tree.md`。当 `meta.json.skill_tree_enabled=false` 时可以不展示、不更新；当 `meta.json.rpg_enabled=false` 时保留普通进度，但不展示等级、XP、称号、成就、任务等娱乐元素。

如果课程存在 `99-content-supplements/`，`domain-tree.json.nodes` 中的 `99-content-supplements` 必须保持 `available` 或 `unlockable`，不能写成 `locked`。它不属于主线 prerequisite chain（先修链），也不阻塞课程完成。

```json
{
  "schema_version": 5,
  "course_slug": "llm-app-dev",
  "domain": "大模型应用开发",
  "enabled": true,
  "rpg": {
    "enabled": true,
    "level": 1,
    "xp": 0,
    "title": "学徒",
    "achievements": [],
    "quests": []
  },
  "nodes": {
    "llm-basics": {"status": "mastered", "progress": 100},
    "prompt-eng": {"status": "in_progress", "progress": 60},
    "lowcode": {"status": "available", "progress": 0},
    "framework": {"status": "locked", "progress": 0}
  }
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:---:|--------|------|
| course_slug | string | ✅ | — | 所属课程标识 |
| domain | string | ✅ | — | 技能树所属领域或课程名 |
| enabled | bool | ✅ | true | 是否启用技能树；与 `meta.json.skill_tree_enabled` 同步 |
| rpg.enabled | bool | ✅ | true | 是否启用 RPG 展示；与 `meta.json.rpg_enabled` 同步 |
| rpg.level | int | ✅ | 1 | 当前等级 |
| rpg.xp | int | ✅ | 0 | 当前经验值 |
| rpg.title | string | ✅ | "学徒" | 当前称号 |
| rpg.achievements | string[] | ✅ | [] | 已获得成就 |
| rpg.quests | array | ✅ | [] | 当前任务 |
| nodes | object | ✅ | {} | 技能节点，key 为节点 ID |

---

## learning-record.json（课程级学习记录）

由本地播放器写入。它记录学习者实际看过哪些页面、提交了哪些题、留下哪些问题，以及学习者点击“完成本次学习”后产生的页面完成事件。它不是掌握度结论；agent 必须读取记录、判断证据，再更新 `meta.json`、`domain-tree.json`、`concepts.json` 或 XP。

```json
{
  "schema_version": 5,
  "source": "study.skill.viewer",
  "course_slug": "react-hooks",
  "created_at": "2026-06-09T10:00:00+08:00",
  "updated_at": "2026-06-09T14:30:00+08:00",
  "current": {
    "module": "03-useContext",
    "section": "01-provider",
    "content_file": "react-hooks/03-useContext/01-provider/content.md",
    "updated_at": "2026-06-09T14:30:00+08:00"
  },
  "pages": [
    {
      "module": "03-useContext",
      "section": "01-provider",
      "content_file": "react-hooks/03-useContext/01-provider/content.md",
      "title": "Provider 是怎么把值传下去的",
      "first_opened_at": "2026-06-09T14:10:00+08:00",
      "last_opened_at": "2026-06-09T14:25:00+08:00",
      "opens": 2,
      "completed_at": "2026-06-09T14:30:00+08:00"
    }
  ],
  "questions_for_llm": ["为什么 Provider 改值会让子组件更新？"],
  "exercises": [
    {
      "id": "provider-flow-1",
      "type": "choice",
      "module": "03-useContext",
      "section": "01-provider",
      "question": "Context 的值从哪里读？",
      "user_answer": "B",
      "reference_answer": "B",
      "explanation": "消费者组件读取最近的 Provider value。",
      "mastery_tags": ["recall"],
      "submitted_at": "2026-06-09T14:28:00+08:00"
    }
  ],
  "review_summary": {
    "rated_count": 1,
    "items": [
      {
        "concept_id": "useState-basics",
        "rating": 3,
        "next_review": "2026-06-12",
        "rated_at": "2026-06-09T14:20:00+08:00"
      }
    ]
  },
  "legacy_checkpoints": [],
  "completions": [
    {
      "module": "03-useContext",
      "section": "01-provider",
      "content_file": "react-hooks/03-useContext/01-provider/content.md",
      "started_at": "2026-06-09T14:10:00+08:00",
      "completed_at": "2026-06-09T14:30:00+08:00",
      "question_count": 1,
      "exercise_ids": ["provider-flow-1"],
      "review_rated_count": 1
    }
  ]
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:---:|--------|------|
| source | string | ✅ | study.skill.viewer | 记录来源 |
| course_slug | string | ✅ | — | 所属课程标识 |
| current | object | ✅ | 空位置 | 播放器最后停留位置 |
| pages | array | ✅ | [] | 浏览过的模块/小节页面 |
| questions_for_llm | string[] | ✅ | [] | 学习者留下的问题；agent 回答后必须删除已回答项 |
| exercises | array | ✅ | [] | `study-*` 题目的原始作答证据 |
| review_summary | object | ✅ | 空摘要 | 当前课程复习评分摘要；评分已经写入 `concepts.json` |
| legacy_checkpoints | array | ✅ | [] | 旧版 `study-checkpoint` 兼容记录 |
| completions | array | ✅ | [] | 学习者点击“完成本次学习”后记录的页面完成事件 |

`exercises` 只保存原始作答、参考内容和 `mastery_tags`。不要保存 `correct`、`passed`、`score` 这类终态字段；判断职责在 agent。

`questions_for_llm` 是待处理队列，不是历史问答记录。agent 从这里读取并回答问题后，必须通过 `write-state.py` 写回更新后的 `learning-record.json`，删除已回答项；全部回答完就写成 `[]`。不要为了保留历史而让已回答问题继续留在队列里。

---

## 并发写入规则

1. **写前重读**：每次写入前，先读取当前文件内容
2. **临时文件**：写入 `{filename}.tmp`
3. **原子替换**：rename `.tmp` → 原文件名
4. **备份保留**：rename 原文件 → `{filename}.bak`（保留最近一次）

推荐使用仓库脚本执行写入：

```bash
python {skill_dir}/scripts/write-state.py <state-file.json> < <new-content.json>
```

Windows PowerShell 写包含中文的 JSON 时，优先写入 UTF-8 临时文件，再用 `--input-file` 读取，避免管道编码问题：

```powershell
python {skill_dir}\scripts\write-state.py <state-file.json> --input-file <new-content.json>
```

不要把包含中文的 JSON 直接通过 PowerShell 管道传给 Python。写入失败时保留真实失败状态，不要伪造成功。

复习评分更新优先使用专用脚本：

```bash
python {skill_dir}/scripts/record-review.py <course-state-dir> <concept-id> <rating>
```

`<course-state-dir>` 是 `.learning-profile/courses/{course-slug}` 这一层目录； `<rating>` 取值为 1、2、3、4，分别对应“完全忘了、记得一点、记得大部分、轻松想起”。

```bash
# 示例原子写入
cp <state-file.json> <state-file.json>.bak
# ... 在内存中更新数据 ...
echo "$new_content" > <state-file.json>.tmp
mv <state-file.json>.tmp <state-file.json>
```

---

## 文件损坏处理

当 JSON 解析失败时，停止当前写入并保留原文件。不要静默覆盖、重建或伪造状态。需要恢复时，由 agent 根据 `.bak` 和当前文件内容单独处理。

---

## 日期格式规范

所有日期字段使用 ISO 8601 格式：
```
2026-06-09T14:30:00+08:00    # 带时区
2026-06-09T14:30:00Z          # UTC
2026-06-09                    # 仅日期（用于 next_review）
```

`next_review` 字段可以只用日期（无需精确到时间）。其他时间戳建议带时区。
