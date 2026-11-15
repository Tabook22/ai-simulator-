// The development twin of jsx-runtime.ts.
import * as runtime from 'react/jsx-dev-runtime';
import type { ElementType, Key } from 'react';
import { localize } from './hook';

export const Fragment = runtime.Fragment;

export function jsxDEV(type: ElementType, props: unknown, key: Key | undefined, isStatic: boolean,
  source?: unknown, self?: unknown) {
  return (runtime as unknown as { jsxDEV: (...parts: unknown[]) => unknown })
    .jsxDEV(type, localize(type, props), key, isStatic, source, self);
}
