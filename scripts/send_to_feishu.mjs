#!/usr/bin/env node
/**
 * send_to_feishu.mjs — Send a structured daily report to Feishu via lark-cli.
 *
 * Final format (verified 2026-06-19):
 *   - Header: indigo template, dot-format date title
 *   - Items: bold title + content-aware emoji, summary, "查看原文" button (margin 12px)
 *   - No dividers, no footer, no 📌今日精选 header
 *   - 小结与展望: plain markdown, no quote block
 *
 * Usage:
 *   node send_to_feishu.mjs --chat-id oc_xxx [--as bot] [--dry-run] [--skip-validation]
 *   node send_to_feishu.mjs --user-id ou_xxx [--as bot] [--dry-run] [--skip-validation]
 *   node send_to_feishu.mjs --report-file cache/generated-report.md
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseDir = dirname(__dirname);

// ── CLI arg parsing ─────────────────────────────────────────────

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    raw: argv,
    get(name, fallback) {
      const i = argv.indexOf(name);
      return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
    },
    has(name) { return argv.includes(name); }
  };
}

const cli = parseCliArgs();
const reportFileArg = cli.get("--report-file", "cache/generated-report.md");
const chatId = cli.get("--chat-id", process.env.FEISHU_CHAT_ID || "");
const userId = cli.get("--user-id", process.env.FEISHU_USER_ID || "");
const identity = cli.get("--as", "bot");
const dryRun = cli.has("--dry-run");
const skipValidation = cli.has("--skip-validation");

// ── lark-cli path ───────────────────────────────────────────────

function resolveLarkCli() {
  if (process.env.LARK_CLI_PATH) return process.env.LARK_CLI_PATH;
  return "lark-cli";
}

const LARK_CLI = resolveLarkCli();

// ── Emoji mapping ───────────────────────────────────────────────

function pickEmoji(title, summary) {
  const text = title + " " + summary;
  const rules = [
    [/figma|设计工具|插件|auto layout/i, "🎨"],
    [/浏览器|browser|tabbit/i, "🌐"],
    [/开源|github|星标|star/i, "⭐"],
    [/mcp|协议|anthropic|claude/i, "🔗"],
    [/苹果|apple|swiftui|动态岛/i, "🍎"],
    [/谷歌|google|material|主题/i, "🔵"],
    [/交互|ux|对话式|框架|agent ux/i, "🧩"],
    [/哲学|定位|伙伴|信任/i, "🧠"],
    [/评测|插件生态|效率/i, "🔍"],
    [/原则|十个|可控|透明/i, "📋"],
    [/ai助手|助手项目/i, "🤖"],
    [/设计系统|组件化|交付/i, "🛠"],
    [/多模态|协同|发酵/i, "🔄"],
    [/产品|更新|发布|推出/i, "🚀"],
  ];
  for (const [re, emoji] of rules) {
    if (re.test(text)) return emoji;
  }
  return "📌";
}

// ── Report parsing ──────────────────────────────────────────────

function getDateLine(text) {
  const raw = (text.match(/\d{4}年\d{2}月\d{2}日/) || [""])[0]
    || new Date().getUTCFullYear() + "年" + String(new Date().getUTCMonth() + 1).padStart(2, "0") + "月" + String(new Date().getUTCDate()).padStart(2, "0") + "日";
  return raw.replace(/年/, ".").replace(/月/, ".").replace(/日/, "");
}

function sectionSlice(text, start, endList) {
  const s = text.indexOf(start);
  if (s < 0) return "";
  const from = s + start.length;
  let to = text.length;
  for (const e of endList) {
    const p = text.indexOf(e, from);
    if (p >= 0) to = Math.min(to, p);
  }
  return text.slice(from, to).trim();
}

function parseItems(sectionText) {
  const out = [];
  const lines = sectionText.split("\n");
  let cur = null;

  const pushCur = () => {
    if (!cur || !cur.title) return;
    out.push({
      title: cur.title,
      summary: cur.summary.join(" ").replace(/\s+/g, " ").trim(),
      url: cur.url || ""
    });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const linkMatch = line.match(/👉\s*\[点击查看\]\((https?:\/\/[^)]+)\)/);
    if (linkMatch) {
      if (cur) { cur.url = linkMatch[1]; pushCur(); cur = null; }
      continue;
    }

    if (!cur) { cur = { title: line, summary: [], url: "" }; continue; }

    const u = (line.match(/https?:\/\/x\.com\/[^\s*]+\/status\/\d+/i) || [""])[0];
    if (u) { cur.url = u; pushCur(); cur = null; continue; }

    const s = line.replace(/^>\s*/, "").replace(/^\*链接：?/, "").replace(/\*$/g, "").trim();
    if (s && !/^(链接：|\*)/.test(s)) cur.summary.push(s);
  }

  pushCur();
  return out;
}

