// The JSX runtime for the whole app (see vite.config.ts): React's own, with every element's
// text passed through the translation engine first.
import * as runtime from 'react/jsx-runtime';
import type { ElementType, Key } from 'react';
import { localize } from './hook';

export const Fragment = runtime.Fragment;

export function jsx(type: ElementType, props: unknown, key?: Key) {
  return runtime.jsx(type, localize(type, props), key);
}

export function jsxs(type: ElementType, props: unknown, key?: Key) {
  return runtime.jsxs(type, localize(type, props), key);
}
