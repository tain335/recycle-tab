import mitt from "mitt"

type FrontendEvents = {
  "update": void
}

export const frontendEmitter = mitt<FrontendEvents>()