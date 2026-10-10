# Expo Router demo

This private workspace app demonstrates `@react-native-media-styles/core` from local source in `packages/core`. It is excluded from the npm package, along with its dependencies, build output, and tests.

Use Node 24+ and the repository's pinned pnpm version. From the repository root:

```sh
pnpm install
pnpm demo:ssr
```

Open http://localhost:8081 for development SSR. Expo SDK 57 requires `unstable_useServerRendering`, which this demo enables in server mode. To run the client-rendered SPA instead:

```sh
pnpm demo:spa
```

Open http://localhost:8082. Both commands use the same route components and companions. Neither creates a global stylesheet or eager style registration list.

Route splitting is enabled in production builds. Development uses synchronous routes so Expo's route-bundling fallback does not replace server-rendered content during hydration. The separate lazy `StreamCard` still demonstrates component streaming in development and production.

For production builds and local serving:

```sh
pnpm --dir examples/expo build:ssr
pnpm --dir examples/expo serve:ssr

pnpm --dir examples/expo build:spa
pnpm --dir examples/expo serve:spa
```

The output directories are `dist-server` and `dist-single`. The optional `build:static` command exports static HTML to `dist-static`. The small `scripts/expo.mjs` launcher selects the output mode without shell-specific environment syntax.

## What to try

- Resize across 800px: the heading, card layout, and padding change using actual media queries.
- Click **Test interactivity** to verify SSR hydration or SPA mounting.
- Follow **Lazy route**: the details route has its own colocated tokens and loads in a separate JavaScript chunk.
- Open `/details` directly in SSR mode: the response includes that route's stylesheet resources without any registration by its parent.
- On a cold SSR process, the overview's delayed component waits 1.2 seconds before its first lazy load. The shell/fallback can stream immediately; the component and its stylesheet arrive later. The delay is cached after that first module load. Restart the server to observe it again.

`+html.tsx` preserves Expo's head/body assets and attributes. It does not collect or inject library styles. Each component renders its own `BreakpointStyles` companion. Ordinary component styling is handled by React Native's `StyleSheet`; the breakpoint tokens own the responsive properties.

## Development dependency fixes

Version-pinned pnpm patches in `patches/` fix two SDK 57 development issues. Expo Router's bundling toast uses the JavaScript animation driver on web and keeps the native driver on native. Expo's CLI and HTTP adapter propagate canceled requests without producing Metro error overlays for the request's own abort reason. Other errors still follow the normal error handlers, including errors occurring after a disconnect.

The patches apply during `pnpm install` through the workspace configuration. They and the demo dependencies are excluded from the library's npm package. Restart the development server after installing. On dependency upgrades, review whether upstream has fixed these issues before carrying the patches forward. Repeated `λ Bundled` and `Web Bundled` messages are normal development output.

With the SSR development server running, `pnpm --dir examples/expo test:dev` checks first-paint styling, retention of the visible shell during hydration, streaming, and interactivity. Pass a URL as an argument to check another port.

## Verification

Build both production modes first, then:

```sh
pnpm --dir examples/expo exec playwright install chromium
pnpm --dir examples/expo test:e2e
pnpm --dir examples/expo test:patches
pnpm --dir examples/expo typecheck
pnpm test:package
```

Playwright starts fresh production servers on ports 8091 and 8092, separate from the interactive demos. Its tests cover first-visible-frame streaming styles, responsive CSS, hydration/interactivity, lazy client navigation, resource deduplication, and a direct server-rendered route with JavaScript disabled. The library's own tests exercise delayed SSR boundaries and concurrent renders. `test:package` inspects `npm pack --dry-run` and fails if demo or test files enter the publish payload.
