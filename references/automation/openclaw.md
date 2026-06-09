# OpenClaw 复习提醒自动化

> **来源**: https://docs.openclaw.ai/zh-CN/automation/cron-jobs
> **验证日期**: 2026-06-09

## 该平台支持什么

| 能力 | 支持 | 说明 |
|------|:----:|------|
| 定时任务 | ✅ cron | 一次性（--at）、固定间隔（--every）、cron 表达式（--cron） |
| Webhook | ✅ | POST /hooks/wake 或 /hooks/agent |
| 渠道推送 | ✅ announce | Telegram、Slack、Discord、Mattermost、Matrix |
| 隔离会话 | ✅ | --session isolated，独立运行不影响主会话 |
| 自定义会话 | ✅ | --session:custom-id，跨运行持久化上下文 |
| 机器关闭运行 | ✅ | Gateway 进程持续运行即可 |
| AGENTS.md | ✅ | 项目级指令自动加载 |

## 配置方案一：CLI 定时任务（推荐）

```bash
# 每天早上 9 点检查复习（北京时间）
openclaw cron add \
  --name "学习复习提醒" \
  --cron "0 9 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "检查 .learning-profile/courses/*/concepts.json 中的到期复习项。运行 python3 .learning-profile/scripts/check-reviews.py。如果有 overdue 项，输出提醒。" \
  --announce

# 一次性提醒（明天下午 2 点）
openclaw cron add \
  --name "明天复习" \
  --at "2026-06-10T14:00:00+08:00" \
  --session main \
  --system-event "你有知识点需要复习，运行 check-reviews.py 查看详情" \
  --wake now \
  --delete-after-run
```

## 配置方案二：Webhook 触发

通过外部系统（如 CI/CD、定时脚本）触发：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"检查复习项并提醒","name":"复习检查"}'
```

## 配置方案三：渠道推送

将复习提醒推送到 Telegram/Slack/Discord：

```bash
openclaw cron add \
  --name "每日复习提醒" \
  --cron "0 9 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "检查复习项并提醒" \
  --announce \
  --channel telegram \
  --to "-1001234567890"
```

## 管理

```bash
openclaw cron list              # 查看所有任务
openclaw cron show <job-id>     # 查看任务详情
openclaw cron run <job-id>      # 立即运行
openclaw cron runs --id <job-id> # 查看运行历史
openclaw cron remove <job-id>   # 删除任务
```

## 验证

1. 确认 Gateway 正在运行：`openclaw status`
2. 创建任务后运行 `openclaw cron list` 确认
3. 手动触发：`openclaw cron run <job-id>`
4. 查看运行历史：`openclaw cron runs --id <job-id>`

## 限制

- Gateway 进程必须持续运行（机器关闭则定时任务不触发，除非配合外部调度）
- 渠道推送需要配置相应的渠道连接（Telegram Bot、Slack Webhook 等）
