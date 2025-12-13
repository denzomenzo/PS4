"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Copy, Check } from "lucide-react";

interface DebugInfo {
  status: 'loading' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

export default function DebugDashboard() {
  const [copied, setCopied] = useState(false);
  
  const [authCheck, setAuthCheck] = useState<DebugInfo>({ status: 'loading', message: 'Checking...' });
  const [sessionCheck, setSessionCheck] = useState<DebugInfo>({ status: 'loading', message: 'Checking...' });
  const [customersCheck, setCustomersCheck] = useState<DebugInfo>({ status: 'loading', message: 'Checking...' });
  const [staffCheck, setStaffCheck] = useState<DebugInfo>({ status: 'loading', message: 'Checking...' });
  const [servicesCheck, setServicesCheck] = useState<DebugInfo>({ status: 'loading', message: 'Checking...' });
  const [appointmentsCheck, setAppointmentsCheck] = useState<DebugInfo>({ status: 'loading', message: 'Checking...' });
  const [rlsCheck, setRlsCheck] = useState<DebugInfo>({ status: 'loading', message: 'Checking...' });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    runAllChecks();
  }, []);

  const copyUserId = () => {
    if (currentUserId) {
      navigator.clipboard.writeText(currentUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const runAllChecks = async () => {
    console.log("🔍 ===== STARTING COMPREHENSIVE DEBUG =====");
    
    // Reset all checks
    setAuthCheck({ status: 'loading', message: 'Checking...' });
    setSessionCheck({ status: 'loading', message: 'Checking...' });
    setCustomersCheck({ status: 'loading', message: 'Checking...' });
    setStaffCheck({ status: 'loading', message: 'Checking...' });
    setServicesCheck({ status: 'loading', message: 'Checking...' });
    setAppointmentsCheck({ status: 'loading', message: 'Checking...' });
    setRlsCheck({ status: 'loading', message: 'Checking...' });

    // 1. Check Session First
    console.log("\n1️⃣ CHECKING SESSION...");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("❌ Session error:", sessionError);
        setSessionCheck({ 
          status: 'error', 
          message: `Session Error: ${sessionError.message}`,
          data: sessionError 
        });
      } else if (!session) {
        console.error("❌ No active session");
        setSessionCheck({ 
          status: 'error', 
          message: '🔒 No active session - You need to log in!',
        });
        setAuthCheck({ 
          status: 'error', 
          message: 'Cannot check - no session',
        });
        return;
      } else {
        console.log("✅ Session exists:", session.user.id);
        setSessionCheck({ 
          status: 'success', 
          message: `Active session found`,
          data: { 
            userId: session.user.id,
            email: session.user.email,
            expiresAt: new Date(session.expires_at || 0).toLocaleString()
          }
        });
      }
    } catch (err) {
      console.error("❌ Session check failed:", err);
      setSessionCheck({ 
        status: 'error', 
        message: `Exception: ${err}`,
      });
      return;
    }

    // 2. Check Authentication
    console.log("\n2️⃣ CHECKING AUTHENTICATION...");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("❌ Auth error:", authError);
        setAuthCheck({ 
          status: 'error', 
          message: `Auth Error: ${authError.message}`,
          data: authError 
        });
        return;
      }

      if (!user) {
        console.error("❌ No user found - THIS IS THE PROBLEM!");
        setAuthCheck({ 
          status: 'error', 
          message: '🔒 Not authenticated - Please log in!',
        });
        return;
      }

      console.log("✅ User authenticated!");
      console.log("   User ID:", user.id);
      console.log("   Email:", user.email);
      console.log("   Created:", user.created_at);
      
      setCurrentUserId(user.id);
      setAuthCheck({ 
        status: 'success', 
        message: `Authenticated as ${user.email}`,
        data: { 
          userId: user.id, 
          email: user.email,
          createdAt: user.created_at,
          lastSignIn: user.last_sign_in_at
        }
      });

      const userId = user.id;

      // 3. Check Customers with detailed logging
      console.log("\n3️⃣ CHECKING CUSTOMERS...");
      console.log("   Query: SELECT * FROM customers WHERE user_id =", userId);
      try {
        const { data, error, count } = await supabase
          .from("customers")
          .select("*", { count: 'exact' })
          .eq("user_id", userId);

        console.log("   Response:", { data, error, count });

        if (error) {
          console.error("❌ Customers error:", error);
          console.error("   Error details:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          
          if (error.code === '42501') {
            setCustomersCheck({ 
              status: 'error', 
              message: '🔒 Permission denied - RLS policies not set up!',
              data: { 
                error,
                solution: "Run the RLS SQL script in Supabase SQL Editor"
              }
            });
          } else {
            setCustomersCheck({ 
              status: 'error', 
              message: `Error: ${error.message}`,
              data: error 
            });
          }
        } else {
          console.log(`✅ Found ${data?.length || 0} customers`);
          if (data && data.length > 0) {
            console.log("   Sample customer:", data[0]);
          }
          setCustomersCheck({ 
            status: 'success', 
            message: `Found ${data?.length || 0} customers`,
            data: data
          });
        }
      } catch (err: any) {
        console.error("❌ Customers exception:", err);
        setCustomersCheck({ 
          status: 'error', 
          message: `Exception: ${err.message || err}`,
          data: err 
        });
      }

      // 4. Check Staff
      console.log("\n4️⃣ CHECKING STAFF...");
      try {
        const { data, error } = await supabase
          .from("staff")
          .select("*", { count: 'exact' })
          .eq("user_id", userId);

        if (error) {
          console.error("❌ Staff error:", error);
          setStaffCheck({ 
            status: 'error', 
            message: error.code === '42501' ? '🔒 Permission denied' : `Error: ${error.message}`,
            data: error 
          });
        } else {
          console.log(`✅ Found ${data?.length || 0} staff members`);
          setStaffCheck({ 
            status: 'success', 
            message: `Found ${data?.length || 0} staff members`,
            data: data 
          });
        }
      } catch (err: any) {
        console.error("❌ Staff exception:", err);
        setStaffCheck({ 
          status: 'error', 
          message: `Exception: ${err.message || err}`,
        });
      }

      // 5. Check Services
      console.log("\n5️⃣ CHECKING SERVICES...");
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*", { count: 'exact' })
          .eq("user_id", userId)
          .eq("is_service", true);

        if (error) {
          console.error("❌ Services error:", error);
          setServicesCheck({ 
            status: 'error', 
            message: error.code === '42501' ? '🔒 Permission denied' : `Error: ${error.message}`,
            data: error 
          });
        } else {
          console.log(`✅ Found ${data?.length || 0} services`);
          setServicesCheck({ 
            status: 'success', 
            message: `Found ${data?.length || 0} services`,
            data: data 
          });
        }
      } catch (err: any) {
        console.error("❌ Services exception:", err);
        setServicesCheck({ 
          status: 'error', 
          message: `Exception: ${err.message || err}`,
        });
      }

      // 6. Check Appointments
      console.log("\n6️⃣ CHECKING APPOINTMENTS...");
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            customers (name, phone),
            staff (name),
            products (name, price, icon)
          `, { count: 'exact' })
          .eq("user_id", userId);

        if (error) {
          console.error("❌ Appointments error:", error);
          setAppointmentsCheck({ 
            status: 'error', 
            message: error.code === '42501' ? '🔒 Permission denied' : `Error: ${error.message}`,
            data: error 
          });
        } else {
          console.log(`✅ Found ${data?.length || 0} appointments`);
          setAppointmentsCheck({ 
            status: 'success', 
            message: `Found ${data?.length || 0} appointments`,
            data: data 
          });
        }
      } catch (err: any) {
        console.error("❌ Appointments exception:", err);
        setAppointmentsCheck({ 
          status: 'error', 
          message: `Exception: ${err.message || err}`,
        });
      }

      // 7. Check RLS is working
      console.log("\n7️⃣ CHECKING RLS ENFORCEMENT...");
      try {
        // Try to query without filter - should only see our data
        const { data: allCustomers, error: rlsError } = await supabase
          .from("customers")
          .select("user_id");

        if (rlsError) {
          if (rlsError.code === '42501') {
            console.log("✅ RLS is enforcing (permission denied without filter)");
            setRlsCheck({ 
              status: 'success', 
              message: 'RLS policies are enforced',
              data: { enforced: true }
            });
          } else {
            console.error("❌ RLS error:", rlsError);
            setRlsCheck({ 
              status: 'error', 
              message: `RLS Error: ${rlsError.message}`,
              data: rlsError 
            });
          }
        } else if (allCustomers) {
          const uniqueUserIds = new Set(allCustomers.map(c => c.user_id));
          const isOnlyOurData = uniqueUserIds.size === 1 && uniqueUserIds.has(userId);
          
          console.log(`   Found ${allCustomers.length} customer records`);
          console.log(`   Unique user_ids:`, Array.from(uniqueUserIds));
          
          if (isOnlyOurData) {
            console.log("✅ RLS working - only seeing your data");
            setRlsCheck({ 
              status: 'success', 
              message: `RLS working (${allCustomers.length} records visible)`,
              data: { 
                total: allCustomers.length,
                userIds: Array.from(uniqueUserIds)
              }
            });
          } else {
            console.warn("⚠️ RLS may not be working - seeing multiple user_ids!");
            setRlsCheck({ 
              status: 'warning', 
              message: `⚠️ Seeing data from ${uniqueUserIds.size} different users!`,
              data: { 
                total: allCustomers.length,
                userIds: Array.from(uniqueUserIds)
              }
            });
          }
        }
      } catch (err: any) {
        console.error("❌ RLS check exception:", err);
        setRlsCheck({ 
          status: 'error', 
          message: `Exception: ${err.message || err}`,
        });
      }

      console.log("\n✅ ===== DEBUG COMPLETE =====\n");

    } catch (error: any) {
      console.error("❌ CRITICAL ERROR:", error);
      setAuthCheck({ 
        status: 'error', 
        message: `Critical error: ${error.message || error}`,
      });
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'loading') return <Loader2 className="w-5 h-5 animate-spin text-blue-400" />;
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status === 'warning') return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const CheckCard = ({ title, info }: { title: string; info: DebugInfo }) => (
    <div className={`bg-slate-800/50 backdrop-blur-lg border rounded-2xl p-6 ${
      info.status === 'error' ? 'border-red-500/50' : 
      info.status === 'warning' ? 'border-yellow-500/50' :
      info.status === 'success' ? 'border-green-500/50' : 
      'border-slate-700/50'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <StatusIcon status={info.status} />
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1">{title}</h3>
          <p className={`text-sm ${
            info.status === 'error' ? 'text-red-400' : 
            info.status === 'warning' ? 'text-yellow-400' :
            info.status === 'success' ? 'text-green-400' : 
            'text-slate-400'
          }`}>
            {info.message}
          </p>
        </div>
      </div>
      
      {info.data && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-cyan-400 hover:text-cyan-300">
            View Details
          </summary>
          <pre className="mt-2 p-3 bg-slate-900/50 rounded-lg text-xs overflow-x-auto">
            {JSON.stringify(info.data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );

  const allChecks = [sessionCheck, authCheck, customersCheck, staffCheck, servicesCheck, appointmentsCheck, rlsCheck];
  const passedCount = allChecks.filter(c => c.status === 'success').length;
  const failedCount = allChecks.filter(c => c.status === 'error').length;
  const warningCount = allChecks.filter(c => c.status === 'warning').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400 mb-2">
              🔍 SaaS Debug Dashboard
            </h1>
            <p className="text-slate-400">Multi-tenant system diagnostics</p>
          </div>
          <button
            onClick={runAllChecks}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 rounded-xl font-bold flex items-center gap-2 shadow-xl"
          >
            <RefreshCw className="w-5 h-5" />
            Re-run Checks
          </button>
        </div>

        {/* User ID Display */}
        {currentUserId && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-cyan-400 mb-1">Your User ID</h3>
                <code className="text-sm text-slate-300 font-mono">{currentUserId}</code>
              </div>
              <button
                onClick={copyUserId}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg flex items-center gap-2 transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Alert Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-blue-400 mb-2">Quick Troubleshooting</h3>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>🔴 <strong>If Session/Auth fails:</strong> You're not logged in - go to your login page</li>
                <li>🔴 <strong>If "Permission denied" (42501):</strong> Run the RLS SQL script in Supabase</li>
                <li>🟡 <strong>If data shows 0 records:</strong> Your database is empty (not an error)</li>
                <li>🟢 <strong>All checks pass:</strong> Everything is working correctly!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Checks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <CheckCard title="1. Session Status" info={sessionCheck} />
          <CheckCard title="2. Authentication" info={authCheck} />
          <CheckCard title="3. Customers Table" info={customersCheck} />
          <CheckCard title="4. Staff Table" info={staffCheck} />
          <CheckCard title="5. Services Table" info={servicesCheck} />
          <CheckCard title="6. Appointments Table" info={appointmentsCheck} />
          <CheckCard title="7. RLS Security" info={rlsCheck} />
        </div>

        {/* Summary */}
        <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50">
          <h2 className="text-2xl font-bold mb-6">📊 Summary</h2>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-green-400 mb-2">{passedCount}</div>
              <div className="text-sm text-slate-400">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-red-400 mb-2">{failedCount}</div>
              <div className="text-sm text-slate-400">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-yellow-400 mb-2">{warningCount}</div>
              <div className="text-sm text-slate-400">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-slate-400 mb-2">{allChecks.length}</div>
              <div className="text-sm text-slate-400">Total</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}