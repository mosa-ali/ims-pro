/**
 * ============================================================================
 * ROUTER COMPATIBILITY LAYER
 * ============================================================================
 * 
 * This module provides compatibility between react-router-dom API and wouter.
 * It allows original design files to use react-router-dom patterns while
 * the actual routing is handled by wouter.
 * 
 * ============================================================================
 */

import { useLocation as useWouterLocation, useParams as useWouterParams, useRoute } from 'wouter';

/**
 * useNavigate hook compatible with react-router-dom API
 * Returns a navigate function that works with wouter
 */
export function useNavigate() {
 const [, setLocation] = useWouterLocation();
 
 return (to: string | number, options?: { replace?: boolean }) => {
 if (typeof to === 'number') {
 // Handle history navigation (back/forward)
 window.history.go(to);
 } else {
 // Navigate to path
 if (options?.replace) {
 window.history.replaceState(null, '', to);
 // Trigger wouter's location change
 window.dispatchEvent(new PopStateEvent('popstate'));
 } else {
 setLocation(to);
 }
 }
 };
}

/**
 * useParams hook - re-export from wouter
 */
export { useParams } from 'wouter';

/**
 * useLocation hook compatible with react-router-dom API
 * Returns [pathname, setLocation] tuple
 */
export function useLocation() {
 return useWouterLocation();
}

/**
 * Link component compatibility
 * Re-export from wouter
 */
export { Link, Redirect } from 'wouter';
