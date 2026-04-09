/**
 * Contractors List Page
 * Wrapper component that renders VendorList filtered for contractors only
 */

import VendorList from './VendorList';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ContractorsList() {
  const { language, isRTL} = useLanguage();
 return <VendorList vendorType="contractor" />;
}
