---
name: ai-design-daily
description: Use when generating, running, installing, or scheduling a Chinese AI design daily report from X/Twitter posts. Collects posts through camofox-browser, guides Hermes to write the report, and sends it to Feishu/Lark as a Schema 2.0 interactive card.
version: 1.0.0
author: temurlee + Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [ai-design, daily-report, feishu, lark, twitter, x, camofox, cron]
    related_skills: [hermes-agent, lark-card]
---

# AI Design Daily

## Overview

This skill generates a Chinese AI/design daily report from real X/Twitter posts in the last 24 hours, then sends the report to Feishu/Lark as a polished Schema 2.0 interactive card.

The workflow is intentionally split between scripts and Hermes:

1. Node scripts collect posts and build candidates.
2. Hermes reads the candidates and writes the human-quality report.
3. `send_to_feishu.mjs` parses that report and renders the Feishu card.

The skill is designed to be installed as a normal Hermes skill directory and used by different people after they configure their own Camofox and Feishu targets.

## When to Use

Use this skill when the user asks to:

- run AI设计日报 / AI design daily / 设计日报
- install or configure this daily report workflow
- schedule the report with Hermes cron
- debug collection, candidate generation, or Feishu card delivery
- customize watched X/Twitter accounts or report style

Do not use this for generic Feishu messaging unrelated to the daily report.

## Requirements

- Hermes Agent with `terminal` and `file` toolsets.
- Node.js 18+.
- `camofox-browser` REST API reachable via `CAMOFOX_URL`.
- Valid X/Twitter session/cookies in the Camofox browser profile.
- `lark-cli` installed and authenticated for the target Feishu/Lark tenant.
- A Feishu recipient: `FEISHU_USER_ID` or `FEISHU_CHAT_ID`.

## Installation

```bash
mkdir -p ~/.hermes/skills/productivity
git clone https://github.com/temurlee/ai-design-daily.git ~/.hermes/skills/productivity/ai-design-daily
cd ~/.hermes/skills/productivity/ai-design-daily
npm install
cp templates/env.example .env
```

Configure `.env`:

```env
CAMOFOX_URL=http://your-camofox-host:9377
CAMOFOX_API_KEY=optional-if-your-camofox-requires-auth
FEISHU_USER_ID=ou_xxx
# or FEISHU_CHAT_ID=oc_xxx
# LARK_CLI_PATH=/path/to/lark-cli
```

## Directory Structure

```text
ai-design-daily/
├── SKILL.md
├── README.md
├── package.json
├── package-lock.json
├── scripts/
│   ├── run_strict.mjs
│   ├── collect_camofox.mjs
│   ├── collect_ids_camofox.mjs
│   ├── build_account_attempts.mjs
│   ├── generate_report.mjs
│   ├── send_to_feishu.mjs
│   └── lib/shared.mjs
├── references/
│   └── query-presets.json
├── templates/
│   ├── env.example
│   └── cron-prompt.md
└── cache/                 # runtime only, ignored
```

Never commit `.env` or `cache/`.

## Manual Workflow

### 1. Load environment

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd ~/.hermes/skills/productivity/ai-design-daily
set -a && source .env && set +a
```

### 2. Run strict collection

```bash
npm run strict
```

`npm run strict` resets runtime cache, collects posts, converts URLs to IDs, builds account-attempt coverage, and generates `cache/candidates.json`.

It normally stops before sending with this error when `cache/generated-report.md` does not exist. That is expected. Hermes must write the report first.

### 3. Inspect candidates

Read:

- `cache/candidates.json`
- `cache/account-attempts.json`
- `SKILL.md`

If fewer than 3 candidates exist, stop and report failure.

### 4. Write the report

Write `cache/generated-report.md` in this format:

```markdown
YYYY年MM月DD日
《AI设计日报》

📌 TOP 10
[一句话总结标题]
[100-140字中文摘要]
👉 [点击查看](URL)

...

