import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
export async function vibrate(strong = false): Promise<void> {
  try {
    if (Capacitor.isNativePlatform())
      await Haptics.impact({ style: strong ? ImpactStyle.Medium : ImpactStyle.Light });
    else navigator.vibrate?.(strong ? 20 : 7);
  } catch {
    /* Not supported on every device. */
  }
}
export async function observeLifecycle(change: (active: boolean) => void): Promise<() => void> {
  const handler = () => change(!document.hidden);
  document.addEventListener('visibilitychange', handler);
  const native = Capacitor.isNativePlatform()
    ? await App.addListener('appStateChange', ({ isActive }) => change(isActive))
    : null;
  return () => {
    document.removeEventListener('visibilitychange', handler);
    void native?.remove();
  };
}
