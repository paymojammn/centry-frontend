"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Filter,
  Calendar,
  User,
  Eye,
  FileText,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  LogOut,
  History,
  MapPin,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  user_name: string;
  user_email: string;
  user_ip: string;
  action_type: string;
  action_display: string;
  action_description: string;
  severity: string;
  severity_display: string;
  module: string;
  target_representation: string;
  timestamp: string;
  organization_name: string;
  success: boolean;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface AuditStats {
  total_logs: number;
  by_severity: Record<string, number>;
  by_module: Record<string, number>;
  by_action: Record<string, number>;
  recent_count: number;
  error_count: number;
  critical_count: number;
}

interface UserSession {
  id: string;
  device_type: string;
  device_name: string;
  ip_address: string;
  location: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
  is_current: boolean;
}

interface LoginHistoryItem {
  id: string;
  timestamp: string;
  ip_address: string;
  device_type: string;
  device_name: string;
  location: string;
  success: boolean;
  failure_reason: string;
  auth_method: string;
}

export default function SecurityPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sessions");
  const [sessionToRevoke, setSessionToRevoke] = useState<UserSession | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);

  const [filters, setFilters] = useState({
    action_type: "",
    severity: "",
    module: "",
    search: "",
    days: "30",
  });

  // Fetch sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<UserSession[]>({
    queryKey: ["user-sessions"],
    queryFn: () => api.get("/api/v1/security/sessions/"),
    retry: 2,
  });

  // Fetch login history
  const { data: loginHistory = [], isLoading: historyLoading } = useQuery<LoginHistoryItem[]>({
    queryKey: ["login-history"],
    queryFn: () => api.get("/api/v1/security/login-history/"),
    retry: 2,
  });

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/api/v1/security/sessions/${sessionId}/revoke/`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      toast.success("Session revoked successfully");
      setSessionToRevoke(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to revoke session");
    },
  });

  // Revoke all sessions mutation
  const revokeAllMutation = useMutation({
    mutationFn: () => api.post("/api/v1/security/sessions/revoke-all/", {}),
    onSuccess: (data: { revoked_count: number }) => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      toast.success(`Revoked ${data.revoked_count} session(s)`);
      setShowRevokeAllDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to revoke sessions");
    },
  });

  // Fetch audit stats
  const { data: stats, error: statsError } = useQuery<AuditStats>({
    queryKey: ["audit-stats", filters.days],
    queryFn: () => api.get(`/api/v1/security/audit-logs/stats/?days=${filters.days}`),
    retry: 2,
    retryDelay: 1000,
    enabled: activeTab === "audit",
  });

  // Fetch audit logs with filters
  const { data: logsData, isLoading: logsLoading, error: logsError } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.action_type) params.append("action_type", filters.action_type);
      if (filters.severity) params.append("severity", filters.severity);
      if (filters.module) params.append("module", filters.module);
      if (filters.search) params.append("search", filters.search);

      const response = await api.get<{ results: AuditLog[] }>(`/api/v1/security/audit-logs/?${params.toString()}`);
      return response;
    },
    retry: 2,
    retryDelay: 1000,
    enabled: activeTab === "audit",
  });

  const logs = logsData?.results || [];

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action_type) params.append("action_type", filters.action_type);
      if (filters.severity) params.append("severity", filters.severity);
      if (filters.module) params.append("module", filters.module);

      window.open(`/api/v1/security/audit-logs/export/?${params.toString()}`, '_blank');
      toast.success("Exporting audit logs...");
    } catch {
      toast.error("Failed to export logs");
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles = {
      info: "bg-blue-100 text-blue-800",
      warning: "bg-yellow-100 text-yellow-800",
      error: "bg-red-100 text-red-800",
      critical: "bg-purple-100 text-purple-800",
    };
    return styles[severity as keyof typeof styles] || styles.info;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-purple-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-5 w-5 text-gray-500" />;
      case "tablet":
        return <Tablet className="h-5 w-5 text-gray-500" />;
      case "desktop":
        return <Monitor className="h-5 w-5 text-gray-500" />;
      default:
        return <Laptop className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAuthMethodBadge = (method: string) => {
    const styles: Record<string, string> = {
      password: "bg-gray-100 text-gray-700",
      "2fa_otp": "bg-blue-100 text-blue-700",
      "2fa_totp": "bg-green-100 text-green-700",
      "2fa_backup": "bg-amber-100 text-amber-700",
      xero: "bg-cyan-100 text-cyan-700",
    };
    const labels: Record<string, string> = {
      password: "Password",
      "2fa_otp": "Email OTP",
      "2fa_totp": "Authenticator",
      "2fa_backup": "Backup Code",
      xero: "Xero SSO",
    };
    return {
      className: styles[method] || styles.password,
      label: labels[method] || method,
    };
  };

  const otherSessions = sessions.filter(s => !s.is_current);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#49a034]/10 rounded-lg">
                <Shield className="h-6 w-6 text-[#49a034]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Security</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Manage your account security and monitor activity
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 animate-fade-in-up">

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-white rounded-xl border border-gray-200/80 shadow-sm p-1">
          <TabsTrigger value="sessions" className="flex items-center gap-2 btn-press data-[state=active]:bg-[#49a034] data-[state=active]:text-white rounded-lg">
            <Monitor className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 btn-press data-[state=active]:bg-[#49a034] data-[state=active]:text-white rounded-lg">
            <History className="h-4 w-4" />
            Login History
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2 btn-press data-[state=active]:bg-[#49a034] data-[state=active]:text-white rounded-lg">
            <FileText className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6 mt-6">
          {/* Current Session */}
          {sessions.filter(s => s.is_current).map(session => (
            <Card key={session.id} className="p-6 border-[#49a034]/20 bg-[#49a034]/5 rounded-xl shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {getDeviceIcon(session.device_type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{session.device_name}</h3>
                      <Badge className="bg-[#49a034] text-white">Current Session</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {session.ip_address} {session.location && `- ${session.location}`}
                      </p>
                      <p>
                        Started {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Other Sessions */}
          <Card className="border-gray-200/80 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Other Active Sessions</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Devices that are currently signed in to your account
                </p>
              </div>
              {otherSessions.length > 0 && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 btn-press"
                  onClick={() => setShowRevokeAllDialog(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out all
                </Button>
              )}
            </div>

            {sessionsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-[#49a034] border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-500 mt-2">Loading sessions...</p>
              </div>
            ) : otherSessions.length === 0 ? (
              <div className="p-8 text-center">
                <Monitor className="h-12 w-12 text-gray-300 mx-auto" />
                <p className="text-gray-500 mt-2">No other active sessions</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 animate-stagger">
                {otherSessions.map(session => (
                  <div key={session.id} className="p-4 flex items-center justify-between row-interactive">
                    <div className="flex items-center gap-4">
                      {getDeviceIcon(session.device_type)}
                      <div>
                        <p className="font-medium text-gray-900">{session.device_name}</p>
                        <p className="text-sm text-gray-500">
                          {session.ip_address} {session.location && `- ${session.location}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Last active {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setSessionToRevoke(session)}
                    >
                      Sign out
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="history" className="space-y-6 mt-6">
          <Card className="border-gray-200/80 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#49a034]" />
                <h2 className="text-lg font-semibold text-gray-900">Recent Login Activity</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                A log of all sign-in attempts to your account
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin h-5 w-5 border-2 border-[#49a034] border-t-transparent rounded-full" />
                          Loading...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : loginHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <History className="h-12 w-12 text-gray-300 mx-auto" />
                        <p className="text-gray-500 mt-2">No login history yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    loginHistory.map((item) => {
                      const authBadge = getAuthMethodBadge(item.auth_method);
                      return (
                        <TableRow key={item.id} className="row-interactive">
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">
                                {format(new Date(item.timestamp), "MMM dd, yyyy")}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(item.timestamp), "HH:mm:ss")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(item.device_type)}
                              <span className="text-gray-700">{item.device_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="font-mono text-sm">{item.ip_address}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={authBadge.className}>
                              {authBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.success ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Success</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-600">
                                <XCircle className="h-4 w-4" />
                                <span title={item.failure_reason}>Failed</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-6 mt-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 border-gray-200/80 rounded-xl shadow-sm card-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-black mt-2">
                    {stats?.total_logs || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-gray-200/80 rounded-xl shadow-sm card-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Last 24h</p>
                  <p className="text-2xl font-bold text-black mt-2">
                    {stats?.recent_count || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-gray-200/80 rounded-xl shadow-sm card-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {stats?.error_count || 0}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-gray-200/80 rounded-xl shadow-sm card-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">
                    {stats?.critical_count || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-6 border-gray-200/80 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#49a034]" />
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              </div>
              <Button
                onClick={handleExport}
                variant="outline"
                className="border-[#49a034] text-[#49a034] hover:bg-[#49a034]/10 btn-press"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Logs
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="module">Module</Label>
                <Select
                  value={filters.module || "all"}
                  onValueChange={(value) => setFilters({ ...filters, module: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    <SelectItem value="auth">Authentication</SelectItem>
                    <SelectItem value="user">User Management</SelectItem>
                    <SelectItem value="org">Organization</SelectItem>
                    <SelectItem value="erp">ERP Integration</SelectItem>
                    <SelectItem value="bank">Banking</SelectItem>
                    <SelectItem value="payment">Payments</SelectItem>
                    <SelectItem value="expense">Expenses</SelectItem>
                    <SelectItem value="bill">Bills</SelectItem>
                    <SelectItem value="recon">Reconciliation</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={filters.severity || "all"}
                  onValueChange={(value) => setFilters({ ...filters, severity: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="days">Time Range</Label>
                <Select
                  value={filters.days}
                  onValueChange={(value) => setFilters({ ...filters, days: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() =>
                    setFilters({
                      action_type: "",
                      severity: "",
                      module: "",
                      search: "",
                      days: "30",
                    })
                  }
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Error Display */}
          {(statsError || logsError) && (
            <Card className="border-red-200 bg-red-50 p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Error Loading Audit Logs</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {String(statsError || logsError)}
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Please ensure you are logged in and have the necessary permissions.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Audit Logs Table */}
          <Card className="border-gray-200/80 rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#49a034]" />
                <h2 className="text-lg font-semibold text-gray-900">Audit Log Entries</h2>
                <Badge className="ml-2 bg-gray-100 text-gray-700">
                  {logs.length} records
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin h-5 w-5 border-2 border-[#49a034] border-t-transparent rounded-full" />
                          Loading...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Eye className="h-12 w-12 text-gray-300" />
                          <p className="text-gray-500">No audit logs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="row-interactive">
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.timestamp), "MMM dd, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {log.user_name || "System"}
                              </p>
                              <p className="text-xs text-gray-500">{log.user_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.action_display}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gray-100 text-gray-700">
                            {log.module}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm text-gray-700 truncate">
                            {log.action_description}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(log.severity)}
                            <Badge className={getSeverityBadge(log.severity)}>
                              {log.severity_display}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      </div>
      {/* Revoke Session Dialog */}
      <Dialog open={!!sessionToRevoke} onOpenChange={() => setSessionToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out this device?</DialogTitle>
            <DialogDescription>
              This will sign out the session on {sessionToRevoke?.device_name}.
              They will need to sign in again to access the account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToRevoke(null)} className="btn-press">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => sessionToRevoke && revokeSessionMutation.mutate(sessionToRevoke.id)}
              disabled={revokeSessionMutation.isPending}
              className="btn-press"
            >
              {revokeSessionMutation.isPending ? "Signing out..." : "Sign out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions Dialog */}
      <Dialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out all other devices?</DialogTitle>
            <DialogDescription>
              This will sign out {otherSessions.length} other active session(s).
              Your current session will remain active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeAllDialog(false)} className="btn-press">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeAllMutation.mutate()}
              disabled={revokeAllMutation.isPending}
              className="btn-press"
            >
              {revokeAllMutation.isPending ? "Signing out..." : "Sign out all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
