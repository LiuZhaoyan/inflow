import { NextResponse } from 'next/server';
import { getAuthenticatedUserWithRole, requireAdminRole, getAuthenticatedUser } from './helpers';
import { handleApiError } from '@/lib/core/error-handler';

/**
 * API 路由权限检查工具库
 * 提供标准化的权限验证模式
 */

/**
 * 检查用户是否已认证（基础权限）
 * @returns { user, errorResponse }
 *
 * 用法:
 * ```typescript
 * const { user, errorResponse } = await checkAuth();
 * if (errorResponse) return errorResponse;
 * // user 已认证，可安全使用
 * ```
 */
export async function checkAuth() {
  return getAuthenticatedUser();
}

/**
 * 检查用户权限等级（需要角色信息）
 * @returns { user, errorResponse }
 *
 * 用法:
 * ```typescript
 * const { user, errorResponse } = await checkAuthWithRole();
 * if (errorResponse) return errorResponse;
 * // user 包含 role: 'user' | 'admin'
 * ```
 */
export async function checkAuthWithRole() {
  return getAuthenticatedUserWithRole();
}

/**
 * 检查用户是否为管理员
 * @returns { user, errorResponse }
 *
 * 用法:
 * ```typescript
 * const { user, errorResponse } = await checkAdminRole();
 * if (errorResponse) return errorResponse;
 * // user 已验证为管理员
 * ```
 */
export async function checkAdminRole() {
  return requireAdminRole();
}

/**
 * 标准的权限错误处理函数
 *
 * 用法:
 * ```typescript
 * try {
 *   const { user, errorResponse } = await checkAuth();
 *   if (errorResponse) return errorResponse;
 *   // ... 业务逻辑
 * } catch (error) {
 *   return handlePermissionError(error, {
 *     endpoint: 'GET /api/some-route',
 *     userId: user?.id,
 *     statusCode: 500,
 *     durationMs: Date.now() - startTime,
 *   });
 * }
 * ```
 */
export async function handlePermissionError(
  error: unknown,
  context: {
    endpoint: string;
    userId?: string;
    statusCode: number;
    durationMs: number;
  },
) {
  return handleApiError(error, {
    ...context,
    originalError: error instanceof Error ? error : undefined,
  });
}

/**
 * 权限场景的标准响应格式
 */
export const PermissionResponses = {
  /**
   * 未认证 (401)
   */
  unauthorized: () =>
    NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    ),

  /**
   * 无权限 (403)
   */
  forbidden: (reason = 'Forbidden') =>
    NextResponse.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: reason,
        },
      },
      { status: 403 },
    ),

  /**
   * 仅管理员 (403)
   */
  adminOnly: () =>
    NextResponse.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Admin role required',
        },
      },
      { status: 403 },
    ),

  /**
   * 资源不存在或无权访问 (404)
   */
  notFound: (reason = 'Not found') =>
    NextResponse.json(
      { error: reason },
      { status: 404 },
    ),
};
