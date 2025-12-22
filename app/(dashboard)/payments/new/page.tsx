"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Recipient {
  id: string;
  name: string;
  phoneNumber: string;
  amount?: number;
}

interface SendingList {
  id: string;
  name: string;
  recipients: Recipient[];
  totalAmount: number;
  createdAt: Date;
}

export default function NewPaymentPage() {
  const [activeTab, setActiveTab] = useState("single");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sendingLists, setSendingLists] = useState<SendingList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [isAddRecipientOpen, setIsAddRecipientOpen] = useState(false);
  const [isSaveListOpen, setIsSaveListOpen] = useState(false);
  const [listName, setListName] = useState("");

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

  const handleAddRecipient = () => {
    if (newRecipient.name && newRecipient.phoneNumber) {
      const recipient: Recipient = {
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
        const imported: Recipient[] = [];

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
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

  const handleSaveAsList = () => {
    if (listName && recipients.length > 0) {
      const totalAmount = recipients.reduce((sum, r) => sum + (r.amount || 0), 0);
      const newList: SendingList = {
        id: Math.random().toString(36).substr(2, 9),
        name: listName,
        recipients: [...recipients],
        totalAmount,
        createdAt: new Date(),
      };
      setSendingLists([...sendingLists, newList]);
      setListName("");
      setIsSaveListOpen(false);
    }
  };

  const handleLoadList = (listId: string) => {
    const list = sendingLists.find((l) => l.id === listId);
    if (list) {
      setRecipients([...list.recipients]);
      setSelectedList(listId);
    }
  };

  const handleDeleteList = (listId: string) => {
    setSendingLists(sendingLists.filter((l) => l.id !== listId));
    if (selectedList === listId) {
      setSelectedList(null);
    }
  };

  const calculateTotal = () => {
    return recipients.reduce((sum, r) => sum + (r.amount || 0), 0);
  };

  const handleSendPayments = () => {
    // Implementation for sending payments
    console.log("Sending payments:", recipients);
    alert(`Sending payments to ${recipients.length} recipients. Total: UGX ${calculateTotal().toLocaleString()}`);
  };

  const handleSendSinglePayment = () => {
    // Implementation for single payment
    console.log("Sending single payment:", singlePayment);
    alert(`Sending UGX ${parseFloat(singlePayment.amount).toLocaleString()} to ${singlePayment.phoneNumber}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#638C80]/5">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header with brand gradient background */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#638C80] via-[#547568] to-[#456050] p-8 shadow-xl">
            <div className="absolute inset-0 bg-black opacity-5"></div>
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Smartphone className="h-8 w-8" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">Send Mobile Money</h1>
                </div>
                <p className="text-white/90 text-lg mt-3 ml-16">
                  Send payments to individuals or multiple recipients at once
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
              <TabsList className="bg-gray-50 p-1.5 rounded-xl w-full grid grid-cols-3 gap-1">
                <TabsTrigger
                  value="single"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#547568] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Single Payment
                </TabsTrigger>
                <TabsTrigger
                  value="bulk"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#547568] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Payments
                </TabsTrigger>
                <TabsTrigger
                  value="lists"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#547568] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
                >
                  <List className="h-4 w-4 mr-2" />
                  Saved Lists ({sendingLists.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Single Payment Tab */}
            <TabsContent value="single" className="space-y-6">
              <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <CardTitle className="text-xl font-semibold text-gray-900">Single Payment</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Send money to one mobile number</p>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="recipient-name">Recipient Name</Label>
                    <Input
                      id="recipient-name"
                      placeholder="Enter recipient name"
                      value={singlePayment.name}
                      onChange={(e) => setSinglePayment({ ...singlePayment, name: e.target.value })}
                      className="h-12 border-2 border-gray-200 focus:border-[#638C80] rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-number">Mobile Number</Label>
                    <Input
                      id="phone-number"
                      placeholder="+256 XXX XXX XXX"
                      value={singlePayment.phoneNumber}
                      onChange={(e) => setSinglePayment({ ...singlePayment, phoneNumber: e.target.value })}
                      className="h-12 border-2 border-gray-200 focus:border-[#638C80] rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (UGX)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={singlePayment.amount}
                      onChange={(e) => setSinglePayment({ ...singlePayment, amount: e.target.value })}
                      className="h-12 border-2 border-gray-200 focus:border-[#638C80] rounded-xl text-lg font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Payment description..."
                      value={singlePayment.description}
                      onChange={(e) => setSinglePayment({ ...singlePayment, description: e.target.value })}
                      className="border-2 border-gray-200 focus:border-[#638C80] rounded-xl"
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleSendSinglePayment}
                    disabled={!singlePayment.phoneNumber || !singlePayment.amount}
                    className="w-full h-12 bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] text-white shadow-md hover:shadow-lg transition-all text-lg font-semibold"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Send Payment
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bulk Payments Tab */}
            <TabsContent value="bulk" className="space-y-6">
              {/* Action Buttons */}
              <div className="flex gap-4 flex-wrap">
                <Dialog open={isAddRecipientOpen} onOpenChange={setIsAddRecipientOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] text-white shadow-md">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Recipient
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Recipient</DialogTitle>
                      <DialogDescription>Add a new recipient to your payment list</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-name">Name</Label>
                        <Input
                          id="new-name"
                          placeholder="Recipient name"
                          value={newRecipient.name}
                          onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-phone">Mobile Number</Label>
                        <Input
                          id="new-phone"
                          placeholder="+256 XXX XXX XXX"
                          value={newRecipient.phoneNumber}
                          onChange={(e) => setNewRecipient({ ...newRecipient, phoneNumber: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-amount">Amount (UGX)</Label>
                        <Input
                          id="new-amount"
                          type="number"
                          placeholder="0.00"
                          value={newRecipient.amount}
                          onChange={(e) => setNewRecipient({ ...newRecipient, amount: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleAddRecipient} className="w-full bg-[#638C80] hover:bg-[#547568]">
                        <Plus className="h-4 w-4 mr-2" />
                        Add to List
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <label htmlFor="csv-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
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
                    const csvContent =
                      "Name,Phone Number,Amount\nJohn Doe,+256701234567,10000\nJane Smith,+256702345678,15000";
                    const blob = new Blob([csvContent], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "template.csv";
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>

                {recipients.length > 0 && (
                  <Dialog open={isSaveListOpen} onOpenChange={setIsSaveListOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-[#638C80] text-[#638C80] hover:bg-[#638C80]/10">
                        <List className="h-4 w-4 mr-2" />
                        Save as List
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save Sending List</DialogTitle>
                        <DialogDescription>Give your sending list a name to save it for later use</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="list-name">List Name</Label>
                          <Input
                            id="list-name"
                            placeholder="e.g., Monthly Salaries, Supplier Payments"
                            value={listName}
                            onChange={(e) => setListName(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleSaveAsList} className="w-full bg-[#638C80] hover:bg-[#547568]">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Save List
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Recipients List */}
              {recipients.length > 0 ? (
                <>
                  <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-semibold text-gray-900">
                            Recipients ({recipients.length})
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            Total: UGX {calculateTotal().toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRecipients([])}
                          className="text-red-600 border-red-200 hover:bg-red-50"
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
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl hover:border-[#638C80]/30 hover:shadow-md transition-all"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{recipient.name}</p>
                              <p className="text-sm text-gray-500">{recipient.phoneNumber}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-[#638C80]">
                                  UGX {recipient.amount?.toLocaleString() || "0"}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRecipient(recipient.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Send Button */}
                  <Card className="border-2 border-[#638C80] shadow-lg rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Ready to Send</h3>
                          <p className="text-sm text-gray-600">
                            {recipients.length} payment{recipients.length !== 1 ? "s" : ""} totaling UGX{" "}
                            {calculateTotal().toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleSendPayments}
                        className="w-full h-12 bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] text-white shadow-md hover:shadow-lg transition-all text-lg font-semibold"
                      >
                        <Send className="h-5 w-5 mr-2" />
                        Send All Payments
                      </Button>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
                  <CardContent className="p-12 text-center">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recipients Yet</h3>
                    <p className="text-gray-500 mb-6">
                      Add recipients individually or import from a CSV file to get started
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button
                        onClick={() => setIsAddRecipientOpen(true)}
                        className="bg-[#638C80] hover:bg-[#547568]"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Recipient
                      </Button>
                      <label htmlFor="csv-upload-empty">
                        <Button variant="outline" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Import CSV
                          </span>
                        </Button>
                        <input
                          id="csv-upload-empty"
                          type="file"
                          accept=".csv"
                          onChange={handleImportCSV}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Saved Lists Tab */}
            <TabsContent value="lists" className="space-y-6">
              {sendingLists.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {sendingLists.map((list) => (
                    <Card key={list.id} className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
                      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl font-semibold text-gray-900">{list.name}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              Created {list.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteList(list.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="h-5 w-5 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {list.recipients.length} recipient{list.recipients.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <Badge className="bg-[#638C80]/20 text-[#638C80] border-[#638C80]/30">
                              UGX {list.totalAmount.toLocaleString()}
                            </Badge>
                          </div>
                          <Button
                            onClick={() => {
                              handleLoadList(list.id);
                              setActiveTab("bulk");
                            }}
                            className="w-full bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] text-white"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Use This List
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
                  <CardContent className="p-12 text-center">
                    <List className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Lists</h3>
                    <p className="text-gray-500 mb-6">
                      Create bulk payments and save them as lists for quick reuse
                    </p>
                    <Button onClick={() => setActiveTab("bulk")} className="bg-[#638C80] hover:bg-[#547568]">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Bulk Payment
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
