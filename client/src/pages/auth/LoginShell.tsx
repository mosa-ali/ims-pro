import React, { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LoginShellProps {
  brandingPanel: ReactNode;
  accessPanel: ReactNode;
}

export function LoginShell({ brandingPanel, accessPanel }: LoginShellProps) {
  const { isRTL } = useLanguage();

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-7xl">
        {/* Desktop: 2-column layout */}
        <div className="hidden md:grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Panel - Branding */}
          <div className="flex flex-col justify-center">{brandingPanel}</div>

          {/* Right Panel - Access Card */}
          <div className="flex flex-col justify-center">{accessPanel}</div>
        </div>

        {/* Mobile/Tablet: Stacked layout */}
        <div className="md:hidden flex flex-col gap-8">
          {/* Branding Section */}
          <div>{brandingPanel}</div>

          {/* Access Card Section */}
          <div>{accessPanel}</div>
        </div>
      </div>
    </div>
  );
}
