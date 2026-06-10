# 复习提醒自动化

study.skill 为多种主流 agent 平台提供复习提醒配置参考。根据你使用的平台，
选择对应的配置指南；实际可用能力以当前平台版本和账号权限为准。

## 两种提醒不要混淆

- **本地复习计划**：写在 `.learning-profile/courses/{course-slug}/concepts.json`
  里，记录每个知识点的 `next_review`。这只是学习状态，不会自己推送消息。
- **系统提醒 / automation（自动化提醒）**：由 Codex、Claude Code、Cursor、
  GitHub Copilot、OpenClaw 等平台创建的定时任务或会话唤起。只有它才会在
  到点时主动提醒用户。

不得把 `concepts.json` 里的 `next_review` 说成“已经自动化”。

## 主动询问规则

首次课程创建后，或第一次正式学习结束时，如果
`profile.json.preferences.automation_declined` 不是 `true`，主动询问一次：

```text
我可以顺手把学习提醒设上。默认每天 21:30 提醒你继续学 1 小时，并检查到期复习项。这个时间可以吗？
```

如果用户同意，按当前平台文档创建或引导创建 automation。提醒内容建议：

```text
检查今天是否有到期复习项；如果有，先用 5 分钟快速复习。
然后继续当前课程的下一个小节，默认学习 1 小时。
```

如果用户拒绝，写入：

```json
{
  "preferences": {
    "automation_declined": true,
    "automation_declined_at": "<now>"
  }
}
```

后续不要反复推荐自动化，除非用户主动提起。

## 平台能力总览

| 平台 | 定时任务 | 会话启动检查 | 推送通知 | 云端运行 | 配置文件 |
|------|:-------:|:----------:|:-------:|:-------:|---------|
| Claude Code | ✅ Routines | ✅ SessionStart | ✅ Desktop | ✅ Remote | [claude-code.md](./claude-code.md) |
| Codex | ✅ Automations | ✅ AGENTS.md | ✅ Triage inbox | ✅ | [codex.md](./codex.md) |
| Cursor | ✅ Automations | ❌ | ❌ | ✅ | [cursor.md](./cursor.md) |
| GitHub Copilot | ✅ Automations | ❌ | ❌ | ✅ | [github-copilot.md](./github-copilot.md) |
| OpenClaw | ✅ cron | ✅ | ✅ 多渠道 | ✅ Gateway | [openclaw.md](./openclaw.md) |
| Gemini CLI | ❌ | ✅ SessionStart | ❌ | ❌ | [gemini-cli.md](./gemini-cli.md) |

## 通用方案（支持项目指令文件的平台）

即使平台没有原生定时任务，也可以通过 AGENTS.md 或同类项目指令文件实现会话启动检查。

将以下内容添加到你项目根目录的 AGENTS.md：

```markdown
## 学习助手
如果你的工作目录下存在 `.learning-profile/` 目录，在每次会话开始时，
运行 `python .learning-profile/scripts/check-reviews.py`（或平台环境里的 `python3`）检查到期复习。
如果有 overdue 项，第一句话提醒用户。
如果没有到期项，不主动提及复习。
```

## 复习检查脚本

各平台配置都复用同一个 Python 脚本：
`.learning-profile/scripts/check-reviews.py`

该脚本读取所有 active/completed 课程的 concepts.json，用 FSRS 公式计算 R 值，
输出到期复习项列表。需要机器可读结果时可加 `--json`。

## 初始化时的自动化配置

`scripts/init-profile.sh` 和 `init-profile.ps1` 会：
1. 检测当前平台（通过 `.claude/`、`.codex/` 等目录判断）
2. 将 `check-reviews.py`、`record-review.py`、`write-state.py` 和 `migrate-profile.py` 复制到 `.learning-profile/scripts/`
3. 为 AGENTS.md 添加复习检查指令
4. 检测到 `.claude/` 目录时提示按 Claude Code 文档配置 SessionStart hook
