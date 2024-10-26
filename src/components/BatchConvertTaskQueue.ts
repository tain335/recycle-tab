interface ConvertTask {
  taskId: string | number;
  exec: () => Promise<any>
}

export class BatchConvertTaskQueue<T> {
  private queue: ConvertTask[] = [];
  private current: number = -1;
  private result: T[] = [];

  add(task: ConvertTask) {
    this.queue.push(task);
  }

  remove(taskId: string) {
    const index = this.queue.findIndex((task) => task.taskId === taskId);
    if (index !== -1) {
      if (this.current !== -1) {
        if (index < this.current) {
          this.current--;
        }
      }
      this.queue.splice(index, 1);
    }
  }

  async execAll(progressNotifier?: (index: number, tasks: ConvertTask[]) => void): Promise<T[]> {
    for (this.current = 0; this.current < this.queue.length; this.current++) {
      progressNotifier?.(this.current, this.queue);
      this.result.push(await this.queue[this.current].exec());
    }
    return this.result;
  }

  async continue(progressNotifier?: (index: number, tasks: ConvertTask[]) => void) {
    for (; this.current < this.queue.length; this.current++) {
      progressNotifier?.(this.current, this.queue);
      this.result.push(await this.queue[this.current].exec());
    }
    return this.result;
  }

  destroy() {
    this.current = -1;
    this.result = [];
  }
}
