export function readBlobAsUint8Array(blob: Blob): Promise<Uint8Array> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      resolve(uint8Array)
    }
    reader.onerror = ((err) => {
      reject(err);
    });
    reader.readAsArrayBuffer(blob)
  })
}