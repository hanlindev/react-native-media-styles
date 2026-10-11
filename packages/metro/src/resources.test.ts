import {describe, expect, it} from 'vitest';
import {sheetResources, GROUPS} from './resources';

describe('RNW streaming resources', () => {
  it('delivers each rule once when successively growing sheets are deduplicated', () => {
    const delivered = new Map<string, string>();
    let css = '[stylesheet-group="3"]{}';
    for (let height = 1; height <= 100; height++) {
      css += `\n.r-height${height}{height:${height}px;}`;
      for (const resource of sheetResources(css))
        delivered.set(resource.id, resource.css);
    }
    expect(delivered.size).toBe(106);
    const output = [...delivered.values()].join('');
    expect(output.match(/height:/g)).toHaveLength(100);
    // A separate request still receives all resources, even with warm caches.
    expect(sheetResources(css)).toHaveLength(106);
  });
  it('keeps a multiline nested rule in a single resource', () => {
    const resources = sheetResources(
      '[stylesheet-group="3"]{}\n@media (hover:hover) {\n.r-hover:hover { opacity:0.5; }\n}',
    );
    expect(resources).toHaveLength(7);
    expect(resources[6].css).toContain('.r-hover.r-hover:hover');
  });
  it('establishes all precedence groups even before their rules exist', () => {
    const early = sheetResources(
      '[stylesheet-group="3"]{}\n.r-edge{padding-left:4px;}',
    );
    const late = sheetResources(
      '[stylesheet-group="2"]{}\n.r-all{padding:20px;}\n[stylesheet-group="3"]{}\n.r-edge{padding-left:4px;}',
    );
    expect(early.slice(0, 6).map((resource) => resource.precedence)).toEqual(
      GROUPS.map((group) => `rnms-expo-rnw-${group}`),
    );
    expect(early[6]).toEqual(late[7]);
    expect(early[2].css).toBe('');
    expect(late[6].css).toContain('padding:20px');
  });
  it('uses immutable, deterministic identities for rules across requests', () => {
    const css = '[stylesheet-group="1"]{}\n.css-view{display:flex;}';
    expect(sheetResources(css)).toEqual(sheetResources(css));
    expect(sheetResources(css)[6].id).not.toBe(
      sheetResources(css.replace('flex', 'block'))[6].id,
    );
  });
  it('recognizes group markers serialized by the browser CSSOM', () => {
    const resource = sheetResources(
      '[stylesheet-group="3"] { }\n.r-width { width: 10px; }',
    )[6];
    expect(resource.css).toContain('.r-width.r-width');
    expect(
      sheetResources('[stylesheet-group="3"] { }\n.r-width { width: 10px; }')[0]
        .css,
    ).toBe('');
  });
  it('raises selector specificity without rewriting declaration values', () => {
    const resource = sheetResources(
      '[stylesheet-group="3"]{}\n.r-image{background-image:url("/images/css-logo.png");}',
    )[6];
    expect(resource.css).toContain('.r-image.r-image{');
    expect(resource.css).toContain('url("/images/css-logo.png")');
  });
  it('does not silently misorder a new RNW group', () => {
    expect(() => sheetResources('[stylesheet-group="4"]{}')).toThrow(
      'Unsupported RNW stylesheet group',
    );
  });
  it('preserves quoted braces in values and strengthens nested media selectors', () => {
    const resources = sheetResources(
      '[stylesheet-group="3"]{}\n.r-image{background-image:url("/css-logo{.r-icon}.svg");}\n@media (hover:hover){.r-hover:hover{opacity:0.5;}}',
    );
    expect(resources[6].css).toContain('url("/css-logo{.r-icon}.svg")');
    expect(resources[7].css).toContain('.r-hover.r-hover:hover{');
  });
});
