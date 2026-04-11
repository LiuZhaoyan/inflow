import { NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/auth/permissions';
import { updateUserRole } from '@/lib/db/user';
import { logger } from '@/lib/core/logger';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: paramUserId } = await params;
  const startTime = Date.now();
  const endpoint = `PUT /api/admin/users/${paramUserId}/role`;
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

    // 解析请求体
    const body = await req.json();
    const { role } = body;

    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user" or "admin"' },
        { status: 400 },
      );
    }

    // 更新用户角色
    const result = await updateUserRole(paramUserId, role);

    logger.info('Admin updated user role', {
      endpoint,
      userId,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      targetUser: paramUserId,
      newRole: role,
    });

    return NextResponse.json(result);
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;

    logger.error('Failed to update user role', {
      endpoint,
      userId,
      statusCode,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : undefined,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update user role',
      },
      { status: statusCode },
    );
  }
}
