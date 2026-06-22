# AI 设计日报

Hermes 技能：从 X/Twitter 采集 AI/设计相关推文，生成中文日报，并通过飞书发送 Schema 2.0 交互卡片。

## 功能

- 通过 `camofox-browser` 采集配置的 X/Twitter 账号最新推文。
- 生成候选列表和账号覆盖报告。
- 由 Hermes AI 基于真实候选内容撰写中文日报。
- 通过 `lark-cli` 以飞书交互卡片形式发送日报。

## 环境要求

- Hermes Agent，需启用 `terminal` 和 `file` 工具集。
- Node.js 18+。
- `camofox-browser` REST API，需有可用的 X/Twitter 会话/cookie。
- `lark-cli` 已安装并完成飞书认证。

## 安装

```bash
mkdir -p ~/.hermes/skills/productivity
git clone https://github.com/TAI-IPX/skills-lark-ai-design-daily.git ~/.hermes/skills/productivity/ai-design-daily
cd ~/.hermes/skills/productivity/ai-design-daily
npm install
cp templates/env.example .env
```

编辑 `.env`：

```env
CAMOFOX_URL=http://your-camofox-host:9377
# CAMOFOX_API_KEY=*** camofox 需要认证则填写
FEISHU_USER_ID=ou_xxx
# 或 FEISHU_CHAT_ID=oc_xxx
```

## 手动运行

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd ~/.hermes/skills/productivity/ai-design-daily
set -a && source .env && set +a
npm run strict
```

`npm run strict` 会在缺少 `cache/generated-report.md` 时主动停止，等待 Hermes 读取 `cache/candidates.json` 生成日报内容，之后再执行发送命令。

## 定时任务

使用 `templates/cron-prompt.md` 作为任务提示，设置 workdir 指向本技能目录，启用 `terminal,file` 工具集。

示例定时：每天 10:00（`0 10 * * *`）。

## 自定义数据源

编辑 `references/query-presets.json` 可修改监听的账号和关键词。

## 运行时文件

以下为本地文件，不会提交到 Git：

- `.env`
- `cache/`
- 日志文件

## 开源协议

MIT
