/**
 * PWA Service Worker registration, OS-level system notifications,
 * Web Push (Apple APNs / Google FCM + Vercel / Upstash QStash) lock-screen scheduling,
 * live platform diagnostics, and Screen Wake Lock helpers.
 */

let cachedRemoteConfig = null;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function sameApplicationServerKey(existingBuffer, expectedBytes) {
  if (!existingBuffer || !expectedBytes) return false;
  const existingBytes = new Uint8Array(existingBuffer);
  if (existingBytes.length !== expectedBytes.length) return false;
  for (let i = 0; i < existingBytes.length; i += 1) {
    if (existingBytes[i] !== expectedBytes[i]) return false;
  }
  return true;
}

function extractEndpointHost(endpoint) {
  if (!endpoint) return '';
  try {
    return new URL(endpoint).host;
  } catch {
    return '';
  }
}

export function buildTimerNotificationCopy({
  recipeTitle = '日常菜谱',
  timerLabel = '辅助计时',
  stepTitle = '',
  customBody = '',
  tag = '',
} = {}) {
  const label = timerLabel || stepTitle || '辅助计时';
  const title = `⏰ ${label} 已到时`;
  const contextLine =
    stepTitle && timerLabel && stepTitle !== timerLabel
      ? `「${recipeTitle}」${stepTitle} · ${timerLabel}`
      : `「${recipeTitle}」${label}`;
  const body = customBody || `${contextLine} 计时已结束，请及时查看火候！`;
  const resolvedTag = tag || `recipe-assist-timer-${Date.now()}`;
  return { title, body, tag: resolvedTag };
}

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

async function getReadyServiceWorkerRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg && window.isSecureContext) {
    reg = await navigator.serviceWorker.register('/sw.js');
  }
  if (reg?.active) {
    return reg;
  }
  return navigator.serviceWorker.ready;
}

/**
 * Queries `/api/push-config` on Vercel (with safe fallback when running under plain local `vite`).
 */
export async function fetchRemotePushConfig({ force = false } = {}) {
  if (!force && cachedRemoteConfig) {
    return cachedRemoteConfig;
  }

  const envFallbackKey = (import.meta.env?.VITE_VAPID_PUBLIC_KEY || '').trim();

  if (typeof window === 'undefined') {
    return {
      apiAvailable: false,
      vapidConfigured: Boolean(envFallbackKey),
      vapidPublicKey: envFallbackKey,
      qstashConfigured: false,
    };
  }

  try {
    const res = await fetch('/api/push-config', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      cachedRemoteConfig = {
        apiAvailable: true,
        vapidConfigured: Boolean(data.vapidConfigured),
        vapidPublicKey: (data.vapidPublicKey || envFallbackKey || '').trim(),
        qstashConfigured: Boolean(data.qstashConfigured),
      };
      return cachedRemoteConfig;
    }
  } catch {
    // Running locally without Vercel Serverless API
  }

  cachedRemoteConfig = {
    apiAvailable: false,
    vapidConfigured: Boolean(envFallbackKey),
    vapidPublicKey: envFallbackKey,
    qstashConfigured: false,
  };
  return cachedRemoteConfig;
}

/**
 * Collects live PWA, Notification & Web Push runtime diagnostics.
 */
