import { initMessageHandler } from './message_handler';
import { initMessageDispatcher } from './message_dispatcher';
import { initTabRecycle } from "./tab_recycle";
import { initContextMenu } from "./context_menu";
import { initResolveCORSRules } from './intercept_request';

initContextMenu();
if (FEATURE_RECYCLE) {
  initTabRecycle();
}
initMessageHandler();
initMessageDispatcher();
initResolveCORSRules(10001, chrome.runtime.id);