// app/dashboard/appointments/page.tsx
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
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  CheckCircle,
  Ban,
  CalendarDays,
  UserCircle,
  Scissors,
  Sparkles,
  TrendingUp,
  Eye,
  EyeOff,
  RefreshCw,
  UserMinus,
  Briefcase,
  Package
} from "lucide-react";

interface Appointment {
  id: number;
  customer_id: number | null;
  staff_id: number | null;
  service_id: number | null;
  appointment_date: string;
  appointment_time: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  user_id: string;
}

interface AppointmentWithRelations extends Appointment {
  customers: { name: string; phone: string | null; email: string | null } | null;
  staff: { name: string } | null;
  products: { name: string; price: number; icon: string } | null;
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
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
  is_service: boolean;
}

export default function Appointments() {
  const userId = useUserId();

  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentWithRelations[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);

  const [formCustomerId, setFormCustomerId] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [formServiceId, setFormServiceId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formNotes, setFormNotes] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    today: 0,
    upcoming: 0
  });

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    if (appointments.length > 0) {
      filterAppointments();
      calculateStats();
    } else {
      setFilteredAppointments([]);
    }
  }, [appointments, searchTerm, statusFilter, dateFilter]);

  const loadData = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    setDataLoaded(false);

    try {
      console.log("Loading data for user:", userId);

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("user_id", userId)
        .order("name");

      if (customersError) {
        console.error("Customers error:", customersError);
        throw customersError;
      }
      setCustomers(customersData || []);
      console.log("Customers loaded:", customersData?.length);

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name")
        .eq("user_id", userId)
        .order("name");

      if (staffError) {
        console.error("Staff error:", staffError);
        throw staffError;
      }
      setStaff(staffData || []);
      console.log("Staff loaded:", staffData?.length);

      // Load services (products that are services) - WITHOUT duration column
      const { data: servicesData, error: servicesError } = await supabase
        .from("products")
        .select("id, name, price, icon, is_service")
        .eq("user_id", userId)
        .eq("is_service", true)
        .order("name");

      if (servicesError) {
        console.error("Services error:", servicesError);
        throw servicesError;
      }
      setServices(servicesData || []);
      console.log("Services loaded:", servicesData?.length);

      // First, get the appointments without joins
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", userId)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (appointmentsError) {
        console.error("Appointments error:", appointmentsError);
        throw appointmentsError;
      }

      console.log("Appointments loaded:", appointmentsData?.length);

      // Now manually join the data
      const appointmentsWithRelations: AppointmentWithRelations[] = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          let customerData = null;
          let staffData = null;
          let serviceData = null;

          // Get customer data if customer_id exists
          if (appointment.customer_id) {
            const { data: customer } = await supabase
              .from("customers")
              .select("name, phone, email")
              .eq("id", appointment.customer_id)
              .maybeSingle();
            customerData = customer;
          }

          // Get staff data if staff_id exists
          if (appointment.staff_id) {
            const { data: staffMember } = await supabase
              .from("staff")
              .select("name")
              .eq("id", appointment.staff_id)
              .maybeSingle();
            staffData = staffMember;
          }

          // Get service data if service_id exists
          if (appointment.service_id) {
            const { data: service } = await supabase
              .from("products")
              .select("name, price, icon")
              .eq("id", appointment.service_id)
              .maybeSingle();
            serviceData = service;
          }

          return {
            ...appointment,
            customers: customerData,
            staff: staffData,
            products: serviceData
          };
        })
      );

      setAppointments(appointmentsWithRelations);
      setDataLoaded(true);

    } catch (error: any) {
      console.error("Error loading appointments data:", error);
      setError(error.message || "Failed to load data. Please try again.");
    }

    setLoading(false);
  };

  const filterAppointments = () => {
    let filtered = [...appointments];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.staff?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      switch (dateFilter) {
        case "today":
          filtered = filtered.filter(apt => apt.appointment_date === today);
          break;
        case "tomorrow":
          filtered = filtered.filter(apt => apt.appointment_date === tomorrowStr);
          break;
        case "this_week":
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          filtered = filtered.filter(apt => {
            const aptDate = new Date(apt.appointment_date);
            return aptDate >= weekStart && aptDate <= weekEnd;
          });
          break;
        case "past":
          filtered = filtered.filter(apt => apt.appointment_date < today);
          break;
        case "future":
          filtered = filtered.filter(apt => apt.appointment_date > today);
          break;
      }
    }

    setFilteredAppointments(filtered);
  };

  const calculateStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const stats = {
      scheduled: appointments.filter(a => a.status === "scheduled").length,
      completed: appointments.filter(a => a.status === "completed").length,
      cancelled: appointments.filter(a => a.status === "cancelled").length,
      no_show: appointments.filter(a => a.status === "no_show").length,
      today: appointments.filter(a => a.appointment_date === today).length,
      upcoming: appointments.filter(a => a.appointment_date > today && a.status === "scheduled").length
    };
    setStats(stats);
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

  const openEditModal = (appointment: AppointmentWithRelations) => {
    setSelectedAppointment(appointment);
    setFormDate(appointment.appointment_date);
    setFormTime(appointment.appointment_time);
    setFormCustomerId(appointment.customer_id?.toString() || "");
    setFormStaffId(appointment.staff_id?.toString() || "");
    setFormServiceId(appointment.service_id?.toString() || "");
    setFormNotes(appointment.notes || "");
    setShowEditModal(true);
  };

  const addAppointment = async () => {
    if (!formDate || !formTime) {
      alert("Date and Time are required");
      return;
    }

    try {
      const appointmentData: any = {
        user_id: userId,
        appointment_date: formDate,
        appointment_time: formTime,
        notes: formNotes.trim() || null,
        status: "scheduled",
      };

      // Only add optional fields if they have values
      if (formCustomerId) {
        appointmentData.customer_id = parseInt(formCustomerId);
      }
      
      if (formStaffId) {
        appointmentData.staff_id = parseInt(formStaffId);
      }
      
      if (formServiceId) {
        appointmentData.service_id = parseInt(formServiceId);
      }

      const { error } = await supabase
        .from("appointments")
        .insert([appointmentData]);

      if (error) {
        console.error("Error creating appointment:", error);
        alert("Error creating appointment: " + error.message);
        return;
      }

      alert("Appointment created successfully!");
      setShowAddModal(false);
      loadData(); // Reload data to show the new appointment
    } catch (error: any) {
      console.error("Error:", error);
      alert("Error creating appointment: " + error.message);
    }
  };

  const updateAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const appointmentData: any = {
        appointment_date: formDate,
        appointment_time: formTime,
        notes: formNotes.trim() || null,
      };

      // Only add optional fields if they have values
      if (formCustomerId) {
        appointmentData.customer_id = parseInt(formCustomerId);
      } else {
        appointmentData.customer_id = null;
      }
      
      if (formStaffId) {
        appointmentData.staff_id = parseInt(formStaffId);
      } else {
        appointmentData.staff_id = null;
      }
      
      if (formServiceId) {
        appointmentData.service_id = parseInt(formServiceId);
      } else {
        appointmentData.service_id = null;
      }

      const { error } = await supabase
        .from("appointments")
        .update(appointmentData)
        .eq("id", selectedAppointment.id);

      if (error) {
        console.error("Error updating appointment:", error);
        alert("Error updating appointment: " + error.message);
        return;
      }

      alert("Appointment updated successfully!");
      setShowEditModal(false);
      loadData(); // Reload data to show the updated appointment
    } catch (error: any) {
      console.error("Error:", error);
      alert("Error updating appointment: " + error.message);
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

      alert("Status updated successfully!");
      loadData(); // Reload data to show the updated status
    } catch (error: any) {
      console.error("Error:", error);
      alert("Error updating status: " + error.message);
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

      alert("Appointment deleted successfully!");
      setShowEditModal(false);
      loadData(); // Reload data to remove the deleted appointment
    } catch (error: any) {
      console.error("Error:", error);
      alert("Error deleting appointment: " + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      case "no_show": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled": return <Clock className="w-4 h-4" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <Ban className="w-4 h-4" />;
      case "no_show": return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getServiceIcon = (icon: string | undefined) => {
    if (!icon) return "💇";
    return icon;
  };

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-8">
        <div className="bg-card/50 backdrop-blur-xl rounded-xl p-8 max-w-md border border-border">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Error Loading Appointments</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground">Manage your appointments and schedules</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <button
            onClick={openAddModal}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today</p>
              <p className="text-2xl font-bold text-foreground">{stats.today}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-bold text-foreground">{stats.upcoming}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold text-foreground">{stats.scheduled}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold text-foreground">{stats.cancelled}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">No Show</p>
              <p className="text-2xl font-bold text-foreground">{stats.no_show}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search appointments by customer, staff, service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <button
              onClick={loadData}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this_week">This Week</option>
                <option value="past">Past Appointments</option>
                <option value="future">Future Appointments</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFilter("all");
                }}
                className="w-full bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Appointments List */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">All Appointments</h2>
            <p className="text-sm text-muted-foreground">
              {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Real-time updates active</span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-3">No appointments found</p>
            {appointments.length > 0 ? (
              <p className="text-sm text-muted-foreground mb-3">Try adjusting your filters</p>
            ) : (
              <button
                onClick={openAddModal}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
              >
                Create Your First Appointment
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-background border border-border rounded-lg p-4 hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)} flex items-center gap-1`}>
                        {getStatusIcon(appointment.status)}
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(appointment.appointment_date)} • {formatTime(appointment.appointment_time)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Customer Info - Now Optional */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <UserCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Customer</p>
                          {appointment.customers ? (
                            <>
                              <p className="font-medium text-foreground">{appointment.customers.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {appointment.customers.phone && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {appointment.customers.phone}
                                  </span>
                                )}
                                {appointment.customers.email && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {appointment.customers.email}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="text-muted-foreground italic text-sm">No customer assigned</p>
                          )}
                        </div>
                      </div>

                      {/* Staff Info - Now Optional */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Staff</p>
                          {appointment.staff ? (
                            <p className="font-medium text-foreground">{appointment.staff.name}</p>
                          ) : (
                            <p className="text-muted-foreground italic text-sm">No staff assigned</p>
                          )}
                        </div>
                      </div>

                      {/* Service Info - Now Optional */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                          <span className="text-lg">{getServiceIcon(appointment.products?.icon)}</span>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Service</p>
                          {appointment.products ? (
                            <>
                              <p className="font-medium text-foreground">{appointment.products.name}</p>
                              {appointment.products.price && (
                                <p className="text-emerald-500 font-bold">£{appointment.products.price.toFixed(2)}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-muted-foreground italic text-sm">No service selected</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {appointment.notes && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-foreground">{appointment.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => openEditModal(appointment)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteAppointment(appointment.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">New Appointment</h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Time *</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Customer (Optional)</label>
                <select
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No customer selected</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone && `(${customer.phone})`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Optional - can be assigned later</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Staff (Optional)</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No staff assigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Optional - can be assigned later</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Service (Optional)</label>
                <select
                  value={formServiceId}
                  onChange={(e) => setFormServiceId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No service selected</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {getServiceIcon(service.icon)} {service.name} - £{service.price}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Optional - can be added later</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes (Optional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Any special requests or notes..."
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={addAppointment}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Create Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Edit Appointment</h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Time *</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Customer (Optional)</label>
                <select
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No customer selected</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone && `(${customer.phone})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Staff (Optional)</label>
                <select
                  value={formStaffId}
                  onChange={(e) => setFormStaffId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No staff assigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Service (Optional)</label>
                <select
                  value={formServiceId}
                  onChange={(e) => setFormServiceId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No service selected</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {getServiceIcon(service.icon)} {service.name} - £{service.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes (Optional)</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Status Buttons */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { status: "scheduled", label: "Scheduled", icon: <Clock className="w-4 h-4" /> },
                    { status: "completed", label: "Completed", icon: <CheckCircle className="w-4 h-4" /> },
                    { status: "cancelled", label: "Cancelled", icon: <Ban className="w-4 h-4" /> },
                    { status: "no_show", label: "No Show", icon: <AlertCircle className="w-4 h-4" /> },
                  ].map((item) => (
                    <button
                      key={item.status}
                      type="button"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, item.status)}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-all ${
                        selectedAppointment.status === item.status
                          ? getStatusColor(item.status)
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => deleteAppointment(selectedAppointment.id)}
                className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
              <button
                onClick={updateAppointment}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
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
