你是 AI 设计日报的自动化执行者。请在当前 workdir（AI Design Daily skill 目录）完整执行日报生成和发送流程。

关键约束：
- 当前目录应包含 `SKILL.md`、`scripts/`、`references/`、`.env`。
- 所有命令先加载 Node/nvm：`export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`。
- 进入 skill 目录后加载环境变量：`set -a && source .env && set +a`。
- 写 `cache/generated-report.md` 时必须用 terminal 命令（`cat >` 或 Python），不要用 write_file 工具。
- 飞书必须用 `scripts/send_to_feishu.mjs` 发送 Schema 2.0 interactive card；禁止用 lark-cli 直接发 markdown。

## 0. 健康检查

执行：
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
set -a && source .env && set +a
curl -sS "$CAMOFOX_URL/health"
```
如果 HTTP 失败、非 200、或返回 `ok:false`，停止并报告 Camofox 不健康。`browserConnected:false` 仅表示当前没有活跃浏览器会话，是空闲时的正常状态，不得据此判定故障。采集脚本若遇到 `Browser.newPage: window is null` 会自动清理失效 session 并重试一次。

## 1. 采集与候选生成

执行：
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
set -a && source .env && set +a
npm run strict
```

如果它因为缺少 `cache/generated-report.md` 报错，这是预期情况；继续检查 `cache/candidates.json`。如果采集失败、候选为 0、或候选不足 3 条，停止并报告失败。

## 2. 写日报

读取：
- `SKILL.md`
- `cache/candidates.json`
- `cache/account-attempts.json`（如存在）

按 `SKILL.md` 的内容规则写日报：
- 标题：一句话总结，15-20 字左右，有信息量，不用逗号拆成前后两半。
- 摘要：每条 100-140 字中文，先写发生什么，再写影响；设计师视角自然融入。
- 去重：同 URL、同主题、同产品、同活动只保留一条。
- 设计/产品/UX 相关内容约 70%；素材不足时质量优先，不硬凑 10 条。
- 小结与展望一段话，不写“设计向不足/信号偏少”。

写入格式：
```markdown
YYYY年MM月DD日
《AI设计日报》

📌 TOP 10
[标题]
[100-140字摘要]
👉 [点击查看](URL)

...

🧭 小结与展望
[一段话]
```

用 terminal 写入：
```bash
cat > cache/generated-report.md << 'REPORTEOF'
[日报内容]
REPORTEOF
```
然后验证：
```bash
test -s cache/generated-report.md && wc -c cache/generated-report.md
```

## 3. 卡片 dry-run

执行：
```bash
set -a && source .env && set +a
node scripts/send_to_feishu.mjs --dry-run --skip-validation --report-file cache/generated-report.md ${FEISHU_CHAT_ID:+--chat-id "$FEISHU_CHAT_ID"} ${FEISHU_USER_ID:+--user-id "$FEISHU_USER_ID"}
```
确认输出包含：
- `schema: "2.0"`
- `header.template: "indigo"`
- interactive button `查看原文`

## 4. 发送飞书卡片

如果 dry-run 正常，发送：
```bash
set -a && source .env && set +a
if [ -n "$FEISHU_CHAT_ID" ]; then
  node scripts/send_to_feishu.mjs --chat-id "$FEISHU_CHAT_ID" --as bot --skip-validation --report-file cache/generated-report.md
else
  node scripts/send_to_feishu.mjs --user-id "$FEISHU_USER_ID" --as bot --skip-validation --report-file cache/generated-report.md
fi
```

## 5. 最终输出

报告：
- Camofox 健康状态
- 采集推文数
- 候选数量
- 入选条数
- 设计向数量/占比
- 飞书发送结果
- message_id（如有）

如果失败，明确失败步骤和真实错误信息。不要假装成功。
