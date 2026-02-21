// app/dashboard/settings/audit-logs/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import {
  ArrowLeft,
  FileText,
  Filter,
  Download,
  Search,
  Calendar,
  User,
  Activity,
  Loader2,
  AlertCircle,
  Eye,
  X,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

interface AuditLog {
  id: number;
  user_id: string;
  staff_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  staff?: { name: string } | null;
}

export default function AuditLogs() {
  const userId = useUserId();
  const { staff: currentStaff, hasPermission } = useStaffAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const [staffMembers, setStaffMembers] = useState<{ id: number; name: string }[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, dateRange]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, selectedAction, selectedStaff]);

  const loadData = async () => {
    setLoading(true);

    try {
      // Calculate date filter
      let dateFilter = null;
      if (dateRange !== "all") {
        dateFilter = new Date();
        if (dateRange === "24h") dateFilter.setHours(dateFilter.getHours() - 24);
        if (dateRange === "7d") dateFilter.setDate(dateFilter.getDate() - 7);
        if (dateRange === "30d") dateFilter.setDate(dateFilter.getDate() - 30);
      }

      // Load audit logs with staff info
      const query = supabase
        .from("audit_logs")
        .select(`
          *,
          staff:staff_id (name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (dateFilter) {
        query.gte("created_at", dateFilter.toISOString());
      }

      const { data: logsData, error } = await query;

      if (error) {
        console.error("Error loading logs:", error);
        return;
      }

      setLogs(logsData as any || []);

      // Extract unique actions and staff
      const actions = [...new Set((logsData || []).map(l => l.action))].sort();
      setActionTypes(actions);

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name")
        .eq("user_id", userId);
      
      if (staffData) setStaffMembers(staffData);

    } catch (error) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(query) ||
        log.entity_type?.toLowerCase().includes(query) ||
        log.entity_id?.toLowerCase().includes(query) ||
        log.staff?.name?.toLowerCase().includes(query)
      );
    }

    // Action filter
    if (selectedAction !== "all") {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // Staff filter
    if (selectedStaff !== "all") {
      filtered = filtered.filter(log => log.staff_id?.toString() === selectedStaff);
    }

    setFilteredLogs(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      "Timestamp",
      "Staff",
      "Action",
      "Entity Type",
      "Entity ID",
      "IP Address",
    ];

    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.staff?.name || "System",
      log.action,
      log.entity_type || "",
      log.entity_id || "",
      log.ip_address || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    if (action.includes("LOGIN")) return "text-green-600 bg-green-500/10 border-green-500/30";
    if (action.includes("LOGOUT")) return "text-blue-600 bg-blue-500/10 border-blue-500/30";
    if (action.includes("DELETE")) return "text-red-600 bg-red-500/10 border-red-500/30";
    if (action.includes("CREATED")) return "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";
    if (action.includes("UPDATED")) return "text-orange-600 bg-orange-500/10 border-orange-500/30";
    if (action.includes("ACCESS")) return "text-purple-600 bg-purple-500/10 border-purple-500/30";
    return "text-slate-600 bg-slate-500/10 border-slate-500/30";
  };

  const getActionIcon = (action: string) => {
    if (action.includes("LOGIN")) return "🔓";
    if (action.includes("LOGOUT")) return "🔒";
    if (action.includes("DELETE")) return "🗑️";
    if (action.includes("CREATED")) return "➕";
    if (action.includes("UPDATED")) return "✏️";
    if (action.includes("ACCESS")) return "🔐";
    return "📝";
  };

  if (!userId || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  // Check permissions
  if (!currentStaff || (currentStaff.role !== "owner" && currentStaff.role !== "manager")) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-8">
        <div className="bg-card/50 backdrop-blur-xl rounded-xl p-8 max-w-md border border-border">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              Only managers and owners can view audit logs.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Back to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
                <p className="text-sm text-muted-foreground">Complete activity history for security and compliance</p>
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Events</p>
              <p className="text-2xl font-bold text-foreground">{logs.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Today</p>
              <p className="text-2xl font-bold text-emerald-600">
                {logs.filter(l => {
                  const logDate = new Date(l.created_at);
                  const today = new Date();
                  return logDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Action Types</p>
              <p className="text-2xl font-bold text-purple-600">{actionTypes.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Staff Active</p>
              <p className="text-2xl font-bold text-orange-600">{staffMembers.length}</p>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Filters</h2>
              </div>
              {filtersExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            {filtersExpanded && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search logs..."
                      className="w-full bg-background border border-border pl-9 pr-3 py-2 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Date Range */}
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>

                  {/* Action Filter */}
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Actions</option>
                    {actionTypes.map(action => (
                      <option key={action} value={action}>{action.replace(/_/g, " ")}</option>
                    ))}
                  </select>

                  {/* Staff Filter */}
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="bg-background border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Staff</option>
                    {staffMembers.map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{filteredLogs.length}</span> of{" "}
                    <span className="font-medium text-foreground">{logs.length}</span> events
                  </p>
                  <button
                    onClick={exportToCSV}
                    className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Export CSV
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logs Table */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="overflow-x-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-base font-medium text-foreground">No logs found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Timestamp</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Staff</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Action</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Details</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span>
                              {new Date(log.created_at).toLocaleString('en-GB', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{log.staff?.name || "System"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${getActionColor(log.action)}`}>
                            <span>{getActionIcon(log.action)}</span>
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {log.entity_type && (
                            <span>
                              {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Log Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Action</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-2 ${getActionColor(selectedLog.action)}`}>
                  <span>{getActionIcon(selectedLog.action)}</span>
                  {selectedLog.action.replace(/_/g, " ")}
                </span>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Staff Member</p>
                <p className="text-sm font-medium text-foreground">{selectedLog.staff?.name || "System"}</p>
              </div>

              {selectedLog.entity_type && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Entity</p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedLog.entity_type} {selectedLog.entity_id && `#${selectedLog.entity_id}`}
                  </p>
                </div>
              )}

              {selectedLog.ip_address && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">IP Address</p>
                  <p className="text-sm font-mono text-foreground">{selectedLog.ip_address}</p>
                </div>
              )}

              {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-2">Previous Values</p>
                  <pre className="text-xs bg-background p-3 rounded-lg overflow-x-auto text-foreground">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-2">New Values</p>
                  <pre className="text-xs bg-background p-3 rounded-lg overflow-x-auto text-foreground">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full mt-6 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
