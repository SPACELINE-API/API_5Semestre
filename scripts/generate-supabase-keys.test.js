import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const scriptPath = path.resolve('scripts/generate-supabase-keys.js');

function decodeJwtPayload(token) {
  const [, payload] = token.split('.');

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

test('updates empty .env keys once with Supabase-compatible JWT payloads', () => {
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

    const envContent = readFileSync(envPath, 'utf8');
    const anonMatches = envContent.match(/^ANON_KEY=.+$/gm) ?? [];
    const serviceMatches = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY=.+$/gm) ?? [];

    assert.equal(anonMatches.length, 1);
    assert.equal(serviceMatches.length, 1);
    assert.match(anonMatches[0], /^ANON_KEY=ey/);
    assert.match(serviceMatches[0], /^SUPABASE_SERVICE_ROLE_KEY=ey/);

    const anonPayload = decodeJwtPayload(anonMatches[0].replace('ANON_KEY=', ''));
    const servicePayload = decodeJwtPayload(
      serviceMatches[0].replace('SUPABASE_SERVICE_ROLE_KEY=', ''),
    );

    assert.equal(anonPayload.role, 'anon');
    assert.equal(anonPayload.aud, 'authenticated');
    assert.equal(servicePayload.role, 'service_role');
    assert.equal(servicePayload.aud, 'authenticated');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('does not overwrite generated keys when script is run a second time', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'spaceline-keys-'));
  const envPath = path.join(tempDir, '.env');

  try {
    writeFileSync(
      envPath,
      [
        'JWT_SECRET=local-secret-with-at-least-32-characters',
        'ANON_KEY=already-generated-anon-key',
        'SUPABASE_SERVICE_ROLE_KEY=already-generated-service-key',
        '',
      ].join('\n'),
      'utf8',
    );

    const result = spawnSync(process.execPath, [scriptPath, '--env-file', envPath], {
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Supabase keys already exist/);

    const envContent = readFileSync(envPath, 'utf8');

    assert.match(envContent, /^ANON_KEY=already-generated-anon-key$/m);
    assert.match(envContent, /^SUPABASE_SERVICE_ROLE_KEY=already-generated-service-key$/m);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('parses quoted JWT_SECRET without signing tokens with quote characters', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'spaceline-keys-'));
  const envPath = path.join(tempDir, '.env');

  try {
    writeFileSync(
      envPath,
      [
        'JWT_SECRET="local-secret-with-at-least-32-characters"',
        'ANON_KEY=',
        'SUPABASE_SERVICE_ROLE_KEY=',
        '',
      ].join('\n'),
      'utf8',
    );

    execFileSync(process.execPath, [scriptPath, '--env-file', envPath], {
      encoding: 'utf8',
    });

    const envContent = readFileSync(envPath, 'utf8');
    const anonKey = envContent.match(/^ANON_KEY=(.+)$/m)?.[1];

    assert.ok(anonKey);
    assert.equal(decodeJwtPayload(anonKey).role, 'anon');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
