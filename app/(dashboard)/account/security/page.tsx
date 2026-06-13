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
import { PageHeader } from "@/components/layout/page-header";
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
      info: "bg-[#6B8FB8]/10 text-[#6B8FB8]",
      warning: "bg-[#D4B35A]/10 text-[#D4B35A]",
      error: "bg-destructive/10 text-destructive",
      critical: "bg-[#8B7BB8]/10 text-[#8B7BB8]",
    };
    return styles[severity as keyof typeof styles] || styles.info;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-[#8B7BB8]" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-[#D4B35A]" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-[#6B8FB8]" />;
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-5 w-5 text-muted-foreground" />;
      case "tablet":
        return <Tablet className="h-5 w-5 text-muted-foreground" />;
      case "desktop":
        return <Monitor className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Laptop className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getAuthMethodBadge = (method: string) => {
    const styles: Record<string, string> = {
      password: "bg-muted text-foreground",
      "2fa_otp": "bg-[#6B8FB8]/10 text-[#6B8FB8]",
      "2fa_totp": "bg-primary/10 text-primary",
      "2fa_backup": "bg-[#D4B35A]/10 text-[#D4B35A]",
      xero: "bg-[#6B8FB8]/10 text-[#6B8FB8]",
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
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Security"
        subtitle="Manage your account security and monitor activity"
        breadcrumbs={[
          { label: "Account", href: "/account/profile" },
          { label: "Security" },
        ]}
      />

      <div className="px-6 py-6 space-y-6 animate-fade-in-up">

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-card rounded-xl border border-border/80 shadow-sm p-1">
          <TabsTrigger value="sessions" className="flex items-center gap-2 btn-press data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
            <Monitor className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 btn-press data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
            <History className="h-4 w-4" />
            Login History
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2 btn-press data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
            <FileText className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6 mt-6">
          {/* Current Session */}
          {sessions.filter(s => s.is_current).map(session => (
            <Card key={session.id} className="p-6 border-primary/20 bg-primary/5 rounded-xl shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {getDeviceIcon(session.device_type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{session.device_name}</h3>
                      <Badge className="bg-primary text-white">Current Session</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
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
          <Card className="border-border/80 rounded-xl shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Other Active Sessions</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Devices that are currently signed in to your account
                </p>
              </div>
              {otherSessions.length > 0 && (
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/20 hover:bg-destructive/5 btn-press"
                  onClick={() => setShowRevokeAllDialog(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out all
                </Button>
              )}
            </div>

            {sessionsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground mt-2">Loading sessions...</p>
              </div>
            ) : otherSessions.length === 0 ? (
              <div className="p-8 text-center">
                <Monitor className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <p className="text-muted-foreground mt-2">No other active sessions</p>
              </div>
            ) : (
              <div className="divide-y divide-border animate-stagger">
                {otherSessions.map(session => (
                  <div key={session.id} className="p-4 flex items-center justify-between row-interactive">
                    <div className="flex items-center gap-4">
                      {getDeviceIcon(session.device_type)}
                      <div>
                        <p className="font-medium text-foreground">{session.device_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.ip_address} {session.location && `- ${session.location}`}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Last active {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/5"
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
          <Card className="border-border/80 rounded-xl shadow-sm">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Recent Login Activity</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
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
                          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                          Loading...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : loginHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <History className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                        <p className="text-muted-foreground mt-2">No login history yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    loginHistory.map((item) => {
                      const authBadge = getAuthMethodBadge(item.auth_method);
                      return (
                        <TableRow key={item.id} className="row-interactive">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {format(new Date(item.timestamp), "MMM dd, yyyy")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(item.timestamp), "HH:mm:ss")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(item.device_type)}
                              <span className="text-foreground">{item.device_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground/60" />
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
                              <div className="flex items-center gap-2 text-primary">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Success</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-destructive">
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
            <Card className="p-6 border-border/80 rounded-xl shadow-sm card-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold text-black mt-2">
                    {stats?.total_logs || 0}
                  </p>
                </div>
                <div className="p-3 bg-[#6B8FB8]/10 rounded-lg">
                  <Activity className="h-6 w-6 text-[#6B8FB8]" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/80 rounded-xl shadow-sm card-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last 24h</p>
                  <p className="text-2xl font-bold text-black mt-2">
                    {stats?.recent_count || 0}
                  </p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/80 rounded-xl shadow-sm card-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-destructive mt-2">
                    {stats?.error_count || 0}
                  </p>
                </div>
                <div className="p-3 bg-destructive/5 rounded-lg">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/80 rounded-xl shadow-sm card-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-[#8B7BB8] mt-2">
                    {stats?.critical_count || 0}
                  </p>
                </div>
                <div className="p-3 bg-[#8B7BB8]/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-[#8B7BB8]" />
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-6 border-border/80 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Filters</h2>
              </div>
              <Button
                onClick={handleExport}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10 btn-press"
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
            <Card className="border-destructive/20 bg-destructive/5 p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <h3 className="font-semibold text-destructive">Error Loading Audit Logs</h3>
                  <p className="text-sm text-destructive mt-1">
                    {String(statsError || logsError)}
                  </p>
                  <p className="text-xs text-destructive mt-2">
                    Please ensure you are logged in and have the necessary permissions.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Audit Logs Table */}
          <Card className="border-border/80 rounded-xl shadow-sm">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Audit Log Entries</h2>
                <Badge className="ml-2 bg-muted text-foreground">
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
                          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                          Loading...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Eye className="h-12 w-12 text-muted-foreground/40" />
                          <p className="text-muted-foreground">No audit logs found</p>
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
                            <User className="h-4 w-4 text-muted-foreground/60" />
                            <div>
                              <p className="font-medium text-foreground">
                                {log.user_name || "System"}
                              </p>
                              <p className="text-xs text-muted-foreground">{log.user_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.action_display}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-muted text-foreground">
                            {log.module}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm text-foreground truncate">
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
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
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
