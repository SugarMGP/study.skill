# 复习提醒自动化

study.skill 为多种主流 agent 平台提供复习提醒配置参考。根据你使用的平台，
选择对应的配置指南；实际可用能力以当前平台版本和账号权限为准。

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
2. 将 `check-reviews.py`、`record-review.py` 和 `write-state.py` 复制到 `.learning-profile/scripts/`
3. 为 AGENTS.md 添加复习检查指令
4. 检测到 `.claude/` 目录时提示按 Claude Code 文档配置 SessionStart hook
