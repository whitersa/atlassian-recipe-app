import { createQStashClient, getPushEnv } from './_push-utils.js';

export async function POST(request) {
  try {
    const { qstashConfigured } = getPushEnv();
    const body = await request.json().catch(() => ({}));
    const messageId = body?.messageId;

    if (!messageId || !qstashConfigured) {
      return Response.json({ ok: true, cancelled: false });
    }

    const qstash = createQStashClient();
    try {
      await qstash.messages.delete(messageId);
    } catch (err) {
      // Ignore 404 if message was already delivered or cancelled
      const msg = String(err?.message || '');
      if (!msg.includes('404') && !msg.toLowerCase().includes('not found')) {
        throw err;
      }
    }

    return Response.json({ ok: true, cancelled: true });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

