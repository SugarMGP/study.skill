# 数据模型 Schema

> schema_version: 3

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
│           └── domain-tree.json      # 技能树与 RPG 进度
└── courses/
    └── {course-slug}/                # 课程内容（学习资料）
```

---

## profile.json（全局偏好）

```json
{
  "schema_version": 3,
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

`learner_profile` 只保存用户明确给出的事实或从材料中能直接确认的信息。
不清楚就保持空值，不要脑补。

---

## meta.json（课程元数据）

```json
{
  "schema_version": 3,
  "slug": "react-hooks",
  "name": "React Hooks 从零到一",
  "status": "active",
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
| status | enum | ✅ | "active" | active/paused/completed/archived | 课程状态 |
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

---

## params.json（自适应参数）

```json
{
  "schema_version": 3,
  "mode": "system",
  "mode_label": "系统精讲",
  "depth_chars_per_module": 6000,
  "exercises_per_module": 5,
  "target_retention": 0.90,
  "new_items_per_session": 5,
  "spacing_factor": 1.0,
  "speed_factor": 1.0,
  "auto_advance": false,
  "require_mastery_before_advance": true,
  "last_speed_feedback": null,
  "last_speed_feedback_at": null,
  "adaptive_history": []
}
```

| 字段 | 类型 | 必填 | 默认值 | 范围 | 说明 |
|------|------|:---:|--------|------|------|
| mode | enum | ✅ | — | speedrun/system/interview/exam | 学习模式 |
| mode_label | string | ✅ | — | — | 模式显示名（可按课程语言写） |
| depth_chars_per_module | int | ✅ | 6000 | [500, 9000] | 每模块目标正文规模；课程生成以正文规模和结构覆盖为主，时间只作粗参考 |
| exercises_per_module | int | ✅ | 5 | [0, 10] | 每模块练习题数 |
| target_retention | float | ✅ | 0.90 | [0.70, 0.98] | 目标记忆保持率 |
| new_items_per_session | int | ✅ | 5 | [1, 20] | 每次会话新知识点数 |
| spacing_factor | float | ✅ | 1.0 | [0.3, 3.0] | 复习间隔乘数 |
| speed_factor | float | ✅ | 1.0 | [0.5, 2.0] | 教学速度乘数 |
| auto_advance | bool | ✅ | false | — | 掌握后自动进入下一模块 |
| require_mastery_before_advance | bool | ✅ | true | — | 必须通过掌握度检查才前进 |
| last_speed_feedback | enum | — | null | too_fast/too_slow/just_right/null | 最近一次速度反馈 |
| last_speed_feedback_at | ISO 8601 | — | null | — | 反馈时间 |
| adaptive_history | array | ✅ | [] | — | 参数调整历史记录 |

**模式默认值：**

| 模式 | depth_chars | exercises | target_retention | auto_advance | require_mastery |
|------|------------|-----------|-----------------|-------------|----------------|
| speedrun | 2400 | 2 | 0.85 | true | false |
| system | 6000 | 5 | 0.90 | false | true |
| interview | 2600 | 3 | 0.90 | true | false |
| exam | 4000 | 5 | 0.90 | false | true |

**自适应调整规则：**

| 用户反馈 | 调整 |
|---------|------|
| 太快了/跟不上 | speed_factor *= 0.7, new_items -= 2 (min 1), spacing_factor *= 0.9 |
| 太慢了/太墨迹 | speed_factor *= 1.3, new_items += 2, spacing_factor *= 1.1 |
| 太浅了 | depth_chars_per_module *= 1.5 (cap 9000) |
| 太深了/听不懂 | depth_chars_per_module *= 0.7 (floor 500) |

每次调整后写入 `adaptive_history` 数组：
```json
{
  "at": "2026-06-09T14:30:00+08:00",
  "trigger": "too_fast",
  "before": {"speed_factor": 1.0, "new_items_per_session": 5},
  "after": {"speed_factor": 0.7, "new_items_per_session": 3}
}
```

---

## concepts.json（知识点状态）

```json
{
  "schema_version": 3,
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

默认生成。结构参考 `references/skill-tree.md`。当 `meta.json.skill_tree_enabled=false`
时可以不展示、不更新；当 `meta.json.rpg_enabled=false` 时保留普通进度，但不展示
等级、XP、称号、成就、任务等娱乐元素。

```json
{
  "schema_version": 3,
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

## 并发写入规则

1. **写前重读**：每次写入前，先读取当前文件内容
2. **临时文件**：写入 `{filename}.tmp`
3. **原子替换**：rename `.tmp` → 原文件名
4. **备份保留**：rename 原文件 → `{filename}.bak`（保留最近一次）

推荐使用仓库脚本执行写入：

```bash
python scripts/write-state.py <state-file.json> < <new-content.json>
```

Windows PowerShell 写包含中文的 JSON 时，优先写入 UTF-8 临时文件，再用
`--input-file` 读取，避免管道编码问题：

```powershell
python .\scripts\write-state.py <state-file.json> --input-file <new-content.json>
```

不要把包含中文的 JSON 直接通过 PowerShell 管道传给 Python。写入失败时保留
真实失败状态，不要伪造成功。

复习评分更新优先使用专用脚本：

```bash
python scripts/record-review.py <course-state-dir> <concept-id> <rating>
```

`<course-state-dir>` 是 `.learning-profile/courses/{course-slug}` 这一层目录；
`<rating>` 取值为 1、2、3、4，分别对应“完全忘了、记得一点、记得大部分、轻松想起”。

```bash
# 示例原子写入
cp <state-file.json> <state-file.json>.bak
# ... 在内存中更新数据 ...
echo "$new_content" > <state-file.json>.tmp
mv <state-file.json>.tmp <state-file.json>
```

---

## 文件损坏处理

当 JSON 解析失败时，停止当前写入并保留原文件。不要静默覆盖、重建或伪造状态。
需要恢复时，由 agent 根据 `.bak` 和当前文件内容单独处理。

---

## 日期格式规范

所有日期字段使用 ISO 8601 格式：
```
2026-06-09T14:30:00+08:00    # 带时区
2026-06-09T14:30:00Z          # UTC
2026-06-09                    # 仅日期（用于 next_review）
```

`next_review` 字段可以只用日期（无需精确到时间）。
其他时间戳建议带时区。
