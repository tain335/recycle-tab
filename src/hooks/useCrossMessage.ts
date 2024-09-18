import { useEffect, useState } from 'react';

export function useCrossMessage(key: string) {
  const [message, setMessage] = useState<string>('');
  useEffect(() => {

    chrome.storage.local.get('$' + key).then((result) => {
      setMessage(result['$' + key] ?? '');
      chrome.storage.local.remove('$' + key);
    });

    const storageListener = (changes: any) => {
      if (changes.hasOwnProperty('$' + key)) {
        setMessage(changes['$' + key].newValue);
        chrome.storage.local.remove('$' + key);
      }
    };
    chrome.storage.local.onChanged.addListener(storageListener);
    return () => {
      chrome.storage.local.onChanged.removeListener(storageListener);
    }
  }, []);
  return message;
}