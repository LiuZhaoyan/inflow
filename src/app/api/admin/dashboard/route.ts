import { NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/auth/permissions';
import { getAdminDashboardStats } from '@/lib/db/user';
import { logger } from '@/lib/core/logger';

export async function GET(req: Request) {
  const startTime = Date.now();
  const endpoint = 'GET /api/admin/dashboard';
  let userId: string | undefined;

  try {
    // 检查管理员权限
    const { user, errorResponse } = await checkAdminRole();
    if (errorResponse) {
      logger.warn('Unauthorized admin access attempt', {
        endpoint,
        statusCode: errorResponse.status || 403,
        durationMs: Date.now() - startTime,
      });
      return errorResponse;
    }

    userId = user?.id;

    // 获取仪表板统计数据
    const stats = await getAdminDashboardStats();

    logger.info('Admin dashboard accessed', {
      endpoint,
      userId,
      statusCode: 200,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Failed to fetch dashboard stats', {
      endpoint,
      userId,
      statusCode: 500,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : undefined,
    });

    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 },
    );
  }
}
