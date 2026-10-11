import {describe, expect, it} from 'vitest';
import {sheetResources, GROUPS} from './resources';

describe('RNW streaming resources', () => {
  it('establishes all precedence groups even before their rules exist', () => {
    const early = sheetResources(
      '[stylesheet-group="3"]{}\n.r-edge{padding-left:4px;}',
    );
    const late = sheetResources(
      '[stylesheet-group="2"]{}\n.r-all{padding:20px;}\n[stylesheet-group="3"]{}\n.r-edge{padding-left:4px;}',
    );
    expect(early.map((resource) => resource.precedence)).toEqual(
      GROUPS.map((group) => `rnms-expo-rnw-${group}`),
    );
    expect(early[5]).toEqual(late[5]);
    expect(early[2].css).toBe('');
    expect(late[2].css).toContain('padding:20px');
  });
  it('uses immutable, deterministic identities for snapshots across requests', () => {
    const css = '[stylesheet-group="1"]{}\n.css-view{display:flex;}';
    expect(sheetResources(css)).toEqual(sheetResources(css));
    expect(sheetResources(css)[1].id).not.toBe(
      sheetResources(css.replace('flex', 'block'))[1].id,
    );
  });
  it('recognizes group markers serialized by the browser CSSOM', () => {
    const resource = sheetResources(
      '[stylesheet-group="3"] { }\n.r-width { width: 10px; }',
    )[5];
    expect(resource.css).toContain('.r-width.r-width');
    expect(
      sheetResources('[stylesheet-group="3"] { }\n.r-width { width: 10px; }')[0]
        .css,
    ).toBe('');
  });
  it('raises selector specificity without rewriting declaration values', () => {
    const resource = sheetResources(
      '[stylesheet-group="3"]{}\n.r-image{background-image:url("/images/css-logo.png");}',
    )[5];
    expect(resource.css).toContain('.r-image.r-image{');
    expect(resource.css).toContain('url("/images/css-logo.png")');
  });
  it('does not silently misorder a new RNW group', () => {
    expect(() => sheetResources('[stylesheet-group="4"]{}')).toThrow(
      'Unsupported RNW stylesheet group',
    );
  });
  it('preserves quoted braces in values and strengthens nested media selectors', () => {
    const resource = sheetResources(
      '[stylesheet-group="3"]{}\n.r-image{background-image:url("/css-logo{.r-icon}.svg");}\n@media (hover:hover){.r-hover:hover{opacity:0.5;}}',
    )[5];
    expect(resource.css).toContain('url("/css-logo{.r-icon}.svg")');
    expect(resource.css).toContain('.r-hover.r-hover:hover{');
  });
});
