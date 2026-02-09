import fs from 'fs/promises';
import path from 'path';
import type { Story } from '@/lib/types/story';

const STORIES_PATH = path.join(process.cwd(), 'data', 'stories.json');

export async function initStoriesDb() {
  try {
    await fs.access(STORIES_PATH);
  } catch {
    const dataDir = path.dirname(STORIES_PATH);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    await fs.writeFile(STORIES_PATH, '[]', 'utf-8');
  }
}

export async function getStories(): Promise<Story[]> {
  await initStoriesDb();
  const data = await fs.readFile(STORIES_PATH, 'utf-8');
  const stories: Story[] = JSON.parse(data);
  return stories.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addStory(
  story: Omit<Story, 'id' | 'createdAt'>
): Promise<Story> {
  const stories = await getStories();
  const newStory: Story = {
    ...story,
    id: Date.now().toString(),
    createdAt: Date.now(),
  };
  stories.push(newStory);
  await fs.writeFile(STORIES_PATH, JSON.stringify(stories, null, 2), 'utf-8');
  return newStory;
}

export async function getStoryById(id: string): Promise<Story | undefined> {
  const stories = await getStories();
  return stories.find(s => s.id === id);
}

export async function deleteStory(id: string): Promise<void> {
  const stories = await getStories();
  const filtered = stories.filter(s => s.id !== id);
  await fs.writeFile(STORIES_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
}
