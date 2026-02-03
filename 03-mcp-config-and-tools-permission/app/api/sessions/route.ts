import { NextRequest } from 'next/server';
import { getStorage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const storage = getStorage(process.cwd());
    await storage.initialize();

    const sessions = await storage.listSessions();

    return new Response(JSON.stringify({ sessions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
