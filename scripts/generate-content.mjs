/**
 * 扫描 content/ 并写入 src/data/generated/*，供应用与 tsc 直接引用。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderContentModules } from './content-scanner.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'src/data/generated');

fs.mkdirSync(outDir, { recursive: true });

const modules = renderContentModules(rootDir);
fs.writeFileSync(path.join(outDir, 'content-index.ts'), modules.indexModule);
fs.writeFileSync(path.join(outDir, 'search-corpus.ts'), modules.searchModule);

console.log(`Generated content index (${modules.indexModule.length} chars) and search corpus.`);
