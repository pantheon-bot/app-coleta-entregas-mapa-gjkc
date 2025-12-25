import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, role, name } = body;

    // Validate input
    if (!phone || !role) {
      return NextResponse.json(
        { error: 'Phone and role are required' },
        { status: 400 }
      );
    }

    if (role !== 'CLIENTE' && role !== 'COLETOR') {
      return NextResponse.json(
        { error: 'Invalid role. Must be CLIENTE or COLETOR' },
        { status: 400 }
      );
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    // Find or create user
    let user = await db
      .selectFrom('users')
      .selectAll()
      .where('phone', '=', cleanPhone)
      .executeTakeFirst();

    if (!user) {
      // Create new user
      user = await db
        .insertInto('users')
        .values({
          phone: cleanPhone,
          role,
          name: name || null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    } else {
      // Update user role if it changed
      if (user.role !== role) {
        user = await db
          .updateTable('users')
          .set({ role })
          .where('id', '=', user.id)
          .returningAll()
          .executeTakeFirstOrThrow();
      }
    }

    // Create session
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
