import React from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';

interface RiskItem {
  likelihood: number; // 1-5
  impact: number; // 1-5
  count: number;
}

interface Props {
  data: RiskItem[];
}

/**
 * RiskHeatMap
 * Location: src/components/charts/RiskHeatMap.tsx
 * 
 * A 5x5 strategic matrix visualizer for likelihood vs impact.
 */
export default function RiskHeatMap({ data }: Props) {
  const {language } = useLanguage();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const getCellColor = (likelihood: number, impact: number) => {
    const score = likelihood * impact;
    if (score >= 15) return 'bg-rose-500 text-white'; // Critical
    if (score >= 9) return 'bg-orange-400 text-white'; // High
    if (score >= 4) return 'bg-amber-300 text-slate-800'; // Medium
    return 'bg-emerald-100 text-emerald-800'; // Low
  };

  const labels = ['1', '2', '3', '4', '5'];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4">
        {/* Y-Axis Label */}
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest -rotate-90 whitespace-nowrap">
            {t.risk.impact ?? 'Impact'}
          </span>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1">
            {[5, 4, 3, 2, 1].map((impact) => (
              <React.Fragment key={`row-${impact}`}>
                {labels.map((likelihood) => {
                  const val = parseInt(likelihood);
                  const count = data.find(d => d.likelihood === val && d.impact === impact)?.count || 0;
                  return (
                    <div 
                      key={`${likelihood}-${impact}`}
                      className={`aspect-square rounded-md flex items-center justify-center text-xs font-black transition-transform hover:scale-105 cursor-default ${getCellColor(val, impact)}`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          
          {/* X-Axis Label */}
          <div className="mt-2 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t.risk.likelihood ?? 'Likelihood'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded bg-rose-500" />
          <span className="text-[9px] font-bold text-slate-500 uppercase">Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded bg-orange-400" />
          <span className="text-[9px] font-bold text-slate-500 uppercase">High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded bg-amber-300" />
          <span className="text-[9px] font-bold text-slate-500 uppercase">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded bg-emerald-100" />
          <span className="text-[9px] font-bold text-slate-500 uppercase">Low</span>
        </div>
      </div>
    </div>
  );
}
