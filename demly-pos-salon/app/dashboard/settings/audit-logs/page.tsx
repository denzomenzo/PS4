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
    if (action.includes("LOGIN")) return "text-green-400 bg-green-500/20 border-green-500/30";
    if (action.includes("LOGOUT")) return "text-blue-400 bg-blue-500/20 border-blue-500/30";
    if (action.includes("DELETE")) return "text-red-400 bg-red-500/20 border-red-500/30";
    if (action.includes("CREATED")) return "text-emerald-400 bg-emerald-500/20 border-emerald-500/30";
    if (action.includes("UPDATED")) return "text-orange-400 bg-orange-500/20 border-orange-500/30";
    if (action.includes("ACCESS")) return "text-purple-400 bg-purple-500/20 border-purple-500/30";
    return "text-slate-400 bg-slate-500/20 border-slate-500/30";
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  // Check permissions
  if (!currentStaff || (currentStaff.role !== "owner" && currentStaff.role !== "manager")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-8">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-12 max-w-md border border-red-500/30">
          <div className="text-center">
            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
            <h1 className="text-3xl font-black text-white mb-4">Access Denied</h1>
            <p className="text-slate-400 mb-6">
              Only managers and owners can view audit logs.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-block bg-slate-700 hover:bg-slate-600 px-8 py-4 rounded-xl font-bold transition-all"
            >
              Back to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center gap-4">
              <FileText className="w-14 h-14 text-cyan-400" />
              Audit Logs
            </h1>
            <p className="text-slate-400 text-lg mt-2">
              Complete activity history for security and compliance
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
            Back to Settings
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <p className="text-slate-400 mb-2">Total Events</p>
            <p className="text-5xl font-black text-cyan-400">{logs.length}</p>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <p className="text-slate-400 mb-2">Today</p>
            <p className="text-5xl font-black text-emerald-400">
              {logs.filter(l => {
                const logDate = new Date(l.created_at);
                const today = new Date();
                return logDate.toDateString() === today.toDateString();
              }).length}
            </p>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <p className="text-slate-400 mb-2">Action Types</p>
            <p className="text-5xl font-black text-purple-400">{actionTypes.length}</p>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <p className="text-slate-400 mb-2">Staff Active</p>
            <p className="text-5xl font-black text-orange-400">{staffMembers.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-black">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full bg-slate-900/50 border border-slate-700/50 pl-12 pr-4 py-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-slate-900/50 border border-slate-700/50 px-4 py-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
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
              className="bg-slate-900/50 border border-slate-700/50 px-4 py-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Actions</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>

            {/* Staff Filter */}
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="bg-slate-900/50 border border-slate-700/50 px-4 py-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Staff</option>
              {staffMembers.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-slate-400">
              Showing <span className="font-bold text-white">{filteredLogs.length}</span> of{" "}
              <span className="font-bold text-white">{logs.length}</span> events
            </p>
            <button
              onClick={exportToCSV}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
          <div className="overflow-x-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-20">
                <Activity className="w-24 h-24 mx-auto mb-6 text-slate-700 opacity-30" />
                <p className="text-2xl text-slate-500 font-semibold">No logs found</p>
                <p className="text-slate-600 mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Timestamp</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Staff</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Action</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Details</th>
                    <th className="text-center py-4 px-4 font-bold text-slate-300">View</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-all"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="text-sm">
                            {new Date(log.created_at).toLocaleString('en-GB', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">{log.staff?.name || "System"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 w-fit ${getActionColor(log.action)}`}>
                          <span>{getActionIcon(log.action)}</span>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-400">
                        {log.entity_type && (
                          <span>
                            {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailModal(true);
                          }}
                          className="p-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-all"
                        >
                          <Eye className="w-5 h-5" />
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

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-3xl w-full border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Log Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-5">
                <p className="text-sm text-slate-400 mb-1">Action</p>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border inline-flex items-center gap-2 ${getActionColor(selectedLog.action)}`}>
                  <span>{getActionIcon(selectedLog.action)}</span>
                  {selectedLog.action.replace(/_/g, " ")}
                </span>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-5">
                <p className="text-sm text-slate-400 mb-1">Timestamp</p>
                <p className="text-lg font-bold">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-5">
                <p className="text-sm text-slate-400 mb-1">Staff Member</p>
                <p className="text-lg font-bold">{selectedLog.staff?.name || "System"}</p>
              </div>

              {selectedLog.entity_type && (
                <div className="bg-slate-800/50 rounded-xl p-5">
                  <p className="text-sm text-slate-400 mb-1">Entity</p>
                  <p className="text-lg font-bold">
                    {selectedLog.entity_type} {selectedLog.entity_id && `#${selectedLog.entity_id}`}
                  </p>
                </div>
              )}

              {selectedLog.ip_address && (
                <div className="bg-slate-800/50 rounded-xl p-5">
                  <p className="text-sm text-slate-400 mb-1">IP Address</p>
                  <p className="text-lg font-mono">{selectedLog.ip_address}</p>
                </div>
              )}

              {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-5">
                  <p className="text-sm text-slate-400 mb-3">Previous Values</p>
                  <pre className="text-sm bg-slate-900/50 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-5">
                  <p className="text-sm text-slate-400 mb-3">New Values</p>
                  <pre className="text-sm bg-slate-900/50 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full mt-6 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl font-bold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}