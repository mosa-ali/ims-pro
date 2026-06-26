export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatSyncResult(recordsAffected: number): string {
  return `${recordsAffected} record${recordsAffected !== 1 ? 's' : ''} affected`;
}

export function formatError(error: Error | string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function calculateBurnRate(spent: number, budget: number): number {
  if (budget === 0) return 0;
  return (spent / budget) * 100;
}

export function calculateVariance(budget: number, spent: number): number {
  return budget - spent;
}

export function isOverspent(spent: number, budget: number): boolean {
  return spent > budget;
}

export function formatPercentageChange(oldValue: number, newValue: number): string {
  const change = newValue - oldValue;
  const percentChange = oldValue === 0 ? 0 : (change / oldValue) * 100;
  const sign = percentChange >= 0 ? '+' : '';
  return `${sign}${percentChange.toFixed(2)}%`;
}

export function getStatusBadgeColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
    case 'syncing':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
