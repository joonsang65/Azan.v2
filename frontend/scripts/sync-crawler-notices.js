const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const outputPath = path.join(
  projectRoot,
  'app',
  'data',
  'generated',
  'crawler-notices.json'
);

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const entries = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    entries[key] = value;
  }

  return entries;
}

function resolveFromProject(relativeOrAbsolutePath, fallbackPath) {
  const target = relativeOrAbsolutePath || fallbackPath;
  if (!target) {
    return null;
  }

  return path.isAbsolute(target)
    ? target
    : path.resolve(projectRoot, target);
}

function loadJsonArray(filePath, sourceName) {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!Array.isArray(parsed)) {
    throw new Error(`${sourceName} JSON is not an array: ${filePath}`);
  }

  return parsed;
}

function dedupeById(items) {
  const seen = new Map();

  for (const item of items) {
    const id =
      item.id ||
      item.source_notice_id ||
      item.ntt_id ||
      item.bbs_id ||
      item.dedupe_hash ||
      `${item.title || 'notice'}-${item.url || item.source_url || ''}`;

    seen.set(String(id), {
      ...item,
      id: String(id),
    });
  }

  return [...seen.values()];
}

function main() {
  const env = {
    ...parseEnvFile(envPath),
    ...process.env,
  };

  const oiaPath = resolveFromProject(
    env.CRAWLER_OIA_JSON_PATH,
    '..\\..\\workers\\crawlers\\data\\oia_notices_all.json'
  );
  const topikPath = resolveFromProject(
    env.CRAWLER_TOPIK_JSON_PATH,
    '..\\..\\workers\\crawlers\\data\\topik_notices.json'
  );

  const oia = loadJsonArray(oiaPath, 'OIA');
  const topik = loadJsonArray(topikPath, 'TOPIK');
  const notices = dedupeById([...oia, ...topik]);

  const payload = {
    notices,
    syncedAt: new Date().toISOString(),
    sources: [
      { name: 'oia', path: oiaPath, count: oia.length },
      { name: 'topik', path: topikPath, count: topik.length },
    ],
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Synced ${notices.length} notices to ${outputPath}`);
}

main();
