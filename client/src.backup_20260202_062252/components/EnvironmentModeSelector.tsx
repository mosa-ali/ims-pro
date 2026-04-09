// ============================================================================
// ENVIRONMENT MODE SELECTOR
// Toggle between DEV/TEST/UAT/PRODUCTION modes
// ============================================================================

import { useState, useEffect } from 'react';
import { environmentService, type EnvironmentMode } from '@/services/environmentService';
import { Settings } from 'lucide-react';

export function EnvironmentModeSelector() {
  const [currentMode, setCurrentMode] = useState<EnvironmentMode>(environmentService.getMode());
  const [showSelector, setShowSelector] = useState(false);

  const modes: EnvironmentMode[] = ['DEV', 'TEST', 'UAT', 'PRODUCTION'];

  const handleModeChange = (mode: EnvironmentMode) => {
    environmentService.setMode(mode);
    setCurrentMode(mode);
    // Reload page to apply changes
    window.location.reload();
  };

  const getModeColor = (mode: EnvironmentMode) => {
    switch (mode) {
      case 'PRODUCTION':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'UAT':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'TEST':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'DEV':
      default:
        return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  const getDeletionPolicy = (mode: EnvironmentMode) => {
    return mode === 'PRODUCTION' ? 'Draft Only' : 'All Statuses';
  };

  return (
    <div className="relative">
      {/* Current Mode Badge */}
      <button
        onClick={() => setShowSelector(!showSelector)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${getModeColor(currentMode)}`}
        title="Click to change environment mode"
      >
        <Settings className="w-3.5 h-3.5" />
        <span className="uppercase">{currentMode}</span>
        <span className="text-[10px] opacity-75">
          (Delete: {getDeletionPolicy(currentMode)})
        </span>
      </button>

      {/* Mode Selector Dropdown */}
      {showSelector && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-[280px]">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Select Environment Mode
          </div>
          <div className="space-y-1">
            {modes.map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`w-full text-left px-3 py-2 rounded text-xs font-medium transition-colors ${
                  mode === currentMode
                    ? getModeColor(mode) + ' font-bold'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="uppercase font-bold">{mode}</span>
                  <span className="text-[10px]">
                    Delete: {getDeletionPolicy(mode)}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 text-[10px] text-gray-500">
            <strong>DEV/TEST/UAT:</strong> Allow deletion of all statuses<br/>
            <strong>PRODUCTION:</strong> Only draft records can be deleted
          </div>
        </div>
      )}
    </div>
  );
}
