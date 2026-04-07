import { NextResponse } from 'next/server';
import { getStoriesByUser, deleteStoryByUser, updateStoryByUser } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/errorHandler';

export async function GET() {
  const startTime = Date.now();
  const endpoint = 'GET /api/stories';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const stories = await getStoriesByUser(user.id);
    return NextResponse.json({ stories });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return handleApiError(error, {
      endpoint,
      userId,
      statusCode: 500,
      durationMs,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}

export async function DELETE(req: Request) {
  const startTime = Date.now();
  const endpoint = 'DELETE /api/stories';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing story id' }, { status: 400 });
    }
    await deleteStoryByUser(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return handleApiError(error, {
      endpoint,
      userId,
      statusCode: 500,
      durationMs,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}

export async function PUT(req: Request) {
  const startTime = Date.now();
  const endpoint = 'PUT /api/stories';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

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
    const durationMs = Date.now() - startTime;
    return handleApiError(error, {
      endpoint,
      userId,
      statusCode: 500,
      durationMs,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}
