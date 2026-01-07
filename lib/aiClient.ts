// lib/aiClient.ts

import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      baseURL: process.env.BASE_URL,
      apiKey: process.env.API_KEY,
    });
  }
  return openaiClient;
}

export interface AIRequestConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

const DEFAULT_CONFIG: AIRequestConfig = {
  model: 'deepseek/deepseek-v3.2',
  temperature: 0.7,
  maxTokens: 150,
  timeout: 30000,
};

// Chat
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  config: AIRequestConfig = {}
): Promise<string> {
  const client = getOpenAIClient();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const completion = await client.chat.completions.create({
    model: finalConfig.model!,
    messages,
    temperature: finalConfig.temperature,
    max_tokens: finalConfig.maxTokens,
  });

  return completion.choices[0]?.message?.content || '';
}

// image generation
export interface ImageGenerationConfig {
  apiUrl?: string;
  timeout?: number;
}

export async function generateImage(
  prompt: string,
  config: ImageGenerationConfig = {}
): Promise<string> {
  const apiKey = process.env.API_KEY;
  const apiUrl = config.apiUrl || process.env.AI_DEPICT_API_URL || 'https://api.openai.com/v1/images/generations';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt }),
  });

//   if (!response.ok) {
//     const errorText = await response.text();
//     console.error('Image Generation API Error:', response.status, errorText);
//     throw new Error(`Image API request failed with status ${response.status}`);
//   }

  const data = await response.json();
  const imageUrl = data.images?.[0];

  if (!imageUrl) {
    console.error('Unexpected API response structure:', data);
    throw new Error('No image URL found in response');
  }

  return imageUrl;
}

// ============================================
// Async Task Management for Image Generation
// ============================================

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TaskInfo<T = unknown> {
  id: string;
  status: TaskStatus;
  result?: T;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

const taskStore = new Map<string, TaskInfo<unknown>>();

const TASK_EXPIRY_MS = 30 * 60 * 1000;

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [id, task] of taskStore.entries()) {
      if (now - task.createdAt > TASK_EXPIRY_MS) {
        taskStore.delete(id);
      }
    }
  }, 60 * 1000);
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}


export function createTask<T = unknown>(): TaskInfo<T> {
  const task: TaskInfo<T> = {
    id: generateTaskId(),
    status: 'pending',
    createdAt: Date.now(),
  };
  taskStore.set(task.id, task as TaskInfo<unknown>);
  return task;
}

export function getTask<T = unknown>(taskId: string): TaskInfo<T> | null {
  const task = taskStore.get(taskId);
  return task ? (task as TaskInfo<T>) : null;
}

export function updateTask<T = unknown>(
  taskId: string,
  updates: Partial<Pick<TaskInfo<T>, 'status' | 'result' | 'error'>>
): void {
  const task = taskStore.get(taskId);
  if (!task) return;
  
  Object.assign(task, updates);
  
  if (updates.status === 'completed' || updates.status === 'failed') {
    task.completedAt = Date.now();
  }
}

export async function executeImageGenerationTask(
  taskId: string,
  prompt: string
): Promise<void> {
  updateTask(taskId, { status: 'processing' });

  try {
    const imageUrl = await generateImage(prompt);
    updateTask<{ imageUrl: string }>(taskId, {
      status: 'completed',
      result: { imageUrl },
    });
  } catch (error) {
    console.error('Image generation task failed:', error);
    updateTask(taskId, {
      status: 'failed',
      error: (error as Error).message || 'Failed to generate image',
    });
  }
}
