import {expect, it, vi} from 'vitest';
import createOrderedSheet from './orderedSheet';
import {registry} from './registry';

it('records insertions while retaining RNW ordering and avoiding further stylesheet reads', () => {
  const ordered = createOrderedSheet(null);
  const read = vi.spyOn(ordered, 'getTextContent');
  ordered.insert('.r-late-edge{padding-left:4px;}', 3);
  ordered.insert('.r-late-all{padding:20px;}', 2);
  ordered.insert('.r-late-edge{padding-left:4px;}', 3);
  for (let index = 0; index < 100; index++) {
    expect(registry.select('r-late-edge r-late-all')).toHaveLength(8);
  }
  expect(read).not.toHaveBeenCalled();
  const css = ordered.getTextContent();
  expect(css.indexOf('padding:20px')).toBeLessThan(
    css.indexOf('padding-left:4px'),
  );
  expect(css.match(/padding-left:4px/g)).toHaveLength(1);
});
