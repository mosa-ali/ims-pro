import { useRef, useState } from "react";
import { IconButton } from "@/components/ui/iconButton";
import { trpc } from "@/lib/trpc";
import { Bell, Settings, Camera } from "lucide-react";

interface TopNavBarProps {
  title?: string;
}

// Validation Constants
const MIN_SIZE = 10 * 1024; // 10 KB
const MAX_SIZE = 15 * 1024; // 15 KB
const MIN_WIDTH = 200;
const MIN_HEIGHT = 200;
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * TopNavBar Component
 * Path: client/src/components/layout/TopNavBar.tsx
 * Executive Finance Hub navigation header
 */
export const TopNavBar: React.FC<TopNavBarProps> = ({ title = "IMS Finance Hub" }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Fetch persistent profile data
  const profile = trpc.userProfile.getProfile.useQuery();

  // Mutation to persist profile updates
  const updateProfile = trpc.userProfile.updateProfile.useMutation({
    onSuccess: () => {
      utils.userProfile.getProfile.invalidate();
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Validates image dimensions using the browser's Image constructor
   */
  const validateDimensions = (
    file: File
  ): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const isValid =
          img.width >= MIN_WIDTH &&
          img.width <= MAX_WIDTH &&
          img.height >= MIN_HEIGHT &&
          img.height <= MAX_HEIGHT;

        if (isValid) {
          resolve({ width: img.width, height: img.height });
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Validate File Type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid format. Use JPEG, PNG, or WebP.");
      return;
    }

    // 2. Validate File Size (10KB - 15KB)
    if (file.size < MIN_SIZE || file.size > MAX_SIZE) {
      setError(
        `Invalid size (${(file.size / 1024).toFixed(1)}KB). Must be 10KB - 15KB.`
      );
      return;
    }

    // 3. Validate Dimensions
    const dimensions = await validateDimensions(file);
    if (!dimensions) {
      setError(
        `Invalid dimensions. Must be between ${MIN_WIDTH}x${MIN_HEIGHT} and ${MAX_WIDTH}x${MAX_HEIGHT}.`
      );
      return;
    }

    // 4. Update profile (name can be updated here if needed)
    updateProfile.mutate({
      name: profile.data?.name || "User",
    });
  };

  return (
    <header className="sticky top-0 right-0 h-16 bg-surface border-b border-border z-50 flex justify-between items-center px-8 w-full">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Search Section */}
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full bg-surface-container-low border border-border rounded-xl py-2 pl-4 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Branded Title */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="text-sm font-bold text-primary uppercase tracking-wider">
          {title}
        </h1>
      </div>

      {/* Executive Profile Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <IconButton size="sm" variant="ghost" title="Notifications">
            <Bell className="size-4" />
          </IconButton>
          <IconButton size="sm" variant="ghost" title="Settings">
            <Settings className="size-4" />
          </IconButton>
        </div>

        <div className="h-8 w-px bg-border mx-2" />

        <div className="flex flex-col items-end mr-2">
          <p className="text-xs font-bold text-primary uppercase leading-none mb-0.5">
            {profile.data?.name || "Executive User"}
          </p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            {profile.data?.role || "Finance Manager"}
          </p>
        </div>

        {/* Profile Image with Camera Interaction */}
        <div
          className="relative group cursor-pointer"
          onClick={handlePhotoClick}
        >
          <div
            className={`w-11 h-11 rounded-full border-2 overflow-hidden p-0.5 transition-all ${
              error ? "border-destructive" : "border-border group-hover:border-primary"
            }`}
          >
            {updateProfile.isPending ? (
              <div className="w-full h-full flex items-center justify-center bg-primary/5 animate-pulse">
                <div className="animate-spin">
                  <Camera className="size-4" />
                </div>
              </div>
            ) : (
              <img
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100&h=100"
                alt="Executive"
                className="w-full h-full object-cover rounded-full"
              />
            )}
          </div>

          {/* Camera Overlay */}
          <div className="absolute inset-0 bg-primary/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
            <Camera className="size-4" />
          </div>

          {/* Validation Error Tooltip */}
          {error && (
            <div className="absolute top-full mt-2 right-0 bg-destructive text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-[100] animate-in fade-in">
              {error}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
