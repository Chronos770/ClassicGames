// Capacitor bootstrap. Runs once at app start; no-ops in the web bundle
// thanks to Capacitor's platform detection. Anything native-only lives
// behind `if (!isNativeApp()) return;`.
//
// FCM tokens persist to weather_push_subscriptions via registerNativePush(),
// which is called from WeatherPushPrompt the first time a signed-in user
// taps Enable. p256dh + auth columns are nullable (migration 012) so the
// FCM rows coexist with VAPID/Web Push subscriptions.

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

async function persistFcmToken(token: string): Promise<void> {
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      console.log('[native] FCM token received before sign-in — skipping persist');
      return;
    }
    const endpoint = `fcm:${token}`;
    const { error } = await supabase.from('weather_push_subscriptions').upsert(
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
    if (error) {
      console.warn('[native] persistFcmToken upsert failed:', error.message);
    } else {
      console.log('[native] FCM token persisted for user:', userData.user.id);
    }
  } catch (e) {
    console.warn('[native] persistFcmToken threw', e);
  }
}

/**
 * Explicit native push registration. Called from WeatherPushPrompt the
 * first time the user taps Enable in the weather app. Idempotent — safe
 * to call repeatedly; listeners are installed exactly once.
 */
export async function registerNativePush(): Promise<{ ok: boolean; error?: string; token?: string }> {
  if (!isNativeApp()) return { ok: false, error: 'Not running natively' };

  let firstTokenResolved = false;
  const firstToken = new Promise<string | null>((resolve) => {
    const timeout = setTimeout(() => {
      if (!firstTokenResolved) {
        firstTokenResolved = true;
        resolve(null);
      }
    }, 8000);
    if (!pushListenersInstalled) {
      pushListenersInstalled = true;
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[native] FCM token:', token.value.slice(0, 12) + '…');
        await persistFcmToken(token.value);
        if (!firstTokenResolved) {
          firstTokenResolved = true;
          clearTimeout(timeout);
          resolve(token.value);
        }
      });
      PushNotifications.addListener('registrationError', (err) => {
        console.warn('[native] registrationError', err);
        if (!firstTokenResolved) {
          firstTokenResolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
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
    } else {
      // Listeners already installed earlier in this session — don't
      // bother waiting for the registration event to fire again.
      clearTimeout(timeout);
      resolve(null);
    }
  });

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      return { ok: false, error: `Permission: ${perm.receive}` };
    }
    await PushNotifications.register();
    const token = await firstToken;
    return { ok: true, token: token ?? undefined };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}
