/**
 * Shared utilities for ai_design_daily scripts.
 */

export function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    raw: argv,
    get(name, fallback) {
      const i = argv.indexOf(name);
      return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
    },
    has(name) {
      return argv.includes(name);
    }
  };
}

export function todayDateString() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}年${m}月${d}日`;
}
