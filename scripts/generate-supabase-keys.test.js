import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const scriptPath = path.resolve('scripts/generate-supabase-keys.js');

test('updates .env with Supabase keys without duplicating entries', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'spaceline-keys-'));
  const envPath = path.join(tempDir, '.env');

  try {
    writeFileSync(
      envPath,
      [
        'JWT_SECRET=local-secret-with-at-least-32-characters',
        'ANON_KEY=',
        'SUPABASE_SERVICE_ROLE_KEY=',
        '',
      ].join('\n'),
      'utf8',
    );

    execFileSync(process.execPath, [scriptPath, '--env-file', envPath], {
      encoding: 'utf8',
    });
    execFileSync(process.execPath, [scriptPath, '--env-file', envPath], {
      encoding: 'utf8',
    });

    const envContent = readFileSync(envPath, 'utf8');
    const anonMatches = envContent.match(/^ANON_KEY=.+$/gm) ?? [];
    const serviceMatches = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY=.+$/gm) ?? [];

    assert.equal(anonMatches.length, 1);
    assert.equal(serviceMatches.length, 1);
    assert.match(anonMatches[0], /^ANON_KEY=ey/);
    assert.match(serviceMatches[0], /^SUPABASE_SERVICE_ROLE_KEY=ey/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
