#!/usr/bin/env node
/**
 * Sync the docs endpoint reference from the live OpenAPI schema.
 *
 * The checkout docs page used to hand-maintain its endpoint table, which drifted
 * out of sync with the backend (wrong paths, missing endpoints). This script pulls
 * the source of truth — drf-spectacular's published schema — and writes a normalized
 * snapshot that the docs render from. Run it whenever the API surface changes.
 *
 *   npm run sync:docs                      # uses prod (https://api.getcentry.io)
 *   CENTRY_SCHEMA_URL=https://staging-api.getcentry.io/api/schema/ npm run sync:docs
 *
 * The backend also serves the same schema you can feed to Postman/codegen:
 *   https://api.getcentry.io/api/schema/
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'app', 'docs', '_generated', 'openapi-checkout.json');
// Curated, hand-maintained parameter copy merged on top of the schema structure.
const DESCRIPTIONS_FILE = join(ROOT, 'app', 'docs', 'checkout', '_param-descriptions.json');

const BASE = process.env.CENTRY_SCHEMA_URL || 'https://api.getcentry.io/api/schema/';
// drf-spectacular serves YAML by default; ask for JSON so we need no YAML parser.
const SCHEMA_URL = BASE.includes('?') ? BASE : `${BASE}?format=json`;

// Tag → which credential the client sends. Only client-facing tags are documented;
// internal provider webhooks (tag "api") are intentionally excluded.
const AUTH_BY_TAG = {
  Checkout: 'API Key',
  'Checkout (Public)': 'Session Token',
};

// Stable display order (create → manage → public flow).
const ORDER = [
  'POST /api/v1/checkout/sessions/',
  'GET /api/v1/checkout/sessions/list/',
  'GET /api/v1/checkout/sessions/{session_id}/',
  'POST /api/v1/checkout/sessions/{session_id}/cancel/',
  'GET /api/v1/checkout/{session_token}/',
  'GET /api/v1/checkout/{session_token}/methods/',
  'POST /api/v1/checkout/{session_token}/pay/',
  'GET /api/v1/checkout/{session_token}/status/',
];

const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

/** Render a JSON-schema property into a short human type label. */
function typeLabel(prop, components) {
  if (!prop || typeof prop !== 'object') return 'object';
  // ChoiceField / enums arrive as `allOf: [{$ref}]` or a bare $ref.
  const ref = prop.$ref || prop.allOf?.[0]?.$ref;
  if (ref) {
    const target = components[ref.split('/').pop()] || {};
    if (Array.isArray(target.enum)) {
      return target.enum.map((v) => `"${v}"`).join(' | ');
    }
    return 'object';
  }
  if (prop.type === 'array') {
    const items = prop.items || {};
    const inner = items.$ref ? 'object' : items.type || 'string';
    return `${inner}[]`;
  }
  if (prop.type) return prop.type;
  if (Array.isArray(prop.enum)) return prop.enum.map((v) => `"${v}"`).join(' | ');
  return 'object'; // empty schema {} (e.g. a free-form JSONField)
}

/** Extract the JSON request-body params for one operation, merging curated copy. */
function requestParams(op, components, curated) {
  const content = op.requestBody?.content || {};
  const json = content['application/json'] || Object.values(content)[0];
  let schema = json?.schema;
  if (!schema) return null;
  if (schema.$ref) schema = components[schema.$ref.split('/').pop()] || {};
  const props = schema.properties || {};
  if (Object.keys(props).length === 0) return null;
  const required = new Set(schema.required || []);
  return Object.entries(props).map(([name, prop]) => ({
    name,
    type: typeLabel(prop, components),
    required: required.has(name),
    description: curated[name] || prop.description?.split('\n')[0] || '',
  }));
}

async function main() {
  const descriptions = existsSync(DESCRIPTIONS_FILE)
    ? JSON.parse(readFileSync(DESCRIPTIONS_FILE, 'utf8'))
    : {};

  console.log(`Fetching schema from ${SCHEMA_URL}`);
  const res = await fetch(SCHEMA_URL);
  if (!res.ok) throw new Error(`Schema fetch failed: ${res.status} ${res.statusText}`);
  const schema = await res.json();
  const components = schema.components?.schemas || {};

  const endpoints = [];
  const requestBodies = {};
  for (const [path, ops] of Object.entries(schema.paths || {})) {
    if (!path.includes('/checkout/')) continue;
    for (const [method, op] of Object.entries(ops)) {
      if (!METHODS.has(method)) continue;
      const tags = op.tags || [];
      const tag = tags.find((t) => t in AUTH_BY_TAG);
      if (!tag) continue; // skip internal webhook routes
      const key = `${method.toUpperCase()} ${path}`;
      endpoints.push({
        method: method.toUpperCase(),
        path,
        auth: AUTH_BY_TAG[tag],
        summary: op.summary || op.operationId || '',
      });
      const params = requestParams(op, components, descriptions[key] || {});
      if (params) requestBodies[key] = params;
    }
  }

  // Surface curated descriptions that no longer match a schema param — usually
  // means the backend renamed/removed a field and the copy is now stale.
  for (const [key, copy] of Object.entries(descriptions)) {
    if (key.startsWith('_')) continue;
    const known = new Set((requestBodies[key] || []).map((p) => p.name));
    for (const name of Object.keys(copy)) {
      if (!known.has(name)) console.warn(`  ⚠ stale description: ${key} → "${name}" not in schema`);
    }
  }

  const rank = (e) => {
    const i = ORDER.indexOf(`${e.method} ${e.path}`);
    return i === -1 ? ORDER.length : i;
  };
  endpoints.sort((a, b) => rank(a) - rank(b));

  if (endpoints.length === 0) {
    throw new Error('No checkout endpoints found in schema — refusing to overwrite snapshot.');
  }

  const out = {
    note: 'AUTO-GENERATED by scripts/sync-openapi-docs.mjs from the live OpenAPI schema. Do not edit by hand; run `npm run sync:docs` to refresh. Curated param copy lives in app/docs/checkout/_param-descriptions.json.',
    source: `${schema.info?.title ?? 'Centry API'} v${schema.info?.version ?? '?'}`,
    endpoints,
    requestBodies,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${endpoints.length} endpoints, ${Object.keys(requestBodies).length} request bodies → ${OUT}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
