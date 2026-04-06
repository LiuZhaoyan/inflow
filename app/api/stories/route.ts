import { NextResponse } from 'next/server';
import { getStoriesByUser, deleteStoryByUser, updateStoryByUser } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const stories = await getStoriesByUser(user.id);
    return NextResponse.json({ stories });
  } catch (error) {
    logger.error('Failed to fetch stories', {
      error: error instanceof Error ? error : new Error(String(error)),
      endpoint: 'GET /api/stories',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing story id' }, { status: 400 });
    }
    await deleteStoryByUser(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete story', {
      error: error instanceof Error ? error : new Error(String(error)),
      endpoint: 'DELETE /api/stories',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing story id' }, { status: 400 });
    }
    const updated = await updateStoryByUser(user.id, id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Failed to update story', {
      error: error instanceof Error ? error : new Error(String(error)),
      endpoint: 'PUT /api/stories',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
