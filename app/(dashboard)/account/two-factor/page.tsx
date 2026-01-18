"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  ArrowLeft,
  Shield,
  Mail,
  MessageSquare,
  Smartphone,
  Key,
  Copy,
  CheckCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "@/components/layout/loading-state";
import { getApiUrl } from "@/config/api";

interface TwoFASettings {
  is_2fa_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  totp_enabled: boolean;
  preferred_method: string | null;
  has_backup_codes: boolean;
  backup_codes_count: number;
  phone_number: string | null;
  email: string;
}

type TwoFAMethod = "email" | "sms" | "whatsapp" | "totp";

export default function TwoFactorSettingsPage() {
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<
    "enable" | "disable" | "totp-setup" | "totp-disable" | "backup-codes" | null
  >(null);
  const [selectedMethod, setSelectedMethod] = useState<TwoFAMethod | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [totpQrCode, setTotpQrCode] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [showTotpSecret, setShowTotpSecret] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const apiUrl = getApiUrl();

  // Fetch 2FA settings
  const { data: settings, isLoading, error } = useQuery<TwoFASettings>({
    queryKey: ["2fa-settings"],
    queryFn: () => api.get("/api/auth/2fa/settings/"),
  });

  // Enable 2FA method mutation
  const enableMutation = useMutation({
    mutationFn: async (method: TwoFAMethod) => {
      if (method === "totp") {
        // For TOTP, first get setup info
        const response = await api.post<{ qr_code: string; secret: string }>(
          "/api/auth/2fa/totp/setup/"
        );
        return response;
      }
      // For other methods, send verification OTP first
      await api.post("/api/auth/2fa/send-otp/", {
        channel: method,
        purpose: "setup_2fa",
      });
      return null;
    },
    onSuccess: (data, method) => {
      if (method === "totp" && data) {
        setTotpQrCode(data.qr_code);
        setTotpSecret(data.secret);
        setActiveDialog("totp-setup");
      } else {
        toast.success(`Verification code sent to your ${method === "email" ? "email" : method === "sms" ? "phone" : "WhatsApp"}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to send verification code");
    },
  });

  // Verify OTP and enable method
  const verifyEnableMutation = useMutation({
    mutationFn: async ({ method, code }: { method: TwoFAMethod; code: string }) => {
      if (method === "totp") {
        await api.post("/api/auth/2fa/totp/verify/", { code });
      } else {
        await api.post("/api/auth/2fa/enable/", { method, code });
      }
    },
    onSuccess: (_, { method }) => {
      queryClient.invalidateQueries({ queryKey: ["2fa-settings"] });
      toast.success(`${getMethodLabel(method)} enabled successfully`);
      setActiveDialog(null);
      setOtpValue("");
      setTotpQrCode(null);
      setTotpSecret(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Invalid verification code");
    },
  });

  // Disable 2FA method mutation (non-TOTP)
  const disableMutation = useMutation({
    mutationFn: async ({ method, password }: { method: TwoFAMethod; password: string }) => {
      await api.post("/api/auth/2fa/disable/", { method, password });
    },
    onSuccess: (_, { method }) => {
      queryClient.invalidateQueries({ queryKey: ["2fa-settings"] });
      toast.success(`${getMethodLabel(method)} disabled`);
      setActiveDialog(null);
      setSelectedMethod(null);
      setPassword("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to disable method");
    },
  });

  // Disable TOTP mutation (requires password and current TOTP code)
  const disableTotpMutation = useMutation({
    mutationFn: async ({ password, code }: { password: string; code: string }) => {
      await api.post("/api/auth/2fa/totp/disable/", { password, code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-settings"] });
      toast.success("Authenticator App disabled");
      setActiveDialog(null);
      setSelectedMethod(null);
      setPassword("");
      setOtpValue("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to disable authenticator");
    },
  });

  // Generate backup codes mutation
  const generateBackupCodesMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await api.post<{ codes: string[] }>(
        "/api/auth/2fa/backup-codes/generate/",
        { password }
      );
      return response.codes;
    },
    onSuccess: (codes) => {
      setBackupCodes(codes);
      queryClient.invalidateQueries({ queryKey: ["2fa-settings"] });
      toast.success("New backup codes generated");
      setPassword("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate backup codes");
    },
  });

  const getMethodLabel = (method: TwoFAMethod): string => {
    switch (method) {
      case "email":
        return "Email OTP";
      case "sms":
        return "SMS OTP";
      case "whatsapp":
        return "WhatsApp OTP";
      case "totp":
        return "Authenticator App";
    }
  };

  const getMethodIcon = (method: TwoFAMethod) => {
    switch (method) {
      case "email":
        return Mail;
      case "sms":
        return MessageSquare;
      case "whatsapp":
        return MessageSquare;
      case "totp":
        return Smartphone;
    }
  };

  const isMethodEnabled = (method: TwoFAMethod): boolean => {
    if (!settings) return false;
    switch (method) {
      case "email":
        return settings.email_enabled;
      case "sms":
        return settings.sms_enabled;
      case "whatsapp":
        return settings.whatsapp_enabled;
      case "totp":
        return settings.totp_enabled;
    }
  };

  const handleToggleMethod = async (method: TwoFAMethod, enable: boolean) => {
    setSelectedMethod(method);
    if (enable) {
      if (method === "totp") {
        enableMutation.mutate(method);
      } else {
        setActiveDialog("enable");
        enableMutation.mutate(method);
      }
    } else {
      // Different dialog for TOTP (requires code) vs other methods
      if (method === "totp") {
        setActiveDialog("totp-disable");
      } else {
        setActiveDialog("disable");
      }
    }
  };

  const handleVerifyEnable = () => {
    if (!selectedMethod || otpValue.length !== 6) return;
    setIsVerifying(true);
    verifyEnableMutation.mutate(
      { method: selectedMethod, code: otpValue },
      {
        onSettled: () => setIsVerifying(false),
      }
    );
  };

  const handleVerifyTotp = () => {
    if (otpValue.length !== 6) return;
    setIsVerifying(true);
    verifyEnableMutation.mutate(
      { method: "totp", code: otpValue },
      {
        onSettled: () => setIsVerifying(false),
      }
    );
  };

  const handleConfirmDisable = () => {
    if (!selectedMethod || !password) return;
    disableMutation.mutate({ method: selectedMethod, password });
  };

  const handleConfirmDisableTotp = () => {
    if (!password || otpValue.length !== 6) return;
    disableTotpMutation.mutate({ password, code: otpValue });
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    toast.success("Backup codes copied to clipboard");
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleGenerateBackupCodes = () => {
    setActiveDialog("backup-codes");
    // Don't mutate yet - need password first
  };

  const handleConfirmGenerateBackupCodes = () => {
    if (!password) return;
    generateBackupCodesMutation.mutate(password);
  };

  if (isLoading) {
    return <LoadingState fullPage />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-semibold">Error Loading Settings</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Failed to load 2FA settings. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const methods: TwoFAMethod[] = ["email", "sms", "whatsapp", "totp"];
  const enabledCount = methods.filter((m) => isMethodEnabled(m)).length;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/account/profile"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Two-Factor Authentication
              </h1>
              <p className="text-sm text-gray-500">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className="max-w-3xl mx-auto px-6 py-4">
        <Card
          className={`p-4 border ${
            settings?.is_2fa_enabled
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                settings?.is_2fa_enabled ? "bg-green-100" : "bg-amber-100"
              }`}
            >
              <Shield
                className={`h-5 w-5 ${
                  settings?.is_2fa_enabled ? "text-green-600" : "text-amber-600"
                }`}
              />
            </div>
            <div className="flex-1">
              <h3
                className={`font-medium ${
                  settings?.is_2fa_enabled ? "text-green-900" : "text-amber-900"
                }`}
              >
                {settings?.is_2fa_enabled
                  ? "Two-Factor Authentication is enabled"
                  : "Two-Factor Authentication is not enabled"}
              </h3>
              <p
                className={`text-sm ${
                  settings?.is_2fa_enabled ? "text-green-700" : "text-amber-700"
                }`}
              >
                {settings?.is_2fa_enabled
                  ? `${enabledCount} method${enabledCount > 1 ? "s" : ""} configured`
                  : "Enable at least one method to secure your account"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Methods */}
      <div className="max-w-3xl mx-auto px-6 pb-6">
        <Card className="divide-y divide-gray-100">
          {methods.map((method) => {
            const Icon = getMethodIcon(method);
            const enabled = isMethodEnabled(method);

            return (
              <div
                key={method}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      enabled ? "bg-[#49a034]/10" : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        enabled ? "text-[#49a034]" : "text-gray-500"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {getMethodLabel(method)}
                      </h3>
                      {enabled && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          Enabled
                        </Badge>
                      )}
                      {settings?.preferred_method === method && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          Preferred
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {method === "email" &&
                        `Send codes to ${settings?.email || "your email"}`}
                      {method === "sms" &&
                        (settings?.phone_number
                          ? `Send codes to ${settings.phone_number}`
                          : "Add phone number to enable")}
                      {method === "whatsapp" &&
                        (settings?.phone_number
                          ? `Send codes to ${settings.phone_number}`
                          : "Add phone number to enable")}
                      {method === "totp" &&
                        "Use Google Authenticator, Authy, or similar app"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => handleToggleMethod(method, checked)}
                  disabled={
                    enableMutation.isPending ||
                    disableMutation.isPending ||
                    disableTotpMutation.isPending ||
                    ((method === "sms" || method === "whatsapp") &&
                      !settings?.phone_number)
                  }
                />
              </div>
            );
          })}
        </Card>

        {/* Backup Codes */}
        <Card className="mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Key className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  Backup Codes
                </h3>
                <p className="text-xs text-gray-500">
                  Use these codes if you lose access to your authentication methods
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                {settings?.has_backup_codes ? (
                  <p className="text-sm text-gray-600">
                    You have{" "}
                    <span className="font-medium text-gray-900">
                      {settings.backup_codes_count}
                    </span>{" "}
                    backup codes remaining
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    No backup codes generated yet
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateBackupCodes}
                disabled={
                  !settings?.is_2fa_enabled || generateBackupCodesMutation.isPending
                }
                className="h-8"
              >
                {generateBackupCodesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {settings?.has_backup_codes ? "Regenerate" : "Generate"} Codes
              </Button>
            </div>
            {!settings?.is_2fa_enabled && (
              <p className="text-xs text-amber-600 mt-2">
                Enable at least one 2FA method to generate backup codes
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Enable Method Dialog */}
      <Dialog
        open={activeDialog === "enable"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Enable {selectedMethod && getMethodLabel(selectedMethod)}
            </DialogTitle>
            <DialogDescription>
              Enter the verification code sent to your{" "}
              {selectedMethod === "email"
                ? "email"
                : selectedMethod === "sms"
                ? "phone"
                : "WhatsApp"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={(value) => setOtpValue(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActiveDialog(null)}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyEnable}
              disabled={otpValue.length !== 6 || isVerifying}
              className="bg-[#49a034] hover:bg-[#547568]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify & Enable"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Method Dialog */}
      <Dialog
        open={activeDialog === "disable"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
            setPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Disable {selectedMethod && getMethodLabel(selectedMethod)}
            </DialogTitle>
            <DialogDescription>
              Enter your password to confirm disabling this authentication method.
              Your account may be less secure.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="disable-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActiveDialog(null);
                setPassword("");
              }}
              disabled={disableMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDisable}
              disabled={disableMutation.isPending || !password}
            >
              {disableMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Disabling...
                </>
              ) : (
                "Disable"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable TOTP Dialog (requires password + current TOTP code) */}
      <Dialog
        open={activeDialog === "totp-disable"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
            setPassword("");
            setOtpValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Authenticator App</DialogTitle>
            <DialogDescription>
              Enter your password and a code from your authenticator app to disable it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp-disable-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="totp-disable-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Authenticator Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(value) => setOtpValue(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActiveDialog(null);
                setPassword("");
                setOtpValue("");
              }}
              disabled={disableTotpMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDisableTotp}
              disabled={disableTotpMutation.isPending || !password || otpValue.length !== 6}
            >
              {disableTotpMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Disabling...
                </>
              ) : (
                "Disable Authenticator"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOTP Setup Dialog */}
      <Dialog
        open={activeDialog === "totp-setup"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Setup Authenticator App</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app (Google
              Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {totpQrCode && (
              <div className="bg-white p-4 rounded-lg border">
                <img
                  src={totpQrCode}
                  alt="TOTP QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}
            {totpSecret && (
              <div className="w-full">
                <p className="text-xs text-gray-500 text-center mb-2">
                  Or enter this code manually:
                </p>
                <div className="flex items-center gap-2">
                  <code
                    className={`flex-1 text-sm bg-gray-100 px-3 py-2 rounded font-mono text-center ${
                      showTotpSecret ? "" : "blur-sm select-none"
                    }`}
                  >
                    {totpSecret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTotpSecret(!showTotpSecret)}
                    className="h-9"
                  >
                    {showTotpSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(totpSecret);
                      toast.success("Secret copied");
                    }}
                    className="h-9"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="w-full">
              <p className="text-sm text-gray-600 text-center mb-3">
                Enter the 6-digit code from your app:
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(value) => setOtpValue(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActiveDialog(null);
                setTotpQrCode(null);
                setTotpSecret(null);
                setOtpValue("");
              }}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyTotp}
              disabled={otpValue.length !== 6 || isVerifying}
              className="bg-[#49a034] hover:bg-[#547568]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify & Enable"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog
        open={activeDialog === "backup-codes"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveDialog(null);
            setPassword("");
            // Only clear codes if user clicks Done
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Backup Codes</DialogTitle>
            <DialogDescription>
              {backupCodes.length > 0
                ? "Save these codes in a safe place. Each code can only be used once."
                : "Enter your password to generate new backup codes."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {backupCodes.length === 0 && !generateBackupCodesMutation.isPending ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="backup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700">
                    Generating new codes will invalidate any existing backup codes.
                  </p>
                </div>
              </div>
            ) : generateBackupCodesMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : backupCodes.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <code
                      key={index}
                      className="text-sm font-mono bg-white px-3 py-2 rounded border text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            {backupCodes.length === 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveDialog(null);
                    setPassword("");
                  }}
                  disabled={generateBackupCodesMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmGenerateBackupCodes}
                  disabled={!password || generateBackupCodesMutation.isPending}
                  className="bg-[#49a034] hover:bg-[#547568]"
                >
                  {generateBackupCodesMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    "Generate Codes"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCopyBackupCodes}
                  className="flex-1"
                >
                  {copiedCodes ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All Codes
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setActiveDialog(null);
                    setBackupCodes([]);
                    setPassword("");
                  }}
                  className="bg-[#49a034] hover:bg-[#547568]"
                >
                  Done
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
