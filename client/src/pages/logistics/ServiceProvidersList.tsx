/**
 * Service Providers List Page
 * Wrapper component that renders VendorList filtered for service providers only
 */

import VendorList from './VendorList';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ServiceProvidersList() {
  const { language, isRTL} = useLanguage();
 return <VendorList vendorType="service_provider" />;
}
