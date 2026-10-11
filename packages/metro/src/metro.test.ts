import {expect, it, vi} from 'vitest';
import {withStreamingStyles} from '../dist/metro.cjs';

it('intercepts ordered-sheet registration only on web and bypasses its original import', () => {
  const filePath =
    '/app/node_modules/react-native-web/dist/exports/StyleSheet/dom/createOrderedCSSStyleSheet.js';
  const resolveRequest = vi.fn(
    (_context: unknown, _name: string, _platform: string | null) => ({
      type: 'sourceFile',
      filePath,
    }),
  );
  const config = withStreamingStyles({resolver: {resolveRequest}});
  expect(
    config.resolver
      .resolveRequest({}, './createOrderedCSSStyleSheet', 'web')
      .filePath?.replaceAll('\\', '/'),
  ).toMatch(/\/src\/orderedSheet.ts$/);
  expect(
    config.resolver.resolveRequest({}, './createOrderedCSSStyleSheet', 'ios')
      .filePath,
  ).toBe(filePath);
  expect(
    config.resolver.resolveRequest(
      {},
      'react-native-web-streaming-styles/original-ordered-sheet',
      'web',
    ).filePath,
  ).toBe(filePath);
  expect(resolveRequest).toHaveBeenLastCalledWith(
    {},
    'react-native-web/dist/exports/StyleSheet/dom/createOrderedCSSStyleSheet',
    'web',
  );
});

function setup() {
  const resolveRequest = vi.fn(
    (_context: unknown, name: string, _platform: string | null) => ({
      type: 'sourceFile',
      filePath:
        name === 'view' ||
        name === 'react-native-web/dist/exports/createElement'
          ? '/app/node_modules/react-native-web/dist/exports/createElement/index.js'
          : '/app/other.js',
    }),
  );
  const config = {resolver: {resolveRequest}, watchFolders: ['/app']};
  return {config, resolveRequest, wrapped: withStreamingStyles(config)};
}

it('the compiled entry redirects web elements to the shipped source and preserves the resolver', () => {
  const {config, resolveRequest, wrapped} = setup();
  const context = {
    originModulePath:
      '/app/node_modules/react-native-web/dist/exports/View/index.js',
  };
  expect(wrapped.watchFolders).toBe(config.watchFolders);
  expect(
    wrapped.resolver
      .resolveRequest(context, 'view', 'web')
      .filePath.replaceAll('\\', '/'),
  ).toMatch(/\/packages\/metro\/src\/createElement\.ts$/);
  expect(resolveRequest).toHaveBeenCalledWith(context, 'view', 'web');
  expect(config.resolver.resolveRequest).toBe(resolveRequest);
});

it('preserves the public factory for SVG, direct callers and element cloning', () => {
  const {wrapped} = setup();
  for (const originModulePath of [
    '/app/node_modules/react-native-web/dist/index.js',
    '/app/node_modules/react-native-svg/lib/module/web/WebShape.js',
    '/app/components/CustomPrimitive.tsx',
  ]) {
    expect(
      wrapped.resolver.resolveRequest(
        {originModulePath},
        'react-native-web/dist/exports/createElement',
        'web',
      ).filePath,
    ).toBe(
      '/app/node_modules/react-native-web/dist/exports/createElement/index.js',
    );
  }
});

it('preserves native resolution and bypasses interception for the original web factory', () => {
  const {wrapped, resolveRequest} = setup();
  const context = {};
  expect(
    wrapped.resolver.resolveRequest(context, 'view', 'android').filePath,
  ).toContain('react-native-web/dist/exports/createElement');
  expect(
    wrapped.resolver.resolveRequest(
      context,
      'react-native-web-streaming-styles/original-create-element',
      'web',
    ).filePath,
  ).toContain('react-native-web/dist/exports/createElement');
  expect(resolveRequest).toHaveBeenLastCalledWith(
    context,
    'react-native-web/dist/exports/createElement',
    'web',
  );
});
