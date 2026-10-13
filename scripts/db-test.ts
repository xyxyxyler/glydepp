/**
 * Runs supabase/tests/database/*.test.sql against the linked hosted project with psql.
 * Each test file wraps itself in a transaction and rolls back, so no data is left behind.
 * (`supabase test db` needs Docker; we don't use Docker.)
 *
 *   npm run db:test
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

process.loadEnvFile(new URL('../.env.local', import.meta.url));
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error('SUPABASE_DB_PASSWORD missing from .env.local');
// Written by `supabase link`; contains no password.
const dbUrl = readFileSync(new URL('../supabase/.temp/pooler-url', import.meta.url), 'utf8').trim();

const dir = new URL('../supabase/tests/database/', import.meta.url);
let failed = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.test.sql')).sort()) {
  const run = spawnSync('psql', [dbUrl, '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', new URL(file, dir).pathname], {
    env: { ...process.env, PGPASSWORD: password },
    encoding: 'utf8',
  });
  const lines = run.stdout.split('\n');
  const ok = lines.filter((l) => l.startsWith('ok ')).length;
  const bad = lines.filter((l) => l.startsWith('not ok'));
  const plan = lines.find((l) => /^1\.\.\d+$/.test(l));
  const planned = plan ? Number(plan.slice(3)) : NaN;
  console.log(`${file}: ${ok}/${planned} ok`);
  bad.forEach((l) => console.log('  ' + l));
  if (run.status !== 0 || bad.length || ok !== planned) {
    failed++;
    if (run.stderr.trim()) console.log(run.stderr.trim());
  }
}
process.exit(failed ? 1 : 0);
