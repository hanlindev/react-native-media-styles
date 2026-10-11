import {performance} from 'node:perf_hooks';
import {gzipSync} from 'node:zlib';

const [origin, ...paths] = process.argv.slice(2);
if (!origin)
  throw new Error('Usage: node benchmark-http.mts <origin> [paths...]');
const results = [];
for (const path of paths.length ? paths : ['/']) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const start = performance.now();
    const response = await fetch(new URL(path, origin));
    const html = await response.text();
    const responseMs = performance.now() - start;
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
    const resources = styles.filter((match) =>
      /data-href="rnms-/.test(match[0]),
    );
    results.push({
      path,
      attempt,
      responseMs,
      htmlBytes: Buffer.byteLength(html),
      gzipBytes: gzipSync(html).length,
      styleTags: styles.length,
      resourceIdentities: resources.reduce(
        (count, match) =>
          count +
          (match[0].match(/data-href="([^"]*)"/)?.[1].split(' ').length ?? 0),
        0,
      ),
      resourceCssBytes: Buffer.byteLength(
        resources.map((match) => match[1]).join(''),
      ),
    });
  }
}
console.log(
  JSON.stringify(
    {
      node: process.version,
      platform: process.platform,
      description:
        'Sequential requests to one server process. Response time includes local HTTP transport and complete SSR body; gzip size is computed locally. Later routes share the warmed module graph.',
      results,
    },
    null,
    2,
  ),
);