function parseReport(raw) {
  const listHeader = raw.includes("📌 今日精选") ? "📌 今日精选" : "📌 TOP 10";
  const top10Text = sectionSlice(raw, listHeader, ["🧭 小结与展望"]);
  let top10 = parseItems(top10Text).slice(0, 10);

  const summaryPart = sectionSlice(raw, "🧭 小结与展望", []);
  const paragraph = summaryPart.split("\n").map(x => x.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  return { top10, summary: { paragraph } };
}

// ── Validation ──────────────────────────────────────────────────

function validateStructured(data) {
  const issues = [];
  if (data.top10.length < 1) issues.push("[红线] 今日精选为空");
  if (data.top10.length > 10) issues.push("[红线] 条数超过 10");
  if (!data.summary?.paragraph?.trim()) issues.push("[红线] 小结与展望缺失");

  const seenUrls = new Set();
  data.top10.forEach((it, idx) => {
    if (!it.title) issues.push("第" + (idx + 1) + "条标题缺失");
    if (!it.url) issues.push("第" + (idx + 1) + "条链接缺失");
    if (seenUrls.has(it.url)) issues.push("[红线] 重复 URL：" + it.url);
    if (it.url) seenUrls.add(it.url);
  });

  return issues;
}

// ── Feishu Card (Schema 2.0) builder ────────────────────────────

function buildFeishuCard(dateLine, data) {
  const elements = [];

  for (let i = 0; i < data.top10.length; i++) {
    const item = data.top10[i];
    const idx = String(i + 1);
    const emoji = pickEmoji(item.title, item.summary);

    elements.push({
      tag: "markdown",
      element_id: "item_" + idx + "_title",
      content: "**" + emoji + " " + item.title + "**"
    });

    elements.push({
      tag: "markdown",
      element_id: "item_" + idx + "_summary",
      content: item.summary,
      text_size: "normal"
    });

    elements.push({
      tag: "button",
      element_id: "item_" + idx + "_btn",
      type: "default",
      size: "small",
      margin: "0 0 12px 0",
      text: { tag: "plain_text", content: "查看原文" },
      behaviors: [{ type: "open_url", default_url: item.url }]
    });
  }

  elements.push({
    tag: "markdown",
    element_id: "section_summary_title",
    content: "**🧭 小结与展望**"
  });
  elements.push({
    tag: "markdown",
    element_id: "section_summary_body",
    content: data.summary.paragraph
  });

  return {
    schema: "2.0",
    config: {
      update_multi: true,
      summary: {
        content: "AI设计日报 " + dateLine + " · " + data.top10.length + "条精选"
      }
    },
    header: {
      template: "indigo",
      title: { tag: "plain_text", content: dateLine + "｜AI 设计日报" },
      subtitle: { tag: "plain_text", content: "TAI-IPX × Hermes · 追踪过去24小时AI前沿热点事件" }
    },
    body: { elements }
  };
}

// ── Send via lark-cli ────────────────────────────────────────────

function sendViaLarkCli(cardJson, chatIdArg, userIdArg, identityArg) {
  const contentStr = JSON.stringify(cardJson);
  const args = [
    "im", "+messages-send",
    "--msg-type", "interactive",
    "--content", contentStr,
    "--as", identityArg,
    "--format", "json"
  ];

  if (userIdArg) {
    args.push("--user-id", userIdArg);
  } else {
    args.push("--chat-id", chatIdArg);
  }

  const result = execFileSync(LARK_CLI, args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000
  });
  return JSON.parse(result.toString().trim());
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const target = chatId || userId;
  if (!target) {
    throw new Error("No target. Use --chat-id oc_xxx or --user-id ou_xxx, or set env vars.");
  }

  const reportPath = reportFileArg.startsWith("/") ? reportFileArg : join(baseDir, reportFileArg);
  if (!existsSync(reportPath)) throw new Error("Report file not found: " + reportPath);

  const raw = readFileSync(reportPath, "utf8").trim();
  const dateLine = getDateLine(raw);
  const data = parseReport(raw);

  const issues = skipValidation ? [] : validateStructured(data);
  if (issues.length) {
    throw new Error("校验失败：" + issues.join("；"));
  }

  const card = buildFeishuCard(dateLine, data);

  if (dryRun) {
    console.log("=== DRY RUN: Feishu Card JSON ===");
    console.log(JSON.stringify(card, null, 2));
    console.log("\nTarget: " + (userId ? "user_id=" + userId : "chat_id=" + chatId) + ", identity=" + identity);
    process.exit(0);
  }

  const sendResult = sendViaLarkCli(card, chatId, userId, identity);

  if (!sendResult.ok) {
    console.error("❌ Send failed:", JSON.stringify(sendResult.error, null, 2));
    process.exit(1);
  }

  const msgId = sendResult.data?.message_id || sendResult.message_id;
  const cId = sendResult.data?.chat_id || sendResult.chat_id;
  console.log("✅ Sent to Feishu: message_id=" + msgId + ", chat_id=" + cId);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
