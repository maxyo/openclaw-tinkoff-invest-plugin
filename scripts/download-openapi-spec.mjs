import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SPEC_URL = 'https://tinkoff.github.io/investAPI/swagger-ui/openapi.yaml';
const SPEC_URL = process.env.TINKOFF_INVEST_OPENAPI_SPEC_URL ?? DEFAULT_SPEC_URL;
const SPEC_RELATIVE_PATH = 'specs/tinkoff-invest-openapi.yaml';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const specPath = path.join(repoRoot, SPEC_RELATIVE_PATH);

let response;

try {
  response = await fetch(SPEC_URL, {
    headers: {
      'user-agent': 'openclaw-plugin-tinkoff-invest-spec-downloader'
    },
    signal: AbortSignal.timeout(30_000)
  });
} catch (error) {
  throw new Error(`Failed to download OpenAPI spec from ${SPEC_URL}`, { cause: error });
}

if (!response.ok) {
  throw new Error(`Failed to download OpenAPI spec from ${SPEC_URL}: ${response.status} ${response.statusText}`);
}

const specBody = await response.text();
await mkdir(path.dirname(specPath), { recursive: true });
await writeFile(specPath, specBody, 'utf8');

console.log(`Saved OpenAPI spec to ${SPEC_RELATIVE_PATH} from ${SPEC_URL}`);
