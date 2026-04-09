import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function PlatformAuditLogs() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('platform.auditLogs.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('platform.auditLogs.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('platform.auditLogs.title')}
          </CardTitle>
          <CardDescription>
            Platform-wide activity and system logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Audit logs interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
