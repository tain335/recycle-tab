import mitt from "mitt"

type FrontendEvents = {
  "update_tab_list": void
}

export const frontendEmitter = mitt<FrontendEvents>()
