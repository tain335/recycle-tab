export function hasFlags(state: number, ...flags: number[]): boolean {
  let flag = 0;
  flags.forEach((f) => {
    flag = flag | f;
  })
  return Boolean(state & flag)
}

export function assignFlags(state: number, ...flags: number[]): number {
  let flag = 0;
  flags.forEach((f) => {
    flag = flag | f;
  })
  return state | flag;
}

export function removeFlags(state: number, ...flags: number[]): number {
  flags.forEach((f) => {
    state = state & ~f
  });
  return state;
}

export function isNoFlags(state: number, ...flags: number[]): boolean {
  for (let f of flags) {
    if (hasFlags(state, f)) {
      return false;
    }
  }
  return true;
}