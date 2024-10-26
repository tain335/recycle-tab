export async function initResolveCORSRules(ruleId: number, domain: string) {

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId, ruleId + 1],
    addRules: [
      {
        id: ruleId,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: 'Sec-Fetch-Mode', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'navigate',
            },
            {
              header: 'Sec-Fetch-Site', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'same-origin',
            },
          ],
          responseHeaders: [
            {
              header: 'Content-Security-Policy', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
            },
            {
              header: 'X-Frame-Options', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
            },
            {
              header: 'Access-Control-Allow-Origin',
              value: '*',
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
            }
          ]
        },
        condition: {
          initiatorDomains: [domain],
          urlFilter: "https://*/*",
        }
      },
      {
        id: ruleId + 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: 'Sec-Fetch-Mode', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'navigate',
            },
            {
              header: 'Sec-Fetch-Site', operation: chrome.declarativeNetRequest.HeaderOperation.SET, value: 'same-origin',
            },
          ],
          responseHeaders: [
            {
              header: 'Content-Security-Policy', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
            },
            {
              header: 'X-Frame-Options', operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
            },
            {
              header: 'Access-Control-Allow-Origin',
              value: '*',
              operation: chrome.declarativeNetRequest.HeaderOperation.APPEND,
            }
          ]
        },
        condition: {
          initiatorDomains: [domain],
          requestMethods: [chrome.declarativeNetRequest.RequestMethod.OPTIONS],
          urlFilter: "https://*/*",
        }
      }
    ]
  });

  return async () => {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId, ruleId + 1],
    })
  }
}