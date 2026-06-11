# 本地课程播放器

已生成课程后，本地课程播放器是默认阅读入口，先启动播放器，再在聊天里讲解和答疑。

只有播放器无法启动、必需文件缺失，或用户明确拒绝打开播放器时，才退回聊天教学。退回时必须说明具体原因，并继续读取当前 `content.md`，不能重新调研或凭记忆复述课程。

## 启动命令

```bash
python {skill_dir}/viewer/server.py \
  --course {course_slug} \
  --learning-root {learning_root} \
  --mode {interactive|read-only} \
  [--module {module_id}] \
  [--port {port}]
```

默认使用 `--mode interactive`（完整学习模式）。不要省略 `--mode`，也不要默认用`read-only`。不要猜 `{learning_root}`；路径不明确时先询问用户或读取已知状态。

## 模式

| 模式 | 适用场景 | 状态写入 |
|------|----------|----------|
| interactive | 默认；正式学习、复习、保存作答和问题 | 只写学习过程记录；正式进度由你判断后写入 |
| read-only | 仅当用户明确说“只浏览/只看课件，不记录”，或 interactive 依赖缺失时的降级 | 不写入学习记录 |

interactive 模式要求 `.learning-profile/scripts/check-reviews.py` 和 `record-review.py` 存在。缺失时保留真实失败，不要伪造复习结果。

## 页面能做什么

- 查看课程目录、当前章节、技能树和学习状态。
- 渲染 Markdown、Mermaid 图、代码块、图片和公式。
- 记录待问问题。
- 给到期复习项打 1-4 分；这个评分只用于复习调度。
- 保存回忆题、迁移题、费曼解释和 checkpoint 的原始作答。

页面不能判断练习对错，不能标记模块完成，不能更新技能树 mastered，也不能发放 XP。

## 学习记录

interactive 模式下，页面会把本次记录写入本地交接文件：

```text
{learning_root}/.learning-profile/tmp/viewer-sessions/{session_id}.json
```

关键字段：

| 字段 | 说明 |
|------|------|
| source | 固定为 `study.skill.viewer`，用于识别记录来源 |
| session_id | 本次播放器会话标识，用来定位记录文件 |
| course_slug | 课程目录名 |
| started_at / ended_at | 本次打开和完成时间 |
| questions_for_llm | 用户留下的问题 |
| review_summary | 复习评分摘要；评分本身已通过 record-review.py 写入 concepts.json |
| exercises | 回忆题、迁移题的原始作答 |
| feynman_explanations | 费曼解释原文 |
| checkpoints | checkpoint 提交记录 |

练习和 checkpoint 一律由教学 agent 判断。不要为这个固定行为新增
`judgement_policy`、`requires_llm_judgement` 之类的策略字段；也禁止在
`exercises`、`feynman_explanations`、`checkpoints` 里保存 `correct`、
`passed`、`self_assessed` 这类自评终态。

字段消费路径：

| 字段 | 怎么用 |
|------|--------|
| source | 校验记录来源；不匹配时不要写正式状态 |
| session_id / course_slug | 定位本次记录和对应课程 |
| started_at / ended_at | 用于更新学习时间、学习时长或学习天数 |
| questions_for_llm | 会话结束后逐条回答 |
| review_summary | 只用于总结本次复习；不要重复写 concepts.json |
| exercises | 判断回忆题、迁移题证据 |
| feynman_explanations | 判断解释题证据 |
| checkpoints | 判断模块掌握度检查是否证据充足 |

## 会话结束处理

用户点击完成后：

1. 读取最新学习记录文件。
2. 先回答 `questions_for_llm`。
3. 根据 `exercises`、`feynman_explanations`、`checkpoints` 判断是否满足掌握度门槛。
4. 只有证据满足门槛时，才通过 `write-state.py` 更新 `meta.json`、`domain-tree.json` 和 XP。
5. 证据不足时保持 `in_progress`，不要为了进度好看伪造完成。

本地播放器不可用时，读取当前 `content.md`，按 `phase-3-learning.md` 在聊天中继续教学。
