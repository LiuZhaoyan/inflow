import { NextResponse } from 'next/server';
import { getStoriesByUser, deleteStoryByUser, updateStoryByUser } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

export async function GET() {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const stories = await getStoriesByUser(user.id);
    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Failed to fetch stories:', error);
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
    console.error('Failed to delete story:', error);
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
    console.error('Failed to update story:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
