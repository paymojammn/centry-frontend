"use client";

import { useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Smartphone,
  Upload,
  UserPlus,
  List,
  Send,
  Trash2,
  Download,
  Plus,
  X,
  CheckCircle2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizations } from "@/hooks/use-organization";
import {
  usePaymentRequests,
  usePendingPaymentRequests,
  usePaymentRequestStats,
  useCreatePaymentRequest,
  useSubmitPaymentRequest,
  useApprovePaymentRequest,
  useRejectPaymentRequest,
  useDeletePaymentRequest,
} from "@/hooks/use-payment-requests";
import type { PaymentRequest, PaymentRecipient } from "@/types/payment-request";
import { StatusBadge } from "@/components/layout/status-badge";
import { PageHeader } from "@/components/layout/page-header";

interface LocalRecipient {
  id: string;
  name: string;
  phoneNumber: string;
  amount?: number;
}

export default function NewPaymentPage() {
  const { data: organizationsResponse } = useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];
  const currentOrganization = organizations?.[0];
  const organizationId = currentOrganization?.id;

  const [activeTab, setActiveTab] = useState("single");
  const [recipients, setRecipients] = useState<LocalRecipient[]>([]);
  const [isAddRecipientOpen, setIsAddRecipientOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  // Single payment state
  const [singlePayment, setSinglePayment] = useState({
    name: "",
    phoneNumber: "",
    amount: "",
    description: "",
  });

  // Add recipient state
  const [newRecipient, setNewRecipient] = useState({
    name: "",
    phoneNumber: "",
    amount: "",
  });

  // API hooks
  const { data: myRequests, isLoading: loadingMyRequests } = usePaymentRequests({
    organization_id: organizationId,
    my_requests: true,
  });
  const { data: pendingRequests, isLoading: loadingPending } = usePendingPaymentRequests(organizationId);
  const { data: stats } = usePaymentRequestStats(organizationId);
  const { mutate: createRequest, isPending: isCreating } = useCreatePaymentRequest();
  const { mutate: submitRequest, isPending: isSubmitting } = useSubmitPaymentRequest();
  const { mutate: approveRequest, isPending: isApproving } = useApprovePaymentRequest();
  const { mutate: rejectRequest, isPending: isRejecting } = useRejectPaymentRequest();
  const { mutate: _deleteRequest } = useDeletePaymentRequest();

  const handleAddRecipient = () => {
    if (newRecipient.name && newRecipient.phoneNumber) {
      const recipient: LocalRecipient = {
        id: Math.random().toString(36).substr(2, 9),
        name: newRecipient.name,
        phoneNumber: newRecipient.phoneNumber,
        amount: newRecipient.amount ? parseFloat(newRecipient.amount) : undefined,
      };
      setRecipients([...recipients, recipient]);
      setNewRecipient({ name: "", phoneNumber: "", amount: "" });
      setIsAddRecipientOpen(false);
    }
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const imported: LocalRecipient[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]?.trim();
          if (line) {
            const [name, phoneNumber, amount] = line.split(",");
            if (name && phoneNumber) {
              imported.push({
                id: Math.random().toString(36).substr(2, 9),
                name: name.trim(),
                phoneNumber: phoneNumber.trim(),
                amount: amount ? parseFloat(amount.trim()) : undefined,
              });
            }
          }
        }
        setRecipients([...recipients, ...imported]);
      };
      reader.readAsText(file);
    }
  };

  const calculateTotal = () => {
    return recipients.reduce((sum, r) => sum + (r.amount || 0), 0);
  };

  const handleSubmitSinglePayment = () => {
    if (!organizationId) return;

    createRequest(
      {
        organization_id: organizationId,
        payment_type: "single",
        payment_method: "mobile_money",
        recipient_name: singlePayment.name,
        recipient_phone: singlePayment.phoneNumber,
        amount: parseFloat(singlePayment.amount),
        currency: "UGX",
        description: singlePayment.description,
      },
      {
        onSuccess: (request) => {
          // Auto-submit for approval
          submitRequest(request.id);
          setSinglePayment({ name: "", phoneNumber: "", amount: "", description: "" });
        },
      }
    );
  };

  const handleSubmitBulkPayment = () => {
    if (!organizationId || recipients.length === 0) return;

    const apiRecipients: PaymentRecipient[] = recipients.map((r) => ({
      name: r.name,
      phone: r.phoneNumber,
      amount: r.amount || 0,
    }));

    createRequest(
      {
        organization_id: organizationId,
        payment_type: "bulk",
        payment_method: "mobile_money",
        recipients: apiRecipients,
        currency: "UGX",
        description: `Bulk payment to ${recipients.length} recipients`,
      },
      {
        onSuccess: (request) => {
          // Auto-submit for approval
          submitRequest(request.id);
          setRecipients([]);
        },
      }
    );
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    approveRequest(
      { requestId: selectedRequest.id, notes: approvalNotes },
      {
        onSuccess: () => {
          setIsApproveModalOpen(false);
          setSelectedRequest(null);
          setApprovalNotes("");
        },
      }
    );
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectionReason) return;
    rejectRequest(
      { requestId: selectedRequest.id, reason: rejectionReason },
      {
        onSuccess: () => {
          setIsRejectModalOpen(false);
          setSelectedRequest(null);
          setRejectionReason("");
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { status: string; label: string }> = {
      draft: { status: "draft", label: "Draft" },
      pending: { status: "pending_manager_approval", label: "Pending" },
      approved: { status: "approved", label: "Approved" },
      rejected: { status: "rejected", label: "Rejected" },
      processing: { status: "processing", label: "Processing" },
      completed: { status: "paid", label: "Completed" },
      failed: { status: "rejected", label: "Failed" },
    };
    const mapped = statusMap[status] || { status: "draft", label: status };
    return <StatusBadge status={mapped.status} label={mapped.label} />;
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="New Payment"
        subtitle="Send payments to individuals or multiple recipients at once"
        breadcrumbs={[
          { label: "Payments", href: "/payments/new" },
          { label: "New" },
        ]}
      />
      <div className="py-8 px-4">
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                      <p className="text-xs text-muted-foreground">Pending Approval</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
                      <p className="text-xs text-muted-foreground">Approved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#6B8FB8]/10 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-[#6B8FB8]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <List className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="bg-card rounded-xl shadow-sm border border-border p-1.5">
              <TabsList className="bg-muted p-1 rounded-lg w-full grid grid-cols-4 gap-1">
                <TabsTrigger
                  value="single"
                  className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all font-medium text-muted-foreground"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Single
                </TabsTrigger>
                <TabsTrigger
                  value="bulk"
                  className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all font-medium text-muted-foreground"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Bulk
                </TabsTrigger>
                <TabsTrigger
                  value="approvals"
                  className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all font-medium text-muted-foreground"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Approvals
                  {(pendingRequests?.count || 0) > 0 && (
                    <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-200">
                      {pendingRequests?.count}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all font-medium text-muted-foreground"
                >
                  <List className="h-4 w-4 mr-2" />
                  My Requests
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Single Payment Tab */}
            <TabsContent value="single" className="space-y-6">
              <Card className="border border-border shadow-sm rounded-xl overflow-hidden">
                <div className="p-5 border-b border-border">
                  <CardTitle className="text-lg font-semibold text-foreground">Single Payment</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Send money to one mobile number</p>
                </div>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="recipient-name" className="text-foreground">Recipient Name</Label>
                    <Input
                      id="recipient-name"
                      placeholder="Enter recipient name"
                      value={singlePayment.name}
                      onChange={(e) => setSinglePayment({ ...singlePayment, name: e.target.value })}
                      className="h-11 border-border rounded-lg bg-card text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-number" className="text-foreground">Mobile Number</Label>
                    <Input
                      id="phone-number"
                      placeholder="+256 XXX XXX XXX"
                      value={singlePayment.phoneNumber}
                      onChange={(e) => setSinglePayment({ ...singlePayment, phoneNumber: e.target.value })}
                      className="h-11 border-border rounded-lg bg-card text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-foreground">Amount (UGX)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={singlePayment.amount}
                      onChange={(e) => setSinglePayment({ ...singlePayment, amount: e.target.value })}
                      className="h-11 border-border rounded-lg bg-card text-foreground font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Payment description..."
                      value={singlePayment.description}
                      onChange={(e) => setSinglePayment({ ...singlePayment, description: e.target.value })}
                      className="border-border rounded-lg bg-card text-foreground"
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleSubmitSinglePayment}
                    disabled={!singlePayment.phoneNumber || !singlePayment.amount || isCreating || isSubmitting}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-white shadow-sm transition-all font-medium"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isCreating || isSubmitting ? "Submitting..." : "Submit for Approval"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bulk Payments Tab */}
            <TabsContent value="bulk" className="space-y-6">
              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                <Dialog open={isAddRecipientOpen} onOpenChange={setIsAddRecipientOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Recipient
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Add Recipient</DialogTitle>
                      <DialogDescription className="text-muted-foreground">Add a new recipient to your payment list</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-name" className="text-foreground">Name</Label>
                        <Input
                          id="new-name"
                          placeholder="Recipient name"
                          value={newRecipient.name}
                          onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                          className="bg-card text-foreground border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-phone" className="text-foreground">Mobile Number</Label>
                        <Input
                          id="new-phone"
                          placeholder="+256 XXX XXX XXX"
                          value={newRecipient.phoneNumber}
                          onChange={(e) => setNewRecipient({ ...newRecipient, phoneNumber: e.target.value })}
                          className="bg-card text-foreground border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-amount" className="text-foreground">Amount (UGX)</Label>
                        <Input
                          id="new-amount"
                          type="number"
                          placeholder="0.00"
                          value={newRecipient.amount}
                          onChange={(e) => setNewRecipient({ ...newRecipient, amount: e.target.value })}
                          className="bg-card text-foreground border-border"
                        />
                      </div>
                      <Button onClick={handleAddRecipient} className="w-full bg-primary hover:bg-primary/90">
                        <Plus className="h-4 w-4 mr-2" />
                        Add to List
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <label htmlFor="csv-upload">
                  <Button variant="outline" className="cursor-pointer border-primary text-primary hover:bg-primary/5" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Import CSV
                    </span>
                  </Button>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </label>

                <Button
                  variant="outline"
                  onClick={() => {
                    const csvContent = "Name,Phone Number,Amount\nJohn Doe,+256701234567,10000\nJane Smith,+256702345678,15000";
                    const blob = new Blob([csvContent], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "template.csv";
                    a.click();
                  }}
                  className="border-border text-foreground hover:bg-muted"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              {/* Recipients List */}
              {recipients.length > 0 ? (
                <>
                  <Card className="border border-border shadow-sm rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-border bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold text-foreground">
                            Recipients ({recipients.length})
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Total: UGX {calculateTotal().toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecipients([])}
                          className="text-destructive border-destructive/20 hover:bg-destructive/5"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {recipients.map((recipient) => (
                          <div
                            key={recipient.id}
                            className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{recipient.name}</p>
                              <p className="text-sm text-muted-foreground">{recipient.phoneNumber}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-primary">
                                  UGX {recipient.amount?.toLocaleString() || "0"}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRecipient(recipient.id)}
                                className="text-destructive hover:text-red-700 hover:bg-destructive/5"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Submit Button */}
                  <Card className="border border-primary shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Ready to Submit</h3>
                          <p className="text-sm text-muted-foreground">
                            {recipients.length} payment{recipients.length !== 1 ? "s" : ""} totaling UGX {calculateTotal().toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleSubmitBulkPayment}
                        disabled={isCreating || isSubmitting}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white shadow-sm transition-all text-lg font-semibold"
                      >
                        <Send className="h-5 w-5 mr-2" />
                        {isCreating || isSubmitting ? "Submitting..." : "Submit for Approval"}
                      </Button>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border border-border shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-12 text-center">
                    <Users className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Recipients Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Add recipients individually or import from a CSV file to get started
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={() => setIsAddRecipientOpen(true)} className="bg-primary hover:bg-primary/90">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Recipient
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Approvals Tab */}
            <TabsContent value="approvals" className="space-y-6">
              {loadingPending ? (
                <Card className="border border-border shadow-sm rounded-xl">
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">Loading...</p>
                  </CardContent>
                </Card>
              ) : (pendingRequests?.results || []).length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">
                      Pending Approvals ({pendingRequests?.count})
                    </h2>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      Total: UGX {parseFloat(pendingRequests?.total_amount || "0").toLocaleString()}
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    {pendingRequests?.results.map((request) => (
                      <Card key={request.id} className="border border-border shadow-sm rounded-xl">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusBadge(request.status)}
                                <Badge variant="outline" className="border-border">
                                  {request.payment_type_display}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-foreground">
                                {request.payment_type === "bulk"
                                  ? `Bulk Payment - ${request.total_recipients} recipients`
                                  : `Payment to ${request.recipient_name}`}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {request.payment_type === "single" && request.recipient_phone}
                                {request.description && ` • ${request.description}`}
                              </p>
                              <p className="text-xs text-muted-foreground/60 mt-2">
                                Requested by {request.created_by_name} on{" "}
                                {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-foreground">
                                {request.currency} {parseFloat(request.amount).toLocaleString()}
                              </p>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-destructive/20 text-destructive hover:bg-destructive/5"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsRejectModalOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90 text-white"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsApproveModalOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <Card className="border border-border shadow-sm rounded-xl">
                  <CardContent className="p-12 text-center">
                    <CheckCircle2 className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Approvals</h3>
                    <p className="text-muted-foreground">All payment requests have been reviewed</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* My Requests Tab */}
            <TabsContent value="history" className="space-y-6">
              {loadingMyRequests ? (
                <Card className="border border-border shadow-sm rounded-xl">
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">Loading...</p>
                  </CardContent>
                </Card>
              ) : (myRequests?.results || []).length > 0 ? (
                <div className="space-y-4">
                  {myRequests?.results.map((request) => (
                    <Card key={request.id} className="border border-border shadow-sm rounded-xl">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(request.status)}
                              <Badge variant="outline" className="border-border">
                                {request.payment_type_display}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-foreground">
                              {request.payment_type === "bulk"
                                ? `Bulk Payment - ${request.total_recipients} recipients`
                                : `Payment to ${request.recipient_name}`}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {request.payment_type === "single" && request.recipient_phone}
                              {request.description && ` • ${request.description}`}
                            </p>
                            {request.rejection_reason && (
                              <p className="text-sm text-destructive mt-2">
                                Rejected: {request.rejection_reason}
                              </p>
                            )}
                            {request.payment_reference && (
                              <p className="text-sm text-primary mt-2">
                                Reference: {request.payment_reference}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-foreground">
                              {request.currency} {parseFloat(request.amount).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border border-border shadow-sm rounded-xl">
                  <CardContent className="p-12 text-center">
                    <List className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Payment Requests</h3>
                    <p className="text-muted-foreground mb-6">
                      You haven't submitted any payment requests yet
                    </p>
                    <Button onClick={() => setActiveTab("single")} className="bg-primary hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Payment
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Approve Modal */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Approve Payment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Confirm approval for this payment request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold text-foreground">
                  {selectedRequest.payment_type === "bulk"
                    ? `Bulk Payment - ${selectedRequest.total_recipients} recipients`
                    : `Payment to ${selectedRequest.recipient_name}`}
                </p>
                <p className="text-xl font-bold text-primary mt-1">
                  {selectedRequest.currency} {parseFloat(selectedRequest.amount).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Notes (Optional)</Label>
                <Textarea
                  placeholder="Add approval notes..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="bg-card text-foreground border-border"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsApproveModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleApprove}
                  disabled={isApproving}
                >
                  {isApproving ? "Approving..." : "Approve Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reject Payment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Provide a reason for rejecting this payment request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold text-foreground">
                  {selectedRequest.payment_type === "bulk"
                    ? `Bulk Payment - ${selectedRequest.total_recipients} recipients`
                    : `Payment to ${selectedRequest.recipient_name}`}
                </p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {selectedRequest.currency} {parseFloat(selectedRequest.amount).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Rejection Reason *</Label>
                <Textarea
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="bg-card text-foreground border-border"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsRejectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={!rejectionReason || isRejecting}
                >
                  {isRejecting ? "Rejecting..." : "Reject Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
