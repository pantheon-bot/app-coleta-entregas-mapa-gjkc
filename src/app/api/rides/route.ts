import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET - List rides for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = db
      .selectFrom('rides')
      .leftJoin('users as client', 'rides.client_id', 'client.id')
      .leftJoin('users as collector', 'rides.collector_id', 'collector.id')
      .select([
        'rides.id',
        'rides.client_id',
        'rides.collector_id',
        'rides.status',
        'rides.origin_latitude',
        'rides.origin_longitude',
        'rides.origin_address',
        'rides.destination_address',
        'rides.destination_latitude',
        'rides.destination_longitude',
        'rides.requested_at',
        'rides.accepted_at',
        'rides.arrived_at_client_at',
        'rides.completed_at',
        'client.name as client_name',
        'client.phone as client_phone',
        'client.latitude as client_latitude',
        'client.longitude as client_longitude',
        'collector.name as collector_name',
        'collector.phone as collector_phone',
        'collector.latitude as collector_latitude',
        'collector.longitude as collector_longitude',
      ]);

    // Filter by role
    if (user.role === 'CLIENTE') {
      query = query.where('rides.client_id', '=', user.id);
    } else {
      query = query.where('rides.collector_id', '=', user.id);
    }

    // Filter by status if provided
    if (status) {
      // Split comma-separated statuses for multiple status filter
      const statuses = status.split(',') as Array<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'AT_CLIENT' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED'>;
      if (statuses.length > 1) {
        query = query.where('rides.status', 'in', statuses);
      } else {
        query = query.where('rides.status', '=', statuses[0]);
      }
    }

    const rides = await query.orderBy('rides.requested_at', 'desc').execute();

    return NextResponse.json({ rides });
  } catch (error) {
    console.error('Get rides error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new ride request
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== 'CLIENTE') {
      return NextResponse.json(
        { error: 'Only clients can create ride requests' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { collector_id, destination_address, origin_latitude, origin_longitude } = body;

    // Validate input
    if (!collector_id || !destination_address || !origin_latitude || !origin_longitude) {
      return NextResponse.json(
        { error: 'collector_id, destination_address, origin_latitude, and origin_longitude are required' },
        { status: 400 }
      );
    }

    // Check if collector exists and is available
    const collector = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', collector_id)
      .where('role', '=', 'COLETOR')
      .executeTakeFirst();

    if (!collector) {
      return NextResponse.json(
        { error: 'Collector not found' },
        { status: 404 }
      );
    }

    // Create ride (MySQL doesn't support RETURNING)
    const result = await db
      .insertInto('rides')
      .values({
        client_id: user.id,
        collector_id,
        destination_address,
        origin_latitude,
        origin_longitude,
        status: 'PENDING',
      })
      .executeTakeFirst();

    // Get the created ride (handle bigint insertId)
    const insertId = result?.insertId;
    if (!insertId) {
      throw new Error('Failed to create ride');
    }

    const ride = await db
      .selectFrom('rides')
      .selectAll()
      .where('id', '=', Number(insertId))
      .executeTakeFirst();

    if (!ride) {
      throw new Error('Failed to retrieve created ride');
    }

    return NextResponse.json({ ride }, { status: 201 });
  } catch (error) {
    console.error('Create ride error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
