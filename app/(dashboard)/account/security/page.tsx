"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Filter,
  Calendar,
  User,
  Lock,
  Eye,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
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
  changes: Record<string, any>;
  metadata: Record<string, any>;
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

export default function SecurityPage() {
  const [filters, setFilters] = useState({
    action_type: "",
    severity: "",
    module: "",
    search: "",
    days: "30",
  });

  // Fetch audit stats
  const { data: stats, error: statsError } = useQuery<AuditStats>({
    queryKey: ["audit-stats", filters.days],
    queryFn: () => api.get(`/api/v1/security/audit-logs/stats/?days=${filters.days}`),
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch audit logs with filters
  const { data: logsData, isLoading, error: logsError } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.action_type) params.append("action_type", filters.action_type);
      if (filters.severity) params.append("severity", filters.severity);
      if (filters.module) params.append("module", filters.module);
      if (filters.search) params.append("search", filters.search);

      const response = await api.get<{ results: AuditLog[] }>(`/api/v1/security/audit-logs/?${params.toString()}`);
      console.log('Audit logs response:', response);
      return response;
    },
    retry: 2,
    retryDelay: 1000,
  });

  const logs = logsData?.results || [];
  console.log('Logs data:', logsData);
  console.log('Logs array:', logs);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action_type) params.append("action_type", filters.action_type);
      if (filters.severity) params.append("severity", filters.severity);
      if (filters.module) params.append("module", filters.module);
      
      window.open(`/api/v1/security/audit-logs/export/?${params.toString()}`, '_blank');
      toast.success("Exporting audit logs...");
    } catch (error) {
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-3">
            <div className="p-2 bg-[#638C80]/10 rounded-lg">
              <Shield className="h-7 w-7 text-[#638C80]" />
            </div>
            Security & Audit Trail
          </h1>
          <p className="text-gray-600 mt-2 ml-[52px]">
            Monitor system activity and security events
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="border-[#638C80] text-[#638C80] hover:bg-[#638C80]/10"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 border-gray-100 shadow-sm">
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

        <Card className="p-6 border-gray-100 shadow-sm">
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

        <Card className="p-6 border-gray-100 shadow-sm">
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

        <Card className="p-6 border-gray-100 shadow-sm">
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
      <Card className="p-6 border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-[#638C80]" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
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
      <Card className="border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#638C80]" />
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-[#638C80] border-t-transparent rounded-full" />
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
                  <TableRow key={log.id} className="hover:bg-gray-50">
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
    </div>
  );
}
