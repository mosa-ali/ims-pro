/**
 * Suppliers List Page
 * Wrapper component that renders VendorList filtered for suppliers only
 */

import VendorList from './VendorList';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SuppliersList() {
  const { language, isRTL} = useLanguage();
 return <VendorList vendorType="supplier" />;
}
