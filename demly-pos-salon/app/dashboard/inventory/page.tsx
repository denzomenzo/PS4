// app/dashboard/inventory/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  ArrowLeft,
  Package,
  Search,
  Upload,
  Download,
  TrendingUp,
  TrendingDown,
  Tag,
  Filter,
  Grid,
  List,
  DollarSign,
  BarChart3,
  Check,
  AlertCircle,
  Hash,
  Box,
  Coffee,
  Image as ImageIcon,
  MoreVertical,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Zap,
  ChevronDown,
  ChevronUp,
  Infinity,
  ToggleLeft,
  ToggleRight,
  Power,
  PowerOff,
  Smile
} from "lucide-react";
import EmojiPicker from 'emoji-picker-react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  price: number;
  cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  is_service: boolean;
  icon: string;
  supplier: string | null;
  image_url: string | null;
  service_type: string | null;
  has_infinite_stock?: boolean;
}

interface ServiceType {
  id: number;
  name: string;
  icon: string;
  color: string;
  default_price: number;
  is_active: boolean;
  user_id: string;
  usage_count?: number;
}

export default function Inventory() {
  const userId = useUserId();
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  
  // Dropdown state
  const [showNewItemDropdown, setShowNewItemDropdown] = useState(false);
  const newItemDropdownRef = useRef<HTMLDivElement>(null);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  
  // Stock adjustment
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [infiniteStock, setInfiniteStock] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSKU, setFormSKU] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formThreshold, setFormThreshold] = useState("10");
  const [formTrackInventory, setFormTrackInventory] = useState(true);
  const [formInfiniteStock, setFormInfiniteStock] = useState(false);
  const [formIcon, setFormIcon] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");

  // Service form states
  const [serviceName, setServiceName] = useState("");
  const [serviceIcon, setServiceIcon] = useState("");
  const [serviceColor, setServiceColor] = useState("#3B82F6");
  const [servicePrice, setServicePrice] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalServices: 0,
    lowStock: 0,
    outOfStock: 0,
    infiniteStock: 0,
    totalValue: 0,
    categories: 0
  });

  // Default service types
  const defaultServices = [
    { name: "Eat In", icon: "🏠", color: "#10B981", price: 0 },
    { name: "Takeaway", icon: "📦", color: "#F59E0B", price: 0 },
    { name: "Delivery", icon: "🚚", color: "#8B5CF6", price: 2.99 },
    { name: "Dine In", icon: "🍽️", color: "#EF4444", price: 0 },
    { name: "Collection", icon: "📥", color: "#06B6D4", price: 0 },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newItemDropdownRef.current && !newItemDropdownRef.current.contains(event.target as Node)) {
        setShowNewItemDropdown(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  useEffect(() => {
    calculateStats();
  }, [products]);

  const loadData = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("name");
      
      if (productsError) throw productsError;
      
      // Add infinite stock flag to products
      const productsWithInfinite = (productsData || []).map(p => ({
        ...p,
        has_infinite_stock: p.has_infinite_stock || p.stock_quantity === -1 || false
      }));
      
      setProducts(productsWithInfinite);

      // Load service types
      const { data: servicesData } = await supabase
        .from("service_types")
        .select("*")
        .eq("user_id", userId)
        .order("name");

      if (servicesData && servicesData.length > 0) {
        // Get usage counts for each service
        const { data: transactionsData } = await supabase
          .from("transactions")
          .select("services")
          .eq("user_id", userId);

        const usageCounts: { [key: string]: number } = {};
        transactionsData?.forEach(t => {
          if (t.services && Array.isArray(t.services)) {
            t.services.forEach((s: any) => {
              if (s.id) {
                usageCounts[s.id] = (usageCounts[s.id] || 0) + 1;
              }
            });
          }
        });

        const servicesWithUsage = servicesData.map(s => ({
          ...s,
          usage_count: usageCounts[s.id] || 0
        }));

        setServiceTypes(servicesWithUsage);
      } else {
        // Create default services if none exist
        await createDefaultServices();
      }
      
    } catch (error) {
      console.error("Error loading inventory:", error);
      setError("Failed to load inventory data");
    }
    
    setLoading(false);
  };

  const createDefaultServices = async () => {
    if (!userId) return;

    const defaultServicePromises = defaultServices.map(service =>
      supabase.from("service_types").insert({
        user_id: userId,
        name: service.name,
        icon: service.icon,
        color: service.color,
        default_price: service.price,
        is_active: true,
      })
    );

    await Promise.all(defaultServicePromises);
    loadData();
  };

  const calculateStats = () => {
    const totalProducts = products.filter(p => !p.is_service).length;
    const totalServices = products.filter(p => p.is_service).length;
    const lowStock = products.filter(p => 
      p.track_inventory && 
      !p.has_infinite_stock &&
      p.stock_quantity <= p.low_stock_threshold && 
      p.stock_quantity > 0
    ).length;
    const outOfStock = products.filter(p => 
      p.track_inventory && 
      !p.has_infinite_stock &&
      p.stock_quantity === 0
    ).length;
    const infiniteStock = products.filter(p => 
      p.has_infinite_stock === true
    ).length;
    const totalValue = products.reduce((sum, p) => 
      sum + (p.cost * (p.has_infinite_stock ? 0 : p.stock_quantity)), 0
    );
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].length;

    setStats({
      totalProducts,
      totalServices,
      lowStock,
      outOfStock,
      infiniteStock,
      totalValue,
      categories
    });
  };

  const getCategories = () => {
    const categories = products
      .map(p => p.category)
      .filter(Boolean) as string[];
    return Array.from(new Set(categories));
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormSKU("");
    setFormBarcode("");
    setFormCategory("");
    setFormPrice("");
    setFormCost("");
    setFormStock("");
    setFormThreshold("10");
    setFormTrackInventory(true);
    setFormInfiniteStock(false);
    setFormIcon("");
    setFormSupplier("");
    setFormImageUrl("");
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
    setShowNewItemDropdown(false);
  };

  const openAddServiceModal = () => {
    setEditingService(null);
    setServiceName("");
    setServiceIcon("");
    setServiceColor("#3B82F6");
    setServicePrice("");
    setShowServicesModal(true);
    setShowNewItemDropdown(false);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description || "");
    setFormSKU(product.sku || "");
    setFormBarcode(product.barcode || "");
    setFormCategory(product.category || "");
    setFormPrice(product.price.toString());
    setFormCost(product.cost.toString());
    setFormStock(product.stock_quantity.toString());
    setFormThreshold(product.low_stock_threshold.toString());
    setFormTrackInventory(product.track_inventory);
    setFormInfiniteStock(product.has_infinite_stock || false);
    setFormIcon(product.icon || "");
    setFormSupplier(product.supplier || "");
    setFormImageUrl(product.image_url || "");
    setShowEditModal(true);
  };

  const openStockModal = (product: Product) => {
    setStockProduct(product);
    setStockAdjustment("");
    setStockReason("");
    setInfiniteStock(product.has_infinite_stock || false);
    setShowStockModal(true);
  };

  const openEditServiceModal = (service: ServiceType) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceIcon(service.icon);
    setServiceColor(service.color);
    setServicePrice(service.default_price.toString());
    setShowServicesModal(true);
  };

  const addProduct = async () => {
    if (!formName || !formPrice) {
      alert("Name and Price are required");
      return;
    }

    try {
      const stockQuantity = formInfiniteStock ? -1 : (parseInt(formStock) || 0);
      
      const productData = {
        user_id: userId,
        name: formName,
        description: formDescription || null,
        sku: formSKU || null,
        barcode: formBarcode || null,
        category: formCategory || null,
        price: parseFloat(formPrice),
        cost: parseFloat(formCost) || 0,
        stock_quantity: stockQuantity,
        low_stock_threshold: formInfiniteStock ? 0 : parseInt(formThreshold),
        track_inventory: !formInfiniteStock && formTrackInventory,
        is_service: false,
        icon: formIcon || null,
        supplier: formSupplier || null,
        image_url: formImageUrl || null,
        service_type: null,
        has_infinite_stock: formInfiniteStock,
      };

      const { error } = await supabase.from("products").insert(productData);

      if (error) throw error;

      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Error adding product: " + (error as any).message);
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;

    try {
      const stockQuantity = formInfiniteStock ? -1 : (parseInt(formStock) || 0);
      
      const productData = {
        name: formName,
        description: formDescription || null,
        sku: formSKU || null,
        barcode: formBarcode || null,
        category: formCategory || null,
        price: parseFloat(formPrice),
        cost: parseFloat(formCost) || 0,
        stock_quantity: stockQuantity,
        low_stock_threshold: formInfiniteStock ? 0 : parseInt(formThreshold),
        track_inventory: !formInfiniteStock && formTrackInventory,
        is_service: false,
        icon: formIcon || null,
        supplier: formSupplier || null,
        image_url: formImageUrl || null,
        service_type: null,
        has_infinite_stock: formInfiniteStock,
      };

      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) throw error;

      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Error updating product: " + (error as any).message);
    }
  };

  const addServiceType = async () => {
    if (!serviceName) {
      alert("Service name is required");
      return;
    }

    try {
      const { error } = await supabase.from("service_types").insert({
        user_id: userId,
        name: serviceName,
        icon: serviceIcon || "🔧",
        color: serviceColor,
        default_price: parseFloat(servicePrice) || 0,
        is_active: true,
      });

      if (error) throw error;

      setServiceName("");
      setServiceIcon("");
      setServiceColor("#3B82F6");
      setServicePrice("");
      setEditingService(null);
      setShowEmojiPicker(false);
      loadData();
    } catch (error) {
      console.error("Error adding service:", error);
      alert("Error adding service: " + (error as any).message);
    }
  };

  const updateServiceType = async () => {
    if (!editingService) return;

    try {
      const { error } = await supabase
        .from("service_types")
        .update({
          name: serviceName,
          icon: serviceIcon || "🔧",
          color: serviceColor,
          default_price: parseFloat(servicePrice) || 0,
        })
        .eq("id", editingService.id);

      if (error) throw error;

      setEditingService(null);
      setServiceName("");
      setServiceIcon("");
      setServiceColor("#3B82F6");
      setServicePrice("");
      setShowEmojiPicker(false);
      loadData();
    } catch (error) {
      console.error("Error updating service:", error);
      alert("Error updating service: " + (error as any).message);
    }
  };

  const toggleServiceActive = async (service: ServiceType) => {
    try {
      const { error } = await supabase
        .from("service_types")
        .update({ is_active: !service.is_active })
        .eq("id", service.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error updating service:", error);
      alert("Error updating service");
    }
  };

  const deleteServiceType = async (id: number) => {
    if (!confirm("Are you sure you want to delete this service type?")) return;

    try {
      const { error } = await supabase.from("service_types").delete().eq("id", id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Error deleting service");
    }
  };

  const adjustStock = async () => {
    if (!stockProduct) return;

    let newStock = stockProduct.stock_quantity;
    
    if (infiniteStock) {
      newStock = -1;
    } else {
      if (!stockAdjustment) {
        alert("Please enter an adjustment amount");
        return;
      }
      
      const adjustment = parseInt(stockAdjustment);
      newStock = stockProduct.stock_quantity + adjustment;

      if (newStock < 0) {
        alert("Stock cannot be negative");
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ 
          stock_quantity: newStock,
          has_infinite_stock: infiniteStock 
        })
        .eq("id", stockProduct.id);

      if (error) throw error;

      if (!infiniteStock && stockAdjustment) {
        await supabase.from("stock_adjustments").insert({
          user_id: userId,
          product_id: stockProduct.id,
          adjustment: parseInt(stockAdjustment),
          reason: stockReason || "Manual adjustment",
          previous_quantity: stockProduct.stock_quantity,
          new_quantity: newStock,
        });
      }

      setShowStockModal(false);
      loadData();
    } catch (error) {
      console.error("Error adjusting stock:", error);
      alert("Error adjusting stock: " + (error as any).message);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error deleting product");
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Description", "SKU", "Barcode", "Category", "Price", "Cost", "Stock", "Threshold", "Track Inventory", "Infinite Stock", "Image URL", "Supplier"];
    
    const rows = products.map(p => [
      p.name,
      p.description || "",
      p.sku || "",
      p.barcode || "",
      p.category || "",
      p.price,
      p.cost,
      p.has_infinite_stock ? "∞" : p.stock_quantity,
      p.low_stock_threshold,
      p.track_inventory,
      p.has_infinite_stock ? "Yes" : "No",
      p.image_url || "",
      p.supplier || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const importFromCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

    const productsToImport = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
      const hasInfiniteStock = values[10] === "Yes" || values[10] === "true" || values[10] === "TRUE";
      
      const product: any = {
        user_id: userId,
        name: values[0],
        description: values[1] || null,
        sku: values[2] || null,
        barcode: values[3] || null,
        category: values[4] || null,
        price: parseFloat(values[5]) || 0,
        cost: parseFloat(values[6]) || 0,
        stock_quantity: hasInfiniteStock ? -1 : (parseInt(values[7]) || 0),
        low_stock_threshold: hasInfiniteStock ? 0 : (parseInt(values[8]) || 10),
        track_inventory: !hasInfiniteStock && (values[9] === "true" || values[9] === "TRUE"),
        is_service: false,
        has_infinite_stock: hasInfiniteStock,
        image_url: values[11] || null,
        supplier: values[12] || null,
      };
      productsToImport.push(product);
    }

    if (productsToImport.length === 0) {
      alert("No valid products found in CSV");
      return;
    }

    try {
      const { error } = await supabase.from("products").insert(productsToImport);
      if (error) throw error;
      
      alert(`Successfully imported ${productsToImport.length} products!`);
      loadData();
    } catch (error) {
      console.error("Error importing products:", error);
      alert("Error importing products");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const filteredProducts = products.filter(product => {
    // Search filter
    const searchMatch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());

    // Type filter - only show products (not services)
    const typeMatch = !product.is_service;

    // Category filter
    const categoryMatch = 
      categoryFilter === "all" || product.category === categoryFilter;

    // Status filter
    let statusMatch = true;
    if (statusFilter !== "all") {
      if (product.has_infinite_stock) {
        statusMatch = statusFilter === "infinite";
      } else if (!product.track_inventory) {
        statusMatch = statusFilter === "no_track";
      } else {
        switch (statusFilter) {
          case "in_stock":
            statusMatch = product.stock_quantity > product.low_stock_threshold;
            break;
          case "low_stock":
            statusMatch = product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0;
            break;
          case "out_of_stock":
            statusMatch = product.stock_quantity === 0;
            break;
          case "infinite":
            statusMatch = product.has_infinite_stock === true;
            break;
        }
      }
    }

    return searchMatch && typeMatch && categoryMatch && statusMatch;
  });

  const getStockStatus = (product: Product) => {
    if (product.has_infinite_stock) return { text: "Infinite Stock", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Infinity };
    if (!product.track_inventory) return { text: "No Track", color: "bg-gray-100 text-gray-800 border-gray-200", icon: Tag };
    if (product.stock_quantity === 0) return { text: "Out of Stock", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle };
    if (product.stock_quantity <= product.low_stock_threshold) return { text: "Low Stock", color: "bg-orange-100 text-orange-800 border-orange-200", icon: TrendingDown };
    return { text: "In Stock", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: Check };
  };

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading inventory...</p>
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
            <h1 className="text-xl font-bold text-foreground mb-2">Error Loading Inventory</h1>
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
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Manage your products and services</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          {/* New Item Dropdown - Fixed hover issue */}
          <div className="relative" ref={newItemDropdownRef}>
            <button
              onClick={() => setShowNewItemDropdown(!showNewItemDropdown)}
              onMouseEnter={() => setShowNewItemDropdown(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              New Item
              <ChevronDown className={`w-4 h-4 transition-transform ${showNewItemDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showNewItemDropdown && (
              <div 
                className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50"
                onMouseLeave={() => setShowNewItemDropdown(false)}
              >
                <button
                  onClick={openAddModal}
                  className="w-full px-4 py-3 text-left text-foreground hover:bg-muted flex items-center gap-2 text-sm rounded-t-lg border-b border-border"
                >
                  <Box className="w-4 h-4" />
                  Add Product
                </button>
                <button
                  onClick={openAddServiceModal}
                  className="w-full px-4 py-3 text-left text-foreground hover:bg-muted flex items-center gap-2 text-sm rounded-b-lg"
                >
                  <Coffee className="w-4 h-4" />
                  Add Service
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Services</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalServices}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-foreground">{stats.lowStock}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
              <p className="text-2xl font-bold text-foreground">{stats.outOfStock}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Infinite Stock</p>
              <p className="text-2xl font-bold text-foreground">{stats.infiniteStock}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <Infinity className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-foreground">£{stats.totalValue.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
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
                placeholder="Search by name, SKU, category, or description..."
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
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              {viewMode === "grid" ? "List View" : "Grid View"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={importFromCSV}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
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
              <label className="block text-sm font-medium text-foreground mb-2">Stock Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="infinite">Infinite Stock</option>
                <option value="no_track">No Tracking</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {getCategories().map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Content */}
      {viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            const StatusIcon = stockStatus.icon;
            return (
              <div
                key={product.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors group"
              >
                {/* Item Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Product Image */}
                    <div className="relative">
                      {product.image_url ? (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <Box className="w-6 h-6 text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${stockStatus.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {stockStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Item Details */}
                <div className="space-y-2 mb-4">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">Price</p>
                      <p className="text-emerald-500 font-bold">£{product.price.toFixed(2)}</p>
                    </div>
                    {product.track_inventory && !product.has_infinite_stock && (
                      <div className="text-right">
                        <p className="font-medium text-foreground">Stock</p>
                        <p className="font-bold text-foreground">{product.stock_quantity}</p>
                      </div>
                    )}
                    {product.has_infinite_stock && (
                      <div className="text-right">
                        <p className="font-medium text-foreground">Stock</p>
                        <p className="font-bold text-purple-500 flex items-center gap-1">
                          <Infinity className="w-4 h-4" />
                          ∞
                        </p>
                      </div>
                    )}
                  </div>

                  {product.category && (
                    <div className="text-sm">
                      <p className="font-medium text-foreground">Category</p>
                      <p className="text-muted-foreground">{product.category}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
                  >
                    Edit
                  </button>
                  {product.track_inventory && !product.has_infinite_stock && (
                    <button
                      onClick={() => openStockModal(product)}
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
                    >
                      Stock
                    </button>
                  )}
                  {product.has_infinite_stock && (
                    <button
                      onClick={() => openStockModal(product)}
                      className="flex-1 bg-purple-500 text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-1"
                    >
                      <Infinity className="w-4 h-4" />
                      Infinite
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-card border border-border rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Item</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Category</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Price</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Stock</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const StatusIcon = stockStatus.icon;
                  return (
                    <tr key={product.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                              <Box className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-foreground">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">{product.description}</div>
                            )}
                            {product.sku && (
                              <div className="text-xs text-muted-foreground font-mono mt-1">SKU: {product.sku}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground">{product.category || "-"}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-emerald-500">£{product.price.toFixed(2)}</div>
                        {product.cost > 0 && (
                          <div className="text-xs text-muted-foreground">Cost: £{product.cost.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {product.has_infinite_stock ? (
                          <div className="flex items-center gap-1 text-purple-500 font-bold">
                            <Infinity className="w-4 h-4" />
                            ∞
                          </div>
                        ) : product.track_inventory ? (
                          <div>
                            <div className="font-bold text-foreground">{product.stock_quantity}</div>
                            <div className="text-xs text-muted-foreground">Min: {product.low_stock_threshold}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${stockStatus.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {stockStatus.text}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {product.track_inventory && !product.has_infinite_stock && (
                            <button
                              onClick={() => openStockModal(product)}
                              className="p-2 text-muted-foreground hover:text-primary transition-colors"
                              title="Adjust Stock"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                          )}
                          {product.has_infinite_stock && (
                            <button
                              onClick={() => openStockModal(product)}
                              className="p-2 text-purple-500 hover:text-purple-600 transition-colors"
                              title="Infinite Stock Settings"
                            >
                              <Infinity className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-3">No products found</p>
          {products.length > 0 ? (
            <p className="text-sm text-muted-foreground mb-3">Try adjusting your filters</p>
          ) : (
            <button
              onClick={openAddModal}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
            >
              Add Your First Product
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {showAddModal ? "Add New Product" : "Edit Product"}
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Product name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={2}
                    placeholder="Product description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                  <input
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Food, Beverages, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">SKU</label>
                  <input
                    value={formSKU}
                    onChange={(e) => setFormSKU(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="SKU-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Price * (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="19.99"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="10.00"
                  />
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Image URL</label>
                  <input
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Add a product image URL to display in POS</p>
                </div>

                {/* Infinite Stock Toggle */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formInfiniteStock}
                      onChange={(e) => {
                        setFormInfiniteStock(e.target.checked);
                        if (e.target.checked) {
                          setFormTrackInventory(false);
                          setFormStock("0");
                          setFormThreshold("0");
                        }
                      }}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-foreground font-medium flex items-center gap-2">
                        <Infinity className="w-4 h-4 text-purple-500" />
                        Infinite Stock
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Product never runs out of stock (no tracking needed)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Inventory Settings - Only show if not infinite stock */}
                {!formInfiniteStock && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Initial Stock</label>
                      <input
                        type="number"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Low Stock Alert</label>
                      <input
                        type="number"
                        value={formThreshold}
                        onChange={(e) => setFormThreshold(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Barcode</label>
                      <input
                        value={formBarcode}
                        onChange={(e) => setFormBarcode(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="1234567890123"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Supplier</label>
                      <input
                        value={formSupplier}
                        onChange={(e) => setFormSupplier(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Supplier name"
                      />
                    </div>

                    {/* Track Inventory Toggle */}
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formTrackInventory}
                          onChange={(e) => setFormTrackInventory(e.target.checked)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm text-foreground font-medium">Track Inventory</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={showAddModal ? addProduct : updateProduct}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                {showAddModal ? "Add Product" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && stockProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {stockProduct.has_infinite_stock ? "Infinite Stock Settings" : "Adjust Stock"}
              </h3>
              <button 
                onClick={() => setShowStockModal(false)} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-2">
                {stockProduct.image_url ? (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <img 
                      src={stockProduct.image_url} 
                      alt={stockProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Box className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{stockProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {stockProduct.has_infinite_stock 
                      ? "Current: Infinite Stock" 
                      : `Current Stock: ${stockProduct.stock_quantity}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Infinite Stock Toggle */}
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={infiniteStock}
                    onChange={(e) => {
                      setInfiniteStock(e.target.checked);
                      if (!e.target.checked && stockProduct.stock_quantity === -1) {
                        setStockAdjustment("0");
                      }
                    }}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-foreground font-medium flex items-center gap-2">
                      <Infinity className="w-4 h-4 text-purple-500" />
                      Infinite Stock
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Product never runs out of stock
                    </p>
                  </div>
                </label>
              </div>

              {/* Stock Adjustment - Only show if not infinite */}
              {!infiniteStock && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Adjustment Amount
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStockAdjustment("-10")}
                        className="flex-1 bg-red-500/10 text-red-600 border border-red-200 py-2 rounded-lg font-medium hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <TrendingDown className="w-4 h-4" />
                        -10
                      </button>
                      <button
                        onClick={() => setStockAdjustment("+10")}
                        className="flex-1 bg-emerald-500/10 text-emerald-600 border border-emerald-200 py-2 rounded-lg font-medium hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <TrendingUp className="w-4 h-4" />
                        +10
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Manual Adjustment</label>
                    <input
                      type="number"
                      value={stockAdjustment}
                      onChange={(e) => setStockAdjustment(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center font-bold"
                      placeholder="0"
                    />
                    {stockAdjustment && (
                      <p className="mt-2 text-center text-sm text-muted-foreground">
                        New stock: <span className="font-bold text-foreground">
                          {stockProduct.stock_quantity + parseInt(stockAdjustment || "0")}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
                    <input
                      value={stockReason}
                      onChange={(e) => setStockReason(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Restock, Damaged, Sold"
                    />
                  </div>
                </>
              )}

              {infiniteStock && (
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <p className="text-sm text-foreground">
                    This product will be marked as having infinite stock and will not be tracked in inventory.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={adjustStock}
                disabled={!infiniteStock && !stockAdjustment}
                className={`flex-1 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 ${
                  infiniteStock 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {infiniteStock ? 'Set Infinite Stock' : 'Adjust Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Types Modal - With Emoji Picker */}
      {showServicesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingService ? "Edit Service" : "Manage Services"}
              </h3>
              <button 
                onClick={() => {
                  setShowServicesModal(false);
                  setEditingService(null);
                  setServiceName("");
                  setServiceIcon("");
                  setServiceColor("#3B82F6");
                  setServicePrice("");
                  setShowEmojiPicker(false);
                }} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-muted-foreground mb-6">
              Create and manage service types like "Eat In", "Takeaway", "Delivery". These will appear as tick options in the POS.
            </p>

            {/* Add/Edit Service Form */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6 border border-border">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                {editingService ? (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Edit Service Type
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add New Service Type
                  </>
                )}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                  <input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Delivery"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Icon</label>
                  <div className="flex gap-2 relative">
                    <div className="flex-1 flex gap-2">
                      <input
                        value={serviceIcon}
                        onChange={(e) => setServiceIcon(e.target.value)}
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="🚚"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="px-3 py-2 bg-muted hover:bg-accent rounded-lg border border-border flex items-center gap-1"
                      >
                        <Smile className="w-4 h-4" />
                        <span className="text-sm">Pick</span>
                      </button>
                    </div>
                    <span className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-2xl border border-border">
                      {serviceIcon || "🔧"}
                    </span>
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div 
                        ref={emojiPickerRef}
                        className="absolute top-full left-0 mt-1 z-50"
                      >
                        <EmojiPicker
                          onEmojiClick={(emojiData) => {
                            setServiceIcon(emojiData.emoji);
                            setShowEmojiPicker(false);
                          }}
                          autoFocusSearch={false}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={serviceColor}
                      onChange={(e) => setServiceColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer"
                    />
                    <input
                      value={serviceColor}
                      onChange={(e) => setServiceColor(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fee (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="2.99"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Fixed fee added to order</p>
                </div>

                <div className="md:col-span-2 flex items-end gap-2">
                  <button
                    onClick={editingService ? updateServiceType : addServiceType}
                    disabled={!serviceName}
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {editingService ? "Update Service" : "Add Service"}
                  </button>
                  {editingService && (
                    <button
                      onClick={() => {
                        setEditingService(null);
                        setServiceName("");
                        setServiceIcon("");
                        setServiceColor("#3B82F6");
                        setServicePrice("");
                        setShowEmojiPicker(false);
                      }}
                      className="px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Available Services</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Active
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    Inactive
                  </span>
                </div>
              </div>
              
              {serviceTypes.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                  <Coffee className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No services created yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add your first service above</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {serviceTypes.map(service => (
                    <div 
                      key={service.id}
                      className={`bg-background border rounded-lg p-4 transition-all ${
                        service.is_active 
                          ? 'border-l-4 border-l-green-500 border-border' 
                          : 'border-border opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Service Icon with color */}
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-3xl"
                            style={{ backgroundColor: service.color + '20' }}
                          >
                            {service.icon || "🔧"}
                          </div>
                          
                          {/* Service Details */}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-semibold text-foreground text-lg">{service.name}</h5>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                service.is_active 
                                  ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                                  : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
                              }`}>
                                {service.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                Fee: <span className="font-semibold text-foreground">£{service.default_price.toFixed(2)}</span>
                              </span>
                              <span className="text-muted-foreground">
                                Used: <span className="font-semibold text-foreground">{service.usage_count || 0} times</span>
                              </span>
                              <span 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: service.color }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleServiceActive(service)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                              service.is_active
                                ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20'
                            }`}
                            title={service.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {service.is_active ? (
                              <>
                                <PowerOff className="w-3.5 h-3.5" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="w-3.5 h-3.5" />
                                Activate
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              openEditServiceModal(service);
                            }}
                            className="px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-all border border-blue-500/20 flex items-center gap-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => deleteServiceType(service.id)}
                            className="px-3 py-1.5 bg-red-500/10 text-red-600 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all border border-red-500/20 flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Usage Preview (if used in transactions) */}
                      {service.usage_count && service.usage_count > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Package className="w-3 h-3" />
                            <span>Used in {service.usage_count} transaction{service.usage_count !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setShowServicesModal(false)}
                className="w-full bg-muted text-foreground py-2.5 rounded-lg font-medium hover:bg-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
