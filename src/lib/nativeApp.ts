// Capacitor bootstrap. Runs once at app start; no-ops in the web bundle
// thanks to Capacitor's platform detection. Anything native-only lives
// behind `if (!isNativeApp()) return;`.
//
// Permission-gated UI lives in src/ui/weather/PushSettings.tsx — push
// registration is NOT triggered on launch, because:
//   1. The OS permission dialog has no context if it pops on app start.
//   2. The schema for weather_push_subscriptions is not yet FCM-aware
//      (p256dh + auth are NOT NULL), so persisting an FCM token would
//      crash. Once a migration relaxes those, flip the registration
//      call back on inside registerNativePush(); the listener wiring
//      already handles the rest.

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { PushNotifications, type Token } from '@capacitor/push-notifications';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

let backButtonHandlerInstalled = false;
let pushListenersInstalled = false;

export async function initNativeApp(): Promise<void> {
  if (!isNativeApp()) return;

  // Brand status bar + nav bar.
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0F172A' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) {
    console.warn('[native] status-bar init failed', e);
  }

  // Hide the launch splash once the JS bundle has booted; the SPA's own
  // skeletons take it from here.
  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn('[native] splash hide failed', e);
  }

  // Hardware back: let SPA history pop if possible; otherwise fall back
  // to the OS default (which exits the app at the root).
  if (!backButtonHandlerInstalled) {
    backButtonHandlerInstalled = true;
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  }

  // Log network connectivity changes so debugging from the device is
  // possible without DevTools. (Web-side code that needs network
  // state already uses the existing navigator.onLine path.)
  Network.addListener('networkStatusChange', (status) => {
    console.log('[native] network', status);
  });
}

/**
 * Explicit native push registration, called from the existing
 * PushSettings UI when the user opts in. Idempotent. Until the schema
 * accepts FCM tokens (see file-top comment), this only logs the token
 * to console — useful for verifying FCM is reaching the device.
 */
export async function registerNativePush(): Promise<{ ok: boolean; error?: string }> {
  if (!isNativeApp()) return { ok: false, error: 'Not running natively' };

  if (!pushListenersInstalled) {
    pushListenersInstalled = true;
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('[native] push token:', token.value.slice(0, 12) + '…');
    });
    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[native] registrationError', err);
    });
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[native] push received', notification);
    });
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = (action.notification?.data?.url as string | undefined) ?? '/weather';
      if (typeof url === 'string' && url.startsWith('/')) {
        window.location.assign(url);
      }
    });
  }

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      return { ok: false, error: `Permission: ${perm.receive}` };
    }
    await PushNotifications.register();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}
