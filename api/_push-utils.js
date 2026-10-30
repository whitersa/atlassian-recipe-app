import webpush from 'web-push';
import { Client } from '@upstash/qstash';

export function getPushEnv() {
  const vapidPublicKey = (
    process.env.VAPID_PUBLIC_KEY ||
    process.env.VITE_VAPID_PUBLIC_KEY ||
    ''
  ).trim();
  const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const qstashToken = (process.env.QSTASH_TOKEN || '').trim();
  const qstashUrl = (process.env.QSTASH_URL || '').trim() || undefined;
  const currentSigningKey = (process.env.QSTASH_CURRENT_SIGNING_KEY || '').trim();
  const nextSigningKey = (process.env.QSTASH_NEXT_SIGNING_KEY || '').trim();
  const vercelBypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();

  const vapidConfigured = Boolean(vapidPublicKey && vapidPrivateKey);
  const qstashConfigured = Boolean(qstashToken);
  const signingConfigured = Boolean(currentSigningKey && nextSigningKey);

  return {
    vapidPublicKey,
    vapidPrivateKey,
    vapidConfigured,
    qstashToken,
    qstashUrl,
    qstashConfigured,
    currentSigningKey,
    nextSigningKey,
    signingConfigured,
    vercelBypassSecret,
  };
}

export function resolveBaseOrigin(request) {
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return new URL(request.url).origin;
}

export function resolveVapidSubject(originUrl) {
  const custom = (process.env.VAPID_SUBJECT || '').trim();
  if (custom.startsWith('mailto:') || custom.startsWith('https://')) {
    return custom;
  }
  if (originUrl && originUrl.startsWith('https://') && !originUrl.includes('localhost')) {
    return originUrl;
  }
  return 'mailto:timer@recipe-pwa.app';
}

export async function sendWebPushNotification({ subscription, payload, originUrl }) {
  const { vapidPublicKey, vapidPrivateKey, vapidConfigured } = getPushEnv();
  if (!vapidConfigured) {
    throw new Error('Server VAPID keys are not configured');
  }

  const subject = resolveVapidSubject(originUrl);
  webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);

  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 300,
    urgency: 'high',
  });
}

export function createQStashClient() {
  const { qstashToken, qstashUrl } = getPushEnv();
  if (!qstashToken) {
    throw new Error('QSTASH_TOKEN is not configured');
  }
  return new Client({
    token: qstashToken,
    ...(qstashUrl ? { baseUrl: qstashUrl } : {}),
  });
}

