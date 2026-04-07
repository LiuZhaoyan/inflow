// app/api/ai-depict/route.ts
import { NextResponse } from 'next/server';
import {
  createTask,
  getTask,
  executeImageGenerationTask,
} from '@/lib/aiClient';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/errorHandler';

export async function POST(request: Request) {
  const startTime = Date.now();
  const endpoint = 'POST /api/ai-depict';
  let userId: string | undefined;
  try {
    const { errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

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
      logger.error('Background image generation failed', {
        error: err instanceof Error ? err : new Error(String(err)),
        endpoint: 'POST /api/ai-depict',
        taskId: task.id,
      });
    });

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      message: 'Image generation started. Poll GET /api/ai-depict?taskId=<id> for status.',
    });

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

// ============================================
// GET: 查询异步任务状态
// 参数: taskId - 任务 ID
// ============================================
export async function GET(request: Request) {
  const { errorResponse } = await getAuthenticatedUser();
  if (errorResponse) return errorResponse;

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
  logger.info('GET /api/ai-depict task status', {
    taskId: task.id,
    status: task.status,
    endpoint: 'GET /api/ai-depict',
  });
  if (task.status === 'completed' && task.result) {
    response.imageUrl = task.result.imageUrl;
  }

  if (task.status === 'failed' && task.error) {
    response.error = task.error;
  }

  return NextResponse.json(response);
}