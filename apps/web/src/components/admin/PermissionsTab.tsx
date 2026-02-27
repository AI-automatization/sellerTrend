// ─── PermissionsTab ──────────────────────────────────────────────────────────

import { ROLES, PERMISSIONS } from './types';
import { RoleBadge } from './RoleBadge';

export function PermissionsTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {ROLES.map((role) => (
          <div key={role} className="card bg-base-200 border border-base-300/50">
            <div className="card-body p-4">
              <RoleBadge role={role} />
              <ul className="mt-2 space-y-1">
                {PERMISSIONS[role].map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs">
                    <span className="text-success">&#10003;</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
