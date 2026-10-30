import {
  createQStashClient,
  getPushEnv,
  resolveBaseOrigin,
  sendWebPushNotification,
} from './_push-utils.js';

export const config = {
  maxDuration: 60,
};

export async function POST(request) {
  try {
    const env = getPushEnv();
    if (!env.vapidConfigured) {
      return Response.json(
        {
          ok: false,
          code: 'VAPID_MISSING',
          error:
            'Vercel 尚未配置 VAPID_PUBLIC_KEY 与 VAPID_PRIVATE_KEY（本地运行 npm run push:keys 生成后填入环境变量即可）',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      subscription,
      delaySeconds = 0,
      title = '⏰ 辅助计时已到时',
      body: messageBody = '日常菜谱烹饪计时已结束，请及时查看火候！',
      tag = 'recipe-assist-timer',
      url = './',
    } = body || {};

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return Response.json(
        {
          ok: false,
          code: 'INVALID_SUBSCRIPTION',
          error: '缺少有效的浏览器 PushSubscription，请先点击授权并完成推送订阅',
        },
        { status: 400 }
      );
    }

    const delay = Math.max(0, Math.round(Number(delaySeconds) || 0));
    const originUrl = resolveBaseOrigin(request);
    const notificationPayload = {
      title,
      body: messageBody,
      tag,
      url,
      icon: '/pwa-192x192.png',
      badge: '/favicon.png',
    };

    // 1. Immediate remote push (0s delay) -> straight to Apple APNs / Google FCM
    if (delay === 0) {
      await sendWebPushNotification({
        subscription,
        payload: notificationPayload,
        originUrl,
      });
      return Response.json({
        ok: true,
        mode: 'immediate-push',
        messageId: null,
        delaySeconds: 0,
      });
    }

    // 2. Durable delayed push via Upstash QStash (supports any duration + mid-timer cancellation)
    if (env.qstashConfigured) {
      const qstash = createQStashClient();
      const webhookUrl = `${originUrl}/api/push-webhook`;
      const forwardHeaders = env.vercelBypassSecret
        ? { 'x-vercel-protection-bypass': env.vercelBypassSecret }
        : undefined;

      const published = await qstash.publishJSON({
        url: webhookUrl,
        body: {
          subscription,
          notification: notificationPayload,
        },
        delay,
        retries: 1,
        ...(forwardHeaders ? { headers: forwardHeaders } : {}),
      });

      return Response.json({
        ok: true,
        mode: 'qstash',
        messageId: published.messageId || null,
        delaySeconds: delay,
      });
    }

    // 3. Quick lock-screen test fallback without QStash (<= 45s within Vercel Hobby 60s maxDuration)
    if (delay <= 45) {
      await new Promise((resolve) => {
        setTimeout(resolve, delay * 1000);
      });
      await sendWebPushNotification({
        subscription,
        payload: notificationPayload,
        originUrl,
      });
      return Response.json({
        ok: true,
        mode: 'serverless-wait',
        messageId: null,
        delaySeconds: delay,
      });
    }

    // 4. Long timers (> 45s) require QStash on Vercel Serverless
    return Response.json(
      {
        ok: false,
        code: 'QSTASH_REQUIRED',
        error:
          '超过 45 秒的长时锁屏推送需在 Vercel Marketplace 一键连接免费的 Upstash QStash（自动配置 QSTASH_TOKEN）',
      },
      { status: 400 }
    );
  } catch (err) {
    const statusCode = err?.statusCode === 404 || err?.statusCode === 410 ? 410 : 500;
    return Response.json(
      {
        ok: false,
        code: statusCode === 410 ? 'SUBSCRIPTION_EXPIRED' : 'PUSH_SCHEDULE_FAILED',
        error: err?.message || String(err),
      },
      { status: statusCode }
    );
  }
}

