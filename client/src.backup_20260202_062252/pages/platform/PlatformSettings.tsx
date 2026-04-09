import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function PlatformSettings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('platform.settings.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('platform.settings.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('platform.settings.title')}
          </CardTitle>
          <CardDescription>
            Configure platform-wide settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Platform settings interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
