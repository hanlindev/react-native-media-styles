import path = require('node:path');

type Resolution = {type: string; filePath?: string};
type ResolveContext = {resolveRequest: Resolver; originModulePath?: string};
type Resolver = (
  context: ResolveContext,
  name: string,
  platform: string | null,
) => Resolution;
type ResolverConfig = {resolveRequest?: Resolver | null};

/** Preserve the application's resolver, then adapt RNW's DOM element factory. */
export function withStreamingStyles<T extends {resolver?: object}>(
  config: T,
): T {
  const resolver: ResolverConfig = config.resolver ?? {};
  const previous = resolver.resolveRequest;
  const resolve: Resolver = (context, name, platform) =>
    previous
      ? previous(context, name, platform)
      : context.resolveRequest(context, name, platform);
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest(
        context: ResolveContext,
        name: string,
        platform: string | null,
      ) {
        if (
          name === 'react-native-web-streaming-styles/original-create-element'
        ) {
          return resolve(
            context,
            'react-native-web/dist/exports/createElement',
            platform,
          );
        }
        if (
          name === 'react-native-web-streaming-styles/original-ordered-sheet'
        ) {
          return resolve(
            context,
            'react-native-web/dist/exports/StyleSheet/dom/createOrderedCSSStyleSheet',
            platform,
          );
        }
        const result = resolve(context, name, platform);
        // RNW's public factory is also used by SVG and callers that clone its
        // returned element. Only RNW's own HTML components may gain siblings.
        // In SVG, React treats <style> as SVG content, not a hoisted resource.
        const origin = context.originModulePath?.replaceAll('\\', '/') ?? '';
        if (
          platform === 'web' &&
          result.type === 'sourceFile' &&
          result.filePath
            ?.replaceAll('\\', '/')
            .endsWith(
              '/react-native-web/dist/exports/StyleSheet/dom/createOrderedCSSStyleSheet.js',
            )
        ) {
          return {
            type: 'sourceFile',
            filePath: path.join(__dirname, '../src/orderedSheet.ts'),
          };
        }
        if (
          platform === 'web' &&
          /\/react-native-web\/dist\/(?:exports|modules)\//.test(origin) &&
          result.type === 'sourceFile' &&
          typeof result.filePath === 'string' &&
          result.filePath
            .replaceAll('\\', '/')
            .endsWith('/react-native-web/dist/exports/createElement/index.js')
        ) {
          return {
            type: 'sourceFile',
            filePath: path.join(__dirname, '../src/createElement.ts'),
          };
        }
        return result;
      },
    },
  };
}
