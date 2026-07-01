import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/iconButton";
import { Table } from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";

/**
 * Report Catalog Card
 */
export const ReportCard: React.FC<{
  id: string;
  title: string;
  desc: string;
  status?: string;
  category?: string;
  onGenerate: () => void;
}> = ({ id, title, desc, status, category, onGenerate }) => (
  <Card className="p-6 bg-surface-container-lowest border-border-subtle shadow-sm hover:shadow-lg transition-all group flex flex-col justify-between h-full border-b-4 border-b-transparent hover:border-b-primary">
    <div>
      <div className="flex justify-between items-start mb-5">
        <div className="p-3 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
          <span className="material-icons">analytics</span>
        </div>
        {status && <Badge variant="outline" className="text-[9px] font-black border-primary/20 bg-primary/5 text-primary uppercase tracking-widest">{status}</Badge>}
      </div>
      <h3 className="font-black text-base text-primary mb-2.5 leading-tight group-hover:text-corporate-blue-dark transition-colors">{title}</h3>
      <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3 font-medium opacity-80">{desc}</p>
    </div>
    <div className="mt-8 pt-5 border-t border-border-subtle flex justify-between items-center">
      <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.15em]">{category}</span>
      <Button 
        variant="outline" 
        size="sm" 
        className="text-primary font-black text-[10px] uppercase hover:bg-primary/5"
        onClick={onGenerate}
      >
        Generate <span className="material-icons text-xs ml-1.5 transition-transform group-hover:translate-x-1">chevron_right</span>
      </Button>
    </div>
  </Card>
);

/**
 * Export History Table
 */
export const ExportHistoryTable: React.FC<{
  data?: any[];
}> = ({ data }) => (
  <div className="overflow-x-auto rounded-xl border border-border-subtle">
    <Table className="w-full">
      <thead>
        <tr className="text-[10px] uppercase font-black text-on-surface-variant border-b border-border-subtle bg-surface-container-low/40">
          <th className="px-6 py-4 text-left tracking-widest">Report Identifier</th>
          <th className="px-6 py-4 text-left tracking-widest">Classification</th>
          <th className="px-6 py-4 text-left tracking-widest">Requestor</th>
          <th className="px-6 py-4 text-left tracking-widest">Status</th>
          <th className="px-6 py-4 text-right tracking-widest">Runtime</th>
          <th className="px-6 py-4 text-center tracking-widest">Control</th>
        </tr>
      </thead>
      <tbody>
        {data?.length ? data.map((report, idx) => (
          <tr key={idx} className="border-b border-border-subtle hover:bg-neutral-gray-surface transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${report.mimeType?.includes('pdf') ? 'bg-error/5 text-error' : 'bg-success/5 text-success'}`}>
                  <span className="material-icons text-base">
                    {report.mimeType?.includes('pdf') ? 'picture_as_pdf' : 'description'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-sm font-black text-primary block">{report.fileName}</span>
                  <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase">{new Date(report.generatedAt).toLocaleString()}</span>
                </div>
              </div>
            </td>
            <td className="px-6 py-4">
               <Badge variant="outline" className="text-[10px] font-bold uppercase">{report.documentType}</Badge>
            </td>
            <td className="px-6 py-4">
               <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                    {String(report.generatedBy).substring(0, 1)}
                  </div>
                  <span className="text-sm font-bold">{report.generatedBy || 'System'}</span>
               </div>
            </td>
            <td className="px-6 py-4">
              <Badge 
                variant={
                  report.status === "COMPLETED"
                    ? "default"
                    : report.status === "FAILED"
                      ? "destructive"
                      : "secondary"
                }
                className="font-black text-[9px] min-w-[80px] justify-center"
              >
                {report.status}
              </Badge>
            </td>
            <td className="px-6 py-4 text-right text-xs font-mono font-bold text-on-surface-variant">{report.runtime || '3.8s'}</td>
            <td className="px-6 py-4">
              <div className="flex justify-center gap-2">
                <IconButton icon="visibility" size="sm" className="hover:bg-primary/5 text-primary" />
                <IconButton icon="download" size="sm" className="hover:bg-primary/5 text-primary" />
              </div>
            </td>
          </tr>
        )) : (
          <tr>
            <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant italic font-medium opacity-50">No export history available for the current filters.</td>
          </tr>
        )}
      </tbody>
    </Table>
  </div>
);

/**
 * Quick Stats Bar for Reporting
 */
export const QuickStatsBar: React.FC<{
  stats: Array<{ label: string; value: string; trend?: string; status?: string; limit?: string }>;
}> = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
    {stats.map((stat, idx) => (
      <Card key={idx} className="p-6 bg-surface-container-lowest border-border-subtle shadow-sm flex justify-between items-center relative overflow-hidden group">
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em]">{stat.label}</p>
          <h4 className="text-3xl font-black text-primary tabular-nums tracking-tighter">{stat.value}</h4>
        </div>
        <div className="text-right relative z-10">
          {stat.trend === 'up' && (
            <Badge variant="default" className="bg-error/5 text-error border-none flex items-center gap-1 px-2 py-1 font-black text-[10px]">
              <span className="material-icons text-xs">trending_up</span> HIGH VOLUME
            </Badge>
          )}
          {stat.status === 'stable' && (
            <Badge variant="destructive" className="bg-success/5 text-success border-none px-2 py-1 font-black text-[10px]">
              OPERATIONAL
            </Badge>
          )}
          {stat.limit && <p className="text-[10px] font-black text-on-surface-variant/40 mt-2 uppercase">Cap: {stat.limit}</p>}
        </div>
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
      </Card>
    ))}
  </div>
);

/**
 * Scheduled Distribution List: Sidebar component for managing recurring reports.
 */
export const ScheduledDistributionList: React.FC<{
  schedules?: any[];
  onManage?: (id: number) => void;
}> = ({ schedules, onManage }) => (
  <div className="space-y-3">
    {schedules?.map((schedule, idx) => (
      <div key={idx} className="flex items-center justify-between p-3 bg-white/10 rounded border border-white/10 hover:bg-white/20 transition-colors group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-bold font-headline-md truncate">{schedule.name}</p>
            <Badge className={schedule.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-slate-600/50 text-white' + " border-none text-[8px] px-1.5 py-0.5"}>
              {schedule.status}
            </Badge>
          </div>
          <p className="text-[10px] text-corporate-blue-light/60 font-body-sm">{schedule.frequency} @ {schedule.time}</p>
        </div>
        <IconButton 
          icon="more_vert" 
          size="sm" 
          className="text-corporate-blue-light/60 hover:text-white" 
          onClick={() => onManage?.(schedule.id)}
        />
      </div>
    )) || (
      <div className="p-4 text-center border border-white/10 rounded-xl bg-white/5">
        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest text-white">No active schedules</p>
      </div>
    )}
  </div>
);
