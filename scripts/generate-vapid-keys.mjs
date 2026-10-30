#!/usr/bin/env node
/**
 * Generates a fresh VAPID keypair for Web Push (iOS APNs / Android FCM / Desktop).
 * Usage:
 *   npm run push:keys
 */

import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('\n=== Web Push VAPID 密钥对已生成（请复制到 Vercel Project → Settings → Environment Variables） ===\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:timer@recipe-pwa.app');
console.log('\n提示：如需支持长时烹饪锁屏定时与中途暂停取消，请在 Vercel Marketplace 连接免费的 Upstash QStash（自动注入 QSTASH_TOKEN）。\n');

