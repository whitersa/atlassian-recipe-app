import { Receiver } from '@upstash/qstash';
import { getPushEnv, resolveBaseOrigin, sendWebPushNotification } from './_push-utils.js';

export const config = {
  maxDuration: 30,
};

export async function POST(request) {
  try {
    const env = getPushEnv();
    const rawBody = await request.text();

    if (env.signingConfigured) {
      const signature = request.headers.get('upstash-signature') || '';
      if (!signature) {
        return Response.json({ ok: false, error: 'Missing Upstash-Signature' }, { status: 401 });
      }
      const receiver = new Receiver({
        currentSigningKey: env.currentSigningKey,
        nextSigningKey: env.nextSigningKey,
      });
      const valid = await receiver.verify({
        signature,
        body: rawBody,
      });
      if (!valid) {
        return Response.json({ ok: false, error: 'Invalid Upstash-Signature' }, { status: 401 });
      }
    }

    const parsed = JSON.parse(rawBody || '{}');
    const { subscription, notification } = parsed;

    if (!subscription?.endpoint || !notification?.title) {
      return Response.json({ ok: false, error: 'Invalid webhook payload' }, { status: 400 });
    }

    const originUrl = resolveBaseOrigin(request);
    await sendWebPushNotification({
      subscription,
      payload: notification,
      originUrl,
    });

    return Response.json({ ok: true });
  } catch (err) {
    // Do not ask QStash to retry permanently expired/unsubscribed endpoints
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      return Response.json({ ok: false, expired: true }, { status: 200 });
    }
    return Response.json(
      {
        ok: false,
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

