import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function PlatformUsers() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('platform.users.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('platform.users.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('platform.users.title')}
          </CardTitle>
          <CardDescription>
            Manage platform administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Platform users management interface will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
