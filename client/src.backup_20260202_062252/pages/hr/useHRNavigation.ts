/**
 * HR Navigation Utility Hook
 * 
 * Provides context-aware navigation for HR module components.
 * Automatically detects whether the user is in /organization/hr or /hr context
 * and generates correct navigation paths.
 */

import { useLocation } from 'wouter';

export function useHRNavigation() {
  const [location, setLocation] = useLocation();
  
  // Determine the base path based on current URL
  const getBasePath = () => {
    if (location.startsWith('/organization/hr')) {
      return '/organization/hr';
    }
    return '/hr';
  };
  
  // Navigate to an HR sub-path
  const navigateTo = (subPath: string) => {
    const basePath = getBasePath();
    // Remove leading slash from subPath if present
    const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
    const fullPath = cleanSubPath ? `${basePath}/${cleanSubPath}` : basePath;
    setLocation(fullPath);
  };
  
  // Get the full path for an HR sub-path (for use in links)
  const getFullPath = (subPath: string) => {
    const basePath = getBasePath();
    const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
    return cleanSubPath ? `${basePath}/${cleanSubPath}` : basePath;
  };
  
  // Check if we're in organization context
  const isOrganizationContext = () => {
    return location.startsWith('/organization/hr');
  };
  
  return {
    basePath: getBasePath(),
    navigateTo,
    getFullPath,
    isOrganizationContext: isOrganizationContext(),
    currentLocation: location,
  };
}

export default useHRNavigation;
