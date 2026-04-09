/**
 * Document Storage Configuration Component
 * 
 * Allows organization admins to configure document storage provider
 * Supports: S3, SharePoint, OneDrive
 * 
 * Location: Organization Settings → Microsoft 365 → Document Storage
 */

import { useState } from 'react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Cloud,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Link2,
  Unlink2,
} from 'lucide-react';
import { toast } from 'sonner';

type StorageProvider = 'S3' | 'SHAREPOINT' | 'ONEDRIVE';

interface StorageConfig {
  provider: StorageProvider;
  isConnected: boolean;
  lastValidatedAt?: Date;
  validationError?: string;
}

export function DocumentStorageConfig() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();

  // State
  const [selectedProvider, setSelectedProvider] = useState<StorageProvider>('S3');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [storageConfig, setStorageConfig] = useState<StorageConfig>({
    provider: 'S3',
    isConnected: true,
  });

  // Form state for each provider
  const [s3Config, setS3Config] = useState({
    bucket: '',
    prefix: '',
  });

  const [sharePointConfig, setSharePointConfig] = useState({
    siteId: '',
    siteUrl: '',
    libraryId: '',
    libraryName: '',
    rootFolderScope: '',
  });

  const [oneDriveConfig, setOneDriveConfig] = useState({
    userId: '',
    driveId: '',
    folderPath: '',
    rootFolderScope: '',
  });

  // tRPC mutations
  const updateProviderMutation = trpc.documentStorageConfig.updateStorageProvider.useMutation();
  const configureS3Mutation = trpc.documentStorageConfig.configureS3.useMutation();
  const configureSharePointMutation = trpc.documentStorageConfig.configureSharePoint.useMutation();
  const configureOneDriveMutation = trpc.documentStorageConfig.configureOneDrive.useMutation();
  const testConnectionMutation = trpc.documentStorageConfig.testConnection.useMutation();
  const validateConnectionMutation = trpc.documentStorageConfig.validateConnection.useMutation();

  // Get current config
  const { data: currentConfig } = trpc.documentStorageConfig.getConfig.useQuery();

  // Get storage stats
  const { data: storageStats } = trpc.documentStorageConfig.getStorageStats.useQuery();

  // Get allowed folder scopes
  const { data: allowedScopes } = trpc.documentStorageConfig.getAllowedFolderScopes.useQuery();

  const handleProviderChange = async (provider: StorageProvider) => {
    setSelectedProvider(provider);
    setIsConfiguring(true);

    try {
      await updateProviderMutation.mutateAsync({ storageProvider: provider });
      setStorageConfig((prev) => ({ ...prev, provider }));
      toast.success(t('storage.provider_changed', { provider }));
    } catch (error) {
      toast.error(t('storage.provider_change_failed'));
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleConfigureS3 = async () => {
    setIsConfiguring(true);

    try {
      await configureS3Mutation.mutateAsync({
        bucket: s3Config.bucket,
        prefix: s3Config.prefix,
        rootFolderScope: s3Config.prefix,
      });
      toast.success(t('storage.s3_configured'));
      setStorageConfig((prev) => ({ ...prev, isConnected: true }));
    } catch (error) {
      toast.error(t('storage.s3_configuration_failed'));
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleConfigureSharePoint = async () => {
    setIsConfiguring(true);

    try {
      await configureSharePointMutation.mutateAsync({
        siteId: sharePointConfig.siteId,
        siteUrl: sharePointConfig.siteUrl,
        libraryId: sharePointConfig.libraryId,
        libraryName: sharePointConfig.libraryName,
        rootFolderScope: sharePointConfig.rootFolderScope,
      });
      toast.success(t('storage.sharepoint_configured'));
      setStorageConfig((prev) => ({ ...prev, isConnected: true }));
    } catch (error) {
      toast.error(t('storage.sharepoint_configuration_failed'));
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleConfigureOneDrive = async () => {
    setIsConfiguring(true);

    try {
      await configureOneDriveMutation.mutateAsync({
        userId: oneDriveConfig.userId,
        driveId: oneDriveConfig.driveId,
        folderPath: oneDriveConfig.folderPath,
        rootFolderScope: oneDriveConfig.rootFolderScope,
      });
      toast.success(t('storage.onedrive_configured'));
      setStorageConfig((prev) => ({ ...prev, isConnected: true }));
    } catch (error) {
      toast.error(t('storage.onedrive_configuration_failed'));
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);

    try {
      const result = await testConnectionMutation.mutateAsync({
        provider: selectedProvider,
      });

      if (result.success) {
        toast.success(t('storage.connection_test_success'));
        setStorageConfig((prev) => ({ ...prev, isConnected: true }));
      } else {
        toast.error(t('storage.connection_test_failed'));
        setStorageConfig((prev) => ({
          ...prev,
          isConnected: false,
          validationError: result.error,
        }));
      }
    } catch (error) {
      toast.error(t('storage.connection_test_error'));
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Cloud className="w-6 h-6" />
          {t('storage.title') || 'Document Storage Configuration'}
        </h2>
        <p className="text-muted-foreground">
          {t('storage.description') ||
            'Configure your organization\'s document storage provider (S3, SharePoint, or OneDrive)'}
        </p>
      </div>

      {/* Storage Status */}
      {currentConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('storage.current_status') || 'Current Status'}</span>
              <Badge
                variant={storageConfig.isConnected ? 'default' : 'destructive'}
                className="flex items-center gap-1"
              >
                {storageConfig.isConnected ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    {t('storage.connected') || 'Connected'}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    {t('storage.disconnected') || 'Disconnected'}
                  </>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('storage.provider') || 'Provider'}
                </p>
                <p className="font-semibold text-foreground">{currentConfig.storageProvider}</p>
              </div>
              {storageStats && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('storage.usage') || 'Storage Usage'}
                    </p>
                    <p className="font-semibold text-foreground">
                      {(storageStats.usagePercentage).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('storage.files') || 'Files'}
                    </p>
                    <p className="font-semibold text-foreground">{storageStats.fileCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('storage.total_size') || 'Total Size'}
                    </p>
                    <p className="font-semibold text-foreground">
                      {(storageStats.totalSize / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('storage.select_provider') || 'Select Storage Provider'}
          </CardTitle>
          <CardDescription>
            {t('storage.provider_description') ||
              'Choose your preferred document storage provider'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedProvider} onValueChange={(value) => handleProviderChange(value as StorageProvider)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="S3">
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Amazon S3
                </span>
              </SelectItem>
              <SelectItem value="SHAREPOINT">
                <span className="flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  Microsoft SharePoint
                </span>
              </SelectItem>
              <SelectItem value="ONEDRIVE">
                <span className="flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  Microsoft OneDrive
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      {selectedProvider === 'S3' && (
        <Card>
          <CardHeader>
            <CardTitle>Amazon S3 Configuration</CardTitle>
            <CardDescription>Configure your S3 bucket and prefix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('storage.s3_bucket') || 'S3 Bucket Name'}
              </label>
              <Input
                placeholder="my-documents-bucket"
                value={s3Config.bucket}
                onChange={(e) => setS3Config((prev) => ({ ...prev, bucket: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('storage.s3_prefix') || 'S3 Prefix (optional)'}
              </label>
              <Input
                placeholder="documents/"
                value={s3Config.prefix}
                onChange={(e) => setS3Config((prev) => ({ ...prev, prefix: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConfigureS3}
                disabled={isConfiguring || !s3Config.bucket}
                className="flex-1"
              >
                {isConfiguring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('storage.configuring') || 'Configuring...'}
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    {t('storage.configure') || 'Configure'}
                  </>
                )}
              </Button>
              <Button
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                variant="outline"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('storage.testing') || 'Testing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('storage.test') || 'Test'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProvider === 'SHAREPOINT' && (
        <Card>
          <CardHeader>
            <CardTitle>Microsoft SharePoint Configuration</CardTitle>
            <CardDescription>Configure your SharePoint site and document library</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('storage.sharepoint_site_id') || 'Site ID'}
              </label>
              <Input
                placeholder="site-id-from-graph-api"
                value={sharePointConfig.siteId}
                onChange={(e) =>
                  setSharePointConfig((prev) => ({ ...prev, siteId: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('storage.sharepoint_site_url') || 'Site URL'}
              </label>
              <Input
                placeholder="https://yourtenant.sharepoint.com/sites/yoursite"
                value={sharePointConfig.siteUrl}
                onChange={(e) =>
                  setSharePointConfig((prev) => ({ ...prev, siteUrl: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('storage.sharepoint_library_id') || 'Library ID'}
              </label>
              <Input
                placeholder="library-id"
                value={sharePointConfig.libraryId}
                onChange={(e) =>
                  setSharePointConfig((prev) => ({ ...prev, libraryId: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('storage.sharepoint_library_name') || 'Library Name'}
              </label>
              <Input
                placeholder="Documents"
                value={sharePointConfig.libraryName}
                onChange={(e) =>
                  setSharePointConfig((prev) => ({ ...prev, libraryName: e.target.value }))
                }
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConfigureSharePoint}
                disabled={isConfiguring || !sharePointConfig.siteId || !sharePointConfig.libraryId}
                className="flex-1"
              >
                {isConfiguring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('storage.configuring') || 'Configuring...'}
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    {t('storage.configure') || 'Configure'}
                  </>
                )}
              </Button>
              <Button
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                variant="outline"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('storage.testing') || 'Testing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('storage.test') || 'Test'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProvider === 'ONEDRIVE' && (
        <Card>
          <CardHeader>
            <CardTitle>Microsoft OneDrive Configuration</CardTitle>
            <CardDescription>Configure your OneDrive for Business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('storage.onedrive_user_id') || 'User ID'}
              </label>
              <Input
                placeholder="user-id-or-email"
                value={oneDriveConfig.userId}
                onChange={(e) =>
                  setOneDriveConfig((prev) => ({ ...prev, userId: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('storage.onedrive_drive_id') || 'Drive ID'}
              </label>
              <Input
                placeholder="drive-id"
                value={oneDriveConfig.driveId}
                onChange={(e) =>
                  setOneDriveConfig((prev) => ({ ...prev, driveId: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('storage.onedrive_folder_path') || 'Folder Path (optional)'}
              </label>
              <Input
                placeholder="/IMS-Documents"
                value={oneDriveConfig.folderPath}
                onChange={(e) =>
                  setOneDriveConfig((prev) => ({ ...prev, folderPath: e.target.value }))
                }
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConfigureOneDrive}
                disabled={isConfiguring || !oneDriveConfig.userId || !oneDriveConfig.driveId}
                className="flex-1"
              >
                {isConfiguring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('storage.configuring') || 'Configuring...'}
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    {t('storage.configure') || 'Configure'}
                  </>
                )}
              </Button>
              <Button
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                variant="outline"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('storage.testing') || 'Testing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('storage.test') || 'Test'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status Alert */}
      {storageConfig.validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{storageConfig.validationError}</AlertDescription>
        </Alert>
      )}

      {storageConfig.isConnected && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {t('storage.connected_successfully') || 'Storage provider connected successfully'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
