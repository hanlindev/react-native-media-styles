import {expect, it, vi} from 'vitest';
import {withMediaStyles} from '../dist/metro.cjs';

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
  return {config, resolveRequest, wrapped: withMediaStyles(config)};
}

it('the compiled entry redirects web elements to the shipped source and preserves the resolver', () => {
  const {config, resolveRequest, wrapped} = setup();
  const context = {};
  expect(wrapped.watchFolders).toBe(config.watchFolders);
  expect(
    wrapped.resolver
      .resolveRequest(context, 'view', 'web')
      .filePath.replaceAll('\\', '/'),
  ).toMatch(/\/packages\/metro\/src\/createElement\.ts$/);
  expect(resolveRequest).toHaveBeenCalledWith(context, 'view', 'web');
  expect(config.resolver.resolveRequest).toBe(resolveRequest);
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
      '@react-native-media-styles/metro/original-create-element',
      'web',
    ).filePath,
  ).toContain('react-native-web/dist/exports/createElement');
  expect(resolveRequest).toHaveBeenLastCalledWith(
    context,
    'react-native-web/dist/exports/createElement',
    'web',
  );
});
