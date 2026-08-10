import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/helpers';
import { getAdminUsersList } from '@/lib/db/user';
import { logger } from '@/lib/core/logger';

export async function GET(req: Request) {
  const startTime = Date.now();
  const endpoint = 'GET /api/admin/users';
  let userId: string | undefined;

  try {
    // 检查管理员权限
    const { user, errorResponse } = await requireAdminRole();
    if (errorResponse) {
      logger.warn('Unauthorized admin access attempt', {
        endpoint,
        statusCode: errorResponse.status || 403,
        durationMs: Date.now() - startTime,
      });
      return errorResponse;
    }

    userId = user?.id;

    // 获取查询参数
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 获取用户列表
    const result = await getAdminUsersList(limit, offset);

    logger.info('Admin fetched users list', {
      endpoint,
      userId,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      count: result.users.length,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to fetch users list', {
      endpoint,
      userId,
      statusCode: 500,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : undefined,
    });

    return NextResponse.json(
      { error: 'Failed to fetch users list' },
      { status: 500 },
    );
  }
}
