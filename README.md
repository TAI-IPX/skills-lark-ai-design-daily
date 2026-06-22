# AI Design Daily

Hermes skill for generating a Chinese AI/design daily report from X/Twitter posts and sending it to Feishu/Lark as a Schema 2.0 interactive card.

## What it does

- Collects recent posts from configured X/Twitter accounts through `camofox-browser`.
- Builds candidates and account coverage reports.
- Lets Hermes write a polished Chinese daily report from real candidates.
- Sends the final report through `lark-cli` as a Feishu interactive card.

## Requirements

- Hermes Agent with `terminal` and `file` toolsets available.
- Node.js 18+.
- `camofox-browser` REST API with usable X/Twitter session/cookies.
- `lark-cli` installed and authenticated for Feishu/Lark sending.

## Install

```bash
mkdir -p ~/.hermes/skills/productivity
git clone https://github.com/TAI-IPX/skills-lark-ai-design-daily.git ~/.hermes/skills/productivity/ai-design-daily
cd ~/.hermes/skills/productivity/ai-design-daily
npm install
cp templates/env.example .env
```

Edit `.env`:

```env
CAMOFOX_URL=http://your-camofox-host:9377
# CAMOFOX_API_KEY=optional-if-your-camofox-requires-auth
FEISHU_USER_ID=ou_xxx
# or FEISHU_CHAT_ID=oc_xxx
```

## Manual run

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd ~/.hermes/skills/productivity/ai-design-daily
set -a && source .env && set +a
npm run strict
```

`npm run strict` intentionally stops before sending if `cache/generated-report.md` is missing. Hermes should then read `cache/candidates.json`, write `cache/generated-report.md`, and run the send command.

## Cron

Use `templates/cron-prompt.md` as the job prompt, set the workdir to this skill directory, and enable `terminal,file` toolsets.

Example schedule: `0 10 * * *`.

## Customize sources

Edit `references/query-presets.json` to change watched accounts and keywords.

## Runtime files

These are local only and must not be committed:

- `.env`
- `cache/`
- logs

## License

MIT
