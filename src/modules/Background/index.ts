import { initMessageHandler } from './message_handler';
import { initMessageDispatcher } from './message_dispatcher';
import { initTabRecycle } from "./tab_recycle";
import { initContextMenu } from "./context_menu";
import { initInterceptRequest } from './intercept_request';

initContextMenu();
initTabRecycle();
initMessageHandler();
initMessageDispatcher();
initInterceptRequest();