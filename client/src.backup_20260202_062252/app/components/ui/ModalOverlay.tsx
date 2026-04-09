/**
 * ============================================================================
 * MODAL OVERLAY - GLOBAL STANDARD (SINGLE SOURCE OF TRUTH)
 * ============================================================================
 * 
 * DESIGN STANDARD (MATCHES MEAL MODULE):
 * - Soft gray overlay: bg-gray-900/30 backdrop-blur-sm
 * - 30% opacity gray + subtle blur effect
 * - Consistent with MEAL "Update Indicator" modal
 * - NO modal is allowed to define its own backdrop
 * 
 * USAGE:
 * import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
 * 
 * <ModalOverlay>
 *   <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
 *     {Your modal content}
 *   </div>
 * </ModalOverlay>
 */

interface ModalOverlayProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  return (
    <div 
      className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        // Close modal if clicking on overlay (not the modal content)
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}