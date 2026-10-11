// RNW 0.21's reset, classic, shorthand, logical-axis, logical-edge and atomic groups.
// Establish every group on every render, even when it has no rules yet. React
// discovers precedence in render order, so a late shorthand must stay before
// an already rendered longhand. No request-global "already emitted" set.
export const GROUPS = [0, 1, 2, 2.1, 2.2, 3] as const;

function strengthenSelectors(css: string) {
  let result = '';
  let start = 0;
  let quote = '';
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') {
      result +=
        css.slice(start, i).replace(/\.(r-[\w-]+|css-[\w-]+)/g, '.$1.$1') + '{';
      start = i + 1;
    } else if (char === '}') {
      result += css.slice(start, i + 1);
      start = i + 1;
    }
  }
  return result + css.slice(start);
}

export function sheetResources(css: string) {
  const groups = new Map<number, string>();
  let group = 0;
  for (const line of css.split('\n')) {
    const marker = /^\[stylesheet-group=["']([\d.]+)["']\]\s*\{\s*\}$/.exec(
      line,
    );
    if (marker) {
      group = Number(marker[1]);
      if (!GROUPS.some((supported) => supported === group)) {
        throw new Error(
          `Unsupported RNW stylesheet group ${group}. Update @react-native-media-styles/metro.`,
        );
      }
    } else if (line) {
      groups.set(group, (groups.get(group) ?? '') + line + '\n');
    }
  }
  return GROUPS.map((group) => {
    // React can hoist resources before Expo's legacy RNW <style>. Repeating
    // generated class selectors gives the complete resource rules priority
    // over that earlier, incomplete snapshot, including RNW's reset classes.
    // Keep classic and atomic rules at the same specificity relative to each
    // other; their precedence groups still decide shorthand/edge ordering.
    const text = strengthenSelectors(groups.get(group) ?? '');
    // Two independent 32-bit lanes; resource identities are content-addressed.
    let a = 2166136261;
    let b = 2246822507;
    for (let i = 0; i < text.length; i++) {
      a = Math.imul(a ^ text.charCodeAt(i), 16777619);
      b = Math.imul(b ^ text.charCodeAt(i), 3266489909);
    }
    return {
      css: text,
      precedence: `rnms-expo-rnw-${group}`,
      id: `rnms-expo-${group}-${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`,
    };
  });
}
