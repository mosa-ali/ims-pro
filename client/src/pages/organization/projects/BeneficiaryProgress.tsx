// BeneficiaryProgress.tsx
// Beneficiary portfolio analytics — total registered, verified, gender breakdown,
// and per-project distribution. Driven by trpc.beneficiaries.getBeneficiarySummary.

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, Clock } from 'lucide-react';

interface BeneficiarySummary {
  total: number;
  males: number;
  females: number;
  verified: number;
  pending: number;
  notEligible: number;
  withDisability: number;
  completed: number;
  active: number;
  byProject: Array<{
    projectId: number;
    projectName: string;
    total: number;
    verified: number;
    males: number;
    females: number;
  }>;
}

interface BeneficiaryProgressProps {
  data: BeneficiarySummary | null | undefined;
  isLoading: boolean;
  t: Record<string, any>;
}

// ─── Per-project bar ──────────────────────────────────────────────────────────

const ProjectBar = memo(function ProjectBar({
  label,
  total,
  verified,
}: {
  label: string;
  total: number;
  verified: number;
}) {
  const pct = total > 0 ? Math.min(Math.round((verified / total) * 100), 100) : 0;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6366f1';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 truncate max-w-[180px]" title={label}>{label}</span>
        <span className="font-semibold text-gray-800 flex-shrink-0 ml-2">
          {total.toLocaleString()} <span className="text-gray-400 font-normal">({pct}% verified)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
});

// ─── Stat pill ────────────────────────────────────────────────────────────────

const StatPill = memo(function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${color}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <div>
        <div className="text-sm font-bold leading-none">{value.toLocaleString()}</div>
        <div className="text-xs mt-0.5 opacity-80">{label}</div>
      </div>
    </div>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export const BeneficiaryProgress = memo(function BeneficiaryProgress({
  data, isLoading, t,
}: BeneficiaryProgressProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data?.total || 0;
  const verified = data?.verified || 0;
  const pending = data?.pending || 0;
  const notEligible = data?.notEligible || 0;
  const males = data?.males || 0;
  const females = data?.females || 0;
  const withDisability = data?.withDisability || 0;
  const byProject: BeneficiarySummary['byProject'] = data?.byProject || [];

  const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;
  const malesPct = total > 0 ? Math.round((males / total) * 100) : 0;
  const femalesPct = total > 0 ? Math.round((females / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-600" />
          {t?.beneficiaryProgress?.title || t?.beneficiaryPortfolio || 'Beneficiary Portfolio'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
            {t?.beneficiaryProgress?.noData || 'No beneficiary records found'}
          </div>
        ) : (
          <>
            {/* ── Portfolio headline ── */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-teal-50 rounded-lg border border-teal-100">
              <div className="text-center flex-shrink-0 min-w-[56px]">
                <div className="text-2xl font-bold text-teal-700">{total.toLocaleString()}</div>
                <div className="text-xs text-teal-600 mt-0.5">{t?.beneficiaryProgress?.target || t?.total || 'Total'}</div>
              </div>
              <div className="flex-1 space-y-1.5">
                {/* Verification progress */}
                <div className="flex justify-between text-xs text-teal-700">
                  <span>{t?.beneficiaryProgress?.reached || 'Verified'}: {verified.toLocaleString()}</span>
                  <span>{verifiedPct}%</span>
                </div>
                <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${verifiedPct}%` }}
                  />
                </div>
                {/* Gender split */}
                <div className="flex gap-1 mt-1">
                  <div
                    className="h-1.5 bg-blue-400 rounded-l-full transition-all duration-500"
                    style={{ width: `${malesPct}%` }}
                    title={`Male: ${males} (${malesPct}%)`}
                  />
                  <div
                    className="h-1.5 bg-pink-400 rounded-r-full transition-all duration-500"
                    style={{ width: `${femalesPct}%` }}
                    title={`Female: ${females} (${femalesPct}%)`}
                  />
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                    {t?.male || 'Male'} {malesPct}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-pink-400" />
                    {t?.female || 'Female'} {femalesPct}%
                  </span>
                </div>
              </div>
            </div>

            {/* ── Status pills ── */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatPill
                icon={UserCheck}
                label={t?.beneficiaryProgress?.reached || 'Verified'}
                value={verified}
                color="bg-emerald-50 text-emerald-700"
              />
              <StatPill
                icon={Clock}
                label={t?.beneficiaryProgress?.pending || t?.pending || 'Pending'}
                value={pending}
                color="bg-amber-50 text-amber-700"
              />
              <StatPill
                icon={UserX}
                label={t?.notEligible || 'Not Eligible'}
                value={notEligible}
                color="bg-red-50 text-red-700"
              />
            </div>

            {withDisability > 0 && (
              <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-400" />
                {t?.withDisability || 'With Disability'}: {withDisability.toLocaleString()} ({total > 0 ? Math.round((withDisability / total) * 100) : 0}%)
              </div>
            )}

            {/* ── Per-project breakdown ── */}
            {byProject.length > 0 && (
              <>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t?.byProject || 'By Project'}
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {byProject.map((p) => (
                    <ProjectBar
                      key={p.projectId}
                      label={p.projectName}
                      total={p.total}
                      verified={p.verified}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
