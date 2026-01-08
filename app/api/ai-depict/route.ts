// app/api/ai-depict/route.ts
import { NextResponse } from 'next/server';
import {
  generateImage,
  createTask,
  getTask,
  executeImageGenerationTask,
  type TaskInfo,
} from '@/lib/aiClient';

export async function POST(request: Request) {
  try {
    // Check if AI-depict feature is enabled
    const isEnabled = process.env.ENABLE_AI_DEPICT === 'true';
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'AI-depict feature is not enabled' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const task = createTask<{ imageUrl: string }>();
    
    executeImageGenerationTask(task.id, prompt).catch((err) => {
      console.error('Background image generation failed:', err);
    });

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      message: 'Image generation started. Poll GET /api/ai-depict?taskId=<id> for status.',
    });

  } catch (error) {
    console.error('AI Depict Route Error:', error);
    return NextResponse.json(
      { error: (error as any).message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}

// ============================================
// GET: 查询异步任务状态
// 参数: taskId - 任务 ID
// ============================================
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json(
      { error: 'taskId query parameter is required' },
      { status: 400 }
    );
  }

  const task = getTask<{ imageUrl: string }>(taskId);

  if (!task) {
    return NextResponse.json(
      { error: 'Task not found or expired' },
      { status: 404 }
    );
  }

  const response: {
    taskId: string;
    status: string;
    imageUrl?: string;
    error?: string;
  } = {
    taskId: task.id,
    status: task.status,
  };
  console.log('[GET /api/ai-depict] Task status:', task);
  if (task.status === 'completed' && task.result) {
    response.imageUrl = task.result.imageUrl;
  }

  if (task.status === 'failed' && task.error) {
    response.error = task.error;
  }

  return NextResponse.json(response);
}