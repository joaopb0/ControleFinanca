const CHANNEL = 'controlefinanca-auth';
const STORAGE_EVENT_KEY = 'cf-session-changed';

// As abas compartilham cookies: uma troca de conta deve descartar dados da conta anterior.
// A mensagem contém somente um aviso; cada aba recupera a identidade pela API.
export function createSessionSync(onChange, browser = window) {
  if (typeof browser.BroadcastChannel === 'function') {
    const channel = new browser.BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      if (event.data === 'session-changed') onChange();
    };
    return {
      notify: () => channel.postMessage('session-changed'),
      close: () => channel.close(),
    };
  }

  const onStorage = (event) => {
    if (event.key === STORAGE_EVENT_KEY && event.newValue) onChange();
  };
  browser.addEventListener('storage', onStorage);
  return {
    notify: () => {
      try {
        // Compatibilidade: armazena apenas um horário de evento, nunca credenciais ou usuário.
        browser.localStorage.setItem(STORAGE_EVENT_KEY, String(Date.now()));
      } catch (error) {
        console.warn('Não foi possível sincronizar a sessão entre abas:', error.name);
      }
    },
    close: () => browser.removeEventListener('storage', onStorage),
  };
}
