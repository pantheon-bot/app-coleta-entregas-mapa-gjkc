import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - Get available collectors
export async function GET() {
  try {
    await requireAuth();

    const collectors = await db
      .selectFrom('users')
      .select([
        'id',
        'name',
        'phone',
        'latitude',
        'longitude',
        'location_updated_at',
        'is_available',
      ])
      .where('role', '=', 'COLETOR')
      .where('is_available', '=', true)
      .where('latitude', 'is not', null)
      .where('longitude', 'is not', null)
      .execute();

    return NextResponse.json({ collectors });
  } catch (error) {
    console.error('Get collectors error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
