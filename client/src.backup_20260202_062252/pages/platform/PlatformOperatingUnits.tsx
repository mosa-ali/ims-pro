import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function PlatformOperatingUnits() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('platform.operatingUnits.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('platform.operatingUnits.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('platform.operatingUnits.title')}
          </CardTitle>
          <CardDescription>
            Manage organizational operating units with hierarchy respect (HQ, Country Office, Regional Office, Field Office)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Operating Units management interface will be implemented here per IMS hierarchy Level 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
