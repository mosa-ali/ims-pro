import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => void;
  title?: string;
  description?: string;
  recordName?: string;
  recordType?: string;
  /** When true, shows a required reason textarea */
  requireReason?: boolean;
  /** Minimum length for the reason (default: 3) */
  reasonMinLength?: number;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  recordName,
  recordType = "record",
  requireReason = false,
  reasonMinLength = 3,
}: DeleteConfirmationDialogProps) {
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  const isReasonValid = !requireReason || reason.trim().length >= reasonMinLength;

  const handleConfirm = () => {
    if (!isReasonValid) return;
    onConfirm(requireReason ? reason.trim() : undefined);
    setReason("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              {title || t.deleteConfirmationDialog.deleteConfirmation}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base leading-relaxed">
            {description || (
              <>
                {t.deleteConfirmationDialog.deleteWarning}
                <br />
                <br />
                <span className="font-medium text-foreground">
                  {t.deleteConfirmationDialog.deleteArchiveNote}
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireReason && (
          <div className="py-2">
            <Label htmlFor="delete-reason" className="text-sm font-medium mb-1.5 block">
              {t.deleteConfirmationDialog.reasonLabel || "Reason for deletion"} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.deleteConfirmationDialog.reasonPlaceholder || "Please provide a reason for deletion (min 3 characters)..."}
              className="min-h-[80px]"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            {reason.length > 0 && reason.trim().length < reasonMinLength && (
              <p className="text-xs text-red-500 mt-1">
                {t.deleteConfirmationDialog.reasonMinLength || `Reason must be at least ${reasonMinLength} characters`}
              </p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t.deleteConfirmationDialog.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isReasonValid}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
          >
            {t.deleteConfirmationDialog.confirmDelete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
