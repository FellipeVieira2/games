import { translate } from '../i18n';
import type { GameState } from '../core/state';

/** An installed update is applied only after saving, on a player action. */
export async function installWebUpdates(
  state: () => GameState,
  save: () => boolean,
): Promise<() => void> {
  if (!('serviceWorker' in navigator)) return () => {};
  const registration = await navigator.serviceWorker.register('./sw.js', {
    updateViaCache: 'none',
  });
  const banner = document.createElement('aside');
  banner.className = 'update-banner';
  banner.hidden = true;
  banner.setAttribute('role', 'status');
  const message = document.createElement('span'),
    button = document.createElement('button');
  banner.append(message, button);
  document.body.append(banner);
  let requested = false;
  let watched: ServiceWorker | null = null;
  const show = () => {
    if (!registration.waiting || !navigator.serviceWorker.controller) return;
    message.textContent = translate(state().settings.locale, 'updateReady');
    button.textContent = translate(state().settings.locale, 'applyUpdate');
    banner.hidden = false;
  };
  const reload = () => {
    if (requested) location.reload();
  };
  const apply = () => {
    if (!registration.waiting || !save()) return;
    requested = true;
    button.disabled = true;
    registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
  };
  const watch = () => {
    watched?.removeEventListener('statechange', show);
    watched = registration.installing;
    watched?.addEventListener('statechange', show);
  };
  button.addEventListener('click', apply);
  registration.addEventListener('updatefound', watch);
  navigator.serviceWorker.addEventListener('controllerchange', reload);
  watch();
  show();
  void registration.update().catch(() => {});
  return () => {
    button.removeEventListener('click', apply);
    registration.removeEventListener('updatefound', watch);
    watched?.removeEventListener('statechange', show);
    navigator.serviceWorker.removeEventListener('controllerchange', reload);
    banner.remove();
  };
}
