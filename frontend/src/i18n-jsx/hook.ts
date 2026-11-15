// The JSX runtime reaches the translation engine through this one global hook instead of
// importing it. The dev server pre-bundles and caches the runtime, and a cached copy that
// contained the engine itself would go stale whenever the engine or the dictionary changed.
type Localize = (type: unknown, props: unknown) => unknown;

export function localize<P>(type: unknown, props: P): P {
  const hook = (globalThis as { __neuronLabLocalize?: Localize }).__neuronLabLocalize;
  return hook ? hook(type, props) as P : props;
}
