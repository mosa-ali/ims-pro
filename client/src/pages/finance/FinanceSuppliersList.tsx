/**
 * Finance Suppliers List — Read-Only Mirror
 * Wrapper component that renders FinanceVendorList filtered for suppliers only
 */
import FinanceVendorList from './FinanceVendorList';

export default function FinanceSuppliersList() {
  return <FinanceVendorList vendorType="supplier" />;
}
