import { useMemo, useRef } from "react";

export function useMemoRef<T>(factory: (old?: T) => T, dependencies: any[]): T {
  const ref = useRef<T>()
  ref.current = useMemo(() => factory(ref.current), dependencies)
  return ref.current;
}