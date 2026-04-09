/**
 * Finance Contractors List — Read-Only Mirror
 * Wrapper component that renders FinanceVendorList filtered for contractors only
 */
import FinanceVendorList from './FinanceVendorList';

export default function FinanceContractorsList() {
  return <FinanceVendorList vendorType="contractor" />;
}
