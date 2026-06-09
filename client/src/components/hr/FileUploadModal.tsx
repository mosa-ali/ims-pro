/**
 * ============================================================================
 * FILE UPLOAD MODAL - Reusable Component
 * ============================================================================
 */

import { useState, useRef } from 'react';
import { X, Upload, File, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';

interface FileUploadModalProps {
 isOpen: boolean;
 onClose: () => void;
 onUpload: (file: File, notes?: string) => Promise<void>;
 title: { en: string; ar: string };
 acceptedTypes?: string;
 maxSizeMB?: number;
}

export function FileUploadModal({
 isOpen, 
 onClose, 
 onUpload,
 title,
 acceptedTypes = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
 maxSizeMB = 10
}: FileUploadModalProps) {
 const { t } = useTranslation(); 
 const { language, isRTL } = useLanguage();
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [notes, setNotes] = useState('');
 const [uploading, setUploading] = useState(false);
 const [error, setError] = useState('');
 const fileInputRef = useRef<HTMLInputElement>(null);

 const labels = {
 close: t.hr.close,
 selectFile: t.hr.selectFile,
 dragDrop: t.hr.orDragAndDrop,
 selectedFile: t.hr.selectedFile,
 notes: t.hr.notesOptional,
 notesPlaceholder: t.hr.addAnyNotesAboutThisDocument,
 upload: t.hr.upload,
 uploading: t.hr.uploading,
 cancel: t.hr.cancel,
 maxSize: language === 'en' ? `Maximum file size: ${maxSizeMB}MB` : `الحد الأقصى لحجم الملف: ${maxSizeMB} ميجابايت`,
 acceptedFormats: t.hr.acceptedFormats,
 };

 if (!isOpen) return null;

 const handleFileSelect = (file: File) => {
 setError('');
 
 // Validate file size
 const maxSizeBytes = maxSizeMB * 1024 * 1024;
 if (file.size > maxSizeBytes) {
 setError(language === 'en' 
 ? `File size exceeds ${maxSizeMB}MB limit` 
 : `حجم الملف يتجاوز الحد المسموح ${maxSizeMB} ميجابايت`
 );
 return;
 }

 setSelectedFile(file);
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 const file = e.dataTransfer.files[0];
 if (file) handleFileSelect(file);
 };

 const handleSubmit = async () => {
 if (!selectedFile) return;

 setUploading(true);
 setError('');

 try {
 await onUpload(selectedFile, notes);
 // Reset and close
 setSelectedFile(null);
 setNotes('');
 onClose();
 } catch (err) {
 setError(t.hr.uploadFailedPleaseTryAgain);
 } finally {
 setUploading(false);
 }
 };

 return (
 <ModalOverlay onClose={onClose}>
 <div className="bg-white rounded-lg w-full max-w-lg">
 {/* Header */}
 <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200`}>
 <h2 className="text-lg font-semibold text-gray-900">{title[language]}</h2>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Content */}
 <div className="px-6 py-4 space-y-4">
 {/* File Drop Zone */}
 <div
 onDrop={handleDrop}
 onDragOver={(e) => e.preventDefault()}
 className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
 onClick={() => fileInputRef.current?.click()}
 >
 <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
 <p className="text-sm text-gray-600 mb-1">{labels.selectFile}</p>
 <p className="text-xs text-gray-500">{labels.dragDrop}</p>
 <input
 ref={fileInputRef}
 type="file"
 accept={acceptedTypes}
 onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
 className="hidden"
 />
 </div>

 {/* File Info */}
 <div className="text-xs text-gray-500 space-y-1">
 <p>{labels.maxSize}</p>
 <p>{t.acceptedFormats}: {acceptedTypes}</p>
 </div>

 {/* Selected File Display */}
 {selectedFile && (
 <div className={`flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200`}>
 <File className="w-5 h-5 text-blue-600 flex-shrink-0" />
 <div className={`flex-1 min-w-0 text-start`}>
 <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
 <p className="text-xs text-gray-500">
 {(selectedFile.size / 1024).toFixed(2)} KB
 </p>
 </div>
 </div>
 )}

 {/* Notes */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {labels.notes}
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder={labels.notesPlaceholder}
 rows={3}
 className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>

 {/* Error Message */}
 {error && (
 <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg`}>
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
 <p className="text-sm text-red-700">{error}</p>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200`}>
 <button
 onClick={onClose}
 disabled={uploading}
 className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
 >
 {labels.cancel}
 </button>
 <button
 onClick={handleSubmit}
 disabled={!selectedFile || uploading}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {uploading ? labels.uploading : labels.upload}
 </button>
 </div>
 </div>
 </ModalOverlay>
 );
}