'use client';

import { useEffect, useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: 'user' | 'admin') => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      setEditingUserId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <div className="h-8 w-8 border-4 border-[var(--accent-0)] border-t-transparent rounded-full" />
          </div>
          <p className="text-[var(--ink-1)]">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div>
        <h1 className="text-[var(--text-title-md)] font-display font-bold text-[var(--ink-0)]">
          User Management
        </h1>
        <p className="text-[var(--ink-2)] mt-2">
          Manage users, edit roles, and delete accounts. Total users: {users.length}
        </p>
      </div>

      {error && (
        <div className="paper-alert-soft-danger p-6 rounded-lg">
          <p className="font-semibold text-[var(--berry-0)]">Error</p>
          <p className="text-sm text-[var(--ink-1)] mt-1">{error}</p>
        </div>
      )}

      {/* 用户表格 */}
      <div className="paper-panel-flat rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--accent-0)] bg-[var(--paper-1)]">
                <th className="px-6 py-4 text-left font-semibold text-[var(--ink-0)]">
                  Email
                </th>
                <th className="px-6 py-4 text-left font-semibold text-[var(--ink-0)]">
                  Username
                </th>
                <th className="px-6 py-4 text-left font-semibold text-[var(--ink-0)]">
                  Role
                </th>
                <th className="px-6 py-4 text-left font-semibold text-[var(--ink-0)]">
                  Joined
                </th>
                <th className="px-6 py-4 text-left font-semibold text-[var(--ink-0)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--paper-1)] hover:bg-[var(--paper-note)] transition-colors"
                >
                  <td className="px-6 py-4 text-[var(--ink-0)] font-medium">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-1)]">
                    {user.username || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {editingUserId === user.id ? (
                      <div className="flex gap-2">
                        <select
                          value={newRole}
                          onChange={(e) =>
                            setNewRole(e.target.value as 'user' | 'admin')
                          }
                          className="paper-input text-sm px-2 py-1"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() =>
                            handleRoleChange(user.id, newRole)
                          }
                          className="paper-btn-primary px-3 py-1 text-sm rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="paper-btn-ghost px-3 py-1 text-sm rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`
                            px-3 py-1 rounded-full text-xs font-semibold
                            ${
                              user.role === 'admin'
                                ? 'bg-[var(--accent-0)] text-white'
                                : 'bg-[var(--paper-1)] text-[var(--ink-0)]'
                            }
                          `}
                        >
                          {user.role}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-2)] text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingUserId(user.id);
                          setNewRole(user.role);
                        }}
                        className="p-2 text-[var(--accent-0)] hover:bg-[var(--paper-1)] rounded transition-colors"
                        title="Edit role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-[var(--berry-0)] hover:bg-[var(--paper-1)] rounded transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 paper-panel-flat rounded-lg">
          <p className="text-[var(--ink-2)]">No users found</p>
        </div>
      )}
    </div>
  );
}
