'use client';

import { useEffect, useState } from 'react';
import { paymentSourcesApi } from '@/lib/payment-sources-api';
import type { PaymentSourcesResponse } from '@/types/payment-sources';

export default function PaymentSourcesTestPage() {
  const [data, setData] = useState<PaymentSourcesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // Get token from localStorage
    if (typeof window !== 'undefined') {
      const authToken = localStorage.getItem('auth_token');
      setToken(authToken || 'No token found');
    }
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      console.log('🔄 Fetching payment sources...');
      const result = await paymentSourcesApi.getPaymentSources();
      console.log('✅ Success:', result);
      setData(result);
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Payment Sources API Test</h1>

        {/* Token Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Token</h2>
          <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
            {token || 'Loading...'}
          </div>
        </div>

        {/* Test Button */}
        <button
          onClick={fetchSources}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold mb-6"
        >
          {loading ? 'Loading...' : 'Fetch Payment Sources'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {data && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-4">Success! 🎉</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Centry Wallets: {data.centry_wallets?.length || 0}</li>
                  <li>Bank Accounts: {data.bank_accounts?.length || 0}</li>
                  <li>Mobile Money: {data.mobile_money_accounts?.length || 0}</li>
                  <li>Org Payment APIs: {data.org_payment_apis?.length || 0}</li>
                  <li>Total: {data.total_sources || 0}</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Full Response</h3>
                <pre className="bg-white p-4 rounded border overflow-auto text-xs">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Test Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-900">
            <li>Make sure you're logged in (check token above)</li>
            <li>Make sure Django backend is running on port 8000</li>
            <li>Click "Fetch Payment Sources" button</li>
            <li>Check browser console for detailed logs</li>
            <li>Check Django terminal for backend logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
