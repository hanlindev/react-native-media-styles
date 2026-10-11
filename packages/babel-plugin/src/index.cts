import type {ConfigAPI, NodePath, PluginObj, PluginPass} from '@babel/core';
import type * as Types from '@babel/types';

type PluginAPI = typeof import('@babel/core') & ConfigAPI;
type State = PluginPass & {companion: Types.Identifier; used: boolean};
type HookKind = 'useBreakpointStyle' | 'useBreakpointStyles';

function mediaStylesPlugin(api: PluginAPI): PluginObj<State> {
  api.assertVersion('^7.0.0');
  const t = api.types;
  const source = '@react-native-media-styles/core';
  function hookKind(
    path: NodePath<Types.CallExpression>,
  ): HookKind | undefined {
    const callee = path.get('callee');
    let binding;
    let name;
    if (callee.isIdentifier()) {
      binding = path.scope.getBinding(callee.node.name);
      if (!binding?.path.isImportSpecifier()) return;
      const imported = binding.path.node.imported;
      name = t.isIdentifier(imported) ? imported.name : imported.value;
    } else if (
      callee.isMemberExpression() &&
      !callee.node.computed &&
      t.isIdentifier(callee.node.object) &&
      t.isIdentifier(callee.node.property)
    ) {
      binding = path.scope.getBinding(callee.node.object.name);
      if (!binding?.path.isImportNamespaceSpecifier()) return;
      name = callee.node.property.name;
    }
    if (
      !binding?.path.parentPath?.isImportDeclaration() ||
      binding.path.parentPath.node.source.value !== source
    )
      return;
    if (name === 'useBreakpointStyle' || name === 'useBreakpointStyles')
      return name;
  }
  return {
    name: 'react-native-media-styles-companions',
    visitor: {
      Program: {
        enter(path, state) {
          state.companion =
            path.scope.generateUidIdentifier('BreakpointStyles');
          state.used = false;
        },
        exit(path, state) {
          if (state.used)
            path.unshiftContainer(
              'body',
              t.importDeclaration(
                [
                  t.importSpecifier(
                    state.companion,
                    t.identifier('BreakpointStyles'),
                  ),
                ],
                t.stringLiteral(source),
              ),
            );
        },
      },
      Function(path, state) {
        const calls: {path: NodePath<Types.CallExpression>; kind: HookKind}[] =
          [];
        let hasJSX = false;
        path.traverse({
          Function(inner) {
            inner.skip();
          },
          JSXElement() {
            hasJSX = true;
          },
          JSXFragment() {
            hasJSX = true;
          },
          CallExpression(call) {
            const kind = hookKind(call);
            if (kind) calls.push({path: call, kind});
          },
        });
        if (!calls.length) return;
        const name =
          ('id' in path.node ? path.node.id?.name : undefined) ??
          (path.parentPath.isVariableDeclarator() &&
          t.isIdentifier(path.parentPath.node.id)
            ? path.parentPath.node.id.name
            : undefined);
        if (!hasJSX && !/^[A-Z]/.test(name ?? '')) return;
        const body = path.get('body');
        if (body.isExpression()) {
          path
            .get('body')
            .replaceWith(t.blockStatement([t.returnStatement(body.node)]));
        }
        const tokens = path.scope.generateUidIdentifier('breakpointTokens');
        const locals: Types.VariableDeclarator[] = [];
        for (const {path: call, kind} of calls) {
          if (kind === 'useBreakpointStyle') {
            if (
              call.node.arguments.length !== 1 ||
              !t.isExpression(call.node.arguments[0])
            ) {
              throw call.buildCodeFrameError(
                'Automatic companions require useBreakpointStyle(token) with one explicit argument.',
              );
            }
            const token = path.scope.generateUidIdentifier('breakpointToken');
            locals.push(t.variableDeclarator(token));
            call.node.arguments[0] = t.sequenceExpression([
              t.assignmentExpression('=', token, call.node.arguments[0]),
              t.callExpression(
                t.memberExpression(tokens, t.identifier('push')),
                [token],
              ),
              token,
            ]);
          } else {
            const combined = path.scope.generateUidIdentifier(
              'combinedBreakpointStyle',
            );
            locals.push(t.variableDeclarator(combined));
            const original = t.cloneNode(call.node, true);
            call.replaceWith(
              t.sequenceExpression([
                t.assignmentExpression('=', combined, original),
                t.callExpression(
                  t.memberExpression(tokens, t.identifier('push')),
                  [t.memberExpression(combined, t.identifier('token'))],
                ),
                combined,
              ]),
            );
          }
        }
        const block = path.get('body');
        if (!block.isBlockStatement()) return;
        block.unshiftContainer('body', [
          t.variableDeclaration('const', [
            t.variableDeclarator(tokens, t.arrayExpression([])),
          ]),
          ...(locals.length ? [t.variableDeclaration('let', locals)] : []),
        ]);
        // Return expressions are evaluated before React renders the companion.
        // Inline hook calls therefore populate this render's local array too.
        path.traverse({
          Function(inner) {
            inner.skip();
          },
          ReturnStatement(result) {
            const content = result.node.argument ?? t.nullLiteral();
            const companion = t.jsxElement(
              t.jsxOpeningElement(
                t.jsxIdentifier(state.companion.name),
                [
                  t.jsxAttribute(
                    t.jsxIdentifier('tokens'),
                    t.jsxExpressionContainer(tokens),
                  ),
                ],
                true,
              ),
              null,
              [],
              true,
            );
            result.node.argument = t.jsxFragment(
              t.jsxOpeningFragment(),
              t.jsxClosingFragment(),
              [companion, t.jsxExpressionContainer(content)],
            );
          },
        });
        state.used = true;
      },
    },
  };
}

export = mediaStylesPlugin;
