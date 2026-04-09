/**
 * Finance Service Providers List — Read-Only Mirror
 * Wrapper component that renders FinanceVendorList filtered for service providers only
 */
import FinanceVendorList from './FinanceVendorList';

export default function FinanceServiceProvidersList() {
  return <FinanceVendorList vendorType="service_provider" />;
}