🧭 小结与展望
[一段话]
```

### 5. Send to Feishu

```bash
npm run send -- --user-id "$FEISHU_USER_ID" --as bot --skip-validation
# or
node scripts/send_to_feishu.mjs --chat-id "$FEISHU_CHAT_ID" --as bot --skip-validation --report-file cache/generated-report.md
```

## Content Rules

### Selection

- Prefer concrete launches, releases, open-source drops, model updates, product demos, and thoughtful UI/UX analysis.
- Downrank vague reactions, repeated old news, pure hype, weak signals, and empty engagement bait.
- Same URL/status appears only once.
- Same topic/product/event appears only once; keep the most representative item.
- Design/product/UX relevance should be around 70% when the source material allows it.
- Do not force 10 items if quality is insufficient. Quality wins over count.

### Title

- One informative Chinese sentence, normally 15-20 Chinese characters.
- Summarize the actual event or claim.
- Do not split with comma into a generic front/back half.
- Avoid formulaic titles and vague labels.

### Summary

- 100-140 Chinese characters per item.
- News-lede style: first state what happened, then explain effect or why designers/product people care.
- Objective, neutral, concise, professional.
- Design perspective should be naturally integrated, not bolted on with a fixed phrase.
- No unfinished ellipsis endings.
- No raw English paragraphs unless a product name requires English.

### Sections

The report must contain only:

- `📌 TOP 10` or `📌 今日精选`
- `🧭 小结与展望`

The summary section is one paragraph. Do not explicitly write phrases like “设计向不足/信号偏少”.

## Feishu Card Style

Card styling is part of this skill and lives in `scripts/send_to_feishu.mjs`. Do not reimplement it in cron prompts.

Current card baseline:

- Message type: `interactive`.
- Feishu card schema: `2.0`.
- Header template: `indigo`.
- Header title: `<YYYY.MM.DD>｜AI 设计日报`.
- Header subtitle: `TAI-IPX × Hermes · 追踪过去24小时AI前沿热点事件`.
- Body contains one block per selected item:
  - bold markdown title with content-aware emoji
  - normal markdown summary
  - small `查看原文` button using `open_url`
  - button margin: `0 0 12px 0`
- Bottom section:
  - bold `🧭 小结与展望`
  - one markdown paragraph
- No footer.
- No dividers.
- No raw markdown delivery fallback.

Hard rule: always send through `scripts/send_to_feishu.mjs`. Never send the report with `lark-cli im +messages-send --markdown`, because that bypasses the card style.

To verify card rendering without sending:

```bash
node scripts/send_to_feishu.mjs --dry-run --skip-validation --report-file cache/generated-report.md --user-id "$FEISHU_USER_ID"
```

## Cron Setup

Use `templates/cron-prompt.md` as the prompt. Recommended job settings:

- schedule: `0 10 * * *`
- workdir: the installed skill directory
- enabled toolsets: `terminal,file`
- delivery: the user’s preferred Hermes destination
- skill: `productivity:ai-design-daily` if skill loading is available

Cron prompts must be self-contained because scheduled sessions may fail to load skills. The template includes the full operational instructions.

## Migration and Cleanup

When converting an older ad-hoc daily-report directory into this reusable skill, follow `references/migration-cleanup-checklist.md`.

Key rule: after a manual end-to-end verification succeeds, remove legacy runtime directories and narrow historical helper skills that were absorbed here, then search active skill docs and cron config for old path/name strings. Do not leave cron pointing at one implementation while docs describe another.

## Common Pitfalls

1. **Using `write_file` under this skill directory in protected Hermes profiles.** If blocked, write runtime files through `terminal`/Python instead.
2. **Sending markdown directly.** This loses the Feishu card style. Use `send_to_feishu.mjs` only.
3. **Leaving Teams/OpenClaw references.** This is now Hermes + Feishu/Lark, not Teams.
4. **Missing Camofox auth.** If Camofox returns 403, check `CAMOFOX_API_KEY`.
5. **Camofox engine crash.** If `/health` shows `browserConnected:false` or server errors mention `window is null`, restart the Camofox container.
6. **Login wall.** If X/Twitter cookies are missing or expired, collection should fail clearly instead of reporting "0 tweets".
7. **Hardcoded user IDs.** Reusable installs must use `.env` (`FEISHU_USER_ID`/`FEISHU_CHAT_ID`), not personal IDs baked into scripts.
8. **Collection timeout.** `npm run strict` can exceed 300s when Camofox has stale browser contexts to clear. Use `timeout=600` for the terminal call. If the first run times out, retry — stale contexts get cleared on the first attempt and the second run typically succeeds.
9. **FEISHU_USER_ID system-env leak.** If `FEISHU_USER_ID` exists in the shell environment (from a previous config, Docker env, or parent process), `source .env` does NOT unset it — `.env` only adds/overrides variables it defines. The send script prioritises `userId` over `chatId`, so even with `--chat-id` and `FEISHU_CHAT_ID` set, a lingering `FEISHU_USER_ID` causes the message to go to a P2P bot chat instead of the target group. **Fix:** when targeting a group, explicitly add `FEISHU_USER_ID=` (empty) to `.env` so `source .env` overrides the system value with an empty string, forcing the script to use `chatId`.

## Verification Checklist

- [ ] `node --check scripts/*.mjs` passes.
- [ ] `.env` exists and has Camofox + Feishu target.
- [ ] `curl $CAMOFOX_URL/health` returns healthy JSON.
- [ ] `npm run strict` creates `cache/candidates.json`.
- [ ] Hermes writes non-empty `cache/generated-report.md`.
- [ ] `send_to_feishu.mjs --dry-run` outputs Schema 2.0 card JSON.
- [ ] Real send returns a Feishu `message_id`.
