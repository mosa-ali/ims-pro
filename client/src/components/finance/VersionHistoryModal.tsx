import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, User, FileText, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Version {
 id: number;
 version: number;
 revisionReason?: string | null;
 createdAt: Date | string;
 createdBy?: number;
 isLatestVersion: boolean;
 [key: string]: any;
}

interface VersionHistoryModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 versions: Version[];
 title: string;
 isLoading?: boolean;
 language: 'en' | 'ar';
 renderVersionDetails: (version: Version) => React.ReactNode;
}

export function VersionHistoryModal({
 open,
 onOpenChange,
 versions,
 title,
 isLoading,
 language,
 renderVersionDetails,
}: VersionHistoryModalProps) {
 const { t } = useTranslation();

 const labels = {
 en: {
 versionHistory: 'Version History',
 version: 'Version',
 current: 'Current',
 revisionReason: 'Revision Reason',
 createdAt: 'Created At',
 createdBy: 'Created By',
 noVersions: 'No version history available',
 loading: 'Loading version history...',
 close: 'Close',
 },
 ar: {
 versionHistory: 'سجل الإصدارات',
 version: 'الإصدار',
 current: 'الحالي',
 revisionReason: 'سبب المراجعة',
 createdAt: 'تاريخ الإنشاء',
 createdBy: 'أنشئ بواسطة',
 noVersions: 'لا يوجد سجل إصدارات',
 loading: 'جاري تحميل سجل الإصدارات...',
 close: 'إغلاق',
 },
 };

 const trans = labels[language];

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className={`max-w-4xl max-h-[80vh]`}>
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <FileText className="h-5 w-5" />
 {trans.versionHistory} - {title}
 </DialogTitle>
 </DialogHeader>

 {isLoading ? (
 <div className="flex items-center justify-center py-8">
 <p className="text-muted-foreground">{trans.loading}</p>
 </div>
 ) : versions.length === 0 ? (
 <div className="flex items-center justify-center py-8">
 <p className="text-muted-foreground">{trans.noVersions}</p>
 </div>
 ) : (
 <ScrollArea className="h-[500px] pe-4">
 <div className="space-y-4">
 {versions.map((version, index) => (
 <div
 key={version.id}
 className={`border rounded-lg p-4 ${ version.isLatestVersion ? 'border-primary bg-primary/5' : 'border-border' }`}
 >
 {/* Version Header */}
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2">
 <Badge variant={version.isLatestVersion ? 'default' : 'outline'}>
 {trans.version} {version.version}
 </Badge>
 {version.isLatestVersion && (
 <Badge variant="secondary">{trans.current}</Badge>
 )}
 </div>
 <div className="flex items-center gap-4 text-sm text-muted-foreground">
 <div className="flex items-center gap-1">
 <Calendar className="h-4 w-4" />
 {new Date(version.createdAt).toLocaleString('en-US')}
 </div>
 {version.createdBy && (
 <div className="flex items-center gap-1">
 <User className="h-4 w-4" />
 {t.financeModule.user} #{version.createdBy}
 </div>
 )}
 </div>
 </div>

 {/* Revision Reason */}
 {version.revisionReason && (
 <div className="mb-3 p-2 bg-muted rounded">
 <p className="text-sm font-medium mb-1">{trans.revisionReason}:</p>
 <p className="text-sm">{version.revisionReason}</p>
 </div>
 )}

 {/* Version Details */}
 <div className="space-y-2">
 {renderVersionDetails(version)}
 </div>

 {/* Separator */}
 {index < versions.length - 1 && (
 <div className="flex items-center justify-center mt-4">
 <ArrowRight className={`h-4 w-4 text-muted-foreground ${isRTL ? 'rotate-180' : ''}`} />
 </div>
 )}
 </div>
 ))}
 </div>
 </ScrollArea>
 )}

 <div className="flex justify-end mt-4">
 <Button variant="outline" onClick={() => onOpenChange(false)}>
 {trans.close}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
