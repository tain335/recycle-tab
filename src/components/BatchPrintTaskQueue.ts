interface PrintTask {
  taskId: string | number;
  exec: () => Promise<any>
}

export class BatchPrintTaskQueue<T> {
  private queue: PrintTask[] = [];


  add(task: PrintTask) {
    this.queue.push(task);
  }

  async execAll(progressNotifier?: (index: number, tasks: PrintTask[]) => void): Promise<T[]> {
    const result: T[] = [];
    for (let i = 0; i < this.queue.length; i++) {
      progressNotifier?.(i, this.queue);
      result.push(await this.queue[i].exec());
    }
    return result;
  }

}
