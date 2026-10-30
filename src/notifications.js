/**
 * PWA Service Worker registration, OS-level system notifications,
 * live platform diagnostics, and Screen Wake Lock helpers.
 */

export function registerPwaServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  const registerNow = () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service Worker registration skipped:', err);
    });
  };
  if (document.readyState === 'complete') {
    registerNow();
  } else {
    window.addEventListener('load', registerNow, { once: true });
  }
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.navigator?.standalone === true
  );
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOSClassic = /iPad|iPhone|iPod/.test(ua);
  const iPadOS13Plus = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return (iOSClassic || iPadOS13Plus) && !window.MSStream;
}

/**
 * Collects live PWA & Notification runtime diagnostics (especially useful on iOS Safari vs Home Screen PWA).
 */
export async function inspectPwaNotificationCapabilities() {
  const secureContext = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false;
  const standalone = isStandalonePwa();
  const ios = isIosDevice();
  const hasNotificationApi = typeof window !== 'undefined' && 'Notification' in window;
  const permission = hasNotificationApi ? Notification.permission : 'unavailable';
  const hasSwApi = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const hasWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  let swState = hasSwApi ? 'unregistered' : 'unsupported';
  if (hasSwApi) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg && secureContext) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }
      if (reg?.active) {
        swState = 'active';
      } else if (reg?.installing || reg?.waiting) {
        swState = 'installing';
      }
    } catch {
      swState = 'error';
    }
  }

  return {
    secureContext,
    standalone,
    ios,
    hasNotificationApi,
    permission,
    swState,
    hasWakeLock,
  };
}

/**
 * Requests OS notification permission inside a direct user gesture (e.g. button tap).
 * Returns: 'granted' | 'denied' | 'default' | 'ios-needs-install' | 'insecure-context' | 'unsupported'
 */
export async function requestTimerNotificationPermission() {
  if (typeof window === 'undefined') return 'unsupported';

  if (!window.isSecureContext) {
    return 'insecure-context';
  }

  if (!('Notification' in window)) {
    if (isIosDevice() && !isStandalonePwa()) {
      return 'ios-needs-install';
    }
    return 'unsupported';
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission || 'default';
  }
}

/**
 * Dispatches an OS-level system notification and returns detailed channel diagnostics
 * (`{ ok, channel, reason }`) for testing across iOS / Android / Desktop.
 */
export async function sendSystemTimerNotificationDetailed({
  recipeTitle = '日常菜谱',
  timerLabel = '辅助计时',
  stepTitle = '',
  customBody = '',
} = {}) {
  if (typeof window === 'undefined') {
    return { ok: false, channel: 'none', reason: '非浏览器环境' };
  }
  if (!window.isSecureContext) {
    return {
      ok: false,
      channel: 'none',
      reason: '当前为非安全上下文（局域网 HTTP IP），浏览器已屏蔽 Service Worker 与系统通知，请通过 HTTPS 或 localhost 访问',
    };
  }
  if (!('Notification' in window)) {
    if (isIosDevice() && !isStandalonePwa()) {
      return {
        ok: false,
        channel: 'none',
        reason: 'iOS Safari 普通标签页不开放 Notification API，请点底部「分享 → 添加到主屏幕」后从桌面图标打开',
      };
    }
    return { ok: false, channel: 'none', reason: '当前浏览器环境未暴露 Notification API' };
  }
  if (Notification.permission !== 'granted') {
    return {
      ok: false,
      channel: 'none',
      reason: `尚未获得通知权限（当前状态: ${Notification.permission}），请先点击「请求通知权限」`,
    };
  }

  const label = timerLabel || stepTitle || '辅助计时';
  const title = `⏰ ${label} 已到时`;
  const contextLine =
    stepTitle && timerLabel && stepTitle !== timerLabel
      ? `「${recipeTitle}」${stepTitle} · ${timerLabel}`
      : `「${recipeTitle}」${label}`;

  const options = {
    body: customBody || `${contextLine} 计时已结束，请及时查看火候！`,
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
    tag: `recipe-assist-timer-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 300],
  };

  if ('serviceWorker' in navigator) {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, options);
        return {
          ok: true,
          channel: 'ServiceWorker.showNotification',
          reason: '已通过 Service Worker 向操作系统发送通知',
        };
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification fallback:', swErr);
    }
  }

  try {
    new Notification(title, options);
    return {
      ok: true,
      channel: 'window.Notification',
      reason: '已通过页面 Notification 构造函数向系统发送通知',
    };
  } catch (err) {
    return {
      ok: false,
      channel: 'none',
      reason: `系统通知调用失败: ${err?.message || String(err)}`,
    };
  }
}

export async function sendSystemTimerNotification(params) {
  const res = await sendSystemTimerNotificationDetailed(params);
  return res.ok;
}

/**
 * Acquires Screen Wake Lock while an assistive kitchen timer is counting down
 * so the phone does not auto-lock mid-simmer on the counter.
 */
export async function acquireCookingWakeLock() {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return null;
  }
  try {
    return await navigator.wakeLock.request('screen');
  } catch {
    return null;
  }
}

export async function releaseCookingWakeLock(sentinel) {
  if (!sentinel) return;
  try {
    await sentinel.release();
  } catch {
    // Ignore if already released by OS visibility change
  }
}
