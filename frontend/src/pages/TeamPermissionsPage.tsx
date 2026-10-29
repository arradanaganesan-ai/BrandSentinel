import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Inbox,
} from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  useToast,
} from '../components/ui';

interface TeamPermissionsPageProps {
  currentUser: User | null;
}

export const TeamPermissionsPage: React.FC<TeamPermissionsPageProps> = ({ currentUser }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTeamMembers();
      setMembers(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Team members could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (membershipId: string, newRole: string) => {
    try {
      await api.updateMemberRole(membershipId, newRole);
      toast.success(`Role updated to '${newRole}'`, 'Event logged in tamper-evident audit trail.');
      await loadMembers();
    } catch (err: any) {
      toast.error('Role update failed', err?.message);
    }
  };

  const roles = [
    { role: 'CONTENT_CREATOR', desc: 'Author drafts, inspect findings, accept/reject suggestions, resubmit revisions.' },
    { role: 'BRAND_MANAGER', desc: 'Publish brand rules, manage terminology and color guidelines, comment on reviews.' },
    { role: 'LEGAL_COMPLIANCE', desc: 'Inspect Claim DNA and disclaimers, resolve escalated claims, participate in gating.' },
    { role: 'APPROVER', desc: 'Executive sign-off authority, approve or reject revisions with mandatory rationale.' },
    { role: 'ORG_ADMIN', desc: 'Full administration: team roles, security policies, data retention, and system settings.' },
  ];

  /* Keep the table mounted while loading or when data exists; hide it only when a
     failed fetch left us with nothing to show (the ErrorState covers that case). */
  const showTable = loading || members.length > 0 || !error;

  const skeletonRow = (i: number) => (
    <tr key={`skeleton-${i}`}>
      <td className="py-3 px-3"><Skeleton className="h-4 w-32" /></td>
      <td className="py-3 px-3"><Skeleton className="h-3 w-44" /></td>
      <td className="py-3 px-3"><Skeleton className="h-4 w-32" /></td>
      <td className="py-3 px-3"><Skeleton className="h-3 w-full" /></td>
      <td className="py-3 px-3"><Skeleton className="h-7 w-44 ml-auto" /></td>
    </tr>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<Users className="w-5 h-5" aria-hidden />}
        eyebrow="Server-Enforced RBAC"
        title="Team Members & Role-Based Access Control"
        description="Strict governance role separation. Users never gain elevated capabilities merely through frontend state modifications."
        actions={
          <div className="text-xs text-ink-muted bg-white border border-line rounded-md px-3.5 py-2 shadow-xs">
            <span>Active Session Authority: </span>
            <strong className="text-purple-300 uppercase">{currentUser?.role || '—'}</strong>
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={loadMembers} />}

      {/* Role Definitions Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {roles.map((r) => (
          <Panel key={r.role} className="p-3.5 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-vermilion block">
              {r.role.replace(/_/g, ' ')}
            </span>
            <p className="text-[11px] text-ink-muted leading-relaxed">{r.desc}</p>
          </Panel>
        ))}
      </div>

      {/* Team Members Table */}
      {showTable && (
        <Panel className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Northstar Labs Organization Members</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-muted font-medium">
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Current Role</th>
                  <th className="py-2.5 px-3">Role Permissions</th>
                  <th className="py-2.5 px-3 text-right">Modify Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading ? (
                  [0, 1, 2, 3].map(skeletonRow)
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <EmptyState
                        icon={<Inbox className="w-4 h-4" />}
                        title="No team members yet"
                        description="Members invited to this organization will appear here with their assigned governance role."
                      />
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.membership_id} className="hover:bg-ivory/70 transition">
                      <td className="py-3 px-3 font-medium text-ink">{m.full_name}</td>
                      <td className="py-3 px-3 font-mono text-ink-muted">{m.email}</td>
                      <td className="py-3 px-3">
                        <Badge tone="brand">{m.role}</Badge>
                      </td>
                      <td className="py-3 px-3 text-ink-muted text-[11px]">
                        {roles.find(r => r.role === m.role)?.desc || 'Standard permissions'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="w-48 ml-auto">
                          <Select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.membership_id, e.target.value)}
                            aria-label={`Role for ${m.full_name}`}
                          >
                            <option value="CONTENT_CREATOR">CONTENT_CREATOR</option>
                            <option value="BRAND_MANAGER">BRAND_MANAGER</option>
                            <option value="LEGAL_COMPLIANCE">LEGAL_COMPLIANCE</option>
                            <option value="APPROVER">APPROVER</option>
                            <option value="ORG_ADMIN">ORG_ADMIN</option>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
};
