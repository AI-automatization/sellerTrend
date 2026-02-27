// ─── RoleBadge ───────────────────────────────────────────────────────────────

import { type Role, ROLE_META } from './types';

export interface RoleBadgeProps {
  role: Role;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const m = ROLE_META[role] ?? ROLE_META.USER;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${m.badge}`}>{m.label}</span>;
}
