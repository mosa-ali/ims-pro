/**
 * Bank Reconciliation Matching Page
 * 
 * Allows users to match bank transactions with GL entries (manual + auto-match)
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Link as LinkIcon, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "wouter";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function BankReconciliationMatching() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { currentOrganizationId, currentOperatingUnitId } = useOperatingUnit();
  const tc = (t as any).treasuryCashManagement ?? {};

  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [selectedReconciliation, setSelectedReconciliation] = useState<string>("");
  const [selectedBankTxId, setSelectedBankTxId] = useState<number | null>(null);

  // Fetch bank accounts
  const bankAccountsQuery = trpc.treasury.bankAccounts.list.useQuery(
    {
      organizationId: currentOrganizationId!,
      operatingUnitId: currentOperatingUnitId!,
    },
    { enabled: !!currentOrganizationId && !!currentOperatingUnitId }
  );

  // Fetch reconciliations for selected bank account
  const reconciliationsQuery = trpc.bankReconciliations.list.useQuery(
    {
      organizationId: currentOrganizationId!,
      bankAccountId: selectedBankAccount ? parseInt(selectedBankAccount) : undefined,
      status: 'in_progress',
    },
    { enabled: !!currentOrganizationId && !!selectedBankAccount }
  );

  // Fetch unmatched bank transactions
  const unmatchedBankTxQuery = trpc.bankReconciliations.getUnmatchedBankTransactions.useQuery(
    {
      organizationId: currentOrganizationId!,
      bankAccountId: parseInt(selectedBankAccount),
      reconciliationId: selectedReconciliation ? parseInt(selectedReconciliation) : undefined,
    },
    { enabled: !!currentOrganizationId && !!selectedBankAccount }
  );

  // Fetch match suggestions
  const matchSuggestionsQuery = trpc.bankReconciliations.getMatchSuggestions.useQuery(
    {
      organizationId: currentOrganizationId!,
      bankAccountId: parseInt(selectedBankAccount),
      reconciliationId: parseInt(selectedReconciliation),
    },
    { enabled: !!currentOrganizationId && !!selectedBankAccount && !!selectedReconciliation }
  );

  const manualMatchMutation = trpc.bankReconciliations.manualMatch.useMutation();
  const unmatchMutation = trpc.bankReconciliations.unmatch.useMutation();

  const handleManualMatch = async (bankTxId: number, glEntryId: number) => {
    if (!selectedReconciliation) {
      toast.error(tc.pleaseSelectReconciliation || "Please select a reconciliation");
      return;
    }

    try {
      await manualMatchMutation.mutateAsync({
        bankTransactionId: bankTxId,
        glEntryId,
        reconciliationId: parseInt(selectedReconciliation),
      });

      toast.success(tc.matchedSuccessfully || "Matched successfully");
      unmatchedBankTxQuery.refetch();
      matchSuggestionsQuery.refetch();
    } catch (err) {
      toast.error(tc.failedToMatch || "Failed to match transaction");
    }
  };

  const handleUnmatch = async (bankTxId: number) => {
    try {
      await unmatchMutation.mutateAsync({ bankTransactionId: bankTxId });
      toast.success(tc.unmatchedSuccessfully || "Unmatched successfully");
      unmatchedBankTxQuery.refetch();
    } catch (err) {
      toast.error(tc.failedToUnmatch || "Failed to unmatch transaction");
    }
  };

  const formatCurrency = (amount: any) => {
    const num = parseFloat(amount || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US');
  };

  return (
    <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/organization/finance/treasury">
            <BackButton label={tc.backToFinance || "Back to Treasury"} />
          </Link>
        </div>
        <h1 className="text-3xl font-bold">
          {tc.bankReconciliationMatching || "Bank Reconciliation Matching"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {tc.matchBankTransactionsDesc || "Match bank transactions with GL entries for accurate reconciliation"}
        </p>
      </div>

      {/* Selection Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{tc.selectReconciliation || "Select Reconciliation"}</CardTitle>
          <CardDescription>
            {tc.selectReconciliationDesc || "Select a bank account and active reconciliation to begin matching"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Account Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {tc.bankAccount || "Bank Account"} <span className="text-red-500">*</span>
              </label>
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                <SelectTrigger>
                  <SelectValue placeholder={tc.selectBankAccount || "Select bank account"} />
                </SelectTrigger>
                <SelectContent>
                  {bankAccountsQuery.data?.items.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.accountName} ({account.accountNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reconciliation Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {tc.reconciliation || "Reconciliation"} <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedReconciliation}
                onValueChange={setSelectedReconciliation}
                disabled={!selectedBankAccount}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc.selectReconciliationPlaceholder || "Select reconciliation"} />
                </SelectTrigger>
                <SelectContent>
                  {reconciliationsQuery.data?.reconciliations.map((recon: any) => (
                    <SelectItem key={recon.id} value={recon.id.toString()}>
                      {formatDate(recon.reconciliationDate)} - {recon.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matching Interface */}
      {selectedBankAccount && selectedReconciliation && (
        <Tabs defaultValue="unmatched" className="space-y-4">
          <TabsList>
            <TabsTrigger value="unmatched" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {tc.unmatchedTransactions || "Unmatched Transactions"}
              {unmatchedBankTxQuery.data && (
                <Badge variant="secondary">{unmatchedBankTxQuery.data.transactions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {tc.autoMatchSuggestions || "Auto-Match Suggestions"}
              {matchSuggestionsQuery.data && (
                <Badge variant="secondary">{matchSuggestionsQuery.data.suggestions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Unmatched Transactions Tab */}
          <TabsContent value="unmatched">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {tc.unmatchedBankTransactions || "Unmatched Bank Transactions"}
                </CardTitle>
                <CardDescription>
                  {tc.transactionsNeedMatching || "These transactions need to be matched with GL entries"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unmatchedBankTxQuery.isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {tc.loading || "Loading..."}
                  </div>
                ) : unmatchedBankTxQuery.data?.transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>{tc.allTransactionsMatched || "All transactions have been matched!"}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc.transactionDate || "Date"}</TableHead>
                          <TableHead>{tc.description || "Description"}</TableHead>
                          <TableHead>{tc.referenceNumber || "Reference"}</TableHead>
                          <TableHead>{tc.transactionType || "Type"}</TableHead>
                          <TableHead className="text-end">{tc.amount || "Amount"}</TableHead>
                          <TableHead className="text-center">{tc.actions || "Actions"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unmatchedBankTxQuery.data?.transactions.map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                            <TableCell>{tx.description}</TableCell>
                            <TableCell>{tx.referenceNumber || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={tx.transactionType === 'credit' ? 'default' : 'secondary'}>
                                {tx.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-end">{formatCurrency(tx.amount)}</TableCell>
                            <TableCell className="text-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedBankTxId(tx.id)}
                              >
                                <LinkIcon className="h-4 w-4 me-2" />
                                {tc.match || "Match"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Match Suggestions Tab */}
          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {tc.autoMatchSuggestions || "Auto-Match Suggestions"}
                </CardTitle>
                <CardDescription>
                  {tc.aiPoweredMatchingDesc || "AI-powered matching suggestions based on amount, date, and reference"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matchSuggestionsQuery.isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {tc.loading || "Loading..."}
                  </div>
                ) : matchSuggestionsQuery.data?.suggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p>{tc.noAutoMatchSuggestions || "No auto-match suggestions found"}</p>
                    <p className="text-sm mt-2">
                      {tc.glEntriesNotAvailable || "GL journal entries may not be available yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matchSuggestionsQuery.data?.suggestions.map((suggestion: any) => (
                      <div key={`${suggestion.bankTransactionId}-${suggestion.glEntryId}`} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="default">
                              {suggestion.confidence}% {tc.confidence || "Confidence"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{suggestion.matchReason}</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleManualMatch(suggestion.bankTransactionId, suggestion.glEntryId)}
                          >
                            <LinkIcon className="h-4 w-4 me-2" />
                            {tc.acceptMatch || "Accept Match"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {(!selectedBankAccount || !selectedReconciliation) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>{tc.selectAccountAndReconciliation || "Please select a bank account and reconciliation to begin matching"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
