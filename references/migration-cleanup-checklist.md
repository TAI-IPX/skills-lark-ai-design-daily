# AI Design Daily Migration & Cleanup Checklist

Use this when converting an ad-hoc daily-report project directory into the canonical reusable `ai-design-daily` skill, or when removing old runtime copies after migration.

## Goal

Keep exactly one canonical implementation and make every scheduler, document, and helper point to it. Avoid the half-project / half-skill state where cron still runs an old directory while the skill docs describe a different workflow.

## Checklist

1. **Establish the canonical skill directory**
   - Put the reusable implementation under a proper Hermes skill path, e.g. `~/.hermes/skills/productivity/ai-design-daily`.
   - Keep `SKILL.md`, `README.md`, `scripts/`, `references/`, and `templates/` inside the skill.
   - Keep runtime-only files local and ignored: `.env`, `cache/`, logs.

2. **Move style and delivery logic into the skill**
   - Card style belongs in `scripts/send_to_feishu.mjs`.
   - Prompt instructions should say to call the script, not reimplement card JSON.
   - `SKILL.md` should describe the card baseline so future agents know what the script preserves.

3. **Update cron before deleting legacy files**
   - Confirm the cron job `workdir` points to the canonical skill directory.
   - Confirm `skills` uses `productivity:ai-design-daily` where skill loading is available.
   - Confirm the prompt is self-contained and forbids markdown fallback delivery.
   - If old errors contain legacy paths in cron state, clear stale `last_error` after a successful manual verification so future searches do not rediscover dead paths.

4. **Run one manual verification before trusting tomorrow's cron**
   - Health-check Camofox.
   - Run strict collection.
   - Inspect `cache/candidates.json`.
   - Write `cache/generated-report.md` via terminal if protected write tools reject runtime files.
   - Run `send_to_feishu.mjs --dry-run` and verify Schema 2.0 / indigo / buttons.
   - Send once for real and record the `message_id` in the session reply, not in long-term memory.

5. **Delete or retire legacy surfaces**
   - Remove obsolete runtime/project directories after the canonical skill has been tested.
   - Delete narrow historical helper skills if their content has been absorbed into this class-level skill.
   - Patch related skills/docs that mention legacy paths so future agents do not resurrect them.

6. **Verify cleanup**
   - Search active skill docs and cron config for legacy path/name strings.
   - Exclude immutable history/session transcripts and runtime cache from the cleanup search.
   - The target state is: active docs and cron config mention only the canonical skill.

## What not to save

- Do not save one-off message IDs, run timestamps, or candidate counts in memory.
- Do not encode transient failures as permanent tool limitations.
- Preserve the migration pattern, not the blow-by-blow session narrative.
