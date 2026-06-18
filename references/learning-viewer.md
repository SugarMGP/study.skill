# 本地课程播放器

已生成课程后，本地课程播放器是默认学习入口。播放器能打开时，先让学习者在播放器里阅读、提交练习；播放器会在学习进度变化时自动保存浏览、作答和页面完成记录。聊天只负责交接、答疑、会后反馈和正式状态写入。

只有播放器无法启动、必需文件缺失，或用户明确拒绝打开播放器时，才退回聊天教学。退回时必须说明具体原因，并继续读取当前模块或小节的 `content.md`，不能重新调研或凭记忆复述课程。

不要在播放器成功打开后，把当前章节再完整讲一遍。那会让学习者同时面对两条学习路径：播放器里的课程和聊天里的课程。正确做法是给 URL、说明当前章节、让学习者在播放器里阅读并提交练习，然后回来让 agent 判断作答和更新进度。

## 启动命令

```bash
python {skill_dir}/viewer/server.py \
  --course {course_slug} \
  --learning-root {learning_root} \
  --mode {interactive|read-only} \
  [--module {module_id}] \
  [--section {section_id}] \
  [--port {port}]
```

默认使用 `--mode interactive`（完整学习模式）。不要省略 `--mode`，也不要默认用`read-only`。不要猜 `{learning_root}`；路径不明确时先询问用户或读取已知状态。

## 模式

| 模式 | 适用场景 | 状态写入 |
|------|----------|----------|
| interactive | 默认；正式学习、复习、保存作答和问题 | 写课程级学习记录；正式进度由你判断后写入 |
| read-only | 仅当用户明确说“只浏览/只看课件，不记录” | 不写入学习记录 |

interactive 模式使用 skill 自带的 `scripts/check-reviews.py` 和
`scripts/record-review.py`。运行期脚本不复制到 `.learning-profile/`；手动命令、
复习检查和播放器都直接调用当前 skill 目录下的脚本。脚本缺失时保留真实失败，
先修复 skill 安装，不要降级成伪造的复习结果。

## 页面能做什么

- 查看课程目录、当前章节、可展开小节、技能树和学习状态。
- 渲染 Markdown、代码块、图片、公式和常用文本图表。
- 自动记录看过的章节/小节、已读完页面和待问问题。
- 给当前课程的到期复习项打 1-4 分；这个评分只用于复习调度。
- 保存选择题、判断题和开放作答题的原始作答。
- 题目必须先提交作答，之后才自动展开参考答案或解析。

右侧“本课程待复习”只是播放器里的会话工具，方便学习者主动处理当前课程到期项；
agent 是否在开场主动提醒，仍以 `phase-3-learning.md` 和 `phase-4-consolidation.md`
的“每天第一次正式学习开始时检查一次”为准。

页面不能判断练习对错，不能标记模块 mastered（已掌握），不能更新技能树 mastered，也不能发放 XP。

## 课程文件可用语法

生成课程时优先使用这些语法，播放器会直接展示：

