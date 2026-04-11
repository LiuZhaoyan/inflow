import { NextResponse } from 'next/server';
import { checkAdminRole } from '@/lib/auth/permissions';
import { deleteUser } from '@/lib/db/user';
import { logger } from '@/lib/core/logger';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: paramUserId } = await params;
  const startTime = Date.now();
  const endpoint = `DELETE /api/admin/users/${paramUserId}`;
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

    // 防止管理员自己删除自己
    if (paramUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own user account' },
        { status: 400 },
      );
    }

    // 删除用户
    await deleteUser(paramUserId);

    logger.info('Admin deleted user', {
      endpoint,
      userId,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      deletedUser: paramUserId,
    });

    return NextResponse.json({ success: true, deletedUser: paramUserId });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;

    logger.error('Failed to delete user', {
      endpoint,
      userId,
      statusCode,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : undefined,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete user',
      },
      { status: statusCode },
    );
  }
}
