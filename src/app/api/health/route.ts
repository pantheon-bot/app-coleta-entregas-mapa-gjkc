import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Try to query the database
    const result = await db
      .selectFrom('users')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      userCount: result?.count || 0,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: errorMessage,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
}
