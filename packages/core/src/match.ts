import type {MediaEnvironment} from './types';

const LENGTH = /^(?:-?\d+(?:\.\d+)?px|0)$/;

export function assertValidMediaQuery(query: string): void {
  if (!validMediaQuery(query)) {
    throw new Error(`Invalid media query: ${query}`);
  }
}

function validMediaQuery(query: string): boolean {
  const parts = query.trim().split(/\s+and\s+/i);
  return parts.every(validFeature);
}

function validFeature(feature: string): boolean {
  const match = /^\(\s*([a-z-]+)\s*:\s*([^)]*?)\s*\)$/i.exec(feature.trim());
  if (match == null) return false;
  const name = match[1].toLowerCase();
  const value = match[2].trim().toLowerCase();
  if (name === 'min-width' || name === 'max-width' || name === 'width') {
    return LENGTH.test(value);
  }
  if (name === 'orientation')
    return value === 'portrait' || value === 'landscape';
  if (name === 'prefers-color-scheme')
    return value === 'light' || value === 'dark';
  return false;
}

export function queryMatches(query: string, env: MediaEnvironment): boolean {
  const trimmed = query.trim();
  if (trimmed.includes(',') || /\bnot\b/i.test(trimmed)) return false;
  return trimmed
    .split(/\s+and\s+/i)
    .every((feature) => featureMatches(feature, env));
}

function featureMatches(feature: string, env: MediaEnvironment): boolean {
  const body = feature.trim().replace(/^\(/, '').replace(/\)$/, '').trim();
  const match = /^([a-z-]+)\s*:\s*(.+)$/i.exec(body);
  if (match == null) return false;
  const name = match[1].toLowerCase();
  const value = match[2].trim().toLowerCase();
  if (name === 'min-width') return widthAtLeast(value, env.width);
  if (name === 'max-width') return widthAtMost(value, env.width);
  if (name === 'width') return widthEqual(value, env.width);
  if (name === 'orientation') return orientationMatches(value, env);
  if (name === 'prefers-color-scheme') return env.colorScheme === value;
  return false;
}

function widthAtLeast(value: string, width: number): boolean {
  const px = parsePx(value);
  return px != null && width >= px;
}

function widthAtMost(value: string, width: number): boolean {
  const px = parsePx(value);
  return px != null && width <= px;
}

function widthEqual(value: string, width: number): boolean {
  const px = parsePx(value);
  return px != null && width === px;
}

function orientationMatches(value: string, env: MediaEnvironment): boolean {
  const landscape = env.width > env.height;
  if (value === 'landscape') return landscape;
  if (value === 'portrait') return !landscape;
  return false;
}

function parsePx(value: string): number | null {
  const match = /^(-?\d+(?:\.\d+)?)(px)?$/.exec(value.trim());
  if (match == null) return null;
  return Number(match[1]);
}
