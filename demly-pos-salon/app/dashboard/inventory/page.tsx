// app/dashboard/inventory/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { 
  Plus, Edit2, Trash2, X, Loader2, ArrowLeft, Package, 
  Search, Upload, Download, TrendingUp, TrendingDown, 
  Tag, Coffee, ShoppingBag, Pizza, Utensils, Package2,
  Filter, Grid, List, Hash, DollarSign, BarChart3,
  Clock, MapPin, Home, Truck
} from "lucide-react";
import Link from "next/link";

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
}

interface ServiceType {
  id: number;
  name: string;
  icon: string;
  color: string;
  default_price: number;
  is_active: boolean;
  user_id: string;
}

export default function Inventory() {
  const userId = useUserId();
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stock adjustment
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [stockReason, setStockReason] = useState("");

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
  const [formIsService, setFormIsService] = useState(false);
  const [formIcon, setFormIcon] = useState("");
  const [formSupplier, setFormSupplier] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formServiceType, setFormServiceType] = useState("");

  // Service form states
  const [serviceName, setServiceName] = useState("");
  const [serviceIcon, setServiceIcon] = useState("🍽️");
  const [serviceColor, setServiceColor] = useState("#3B82F6");
  const [servicePrice, setServicePrice] = useState("");

  // Default service types
  const defaultServices = [
    { name: "Eat In", icon: "🏠", color: "#10B981", price: 0 },
    { name: "Takeaway", icon: "🥡", color: "#F59E0B", price: 0 },
    { name: "Delivery", icon: "🚚", color: "#8B5CF6", price: 2.99 },
    { name: "Dine In", icon: "🍽️", color: "#EF4444", price: 0 },
    { name: "Collection", icon: "📦", color: "#06B6D4", price: 0 },
  ];

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    
    setLoading(true);
    
    // Load products
    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    
    if (productsData) setProducts(productsData);

    // Load service types
    const { data: servicesData } = await supabase
      .from("service_types")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    if (servicesData) {
      setServiceTypes(servicesData);
    } else {
      // Create default services if none exist
      await createDefaultServices();
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
    setFormIsService(false);
    setFormIcon("");
    setFormSupplier("");
    setFormImageUrl("");
    setFormServiceType("");
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
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
    setFormIsService(product.is_service);
    setFormIcon(product.icon || "");
    setFormSupplier(product.supplier || "");
    setFormImageUrl(product.image_url || "");
    setFormServiceType(product.service_type || "");
    setShowEditModal(true);
  };

  const openStockModal = (product: Product) => {
    setStockProduct(product);
    setStockAdjustment("");
    setStockReason("");
    setShowStockModal(true);
  };

  const openServicesModal = () => {
    setShowServicesModal(true);
  };

  const openEditServiceModal = (service: ServiceType) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceIcon(service.icon);
    setServiceColor(service.color);
    setServicePrice(service.default_price.toString());
  };

  const addProduct = async () => {
    if (!formName || !formPrice) {
      alert("Name and Price are required");
      return;
    }

    const { error } = await supabase.from("products").insert({
      user_id: userId,
      name: formName,
      description: formDescription || null,
      sku: formSKU || null,
      barcode: formBarcode || null,
      category: formCategory || null,
      price: parseFloat(formPrice),
      cost: parseFloat(formCost) || 0,
      stock_quantity: formIsService ? 0 : (parseInt(formStock) || 0),
      low_stock_threshold: formIsService ? 0 : parseInt(formThreshold),
      track_inventory: formIsService ? false : formTrackInventory,
      is_service: formIsService,
      icon: formIcon || null,
      supplier: formSupplier || null,
      image_url: formImageUrl || null,
      service_type: formIsService && formServiceType ? formServiceType : null,
    });

    if (error) {
      alert("Error adding product: " + error.message);
      return;
    }

    setShowAddModal(false);
    loadData();
  };

  const updateProduct = async () => {
    if (!editingProduct) return;

    const { error } = await supabase
      .from("products")
      .update({
        name: formName,
        description: formDescription || null,
        sku: formSKU || null,
        barcode: formBarcode || null,
        category: formCategory || null,
        price: parseFloat(formPrice),
        cost: parseFloat(formCost) || 0,
        stock_quantity: formIsService ? 0 : (parseInt(formStock) || 0),
        low_stock_threshold: formIsService ? 0 : parseInt(formThreshold),
        track_inventory: formIsService ? false : formTrackInventory,
        is_service: formIsService,
        icon: formIcon || null,
        supplier: formSupplier || null,
        image_url: formImageUrl || null,
        service_type: formIsService && formServiceType ? formServiceType : null,
      })
      .eq("id", editingProduct.id);

    if (error) {
      alert("Error updating product");
      return;
    }

    setShowEditModal(false);
    loadData();
  };

  const addServiceType = async () => {
    if (!serviceName) {
      alert("Service name is required");
      return;
    }

    const { error } = await supabase.from("service_types").insert({
      user_id: userId,
      name: serviceName,
      icon: serviceIcon,
      color: serviceColor,
      default_price: parseFloat(servicePrice) || 0,
      is_active: true,
    });

    if (error) {
      alert("Error adding service: " + error.message);
      return;
    }

    setServiceName("");
    setServiceIcon("🍽️");
    setServiceColor("#3B82F6");
    setServicePrice("");
    setEditingService(null);
    loadData();
  };

  const updateServiceType = async () => {
    if (!editingService) return;

    const { error } = await supabase
      .from("service_types")
      .update({
        name: serviceName,
        icon: serviceIcon,
        color: serviceColor,
        default_price: parseFloat(servicePrice) || 0,
      })
      .eq("id", editingService.id);

    if (error) {
      alert("Error updating service");
      return;
    }

    setEditingService(null);
    setServiceName("");
    setServiceIcon("🍽️");
    setServiceColor("#3B82F6");
    setServicePrice("");
    loadData();
  };

  const toggleServiceActive = async (service: ServiceType) => {
    const { error } = await supabase
      .from("service_types")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (error) {
      alert("Error updating service");
      return;
    }

    loadData();
  };

  const deleteServiceType = async (id: number) => {
    if (!confirm("Are you sure you want to delete this service type? Products using this service will keep it as their type.")) return;

    const { error } = await supabase.from("service_types").delete().eq("id", id);

    if (error) {
      alert("Error deleting service");
      return;
    }

    loadData();
  };

  const adjustStock = async () => {
    if (!stockProduct || !stockAdjustment) return;

    const adjustment = parseInt(stockAdjustment);
    const newStock = stockProduct.stock_quantity + adjustment;

    if (newStock < 0) {
      alert("Stock cannot be negative");
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({ stock_quantity: newStock })
      .eq("id", stockProduct.id);

    if (error) {
      alert("Error adjusting stock");
      return;
    }

    // Log the adjustment
    await supabase.from("stock_adjustments").insert({
      user_id: userId,
      product_id: stockProduct.id,
      adjustment: adjustment,
      reason: stockReason || "Manual adjustment",
      previous_quantity: stockProduct.stock_quantity,
      new_quantity: newStock,
    });

    setShowStockModal(false);
    loadData();
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      alert("Error deleting product");
      return;
    }

    loadData();
  };

  const exportToCSV = () => {
    const headers = ["Name", "Description", "SKU", "Barcode", "Category", "Price", "Cost", "Stock", "Threshold", "Track Inventory", "Is Service", "Service Type", "Icon", "Supplier"];
    
    const rows = products.map(p => [
      p.name,
      p.description || "",
      p.sku || "",
      p.barcode || "",
      p.category || "",
      p.price,
      p.cost,
      p.stock_quantity,
      p.low_stock_threshold,
      p.track_inventory,
      p.is_service,
      p.service_type || "",
      p.icon || "",
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

    const products = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
      const product: any = {
        user_id: userId,
        name: values[0],
        description: values[1] || null,
        sku: values[2] || null,
        barcode: values[3] || null,
        category: values[4] || null,
        price: parseFloat(values[5]) || 0,
        cost: parseFloat(values[6]) || 0,
        stock_quantity: parseInt(values[7]) || 0,
        low_stock_threshold: parseInt(values[8]) || 10,
        track_inventory: values[9] === "true" || values[9] === "TRUE",
        is_service: values[10] === "true" || values[10] === "TRUE",
        service_type: values[11] || null,
        icon: values[12] || null,
        supplier: values[13] || null,
      };
      products.push(product);
    }

    if (products.length === 0) {
      alert("No valid products found in CSV");
      return;
    }

    const { error } = await supabase.from("products").insert(products);

    if (error) {
      alert("Error importing products: " + error.message);
      return;
    }

    alert(`Successfully imported ${products.length} products!`);
    loadData();
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const filteredProducts = products
    .filter(p => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (p.is_service && activeCategory === "products") return false;
      if (!p.is_service && activeCategory === "services") return false;
      
      return (
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return b.price - a.price;
        case "stock":
          return b.stock_quantity - a.stock_quantity;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const getStats = () => {
    const totalProducts = products.filter(p => !p.is_service).length;
    const totalServices = products.filter(p => p.is_service).length;
    const lowStock = products.filter(p => 
      p.track_inventory && p.stock_quantity <= p.low_stock_threshold
    ).length;
    const totalValue = products.reduce((sum, p) => 
      sum + (p.cost * p.stock_quantity), 0
    );

    return { totalProducts, totalServices, lowStock, totalValue };
  };

  const stats = getStats();

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="p-8 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              Inventory
            </h1>
            <p className="text-slate-400 text-lg mt-2">Manage products, services, and stock levels</p>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
            Back to POS
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Products</p>
                <p className="text-3xl font-bold text-white">{stats.totalProducts}</p>
              </div>
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Package2 className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Services</p>
                <p className="text-3xl font-bold text-white">{stats.totalServices}</p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Coffee className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Low Stock</p>
                <p className="text-3xl font-bold text-white">{stats.lowStock}</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-xl">
                <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Value</p>
                <p className="text-3xl font-bold text-white">£{stats.totalValue.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <DollarSign className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1 flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, services, SKU..."
                className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 pl-12 pr-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${activeCategory === "all" ? "bg-cyan-500 text-white" : "bg-slate-800/50 text-slate-400 hover:text-white"}`}
              >
                All Items
              </button>
              <button
                onClick={() => setActiveCategory("products")}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${activeCategory === "products" ? "bg-emerald-500 text-white" : "bg-slate-800/50 text-slate-400 hover:text-white"}`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveCategory("services")}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${activeCategory === "services" ? "bg-blue-500 text-white" : "bg-slate-800/50 text-slate-400 hover:text-white"}`}
              >
                Services
              </button>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex gap-4">
            {/* View Toggle */}
            <div className="flex bg-slate-800/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-slate-700/50 text-white" : "text-slate-400 hover:text-white"}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-slate-700/50 text-white" : "text-slate-400 hover:text-white"}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Import/Export */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={importFromCSV}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 px-4 py-3 rounded-xl font-medium text-slate-300 hover:text-white transition-all"
            >
              <Upload className="w-5 h-5" />
              Import
            </button>
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 px-4 py-3 rounded-xl font-medium text-slate-300 hover:text-white transition-all"
            >
              <Download className="w-5 h-5" />
              Export
            </button>

            {/* Service Types Button */}
            <button
              onClick={openServicesModal}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-xl font-bold text-white transition-all"
            >
              <Tag className="w-5 h-5" />
              Service Types
            </button>

            {/* Add Product Button */}
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-xl shadow-cyan-500/20"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all group"
              >
                {/* Product Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{product.icon || (product.is_service ? "🎯" : "📦")}</div>
                    <div>
                      <h3 className="font-bold text-white text-lg line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-slate-400">{product.category || "Uncategorized"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                )}

                {/* Service Type Badge */}
                {product.is_service && product.service_type && (
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Tag className="w-3 h-3" />
                      {product.service_type}
                    </span>
                  </div>
                )}

                {/* Price & Stock */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                      £{product.price.toFixed(2)}
                    </p>
                    {product.cost > 0 && (
                      <p className="text-sm text-slate-500">Cost: £{product.cost.toFixed(2)}</p>
                    )}
                  </div>
                  
                  {product.track_inventory && !product.is_service && (
                    <div className="text-right">
                      <div className={`text-lg font-bold ${product.stock_quantity <= product.low_stock_threshold ? "text-red-400" : "text-emerald-400"}`}>
                        {product.stock_quantity} units
                      </div>
                      <button
                        onClick={() => openStockModal(product)}
                        className="text-sm text-cyan-400 hover:text-cyan-300 underline"
                      >
                        Adjust
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {!product.is_service && product.track_inventory && (
                    <button
                      onClick={() => openStockModal(product)}
                      className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-white py-2 rounded-lg text-sm font-medium transition-all"
                    >
                      Stock
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex-1 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 text-cyan-400 py-2 rounded-lg text-sm font-medium transition-all border border-cyan-500/20"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-slate-800/30 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Item</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Category</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Price</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Stock</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Type</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{product.icon || (product.is_service ? "🎯" : "📦")}</div>
                          <div>
                            <div className="font-bold text-white">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-slate-400 line-clamp-1">{product.description}</div>
                            )}
                            <div className="text-xs text-slate-500 font-mono mt-1">
                              {product.sku && <span>SKU: {product.sku}</span>}
                              {product.barcode && <span className="ml-3">{product.barcode}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300">{product.category || "-"}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                          £{product.price.toFixed(2)}
                        </div>
                        {product.cost > 0 && (
                          <div className="text-xs text-slate-500">Cost: £{product.cost.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {product.track_inventory && !product.is_service ? (
                          <div>
                            <div className={`font-bold ${product.stock_quantity <= product.low_stock_threshold ? "text-red-400" : "text-emerald-400"}`}>
                              {product.stock_quantity}
                            </div>
                            <div className="text-xs text-slate-500">Min: {product.low_stock_threshold}</div>
                            <button
                              onClick={() => openStockModal(product)}
                              className="text-xs text-cyan-400 hover:text-cyan-300 underline mt-1"
                            >
                              Adjust
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 w-fit ${
                            product.is_service 
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                              : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          }`}>
                            {product.is_service ? (
                              <>
                                <Coffee className="w-3 h-3" />
                                Service
                              </>
                            ) : (
                              <>
                                <Package2 className="w-3 h-3" />
                                Product
                              </>
                            )}
                          </span>
                          {product.is_service && product.service_type && (
                            <span className="text-xs text-slate-400">{product.service_type}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Package className="w-24 h-24 mx-auto mb-6 opacity-30" />
            <p className="text-2xl mb-2">No items found</p>
            <p className="text-slate-500 mb-6">Try changing your filters or add a new item</p>
            <button
              onClick={openAddModal}
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl"
            >
              Add Your First Item
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal - SAME AS BEFORE BUT UPDATED WITH SERVICE TYPE SELECTOR */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-4xl w-full border border-slate-700/50 max-h-[90vh] overflow-y-auto shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">
                {showAddModal ? "Add Item" : "Edit Item"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="col-span-2">
                <label className="block text-lg mb-2 font-medium text-slate-300">Name *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="Product/Service name"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-lg mb-2 font-medium text-slate-300">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium text-slate-300">Category</label>
                <input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="e.g., Hair Care, Food, etc."
                />
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium text-slate-300">Icon/Emoji</label>
                <input
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="📦 or ✂️ or 🍽️"
                />
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium text-slate-300">Price * (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="19.99"
                />
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium text-slate-300">Cost (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="10.00"
                />
              </div>

              {/* Service Type Selector (only when is_service is true) */}
              {formIsService && (
                <div className="col-span-2">
                  <label className="block text-lg mb-2 font-medium text-slate-300">Service Type</label>
                  <select
                    value={formServiceType}
                    onChange={(e) => setFormServiceType(e.target.value)}
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  >
                    <option value="">Select Service Type (Optional)</option>
                    {serviceTypes
                      .filter(service => service.is_active)
                      .map(service => (
                        <option key={service.id} value={service.name}>
                          {service.icon} {service.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Inventory Settings (only for products) */}
              {!formIsService && (
                <>
                  <div>
                    <label className="block text-lg mb-2 font-medium text-slate-300">Initial Stock</label>
                    <input
                      type="number"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-lg mb-2 font-medium text-slate-300">Low Stock Alert</label>
                    <input
                      type="number"
                      value={formThreshold}
                      onChange={(e) => setFormThreshold(e.target.value)}
                      className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      placeholder="10"
                    />
                  </div>
                </>
              )}

              {/* Additional Fields */}
              <div>
                <label className="block text-lg mb-2 font-medium text-slate-300">SKU</label>
                <input
                  value={formSKU}
                  onChange={(e) => setFormSKU(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="SKU-001"
                />
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium text-slate-300">Barcode</label>
                <input
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="1234567890123"
                />
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium text-slate-300">Supplier</label>
                <input
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="Supplier name"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-lg mb-2 font-medium text-slate-300">Product Image URL</label>
                <input
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Toggles */}
              <div className="col-span-2 flex items-center gap-6 bg-slate-800/30 p-4 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTrackInventory}
                    onChange={(e) => setFormTrackInventory(e.target.checked)}
                    disabled={formIsService}
                    className="w-6 h-6 accent-cyan-500"
                  />
                  <span className="text-lg text-slate-300">Track Inventory</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsService}
                    onChange={(e) => {
                      setFormIsService(e.target.checked);
                      if (e.target.checked) {
                        setFormTrackInventory(false);
                        setFormStock("0");
                        setFormThreshold("0");
                      }
                    }}
                    className="w-6 h-6 accent-cyan-500"
                  />
                  <span className="text-lg text-slate-300">Is Service</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={showAddModal ? addProduct : updateProduct}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 py-4 rounded-xl text-lg font-bold text-white transition-all shadow-xl shadow-cyan-500/20"
              >
                {showAddModal ? "Add Item" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Types Modal */}
      {showServicesModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-4xl w-full border border-slate-700/50 max-h-[90vh] overflow-y-auto shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Service Types</h2>
              <button
                onClick={() => {
                  setShowServicesModal(false);
                  setEditingService(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            <p className="text-slate-400 mb-6">
              Manage service types like "Eat In", "Takeaway", "Delivery". These can be added as buttons in the POS.
            </p>

            {/* Add/Edit Service Form */}
            <div className="bg-slate-800/30 rounded-2xl p-6 mb-8 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-4">
                {editingService ? "Edit Service Type" : "Add New Service Type"}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                  <input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="e.g., Eat In, Takeaway"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Icon</label>
                  <input
                    value={serviceIcon}
                    onChange={(e) => setServiceIcon(e.target.value)}
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="🍽️, 🚚, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={serviceColor}
                      onChange={(e) => setServiceColor(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      value={serviceColor}
                      onChange={(e) => setServiceColor(e.target.value)}
                      className="flex-1 bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-3 rounded-xl text-white font-mono text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Default Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                {editingService && (
                  <button
                    onClick={() => {
                      setEditingService(null);
                      setServiceName("");
                      setServiceIcon("🍽️");
                      setServiceColor("#3B82F6");
                      setServicePrice("");
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-bold text-white transition-all"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  onClick={editingService ? updateServiceType : addServiceType}
                  disabled={!serviceName}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                >
                  {editingService ? "Update Service" : "Add Service"}
                </button>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Active Service Types</h3>
              
              {serviceTypes
                .filter(service => service.is_active)
                .map(service => (
                  <div 
                    key={service.id}
                    className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${service.color}20`, border: `1px solid ${service.color}30` }}
                      >
                        {service.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-lg">{service.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span>Color: <span className="font-mono">{service.color}</span></span>
                          <span>Default Price: £{service.default_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleServiceActive(service)}
                        className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all font-medium"
                      >
                        Active
                      </button>
                      <button
                        onClick={() => openEditServiceModal(service)}
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteServiceType(service.id)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              
              {/* Inactive Services */}
              {serviceTypes.filter(service => !service.is_active).length > 0 && (
                <>
                  <h3 className="text-xl font-bold text-white mt-8">Inactive Service Types</h3>
                  {serviceTypes
                    .filter(service => !service.is_active)
                    .map(service => (
                      <div 
                        key={service.id}
                        className="bg-slate-800/20 rounded-2xl p-4 border border-slate-700/30 flex items-center justify-between opacity-60"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-slate-700/50">
                            {service.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg">{service.name}</h4>
                            <p className="text-sm text-slate-400">Inactive</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleServiceActive(service)}
                            className="px-4 py-2 bg-slate-700/50 text-slate-400 rounded-lg hover:bg-slate-600/50 transition-all font-medium"
                          >
                            Activate
                          </button>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <button
                onClick={() => setShowServicesModal(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal - SAME AS BEFORE */}
      {/* ... (Stock modal code remains the same) ... */}
    </div>
  );
}
