// Einfacher, abhängigkeitsfreier Test-Runner:
// bündelt alle tests/**/*.test.ts mit esbuild (kommt mit Vite) und führt sie mit `node --test` aus.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const collect = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return collect(p);
    return name.endsWith('.test.ts') ? [p] : [];
  });

const entries = collect(root);
if (entries.length === 0) {
  console.error('Keine Tests gefunden.');
  process.exit(1);
}

const out = mkdtempSync(join(tmpdir(), 'hack-tests-'));
let code = 1;
try {
  await build({
    entryPoints: Object.fromEntries(
      entries.map((e) => [relative(root, e).replace(/\.test\.ts$/, '.test'), e]),
    ),
    outdir: out,
    outExtension: { '.js': '.mjs' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'warning',
  });
  const files = readdirSync(out, { recursive: true })
    .filter((f) => String(f).endsWith('.mjs'))
    .map((f) => join(out, String(f)));
  code = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' }).status ?? 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
process.exit(code);

