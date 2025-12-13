"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Clock,
  User,
  X,
  Check,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
} from "lucide-react";

interface Appointment {
  id: number;
  customer_id: number;
  staff_id: number;
  service_id: number;
  appointment_date: string;
  appointment_time: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  customers: { name: string; phone: string | null } | null;
  staff: { name: string } | null;
  products: { name: string; price: number; icon: string } | null;
}

interface Customer {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
}

interface Service {
  id: number;
  name: string;
  price: number;
  icon: string;
}

export default function Appointments() {
  const userId = useUserId();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [formCustomerId, setFormCustomerId] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [formServiceId, setFormServiceId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // First, get the current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user?.id);

      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const currentUserId = user.id;

      // Load all data with better error handling
      const [customersRes, staffRes, servicesRes, appointmentsRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name")
          .eq("user_id", currentUserId)
          .order("name"),
        supabase
          .from("staff")
          .select("id, name")
          .eq("user_id", currentUserId)
          .order("name"),
        supabase
          .from("products")
          .select("id, name, price, icon")
          .eq("user_id", currentUserId)
          .eq("is_service", true)
          .order("name"),
        supabase
          .from("appointments")
          .select("*")
          .eq("user_id", currentUserId)
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false })
      ]);

      // Log any errors
      if (customersRes.error) console.error("Customers error:", customersRes.error);
      if (staffRes.error) console.error("Staff error:", staffRes.error);
      if (servicesRes.error) console.error("Services error:", servicesRes.error);
      if (appointmentsRes.error) console.error("Appointments error:", appointmentsRes.error);

      // Set data
      if (customersRes.data) {
        console.log("Customers loaded:", customersRes.data.length);
        setCustomers(customersRes.data);
      }
      if (staffRes.data) {
        console.log("Staff loaded:", staffRes.data.length);
        setStaff(staffRes.data);
      }
      if (servicesRes.data) {
        console.log("Services loaded:", servicesRes.data.length);
        setServices(servicesRes.data);
      }
      if (appointmentsRes.data) {
        console.log("Appointments loaded:", appointmentsRes.data.length);
        
        // Manually fetch related data for each appointment
        const enrichedAppointments = await Promise.all(
          appointmentsRes.data.map(async (apt) => {
            const [customerRes, staffRes, serviceRes] = await Promise.all([
              apt.customer_id ? supabase.from("customers").select("name, phone").eq("id", apt.customer_id).single() : null,
              apt.staff_id ? supabase.from("staff").select("name").eq("id", apt.staff_id).single() : null,
              apt.service_id ? supabase.from("products").select("name, price, icon").eq("id", apt.service_id).single() : null,
            ]);

            return {
              ...apt,
              customers: customerRes?.data || null,
              staff: staffRes?.data || null,
              products: serviceRes?.data || null,
            };
          })
        );

        console.log("Enriched appointments:", enrichedAppointments);
        setAppointments(enrichedAppointments as any);
      }

    } catch (error) {
      console.error("Error loading appointments data:", error);
      setError("Failed to load data");
    }

    setLoading(false);
  };

  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);
    setFormTime("09:00");
    setFormCustomerId("");
    setFormStaffId("");
    setFormServiceId("");
    setFormNotes("");
    setShowAddModal(true);
  };

  const openEditModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFormDate(appointment.appointment_date);
    setFormTime(appointment.appointment_time);
    setFormCustomerId(appointment.customer_id.toString());
    setFormStaffId(appointment.staff_id.toString());
    setFormServiceId(appointment.service_id.toString());
    setFormNotes(appointment.notes || "");
    setShowEditModal(true);
  };

  const addAppointment = async () => {
    if (!formCustomerId || !formStaffId || !formServiceId || !formDate || !formTime) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Not authenticated");
        return;
      }

      const appointmentData = {
        user_id: user.id,
        customer_id: parseInt(formCustomerId),
        staff_id: parseInt(formStaffId),
        service_id: parseInt(formServiceId),
        appointment_date: formDate,
        appointment_time: formTime,
        notes: formNotes.trim() || null,
        status: "scheduled",
      };

      console.log("Creating appointment with data:", appointmentData);
      console.log("Service ID type:", typeof appointmentData.service_id, "Value:", appointmentData.service_id);

      const { data, error } = await supabase
        .from("appointments")
        .insert(appointmentData)
        .select();

      if (error) {
        console.error("Error creating appointment:", error);
        alert("Error creating appointment: " + error.message);
        return;
      }

      console.log("Appointment created successfully:", data);
      alert("✅ Appointment created successfully!");
      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("Error creating appointment");
    }
  };

  const updateAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          customer_id: parseInt(formCustomerId),
          staff_id: parseInt(formStaffId),
          service_id: parseInt(formServiceId),
          appointment_date: formDate,
          appointment_time: formTime,
          notes: formNotes.trim() || null,
        })
        .eq("id", selectedAppointment.id);

      if (error) {
        console.error("Error updating appointment:", error);
        alert("Error updating appointment: " + error.message);
        return;
      }

      alert("✅ Appointment updated successfully!");
      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("Error updating appointment");
    }
  };

  const updateAppointmentStatus = async (id: number, status: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);

      if (error) {
        console.error("Error updating status:", error);
        alert("Error updating status: " + error.message);
        return;
      }

      loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("Error updating status");
    }
  };

  const deleteAppointment = async (id: number) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return;

    try {
      const { error } = await supabase.from("appointments").delete().eq("id", id);

      if (error) {
        console.error("Error deleting appointment:", error);
        alert("Error deleting appointment: " + error.message);
        return;
      }

      alert("✅ Appointment deleted successfully!");
      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting appointment");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "cancelled": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "no_show": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled": return <Clock className="w-4 h-4" />;
      case "completed": return <Check className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      case "no_show": return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-xl text-red-400 mb-4">{error}</p>
          <button onClick={loadData} className="px-6 py-3 bg-cyan-500 rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
            Appointments
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={openAddModal}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-cyan-500/20"
            >
              <Plus className="w-5 h-5" />
              New Appointment
            </button>
            <Link href="/" className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
              Back to POS
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { status: "scheduled", label: "Scheduled", color: "blue" },
            { status: "completed", label: "Completed", color: "green" },
            { status: "cancelled", label: "Cancelled", color: "red" },
            { status: "no_show", label: "No Show", color: "orange" },
          ].map((item) => {
            const count = appointments.filter((a) => a.status === item.status).length;
            return (
              <div key={item.status} className={`bg-${item.color}-500/20 backdrop-blur-lg border border-${item.color}-500/30 rounded-2xl p-6 shadow-lg`}>
                <p className={`text-${item.color}-400 font-bold mb-2`}>{item.label}</p>
                <p className="text-4xl font-black">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Appointments List */}
        <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6">
            {appointments.length} Total Appointments
          </h2>

          {appointments.length === 0 ? (
            <div className="text-center py-20">
              <CalendarIcon className="w-24 h-24 mx-auto mb-6 text-slate-600 opacity-30" />
              <p className="text-2xl text-slate-400 mb-6">No appointments yet</p>
              <button
                onClick={openAddModal}
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl"
              >
                Create Your First Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/50 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(appointment.status)} flex items-center gap-1`}>
                          {getStatusIcon(appointment.status)}
                          {appointment.status.toUpperCase()}
                        </span>
                        <span className="text-sm text-slate-400">
                          {new Date(appointment.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          {' at '}
                          {appointment.appointment_time}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Customer</p>
                          <p className="font-bold">{appointment.customers?.name || 'N/A'}</p>
                          {appointment.customers?.phone && (
                            <p className="text-sm text-slate-400">{appointment.customers.phone}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Staff</p>
                          <p className="font-bold">{appointment.staff?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Service</p>
                          <p className="font-bold">
                            {appointment.products?.icon} {appointment.products?.name || 'N/A'}
                          </p>
                          {appointment.products?.price && (
                            <p className="text-emerald-400 font-bold">£{appointment.products.price.toFixed(2)}</p>
                          )}
                        </div>
                      </div>

                      {appointment.notes && (
                        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                          <p className="text-sm text-slate-300">{appointment.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                      <button
                        onClick={() => openEditModal(appointment)}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteAppointment(appointment.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">New Appointment</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-lg mb-2">Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                  />
                </div>
                <div>
                  <label className="block text-lg mb-2">Time *</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-lg mb-2">Customer *</label>
                <select
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg mb-2">Staff *</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                >
                  <option value="">Select staff</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg mb-2">Service *</label>
                <select
                  value={formServiceId}
                  onChange={(e) => setFormServiceId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                >
                  <option value="">Select service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.icon} {service.name} - £{service.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg mb-2">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Any special requests..."
                  rows={3}
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={addAppointment}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 py-4 rounded-xl text-lg font-bold shadow-xl"
              >
                Create Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Edit Appointment</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-lg mb-2">Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                  />
                </div>
                <div>
                  <label className="block text-lg mb-2">Time *</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-lg mb-2">Customer *</label>
                <select
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg mb-2">Staff *</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                >
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg mb-2">Service *</label>
                <select
                  value={formServiceId}
                  onChange={(e) => setFormServiceId(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.icon} {service.name} - £{service.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg mb-2">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-lg"
                />
              </div>
            </div>

            {/* Status Buttons */}
            <div className="mb-6">
              <label className="block text-lg mb-3">Status</label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { status: "scheduled", label: "Scheduled" },
                  { status: "completed", label: "Completed" },
                  { status: "cancelled", label: "Cancelled" },
                  { status: "no_show", label: "No Show" },
                ].map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => updateAppointmentStatus(selectedAppointment.id, item.status)}
                    className={`py-3 rounded-xl text-sm font-bold border ${
                      selectedAppointment.status === item.status
                        ? getStatusColor(item.status)
                        : "bg-slate-800/50 border-slate-700/50 text-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => deleteAppointment(selectedAppointment.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 py-4 rounded-xl text-lg font-bold"
              >
                Delete
              </button>
              <button
                onClick={updateAppointment}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 py-4 rounded-xl text-lg font-bold shadow-xl"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
