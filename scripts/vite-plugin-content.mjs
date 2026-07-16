import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderContentModules } from './content-scanner.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const writeGenerated = (rootDir) => {
  const outDir = path.join(rootDir, 'src/data/generated');
  fs.mkdirSync(outDir, { recursive: true });
  const modules = renderContentModules(rootDir);
  fs.writeFileSync(path.join(outDir, 'content-index.ts'), modules.indexModule);
  fs.writeFileSync(path.join(outDir, 'search-corpus.ts'), modules.searchModule);
  return modules;
};

/**
 * 开发/构建时把 md 扫描结果写到 src/data/generated，改 md 即可热更新。
 */
export function contentPlugin(rootDir = defaultRoot) {
  const contentDir = path.join(rootDir, 'content');

  return {
    name: 'codenest-content',
    buildStart() {
      writeGenerated(rootDir);
      this.addWatchFile(contentDir);
    },
    configureServer(server) {
      server.watcher.add(contentDir);

      const invalidate = (file) => {
        if (!file.startsWith(contentDir) || !file.endsWith('.md')) {
          return;
        }
        writeGenerated(rootDir);
        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('add', invalidate);
      server.watcher.on('change', invalidate);
      server.watcher.on('unlink', invalidate);
    }
  };
}
