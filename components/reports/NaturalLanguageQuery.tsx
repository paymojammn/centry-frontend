/**
 * Natural Language Query Component
 * Allows users to ask questions about their financial data
 */

'use client';

import { useState } from 'react';
import { useNaturalLanguageQuery } from '@/hooks/use-reports';
import { Search, Sparkles, Loader2, X, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface NaturalLanguageQueryProps {
  organizationId: string;
}

const EXAMPLE_QUERIES = [
  'What did we spend on transport last month?',
  'Show me pending expenses',
  'What are our top expense categories?',
  'How much did we spend this week?',
];

export default function NaturalLanguageQuery({
  organizationId,
}: NaturalLanguageQueryProps) {
  const [query, setQuery] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [result, setResult] = useState<any>(null);

  const mutation = useNaturalLanguageQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !organizationId) return;

    try {
      const response = await mutation.mutateAsync({
        organization_id: organizationId,
        query: query.trim(),
      });
      setResult(response);
    } catch (error) {
      console.error('Query failed:', error);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    setShowExamples(false);
  };

  const clearResult = () => {
    setResult(null);
    setQuery('');
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowExamples(true)}
            onBlur={() => setTimeout(() => setShowExamples(false), 200)}
            placeholder="Ask a question about your finances..."
            className="pl-10 pr-24 py-6 text-base border-purple-200 focus:border-purple-400 focus:ring-purple-400"
          />
          <div className="absolute right-2 flex items-center gap-2">
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuery('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!query.trim() || mutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-1" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Example Queries */}
      {showExamples && !result && (
        <Card className="absolute z-10 w-full mt-1 shadow-lg border-purple-200">
          <CardContent className="p-3">
            <div className="text-xs text-gray-500 mb-2">Try asking:</div>
            <div className="space-y-1">
              {EXAMPLE_QUERIES.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleExampleClick(example)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 rounded-md transition-colors flex items-center gap-2"
                >
                  <ArrowRight className="h-3 w-3 text-purple-400" />
                  {example}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query Result */}
      {result && (
        <Card className="mt-4 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-900">
                  Results for: "{result.query}"
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearResult}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {result.success ? (
              <div className="space-y-3">
                {/* Show interpreted filters */}
                {Object.keys(result.filters).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(result.filters).map(([key, value]) => (
                      <span
                        key={key}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
                      >
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Show data summary */}
                {result.data && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    {/* Expenses data */}
                    {result.data.by_category && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Expense Breakdown
                        </h4>
                        <div className="space-y-2">
                          {result.data.by_category.slice(0, 5).map((cat: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-600 capitalize">
                                {cat.category?.replace(/_/g, ' ')}
                              </span>
                              <span className="font-medium">
                                {parseFloat(cat.total).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dashboard summary */}
                    {result.data.expenses && !result.data.by_category && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Summary
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Expenses</span>
                            <span className="font-medium">
                              {parseFloat(result.data.expenses.total_amount || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Count</span>
                            <span className="font-medium">
                              {result.data.expenses.count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transaction summary */}
                    {result.data.transactions && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Transactions
                        </h4>
                        <div className="space-y-2">
                          {result.data.transactions.slice(0, 5).map((txn: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-600">
                                {txn.description || txn.transaction_type}
                              </span>
                              <span className="font-medium">
                                {parseFloat(txn.amount).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {result.error || 'Could not process your query. Please try rephrasing.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
