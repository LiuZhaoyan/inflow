import { NextResponse } from 'next/server';
import { getStories, deleteStory, updateStory } from '@/lib/db';

export async function GET() {
  try {
    const stories = await getStories();
    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Failed to fetch stories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing story id' }, { status: 400 });
    }
    await deleteStory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete story:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing story id' }, { status: 400 });
    }
    const updated = await updateStory(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update story:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
