import {describe, expect, it} from 'vitest';
import {createRuleRegistry} from './registry';

describe('incremental stylesheet registry', () => {
  it('selects only rules needed by an element as thousands of unrelated rules register', () => {
    const registry = createRuleRegistry();
    for (let height = 1; height <= 3000; height++)
      registry.insert(`.r-height${height}{height:${height}px;}`, 3);
    const selected = registry.select('r-height3000');
    expect(selected).toHaveLength(7);
    expect(selected.map((resource) => resource.css).join('')).toBe(
      '.r-height3000.r-height3000{height:3000px;}\n',
    );
  });
  it('declares identical dependencies for separate requests and retries', () => {
    const registry = createRuleRegistry();
    registry.insert('.r-edge{padding-left:4px;}', 3);
    const before = registry.select('r-edge');
    registry.insert('.r-edge{padding-left:4px;}', 3);
    registry.insert('.r-other{color:red;}', 3);
    expect(registry.select('r-edge')).toEqual(before);
  });
  it('hydrates existing browser rules and includes resets and keyframes', () => {
    const registry = createRuleRegistry();
    registry.hydrate(
      '[stylesheet-group="0"]{}\nbody{margin:0;}\n[stylesheet-group="3"]{}\n@keyframes move{from{opacity:0;}to{opacity:1;}}\n.r-image{background-image:url("/css-logo.r-fake.svg");}',
    );
    const css = registry
      .select('r-image')
      .map((resource) => resource.css)
      .join('');
    expect(css).toContain('body{margin:0;}');
    expect(css).toContain('@keyframes move');
    expect(css).toContain('.r-image.r-image');
    expect(
      registry
        .select('r-fake')
        .map((resource) => resource.css)
        .join(''),
    ).not.toContain('background-image');
  });
  it('deduplicates a rule selected by multiple classes and preserves nested media rules', () => {
    const registry = createRuleRegistry();
    registry.insert('@media (hover:hover){.r-a,.r-b:hover{opacity:0.5;}}', 3);
    expect(registry.select('r-a r-b')).toHaveLength(7);
    expect(registry.select('r-a r-b')[6].css).toContain('.r-b.r-b:hover');
  });
});
