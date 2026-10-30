import { getPushEnv } from './_push-utils.js';

export async function GET() {
  const { vapidConfigured, vapidPublicKey, qstashConfigured } = getPushEnv();

  return Response.json(
    {
      ok: true,
      vapidConfigured,
      vapidPublicKey: vapidConfigured ? vapidPublicKey : '',
      qstashConfigured,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

