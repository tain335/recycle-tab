const GlobalCache = new WeakMap<any, number>();
let ObjectId = 0;
export function getObjectKey(obj: any) {
  const id = GlobalCache.get(obj);
  if (!id) {
    ObjectId++;
    GlobalCache.set(obj, ObjectId);
    return ObjectId;
  }
  return id;
}