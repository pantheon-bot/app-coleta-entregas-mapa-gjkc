import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PATCH - Update ride status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const rideId = parseInt(id);

    if (isNaN(rideId)) {
      return NextResponse.json(
        { error: 'Invalid ride ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Get existing ride
    const existingRide = await db
      .selectFrom('rides')
      .selectAll()
      .where('id', '=', rideId)
      .executeTakeFirst();

    if (!existingRide) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    // Verify user has permission
    if (user.role === 'CLIENTE' && existingRide.client_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (user.role === 'COLETOR' && existingRide.collector_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Handle different actions
    let updateData: Record<string, unknown> = {};
    const now = new Date();

    switch (action) {
      case 'accept':
        if (user.role !== 'COLETOR') {
          return NextResponse.json({ error: 'Only collectors can accept rides' }, { status: 403 });
        }
        if (existingRide.status !== 'PENDING') {
          return NextResponse.json({ error: 'Ride is not pending' }, { status: 400 });
        }
        updateData = { status: 'ACCEPTED', accepted_at: now };
        break;

      case 'reject':
        if (user.role !== 'COLETOR') {
          return NextResponse.json({ error: 'Only collectors can reject rides' }, { status: 403 });
        }
        if (existingRide.status !== 'PENDING') {
          return NextResponse.json({ error: 'Ride is not pending' }, { status: 400 });
        }
        updateData = { status: 'REJECTED', rejected_at: now };
        break;

      case 'arrive_at_client':
        if (user.role !== 'COLETOR') {
          return NextResponse.json({ error: 'Only collectors can mark arrival' }, { status: 403 });
        }
        if (existingRide.status !== 'ACCEPTED') {
          return NextResponse.json({ error: 'Ride must be accepted first' }, { status: 400 });
        }
        updateData = { status: 'AT_CLIENT', arrived_at_client_at: now };
        break;

      case 'start_delivery':
        if (user.role !== 'COLETOR') {
          return NextResponse.json({ error: 'Only collectors can start delivery' }, { status: 403 });
        }
        if (existingRide.status !== 'AT_CLIENT') {
          return NextResponse.json({ error: 'Must arrive at client first' }, { status: 400 });
        }
        updateData = { status: 'DELIVERING', started_delivery_at: now };
        break;

      case 'complete':
        if (user.role !== 'COLETOR') {
          return NextResponse.json({ error: 'Only collectors can complete rides' }, { status: 403 });
        }
        if (existingRide.status !== 'DELIVERING') {
          return NextResponse.json({ error: 'Must be in delivery phase' }, { status: 400 });
        }
        updateData = { status: 'COMPLETED', completed_at: now };
        break;

      case 'cancel':
        if (!['PENDING', 'ACCEPTED', 'AT_CLIENT', 'DELIVERING'].includes(existingRide.status)) {
          return NextResponse.json({ error: 'Cannot cancel this ride' }, { status: 400 });
        }
        updateData = { status: 'CANCELLED', cancelled_at: now };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update ride (MySQL doesn't support RETURNING)
    await db
      .updateTable('rides')
      .set(updateData)
      .where('id', '=', rideId)
      .execute();

    // Get the updated ride
    const updatedRide = await db
      .selectFrom('rides')
      .selectAll()
      .where('id', '=', rideId)
      .executeTakeFirst();

    if (!updatedRide) {
      return NextResponse.json(
        { error: 'Ride not found after update' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ride: updatedRide });
  } catch (error) {
    console.error('Update ride error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
