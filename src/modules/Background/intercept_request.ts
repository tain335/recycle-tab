export async function initInterceptRequest() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1]
  })
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          // @ts-ignore
          "type": "modifyHeaders",
          responseHeaders: [
            {
              // @ts-ignore
              header: 'Content-Security-Policy', operation: 'remove',
            },
            {
              // @ts-ignore
              header: 'X-Frame-Options', operation: 'remove',
            },
            {
              header: 'Access-Control-Allow-Origin',
              value: '*',
              // @ts-ignore
              operation: 'append',
            }
          ]
        },
        condition: {
          initiatorDomains: [chrome.runtime.id],
          urlFilter: "https://*/*",
        }
      }
    ]
  })
}