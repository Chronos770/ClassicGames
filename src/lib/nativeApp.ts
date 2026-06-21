// Capacitor bootstrap. Runs once at app start; no-ops in the web bundle
// thanks to Capacitor's platform detection. Anything native-only lives
// behind `if (!isNativeApp()) return;`.
//
// Order matters: status-bar + splash run early so the first paint
// matches the brand; back-button handler runs once StrictMode is past
// double-invocation; push-notifications registers async — failure to
// register doesn't block anything else.

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

let backButtonHandlerInstalled = false;

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

  // Try to register for native push. This is a no-op without
  // google-services.json in the build — see android-app/README.md.
  // Web push (via the service worker) keeps working either way.
  registerPushNotifications().catch((e) =>
    console.warn('[native] push registration failed (ok in beta — needs FCM):', e),
  );

  // Log network connectivity changes so debugging from the device is
  // possible without DevTools. (Web-side code that needs network
  // state already uses the existing navigator.onLine path.)
  Network.addListener('networkStatusChange', (status) => {
    console.log('[native] network', status);
  });
}

async function registerPushNotifications(): Promise<void> {
  // Permission first (Android 13+ requires this explicitly).
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') {
    console.log('[native] push permission not granted:', perm.receive);
    return;
  }

  // Wire up the result listeners BEFORE register() so we don't miss
  // the initial registration event on fast-boot.
  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('[native] push token:', token.value.slice(0, 12) + '…');
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.log('[native] no auth user yet — token kept locally');
        return;
      }
      // Persist native FCM tokens alongside web-push subscriptions in
      // the same table. Schema convention: when `endpoint` starts with
      // `fcm:` it's a native token rather than a Web Push endpoint, and
      // the push-send edge function routes accordingly (when we wire
      // up the FCM admin path).
      const endpoint = `fcm:${token.value}`;
      await supabase.from('weather_push_subscriptions').upsert(
        {
          user_id: userData.user.id,
          endpoint,
          p256dh: null,
          auth: null,
          user_agent: 'capacitor-android',
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );
    } catch (e) {
      console.warn('[native] persisting FCM token failed', e);
    }
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.warn('[native] registrationError', err);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Foreground notifications — show them via the OS so the user can
    // tap them. Capacitor handles this for us on most setups; this
    // listener exists so consumers can react to in-app delivery later.
    console.log('[native] push received', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = (action.notification?.data?.url as string | undefined) ?? '/weather';
    console.log('[native] push tapped, navigating to', url);
    if (typeof url === 'string' && url.startsWith('/')) {
      window.location.assign(url);
    }
  });

  await PushNotifications.register();
}
