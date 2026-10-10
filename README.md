# react-native-media-styles

This pnpm workspace contains responsive styles for React Native and React Native Web.

- [`@react-native-media-styles/core`](./packages/core/README.md): tokens, composition, normalization, and stylesheet companions.
- [`examples/expo`](./examples/expo/README.md): private Expo Router SSR and SPA demo, excluded from npm packages.

`@react-native-media-styles/expo` and `@react-native-media-styles/babel-plugin` are planned packages; they are not implemented yet.

## Development

Use Node 24+ and the pinned pnpm version:

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm test:package
pnpm demo:ssr
```

Root commands run the core checks. To run its commands directly, use `pnpm --filter @react-native-media-styles/core <command>`. See the demo README for SPA, production builds, and browser verification.
