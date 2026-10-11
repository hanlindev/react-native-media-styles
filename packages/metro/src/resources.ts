// RNW 0.21's reset, classic, shorthand, logical-axis, logical-edge and atomic groups.
// Establish every group on every render, even when it has no rules yet. React
// discovers precedence in render order, so a late shorthand must stay before
// an already rendered longhand. No request-global "already emitted" set.
export const GROUPS = [0, 1, 2, 2.1, 2.2, 3] as const;

type Resource = {
  css: string;
  classes: string[];
  precedence: string;
  id: string;
};
// RNW retains registered rules for the lifetime of its stylesheet. Reuse the
// corresponding immutable resources as that stylesheet grows.
const ruleCache = new Map<string, Resource>();

export function resourceIdentity(text: string) {
  let a = 2166136261;
  let b = 2246822507;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b ^ text.charCodeAt(i), 3266489909);
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

function splitRules(css: string) {
  const rules: string[] = [];
  let depth = 0;
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
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) {
      rules.push(css.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  return rules;
}

function strengthenSelectors(css: string, classes: Set<string>) {
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
        css
          .slice(start, i)
          .replace(/\.(r-[\w-]+|css-[\w-]+)/g, (_match, name: string) => {
            classes.add(name);
            return `.${name}.${name}`;
          }) + '{';
      start = i + 1;
    } else if (char === '}') {
      result += css.slice(start, i + 1);
      start = i + 1;
    }
  }
  return result + css.slice(start);
}

export function sheetResources(css: string) {
  const rules: {group: number; text: string}[] = [];
  let group = 0;
  for (const line of splitRules(css)) {
    const marker = /^\[stylesheet-group=["']([\d.]+)["']\]\s*\{\s*\}$/.exec(
      line,
    );
    if (marker) {
      group = Number(marker[1]);
      if (!GROUPS.some((supported) => supported === group)) {
        throw new Error(
          `Unsupported RNW stylesheet group ${group}. Update react-native-web-streaming-styles.`,
        );
      }
    } else if (line) {
      rules.push({group, text: line + '\n'});
    }
  }
  // Empty anchors establish precedence before a streamed boundary introduces
  // rules. Every rule has its own immutable identity: adding another rule must
  // never re-emit an accumulated stylesheet under a different identity.
  return [...GROUPS.map((group) => ({group, text: ''})), ...rules].map(
    ({group, text: rule}) => {
      const cacheKey = `${group}:${rule}`;
      const cached = ruleCache.get(cacheKey);
      if (cached) return cached;
      // React can hoist resources before Expo's legacy RNW <style>. Repeating
      // generated class selectors gives the complete resource rules priority
      // over that earlier, incomplete snapshot, including RNW's reset classes.
      // Keep classic and atomic rules at the same specificity relative to each
      // other; their precedence groups still decide shorthand/edge ordering.
      const classes = new Set<string>();
      const text = strengthenSelectors(rule, classes);
      // Two independent 32-bit lanes; resource identities are content-addressed.
      const resource = {
        css: text,
        classes: [...classes],
        precedence: `rnms-expo-rnw-${group}`,
        id: `rnms-expo-${group}-${resourceIdentity(text)}`,
      };
      ruleCache.set(cacheKey, resource);
      return resource;
    },
  );
}