export async function inspectPwaNotificationCapabilities({ forceRemote = false } = {}) {
  const secureContext = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false;
  const standalone = isStandalonePwa();
  const ios = isIosDevice();
  const hasNotificationApi = typeof window !== 'undefined' && 'Notification' in window;
  const permission = hasNotificationApi ? Notification.permission : 'unavailable';
  const hasSwApi = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const hasWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const hasPushManager = typeof window !== 'undefined' && 'PushManager' in window;

  let swState = hasSwApi ? 'unregistered' : 'unsupported';
  let pushSubscribed = false;
  let pushEndpointHost = '';

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
      if (reg?.pushManager) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          pushSubscribed = true;
          pushEndpointHost = extractEndpointHost(sub.endpoint);
        }
      }
    } catch {
      swState = 'error';
    }
  }

  const remote = await fetchRemotePushConfig({ force: forceRemote });

  return {
    secureContext,
    standalone,
    ios,
    hasNotificationApi,
    permission,
    swState,
    hasWakeLock,
    hasPushManager,
    pushSubscribed,
    pushEndpointHost,
    apiAvailable: remote.apiAvailable,
    serverVapidConfigured: remote.vapidConfigured,
    serverQstashConfigured: remote.qstashConfigured,
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
 * Ensures an active Web Push subscription (`web.push.apple.com` on iOS, `fcm.googleapis.com` on Android/Chrome)
 * bound to the server's VAPID public key so notifications arrive even when the phone is locked.
 */
export async function ensureWebPushSubscription({ requestPermission = false, forceReset = false } = {}) {
  if (typeof window === 'undefined') {
    return { ok: false, code: 'SSR', reason: '非浏览器环境' };
  }
  if (!window.isSecureContext) {
    return {
      ok: false,
      code: 'INSECURE_CONTEXT',
      reason: '需要 HTTPS 安全上下文才能订阅 Web Push 锁屏推送',
    };
  }
  if (!('Notification' in window) || !('PushManager' in window)) {
    if (isIosDevice() && !isStandalonePwa()) {
      return {
        ok: false,
        code: 'IOS_NEEDS_INSTALL',
        reason: 'iPhone 需先点 Safari「分享 → 添加到主屏幕」并从桌面图标启动，才开放 PushManager 锁屏推送',
      };
    }
    return {
      ok: false,
      code: 'PUSH_UNSUPPORTED',
      reason: '当前浏览器环境不支持 Web Push (PushManager)',
    };
  }

  let perm = Notification.permission;
  if (perm === 'default' && requestPermission) {
    perm = await requestTimerNotificationPermission();
  }
  if (perm !== 'granted') {
    return {
      ok: false,
      code: 'PERMISSION_NOT_GRANTED',
      reason: `尚未获得通知权限 (${perm})`,
    };
  }

  const remote = await fetchRemotePushConfig({ force: true });
  if (!remote.apiAvailable) {
    return {
      ok: false,
      code: 'API_UNAVAILABLE',
      reason: '当前为本地纯前端预览（未检测到 Vercel /api/push-config 接口），仅支持前台通知',
    };
  }
  if (!remote.vapidConfigured || !remote.vapidPublicKey) {
    return {
      ok: false,
      code: 'VAPID_MISSING',
      reason: 'Vercel 环境变量尚未配置 VAPID_PUBLIC_KEY 与 VAPID_PRIVATE_KEY（运行 npm run push:keys 生成）',
    };
  }

  try {
    const registration = await getReadyServiceWorkerRegistration();
    if (!registration?.pushManager) {
      return {
        ok: false,
        code: 'SW_UNAVAILABLE',
        reason: 'Service Worker PushManager 尚未就绪',
      };
    }

    const expectedKeyBytes = urlBase64ToUint8Array(remote.vapidPublicKey);
    let sub = await registration.pushManager.getSubscription();

    if (sub && (forceReset || !sameApplicationServerKey(sub.options?.applicationServerKey, expectedKeyBytes))) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }

    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedKeyBytes,
      });
    }

    const endpointHost = extractEndpointHost(sub.endpoint);
    return {
      ok: true,
      subscription: sub.toJSON(),
      endpointHost,
      qstashConfigured: remote.qstashConfigured,
      reason: `已连接锁屏推送网关 (${endpointHost})`,
    };
  } catch (err) {
    return {
      ok: false,
      code: 'SUBSCRIBE_FAILED',
      reason: `Web Push 订阅失败: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Schedules (or immediately dispatches when `delaySeconds === 0`) a remote Web Push notification
 * via Vercel Serverless + Upstash QStash so iOS APNs wakes up the locked screen right on time.
 */
export async function scheduleCloudTimerPush({
  delaySeconds = 0,
  recipeTitle = '日常菜谱',
  timerLabel = '辅助计时',
  stepTitle = '',
  customBody = '',
  tag = '',
} = {}) {
  let subRes = await ensureWebPushSubscription({ requestPermission: false });
  if (!subRes.ok) {
    return {
      ok: false,
      mode: 'none',
      messageId: null,
      endpointHost: '',
      code: subRes.code,
      reason: subRes.reason,
    };
  }

  const copy = buildTimerNotificationCopy({
    recipeTitle,
    timerLabel,
    stepTitle,
    customBody,
    tag,
  });

  const postSchedule = async (subscription) => {
    const res = await fetch('/api/push-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        delaySeconds: Math.max(0, Math.round(Number(delaySeconds) || 0)),
        title: copy.title,
        body: copy.body,
        tag: copy.tag,
        url: './',
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok && Boolean(data.ok), data };
  };

  try {
    let attempt = await postSchedule(subRes.subscription);

    // Self-heal if APNs / FCM rotated or expired the endpoint
    if (!attempt.ok && attempt.status === 410) {
      subRes = await ensureWebPushSubscription({ requestPermission: false, forceReset: true });
      if (subRes.ok) {
        attempt = await postSchedule(subRes.subscription);
      }
    }

    if (!attempt.ok) {
      return {
        ok: false,
        mode: 'none',
        messageId: null,
        endpointHost: subRes.endpointHost,
        code: attempt.data?.code || 'SCHEDULE_ERROR',
        reason: attempt.data?.error || '云端推送排期请求失败',
      };
    }

    const mode = attempt.data.mode || 'qstash';
    const modeDesc =
      mode === 'qstash'
        ? `已由 QStash 托管 ${delaySeconds}s 锁屏推送 (${subRes.endpointHost})`
        : mode === 'immediate-push'
          ? `已通过 Web Push (${subRes.endpointHost}) 向系统下发远程推送`
          : `已通过 Vercel Serverless 短时托管 ${delaySeconds}s 锁屏推送 (${subRes.endpointHost})`;

    return {
      ok: true,
      mode,
      messageId: attempt.data.messageId || null,
      endpointHost: subRes.endpointHost,
      tag: copy.tag,
      reason: modeDesc,
    };
  } catch (err) {
    return {
      ok: false,
      mode: 'none',
      messageId: null,
      endpointHost: subRes.endpointHost || '',
      code: 'NETWORK_ERROR',
      reason: `请求 /api/push-schedule 失败: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Cancels a previously scheduled Upstash QStash timer push when the user pauses or resets a timer.
 */
export async function cancelCloudTimerPush(messageId) {
  if (!messageId || typeof window === 'undefined') {
    return { ok: true, cancelled: false };
  }
  try {
    const res = await fetch('/api/push-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
      keepalive: true,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: Boolean(data.ok), cancelled: Boolean(data.cancelled) };
  } catch {
    return { ok: false, cancelled: false };
  }
}

/**
 * Dispatches a local OS-level system notification (foreground / unlocked fallback)
 * and returns detailed channel diagnostics (`{ ok, channel, reason }`).
 */
export async function sendSystemTimerNotificationDetailed({
  recipeTitle = '日常菜谱',
  timerLabel = '辅助计时',
  stepTitle = '',
  customBody = '',
  tag = '',
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

  const copy = buildTimerNotificationCopy({
    recipeTitle,
    timerLabel,
    stepTitle,
    customBody,
    tag,
  });

  const options = {
    body: copy.body,
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
    tag: copy.tag,
    renotify: true,
  };

  if ('serviceWorker' in navigator) {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(copy.title, options);
        return {
          ok: true,
          channel: 'ServiceWorker.showNotification',
          reason: '已通过本地 Service Worker 向系统发送通知（仅前台/未冻结状态有效）',
        };
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification fallback:', swErr);
    }
  }

  try {
    new Notification(copy.title, options);
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
