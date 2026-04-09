import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function PlatformOrganizations() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('platform.organizations.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('platform.organizations.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('platform.organizations.title')}
          </CardTitle>
          <CardDescription>
            Full CRUD operations for organizations (View, Edit, Delete, Archive)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Organizations management interface will be implemented here with full CRUD operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