| 内容 | 写法 | 备注 |
|------|------|------|
| 普通正文 | Markdown | 面向用户，不写内部设计说明 |
| 本地图片 | `![说明](images/a.png)` | 相对路径按当前 `content.md` 所在目录解析 |
| 外部图片 | `![说明](https://...)` | 可以直接加载；失败时显示原链接 |
| 流程/时序/状态图 | ` ```mermaid ` | 默认图表格式 |
| UML 图 | ` ```plantuml ` 或 ` ```puml ` | 类图、组件图、部署图、时序图 |
| 依赖图/DAG | ` ```graphviz ` 或 ` ```dot ` | 知识依赖、图算法、系统依赖 |
| 架构关系图 | ` ```d2 ` | 服务关系、模块关系 |
| 数据图 | ` ```vega-lite ` | 小型统计图、趋势、分布 |
| 可保存练习 | `study-choice` / `study-truefalse` / `study-input` | 只保存原始作答，交给 LLM 判断；旧版 `study-recall` / `study-transfer` / `study-feynman` / `study-checkpoint` 仅兼容历史课程 |

课件生成时的图片、图表和练习块选择规则以 `courseware-format.md` 为准。
播放器这里只说明能渲染和能保存什么。不要把设计目的、技术选型、内部字段说明写进用户能看到的课件。
章节前言可以列出小节名称和学习顺序，但不要写到子小节文件的 Markdown
超链接；播放器不会把这些链接当作课程导航，正式导航来自左侧目录树。

新课程可以使用层级目录：

```text
01-{module}/content.md                  # 章节前言
01-{module}/01-{section}/content.md     # 小节正文
01-{module}/02-{section}/content.md
```

点击章节时显示章节前言；点击展开的小节时显示对应小节正文。旧课程如果只有
`01-{module}/content.md`，播放器仍按整章内容显示。

PlantUML、Graphviz、D2、Vega-Lite 等非 Mermaid 图表通过 Kroki（文本图表渲染服务）
渲染为 SVG；如果网络不可用，页面会显示真实错误。不要因此伪造图片已渲染成功。

## 学习记录

interactive 模式下，页面会把浏览、作答、复习评分摘要和页面完成事件合并写入当前课程的学习记录：

```text
{learning_root}/.learning-profile/courses/{course_slug}/learning-record.json
```

关键字段：

| 字段 | 说明 |
|------|------|
| source | 固定为 `study.skill.viewer`，用于识别记录来源 |
| course_slug | 课程目录名 |
| current | 播放器最后停留的模块、小节和内容文件 |
| pages | 用户看过哪些章节/小节、打开次数、最后打开时间和自动完成时间 |
| questions_for_llm | 当前待问问题列表 |
| review_summary | 复习评分摘要；评分本身已通过 record-review.py 写入 concepts.json |
| exercises | 选择题、判断题和开放作答题的原始作答 |
| legacy_checkpoints | 旧版 `study-checkpoint` 兼容记录；新课程不用 |
| completions | 播放器自动记录的页面完成历史事件 |

练习一律由教学 agent 判断。不要为这个固定行为新增
`judgement_policy`、`requires_llm_judgement` 之类的策略字段；也禁止在
`exercises`、`legacy_checkpoints` 里保存 `correct`、
`passed`、`self_assessed` 这类自评终态。

字段消费路径：

| 字段 | 怎么用 |
|------|--------|
| source | 校验记录来源；不匹配时不要写正式状态 |
| course_slug | 定位对应课程 |
| current | 判断播放器最新停留位置；不能单独当作完成证据 |
| pages | 判断用户是否看过对应章节或小节；`completed_at` 只代表播放器记录到该页已读完，不代表掌握 |
| completions | 找出最近一次完成事件，定位本次要评估的模块/小节 |
| questions_for_llm | 会话结束后逐条回答 |
| review_summary | 只用于总结本次复习；不要重复写 concepts.json |
| exercises | 判断选择题、判断题和开放题证据；用 `mastery_tags` 识别 recall、apply、explain、interview、exam 等证据类型 |
| legacy_checkpoints | 兼容旧课程的检查记录 |

## 会话结束处理

用户读完页面并提交本页练习后，播放器会自动写入完成事件。用户回来要求反馈时：

1. 读取当前课程的 `learning-record.json`，不要再从 `tmp/viewer-sessions/` 查最新文件。
2. 先回答 `questions_for_llm`。
3. 找到 `completions` 中最后一条记录，用其中的 `module`、`section` 和 `exercise_ids` 定位本次证据。
4. 根据相关 `exercises` 的题型、作答和 `mastery_tags` 判断是否满足掌握度门槛；旧课程再兼容读取 `legacy_checkpoints`。
5. 只有证据满足门槛时，才通过 `write-state.py` 更新 `meta.json`、`domain-tree.json` 和 XP。
6. 证据不足时保持 `in_progress`，不要为了进度好看伪造完成。

本地播放器不可用时，读取当前模块或小节的 `content.md`，按 `phase-3-learning.md` 在聊天中继续教学。

## 聊天交接话术

播放器成功启动后，聊天回复保持短：

```text
本地播放器已打开：{url}
当前：{course_name} / {module_id} / {section_title}

你先在播放器里读完这一节，并提交里面的练习。完成后回来告诉我，我会看你的作答、回答遗留问题，再更新进度和复习项。
```

如果今天第一次正式学习检查到到期复习项，可以在这段话前加一行“本课程有 {n} 个待复习知识点”；没有到期项时不要展开解释。
