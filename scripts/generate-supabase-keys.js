import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const defaultEnvPath = path.join(rootDir, '.env');

function resolveEnvPath(args) {
  const envFileIndex = args.indexOf('--env-file');

  if (envFileIndex === -1) {
    return defaultEnvPath;
  }

  const envFile = args[envFileIndex + 1];

  if (!envFile) {
    console.error('Error: --env-file requires a file path.');
    process.exit(1);
  }

  return path.resolve(envFile);
}

const args = process.argv.slice(2);
const envPath = resolveEnvPath(args);
const shouldForce = args.includes('--force');

console.log('Spaceline - Supabase key generator');
console.log();

if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found.');
  console.error(`Expected path: ${envPath}`);
  console.error();
  console.error('Create the .env file from .env.example before continuing.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

function parseEnvValue(value) {
  const trimmedValue = value.trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue.replace(/\s+#.*$/, '');
}

function getEnvValue(key) {
  const regex = new RegExp(`^${key}=(.*)$`, 'm');
  const match = envContent.match(regex);

  return match ? parseEnvValue(match[1]) : '';
}

const jwtSecret = getEnvValue('JWT_SECRET');

if (!jwtSecret) {
  console.error('Error: JWT_SECRET is not defined in .env.');
  console.error('Define JWT_SECRET before generating the Supabase keys.');
  process.exit(1);
}

if (jwtSecret.length < 32) {
  console.error('Error: JWT_SECRET must contain at least 32 characters.');
  process.exit(1);
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createToken(role) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    role,
    aud: 'authenticated',
    iss: 'supabase',
    iat: now,
    exp: now + 315360000,
  };

  const encodedHeader = base64url(header);
  const encodedPayload = base64url(payload);

  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

const existingAnonKey = getEnvValue('ANON_KEY');
const existingServiceRoleKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

if (!shouldForce && (existingAnonKey || existingServiceRoleKey)) {
  console.error('Error: Supabase keys already exist in .env.');
  console.error('This script is intended to be executed only once per local environment.');
  console.error('If JWT_SECRET changed and you intentionally need new keys, run with --force.');
  process.exit(1);
}

function setEnvValue(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }

  const separator = content.endsWith('\n') ? '' : '\n';

  return `${content}${separator}${key}=${value}\n`;
}

const anonKey = createToken('anon');
const serviceRoleKey = createToken('service_role');

let updatedEnv = envContent;

updatedEnv = setEnvValue(updatedEnv, 'ANON_KEY', anonKey);
updatedEnv = setEnvValue(updatedEnv, 'SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);

fs.writeFileSync(envPath, updatedEnv, 'utf8');

console.log('Supabase keys generated successfully.');
console.log('.env file updated successfully.');
console.log();
console.log('Configured variables:');
console.log(' ANON_KEY');
console.log(' SUPABASE_SERVICE_ROLE_KEY');
console.log();
console.log('The generated keys were not printed to the terminal.');
console.log();
console.log('Next step:');
console.log(' docker compose up -d');
