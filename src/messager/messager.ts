const CROSS_MESSAGE = 'CROSS_MESSAGE';
const RESPONSE_ACTION = 'RESPONSE_ACTION';

let seq = 1;

type CrossMessage = {
  type?: typeof CROSS_MESSAGE,
  err?: string,
  seq: number,
  action: string;
  data: any[];
}

type CrossMessageHandler = (params: any) => (void | Promise<any>);

export type CrossMessages<T> = Record<keyof T, CrossMessageHandler>

export class CrossMessager<ReceiverMessages extends CrossMessages<ReceiverMessages>, SenderMessages extends
  CrossMessages<SenderMessages>> {
  private pendings: Record<number, { p: Promise<any>, handlers: ((v: any) => void)[] }> = {}
  private actions: ReceiverMessages = {} as ReceiverMessages;
  private diposeActions: (() => void)[] = [];

  constructor(private post: (message: any) => void) {
    const onMessageHandler = (event: WindowEventMap['message']) => {
      console.info("receive message", event);
      if ((event.data as CrossMessage).type === CROSS_MESSAGE) {
        this.dispatch(event.data as CrossMessage);
      }
    };
    window.addEventListener('message', onMessageHandler);
    this.diposeActions.push(() => window.removeEventListener('message', onMessageHandler))
  }

  registerReceiveActions(actions: ReceiverMessages) {
    this.actions = actions;
    return this;
  }

  private dispatch(message: CrossMessage) {
    if (message.action === RESPONSE_ACTION) {
      const pending = this.pendings[message.seq];
      if (pending) {
        if (message.err) {
          pending.handlers[1](new Error(message.err));
        } else {
          pending.handlers[0](message.data);
        }
        delete this.pendings[message.seq];
      }
    } else if (this.actions[message.action as keyof ReceiverMessages]) {
      const result = this.actions[message.action as keyof ReceiverMessages](message.data)
      if (result instanceof Promise) {
        result.then((v) => {
          this.post({
            type: CROSS_MESSAGE,
            action: RESPONSE_ACTION,
            data: v,
            seq: message.seq
          });
        }).catch((err) => {
          this.post({
            type: CROSS_MESSAGE,
            action: RESPONSE_ACTION,
            err,
            seq: message.seq
          });
        })
      } else {
        this.post({
          type: CROSS_MESSAGE,
          action: RESPONSE_ACTION,
          data: result,
          seq: message.seq
        });
      }
    }
  }

  send<T extends keyof SenderMessages>(action: T, params?: Parameters<SenderMessages[T]>[0]): Promise<Awaited<ReturnType<SenderMessages[T]>>> {
    const seqId = seq++;
    this.post({
      type: CROSS_MESSAGE,
      action,
      data: params,
      seq: seqId
    });

    let handlers: ((v: any) => void)[] = [];
    const p = new Promise<Awaited<ReturnType<SenderMessages[T]>>>((resolve, reject) => {
      handlers = [resolve, reject];
    });

    this.pendings[seqId] = { p, handlers }
    return p
  }

  dispose() {
    this.diposeActions.forEach((action) => action());
  }
}