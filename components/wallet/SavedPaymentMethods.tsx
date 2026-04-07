'use client';

import { useState } from 'react';
import { CreditCard, Smartphone, Building2, Plus, Trash2, Star, Edit2, Wifi } from 'lucide-react';
import { usePaymentMethods, useDeletePaymentMethod } from '@/hooks/use-wallet';
import type { SavedPaymentMethod } from '@/types/wallet';
import SavePaymentMethodModal from './SavePaymentMethodModal';

// Card gradient configurations for different providers using brand colors
// #6B8FB8 Blue, #fed652 Mustard, #f77f00 Orange, #5C8A65 Green, #bec3c6 Grey
const cardStyles: Record<string, { gradient: string; accent: string; pattern: string }> = {
  mtn: {
    gradient: 'from-[#fed652] via-[#f5c842] to-[#f77f00]',
    accent: 'bg-[#fed652]/40',
    pattern: 'bg-gradient-to-br from-[#fed652]/20 to-transparent',
  },
  airtel: {
    gradient: 'from-[#f77f00] via-[#e06d00] to-[#c45a00]',
    accent: 'bg-[#f77f00]/40',
    pattern: 'bg-gradient-to-br from-[#f77f00]/20 to-transparent',
  },
  mpesa: {
    gradient: 'from-primary via-[#4A7252] to-[#3A5B42]',
    accent: 'bg-primary/40',
    pattern: 'bg-gradient-to-br from-primary/20 to-transparent',
  },
  bank: {
    gradient: 'from-[#6B8FB8] via-[#567A9E] to-[#3F5D7A]',
    accent: 'bg-[#6B8FB8]/40',
    pattern: 'bg-gradient-to-br from-[#6B8FB8]/20 to-transparent',
  },
  default: {
    gradient: 'from-[#bec3c6] via-[#9ca3a8] to-[#6b7280]',
    accent: 'bg-[#bec3c6]/40',
    pattern: 'bg-gradient-to-br from-[#bec3c6]/20 to-transparent',
  },
};

export default function SavedPaymentMethods() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<SavedPaymentMethod | null>(null);
  const { data: paymentMethods = [], isLoading } = usePaymentMethods();
  const deleteMethodMutation = useDeletePaymentMethod();

  const handleEdit = (method: SavedPaymentMethod) => {
    setEditingMethod(method);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMethod(null);
  };

  const handleDelete = async (methodId: string) => {
    if (confirm('Are you sure you want to delete this payment method?')) {
      try {
        await deleteMethodMutation.mutateAsync(methodId);
      } catch (error) {
        console.error('Failed to delete payment method:', error);
      }
    }
  };

  const getCardStyle = (provider: string, methodType: string) => {
    const key = provider.toLowerCase();
    if (methodType === 'bank_transfer') {
      return cardStyles.bank;
    }
    return cardStyles[key] || cardStyles.default;
  };

  const getProviderIcon = (provider: string, methodType: string) => {
    if (methodType === 'bank_transfer') {
      return <Building2 className="w-6 h-6" />;
    }
    switch (provider.toLowerCase()) {
      case 'mtn':
      case 'airtel':
      case 'mpesa':
        return <Smartphone className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const formatAccountDisplay = (method: SavedPaymentMethod) => {
    if (method.method_type === 'mobile_money' && method.phone_number) {
      // Format phone: show last 4 digits with dots
      const phone = method.phone_number;
      return `•••• •••• ${phone.slice(-4)}`;
    }
    if (method.account_number) {
      // Format account: show last 4 digits
      const acc = method.account_number;
      return `•••• •••• •••• ${acc.slice(-4)}`;
    }
    return '•••• •••• •••• ••••';
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-gradient-to-br from-muted to-muted rounded-xl"></div>
            <div className="h-48 bg-gradient-to-br from-muted to-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-sm">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Payment Cards</h3>
              <p className="text-sm text-muted-foreground">Manage your saved payment methods</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        </div>

        <div className="p-6">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-muted to-muted rounded-xl mb-4 shadow-inner">
                <CreditCard className="w-10 h-10 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No payment cards saved</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Add a payment method to make your future transactions faster and easier
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Your First Card
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {paymentMethods.map((method: SavedPaymentMethod) => {
                const style = getCardStyle(method.provider, method.method_type);
                return (
                  <div
                    key={method.id}
                    className="group relative"
                  >
                    {/* Payment Card */}
                    <div
                      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${style.gradient} p-5 h-48 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
                    >
                      {/* Background Pattern */}
                      <div className="absolute inset-0 opacity-30">
                        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full ${style.accent} blur-3xl -translate-y-1/2 translate-x-1/2`}></div>
                        <div className={`absolute bottom-0 left-0 w-48 h-48 rounded-full ${style.accent} blur-2xl translate-y-1/2 -translate-x-1/2`}></div>
                      </div>

                      {/* Card Content */}
                      <div className="relative h-full flex flex-col justify-between">
                        {/* Top Row */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-card/20 backdrop-blur-sm rounded-lg">
                              {getProviderIcon(method.provider, method.method_type)}
                            </div>
                            <div>
                              <p className="text-white/80 text-xs uppercase tracking-wider font-medium">
                                {method.method_type === 'mobile_money' ? 'Mobile Money' : 'Bank Account'}
                              </p>
                              <p className="text-white font-bold text-lg capitalize">
                                {method.provider}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {method.is_default && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-card/20 backdrop-blur-sm rounded-full">
                                <Star className="w-3 h-3 text-white fill-white" />
                                <span className="text-white text-xs font-medium">Default</span>
                              </div>
                            )}
                            <Wifi className="w-5 h-5 text-white/60 rotate-90" />
                          </div>
                        </div>

                        {/* Card Number */}
                        <div className="space-y-1">
                          <p className="text-white/60 text-xs uppercase tracking-wider">
                            {method.method_type === 'mobile_money' ? 'Phone Number' : 'Account Number'}
                          </p>
                          <p className="text-white text-xl font-mono tracking-widest">
                            {formatAccountDisplay(method)}
                          </p>
                        </div>

                        {/* Bottom Row */}
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-white/60 text-xs uppercase tracking-wider">Card Name</p>
                            <p className="text-white font-semibold truncate max-w-[180px]">
                              {method.nickname}
                            </p>
                          </div>
                          {method.method_type === 'bank_transfer' && method.bank_name && (
                            <div className="text-right">
                              <p className="text-white/60 text-xs uppercase tracking-wider">Bank</p>
                              <p className="text-white text-sm font-medium truncate max-w-[120px]">
                                {method.bank_name}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Appear on hover */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 group-hover:bottom-4 transition-all duration-300">
                      <button
                        onClick={() => handleEdit(method)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-foreground rounded-lg shadow-lg hover:bg-muted transition-colors text-sm font-medium"
                        title="Edit payment method"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(method.id)}
                        disabled={deleteMethodMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-destructive rounded-lg shadow-lg hover:bg-destructive/5 transition-colors disabled:opacity-50 text-sm font-medium"
                        title="Delete payment method"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add New Card Placeholder */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="relative overflow-hidden rounded-xl border-2 border-dashed border-border p-5 h-48 hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
              >
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <div className="p-4 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                    <Plus className="w-8 h-8 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                      Add New Card
                    </p>
                    <p className="text-sm text-muted-foreground/60">
                      Mobile money or bank account
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <SavePaymentMethodModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editMethod={editingMethod}
      />
    </>
  );
}
