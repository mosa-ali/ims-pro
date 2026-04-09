import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function PlatformSystemHealth() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('platform.systemHealth.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('platform.systemHealth.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('platform.systemHealth.title')}
          </CardTitle>
          <CardDescription>
            Detailed system health monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            System health detailed monitoring interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
