/**
 * Bill Detail Page
 * 
 * Displays detailed information about a specific bill
 */

'use client';

import { useBill } from '@/hooks/use-bills';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Download,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const billId = parseInt(params?.id as string);
  
  const { data: bill, isLoading, error } = useBill(billId);

  if (isLoading) {
    return <BillDetailSkeleton />;
  }

  if (error || !bill) {
    return (
      <div className="container py-8">
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-12 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-black mb-2">Error Loading Bill</h3>
          <p className="text-gray-600 mb-2">{error?.message || 'Bill not found'}</p>
          {billId && (
            <p className="text-sm text-gray-500">Bill ID: {billId}</p>
          )}
          <button
            onClick={() => router.push('/bills')}
            className="mt-4 px-4 py-2 bg-[#638C80] text-white rounded-lg hover:bg-[#4f7068] transition-colors"
          >
            Back to Bills
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = {
    'PAID': { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    'AUTHORISED': { color: 'bg-blue-100 text-blue-700', icon: Clock },
    'VOIDED': { color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const statusInfo = statusConfig[bill.status as keyof typeof statusConfig] || {
    color: 'bg-gray-100 text-gray-700',
    icon: FileText
  };
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/bills')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back to bills"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black">Bill Details</h1>
          <p className="text-gray-600 mt-1">
            Invoice #{bill.invoice_number || bill.invoice_id}
          </p>
        </div>
        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${statusInfo.color}`}>
          <StatusIcon className="h-4 w-4" />
          {bill.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bill Summary */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-semibold text-black">Bill Summary</h2>
            </div>
            <div className="p-6 space-y-4">
              <InfoRow 
                label="Invoice Number" 
                value={bill.invoice_number || 'N/A'} 
                icon={<FileText className="h-4 w-4 text-[#638C80]" />}
              />
              <InfoRow 
                label="Reference" 
                value={bill.reference || 'No reference'} 
                icon={<FileText className="h-4 w-4 text-[#638C80]" />}
              />
              <InfoRow 
                label="Invoice Date" 
                value={bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A'} 
                icon={<Calendar className="h-4 w-4 text-[#638C80]" />}
              />
              <InfoRow 
                label="Due Date" 
                value={bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'} 
                icon={<Calendar className="h-4 w-4 text-[#638C80]" />}
              />
              <InfoRow 
                label="Description" 
                value={bill.description} 
                icon={<FileText className="h-4 w-4 text-[#638C80]" />}
              />
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-semibold text-black">Financial Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-black font-medium">
                  {bill.currency} {parseFloat(bill.subtotal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-gray-600">Tax</span>
                <span className="text-black font-medium">
                  {bill.currency} {parseFloat(bill.total_tax).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-gray-600">Total</span>
                <span className="text-xl font-bold text-black">
                  {bill.currency} {parseFloat(bill.total).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-gray-600">Amount Paid</span>
                <span className="text-green-600 font-medium">
                  {bill.currency} {parseFloat(bill.amount_paid).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-semibold">
                  {bill.status === 'PAID' ? 'Total Amount' : 'Amount Due'}
                </span>
                <span className="text-2xl font-bold text-[#638C80]">
                  {bill.currency} {parseFloat(
                    bill.status === 'PAID' ? bill.total : bill.amount_due
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-semibold text-black">Vendor</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-[#638C80]/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-[#638C80]" />
                </div>
                <div>
                  <div className="font-semibold text-black">{bill.vendor_name}</div>
                  <div className="text-sm text-gray-600">Vendor</div>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Info */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-lg font-semibold text-black">Organization</h2>
            </div>
            <div className="p-6 space-y-3">
              <InfoRow 
                label="Name" 
                value={bill.organization_name} 
                icon={<Building2 className="h-4 w-4 text-[#638C80]" />}
              />
              <InfoRow 
                label="Connection" 
                value={bill.connection_name} 
                icon={<FileText className="h-4 w-4 text-[#638C80]" />}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 space-y-3">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#638C80] text-white rounded-lg hover:bg-[#4f7068] transition-colors">
              <DollarSign className="h-4 w-4" />
              <span>Schedule Payment</span>
            </button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              <span>Download Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Info Row Component
interface InfoRowProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-black font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

// Loading Skeleton
function BillDetailSkeleton() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-gray-100 animate-pulse rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-8 bg-gray-100 animate-pulse rounded w-1/3" />
          <div className="h-4 bg-gray-100 animate-pulse rounded w-1/4" />
        </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
              <div className="h-6 bg-gray-100 animate-pulse rounded w-1/4 mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
              <div className="h-6 bg-gray-100 animate-pulse rounded w-1/2 mb-4" />
              <div className="h-12 bg-gray-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
