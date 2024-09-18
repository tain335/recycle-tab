import { isEqual } from "lodash";

export function similarityURL(url: string, another: string) {
  const u = new URL(url);
  const a = new URL(another);
  if (u.protocol !== a.protocol) {
    return false;
  }
  if (u.host !== a.host) {
    return false;
  }
  const uSlash = u.pathname.split('/');
  const aSlash = u.pathname.split('/');
  if (uSlash.length !== aSlash.length) {
    return false;
  }
  return isEqual(uSlash.slice(0, uSlash.length - 1), aSlash.slice(0, aSlash.length - 1))
}