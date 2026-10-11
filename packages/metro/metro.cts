import path = require('node:path');

type Resolution = {type: string; filePath?: string};
type ResolveContext = {resolveRequest: Resolver};
type Resolver = (
  context: ResolveContext,
  name: string,
  platform: string | null,
) => Resolution;
type ResolverConfig = {resolveRequest?: Resolver | null};

/** Preserve the application's resolver, then adapt RNW's DOM element factory. */
export function withMediaStyles<T extends {resolver?: object}>(config: T): T {
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
          name === '@react-native-media-styles/metro/original-create-element'
        ) {
          return resolve(
            context,
            'react-native-web/dist/exports/createElement',
            platform,
          );
        }
        const result = resolve(context, name, platform);
        if (
          platform === 'web' &&
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
