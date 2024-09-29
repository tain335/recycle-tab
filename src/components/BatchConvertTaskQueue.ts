interface ConvertTask {
  taskId: string | number;
  exec: () => Promise<any>
}

export class BatchConvertTaskQueue<T> {
  private queue: ConvertTask[] = [];


  add(task: ConvertTask) {
    this.queue.push(task);
  }

  async execAll(progressNotifier?: (index: number, tasks: ConvertTask[]) => void): Promise<T[]> {
    const result: T[] = [];
    for (let i = 0; i < this.queue.length; i++) {
      progressNotifier?.(i, this.queue);
      result.push(await this.queue[i].exec());
    }
    return result;
  }

}
