import { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Layers,
  BedDouble,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Download,
  Users,
  UserPlus,
  X,
  Mail,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import {
  useHostelStore,
  addHostelBlock,
  updateHostelBlock,
  deleteHostelBlock,
  addHostelCategory,
  updateHostelCategory,
  deleteHostelCategory,
  addHostelRoom,
  updateHostelRoom,
  deleteHostelRoom,
  addHostelWarden,
  updateHostelWarden,
  deleteHostelWarden,
} from "./data/hostelData.js";
import "./HostelModule.css";

export default function HostelMasterSetup() {
  // Navigation
  const [activeTab, setActiveTab] = useState("blocks"); // "blocks" | "categories" | "allocations" | "wardens"

  // Unified Store
  const { blocks, categories, rooms, wardens } = useHostelStore();

  // Tab 1: Hostel Blocks State
  const [blockSearch, setBlockSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [newBlock, setNewBlock] = useState({
    name: "",
    code: "",
    category: "",
    floors: "",
    location: "",
  });

  // Tab 2: Room Categories State
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "AC Accommodation",
    specification: "",
    capacity: 2,
    fee: "₹8,500/mo",
    blocks: "",
  });

  // Tab 3: Rooms & Bed Allocation State
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [newRoom, setNewRoom] = useState({
    roomNo: "",
    floor: 1,
    block: "BR-A",
    type: "Double Sharing",
    capacity: 2,
    fee: "₹6,500/mo",
  });

  // Tab 4: Warden Allocation State
  const [wardenSearch, setWardenSearch] = useState("");
  const [wardenFilter, setWardenFilter] = useState("");
  const [showAssignWardenModal, setShowAssignWardenModal] = useState(false);
  const [editingWarden, setEditingWarden] = useState(null);
  const [newWarden, setNewWarden] = useState({
    name: "",
    empId: "",
    designation: "Resident Warden",
    phone: "",
    email: "",
    assignedHostels: "Boys Residence - Block A",
    gender: "Male",
  });

  // Delete Target Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, name }

  // Global Toast
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // --- Handlers: Tab 1 (Add/Edit Block) ---
  const handleCloseAddBlockModal = () => {
    setShowAddBlockModal(false);
    setEditingBlock(null);
    setNewBlock({
      name: "",
      code: "",
      category: "",
      floors: "",
      location: "",
    });
  };

  const handleAddBlockSubmit = (e) => {
    e.preventDefault();
    if (!newBlock.name || !newBlock.code || !newBlock.category || !newBlock.floors) return;

    const floorNum = parseInt(newBlock.floors, 10) || 1;

    if (editingBlock) {
      updateHostelBlock(editingBlock.id, {
        name: newBlock.name,
        code: newBlock.code,
        type: newBlock.category,
        floors: floorNum,
        description: newBlock.location || editingBlock.description,
      });
      handleCloseAddBlockModal();
      showToast(`Hostel block "${newBlock.name}" updated successfully!`);
    } else {
      const estRooms = floorNum * 5;
      const estBeds = estRooms * 2;
      const created = {
        id: `blk-${Date.now()}`,
        name: newBlock.name,
        code: newBlock.code,
        type: newBlock.category,
        floors: floorNum,
        totalRooms: estRooms,
        totalBeds: estBeds,
        occupiedBeds: 0,
        vacantBeds: estBeds,
        warden: "To be assigned",
        wardenPhone: "--",
        status: "Active",
        facilities: ["Wi-Fi", "RO Water", "Security"],
        description: newBlock.location || "Newly registered hostel block.",
      };
      addHostelBlock(created);
      handleCloseAddBlockModal();
      showToast(`Hostel block "${newBlock.name} (${newBlock.code})" added successfully!`);
    }
  };

  // --- Handlers: Tab 2 (Add/Edit Category) ---
  const handleCloseAddCategoryModal = () => {
    setShowAddCategoryModal(false);
    setEditingCategory(null);
    setNewCategory({
      name: "",
      type: "AC Accommodation",
      specification: "",
      capacity: 2,
      fee: "₹8,500/mo",
      blocks: "",
    });
  };

  const handleAddCategorySubmit = (e) => {
    e.preventDefault();
    if (!newCategory.name) return;

    if (editingCategory) {
      updateHostelCategory(editingCategory.id, {
        name: newCategory.name,
        type: newCategory.type,
        specification: newCategory.specification || "Standard hostel amenities",
        capacity: Number(newCategory.capacity) || 2,
        fee: newCategory.fee,
        blocks: newCategory.blocks || "Boys Residence - Block A",
      });
      handleCloseAddCategoryModal();
      showToast(`Room Category "${newCategory.name}" updated successfully!`);
    } else {
      const created = {
        id: `cat-${Date.now()}`,
        name: newCategory.name,
        type: newCategory.type,
        specification: newCategory.specification || "Standard hostel amenities",
        capacity: Number(newCategory.capacity) || 2,
        fee: newCategory.fee,
        totalRooms: 10,
        totalBeds: (Number(newCategory.capacity) || 2) * 10,
        blocks: newCategory.blocks || "Boys Residence - Block A",
        status: "Active",
      };
      addHostelCategory(created);
      handleCloseAddCategoryModal();
      showToast(`Room Category "${newCategory.name}" added successfully!`);
    }
  };

  // --- Handlers: Tab 3 (Add/Edit Room) ---
  const handleCloseAddRoomModal = () => {
    setShowAddRoomModal(false);
    setEditingRoom(null);
    setNewRoom({
      roomNo: "",
      floor: 1,
      block: "BR-A",
      type: "Double Sharing",
      capacity: 2,
      fee: "₹6,500/mo",
    });
  };

  const handleAddRoomSubmit = (e) => {
    e.preventDefault();
    if (!newRoom.roomNo) return;

    if (editingRoom) {
      updateHostelRoom(editingRoom.roomNo, {
        roomNo: newRoom.roomNo,
        floor: Number(newRoom.floor) || 1,
        block: newRoom.block,
        type: newRoom.type,
        capacity: Number(newRoom.capacity) || 2,
        fee: newRoom.fee || "₹6,500/mo",
      });
      handleCloseAddRoomModal();
      showToast(`Room #${newRoom.roomNo} updated successfully!`);
    } else {
      const createdRoom = {
        roomNo: newRoom.roomNo,
        floor: Number(newRoom.floor) || 1,
        block: newRoom.block,
        type: newRoom.type,
        capacity: Number(newRoom.capacity) || 2,
        occupied: 0,
        beds: Array.from({ length: Number(newRoom.capacity) || 2 }).map(
          (_, i) => `BED-${i + 1} (Vacant)`
        ),
        fee: newRoom.fee || "₹6,500/mo",
      };
      addHostelRoom(createdRoom);
      handleCloseAddRoomModal();
      showToast(`Room #${newRoom.roomNo} configured successfully!`);
    }
  };

  // --- Handlers: Tab 4 (Assign/Edit Warden) ---
  const handleCloseAssignWardenModal = () => {
    setShowAssignWardenModal(false);
    setEditingWarden(null);
    setNewWarden({
      name: "",
      empId: "",
      designation: "Resident Warden",
      phone: "",
      email: "",
      assignedHostels: "Boys Residence - Block A",
      gender: "Male",
    });
  };

  const handleAssignWardenSubmit = (e) => {
    e.preventDefault();
    if (!newWarden.name || !newWarden.empId) return;

    if (editingWarden) {
      updateHostelWarden(editingWarden.id, {
        name: newWarden.name,
        empId: newWarden.empId,
        designation: newWarden.designation,
        phone: newWarden.phone || "--",
        email: newWarden.email || "--",
        assignedHostels: newWarden.assignedHostels,
        gender: newWarden.gender,
      });
      handleCloseAssignWardenModal();
      showToast(`Warden "${newWarden.name}" updated successfully!`);
    } else {
      const created = {
        id: `w-${Date.now()}`,
        empId: newWarden.empId,
        name: newWarden.name,
        designation: newWarden.designation,
        phone: newWarden.phone || "--",
        email: newWarden.email || "--",
        assignedHostels: newWarden.assignedHostels,
        gender: newWarden.gender,
        status: "Active",
      };
      addHostelWarden(created);
      handleCloseAssignWardenModal();
      showToast(`Warden "${newWarden.name}" assigned successfully!`);
    }
  };

  // --- Filtered Lists ---
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      const matchesSearch =
        !blockSearch ||
        b.name.toLowerCase().includes(blockSearch.toLowerCase()) ||
        b.code.toLowerCase().includes(blockSearch.toLowerCase()) ||
        b.warden.toLowerCase().includes(blockSearch.toLowerCase());
      const matchesFilter = !blockFilter || blockFilter === "all" || b.id === blockFilter;
      return matchesSearch && matchesFilter;
    });
  }, [blocks, blockSearch, blockFilter]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch =
        !categorySearch ||
        c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
        c.specification.toLowerCase().includes(categorySearch.toLowerCase());
      const matchesFilter =
        !categoryFilter ||
        categoryFilter === "all" ||
        (categoryFilter === "ac" && c.type.toLowerCase().includes("ac") && !c.type.toLowerCase().includes("non-ac")) ||
        (categoryFilter === "non-ac" && c.type.toLowerCase().includes("non-ac")) ||
        (categoryFilter === "deluxe" && c.type.toLowerCase().includes("deluxe"));
      return matchesSearch && matchesFilter;
    });
  }, [categories, categorySearch, categoryFilter]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchesSearch =
        !roomSearch ||
        r.roomNo.includes(roomSearch) ||
        r.block.toLowerCase().includes(roomSearch.toLowerCase()) ||
        r.type.toLowerCase().includes(roomSearch.toLowerCase());
      const matchesFilter = !roomFilter || roomFilter === "all" || r.block === roomFilter;
      return matchesSearch && matchesFilter;
    });
  }, [rooms, roomSearch, roomFilter]);

  const filteredWardens = useMemo(() => {
    return wardens.filter((w) => {
      const matchesSearch =
        !wardenSearch ||
        w.name.toLowerCase().includes(wardenSearch.toLowerCase()) ||
        w.empId.toLowerCase().includes(wardenSearch.toLowerCase()) ||
        w.assignedHostels.toLowerCase().includes(wardenSearch.toLowerCase());
      const matchesFilter = !wardenFilter || wardenFilter === "all" || w.assignedHostels.toLowerCase().includes(wardenFilter.toLowerCase());
      return matchesSearch && matchesFilter;
    });
  }, [wardens, wardenSearch, wardenFilter]);

  return (
    <DashboardLayout
      title="Hostel Master Setup"
      subtitle="Manage hostel blocks, room categories, rooms and wardens"
      breadcrumb={["Hostel Management", "Hostel Master Setup"]}
    >
      <div className="hostel-page-wrapper w-full max-w-full box-border bg-[#f2f6ed] text-[#1f2913]">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="pc-toast-banner" role="status">
            <CheckCircle2 size={18} className="text-sky-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. TOP NAVIGATION TAB BAR (Common across all 4 screens) */}
        <nav
          className="w-full max-w-full box-border bg-white p-1.5 md:p-2 rounded-2xl border border-sky-100 mb-5 flex items-center gap-1.5 md:gap-2 shadow-sm"
          aria-label="Hostel Master Navigation Tabs"
        >
          <button
            type="button"
            className={
              activeTab === "blocks"
                ? "bg-sky-600 text-white font-medium rounded-xl px-3.5 py-2 text-xs shadow-sm border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-slate-600 hover:text-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => setActiveTab("blocks")}
          >
            <Building2 size={16} />
            <span>Hostel Blocks</span>
          </button>
          <button
            type="button"
            className={
              activeTab === "categories"
                ? "bg-sky-600 text-white font-medium rounded-xl px-3.5 py-2 text-xs shadow-sm border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-slate-600 hover:text-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => setActiveTab("categories")}
          >
            <Layers size={16} />
            <span>Room Categories</span>
          </button>
          <button
            type="button"
            className={
              activeTab === "allocations"
                ? "bg-sky-600 text-white font-medium rounded-xl px-3.5 py-2 text-xs shadow-sm border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-slate-600 hover:text-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => setActiveTab("allocations")}
          >
            <BedDouble size={16} />
            <span>Rooms &amp; Bed Allocation</span>
          </button>
          <button
            type="button"
            className={
              activeTab === "wardens"
                ? "bg-sky-600 text-white font-medium rounded-xl px-3.5 py-2 text-xs shadow-sm border-0 cursor-pointer flex items-center gap-2 transition whitespace-nowrap"
                : "bg-transparent text-slate-600 hover:text-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition border-0 flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => setActiveTab("wardens")}
          >
            <ShieldCheck size={16} />
            <span>Warden Allocation</span>
          </button>
        </nav>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. TAB 1: HOSTEL BLOCKS (Screen 1)                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "blocks" && (
          <div>
            {/* Header Row */}
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3">
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <Building2 size={24} className="text-sky-600 flex-shrink-0" />
                <span>Hostels</span>
              </div>
              <button
                type="button"
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 border-0 flex-shrink-0"
                onClick={() => setShowAddBlockModal(true)}
              >
                <Plus size={15} />
                <span>Add New Hostel Block</span>
              </button>
            </div>

            {/* Filter Bar Container */}
            <div className="w-full max-w-full box-border p-3 bg-white rounded-2xl border border-sky-100 mb-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-sky-100 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 transition placeholder:text-slate-400 box-border"
                />
                <Search
                  size={15}
                  className="text-slate-400 absolute left-3 pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter:</span>
                <select
                  value={blockFilter}
                  onChange={(e) => setBlockFilter(e.target.value)}
                  className="h-10 w-48 sm:w-56 md:w-60 max-w-full px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border"
                >
                  <option value="">Select Hostel...</option>
                  <option value="all">All Hostels ({blocks.length})</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Empty State vs Blocks Table */}
            {!blockFilter && !blockSearch ? (
              <div className="w-full max-w-full box-border bg-white border border-sky-100 rounded-3xl py-16 px-6 text-center my-3 shadow-sm">
                <div className="bg-sky-50 text-sky-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5">
                  <Building2 size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Select a Hostel
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto m-0 leading-relaxed">
                  Please select a hostel option from the filter dropdown above to render operational hostel blocks.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-full box-border bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm my-3">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-sky-50/60 border-b border-sky-100">
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">BLOCK NAME &amp; CODE</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">CATEGORY</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">FLOORS</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">ROOMS</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">CAPACITY</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">OCCUPIED / VACANT</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">RESIDENT WARDEN</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">STATUS</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-sky-900 uppercase">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {filteredBlocks.map((b) => (
                        <tr key={b.id} className="hover:bg-sky-50/40 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-sm">{b.name}</span>
                              <span className="bg-sky-50 border border-sky-200 text-sky-700 rounded-lg px-2.5 py-0.5 text-xs font-semibold">
                                {b.code}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-sky-50 text-sky-700 rounded-full px-3 py-1 text-xs font-medium inline-block">
                              {b.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-800 font-medium">{b.floors} Floors</td>
                          <td className="py-3 px-4 text-sm text-slate-800 font-medium">{b.totalRooms} Rooms</td>
                          <td className="py-3 px-4 text-sm text-slate-900 font-bold">{b.totalBeds} Beds</td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-semibold">
                              <span className="text-amber-600">{b.occupiedBeds} Occ</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-emerald-600">{b.vacantBeds} Vac</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-semibold text-slate-900">{b.warden}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone size={11} className="text-sky-600" /> {b.wardenPhone}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-semibold inline-block">
                              ✓ {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBlock(b);
                                  setNewBlock({
                                    name: b.name,
                                    code: b.code,
                                    category: b.type,
                                    floors: `${b.floors} Floor${b.floors > 1 ? "s" : ""}`,
                                    location: b.description || "",
                                  });
                                  setShowAddBlockModal(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "block",
                                    id: b.id,
                                    name: `${b.name} (${b.code})`,
                                  })
                                }
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                Delete
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
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. TAB 2: ROOM CATEGORIES (Screen 2)                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "categories" && (
          <div>
            {/* Header Row */}
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3">
              <h2 className="text-2xl font-bold text-slate-900 m-0">Room Categories</h2>
              <button
                type="button"
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 border-0 flex-shrink-0"
                onClick={() => setShowAddCategoryModal(true)}
              >
                <Plus size={15} />
                <span>Add Room Type</span>
              </button>
            </div>

            {/* Filter Bar Container */}
            <div className="w-full max-w-full box-border p-3 bg-white rounded-2xl border border-sky-100 mb-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search by category or specification..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-sky-100 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 transition placeholder:text-slate-400 box-border"
                />
                <Search
                  size={15}
                  className="text-slate-400 absolute left-3 pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-10 w-52 sm:w-60 md:w-64 max-w-full px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border"
                >
                  <option value="">-- Select AC / Non-AC Option --</option>
                  <option value="all">All Categories</option>
                  <option value="ac">AC Accommodation</option>
                  <option value="non-ac">Non-AC Standard</option>
                  <option value="deluxe">Special / Deluxe AC</option>
                </select>
              </div>
            </div>

            {/* Empty State vs Categories List */}
            {!categoryFilter && !categorySearch ? (
              <div className="w-full max-w-full box-border bg-white border border-sky-100 rounded-3xl py-16 px-6 text-center my-3 shadow-sm">
                <div className="bg-sky-50 text-sky-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5">
                  <Layers size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Select a Filter Option
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto m-0 leading-relaxed">
                  Please select an option from the dropdown above to view room categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-3 w-full max-w-full box-border">
                {filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-5 bg-white border border-sky-100 rounded-2xl shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-slate-900 m-0">
                          {cat.name}
                        </h4>
                        <span className="bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap">
                          {cat.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 m-0 mb-3">
                        {cat.specification}
                      </p>
                      <div className="text-xs text-slate-600 space-y-1 py-2 border-y border-sky-100">
                        <div>
                          <span className="font-semibold text-slate-700">Capacity:</span>{" "}
                          {cat.capacity} Bed{cat.capacity > 1 ? "s" : ""} per Room
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Blocks:</span>{" "}
                          <span className="text-slate-500">{cat.blocks}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-sky-50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-sky-600">{cat.fee}</span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                          ✓ {cat.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setNewCategory({
                              name: cat.name,
                              type: cat.type,
                              specification: cat.specification,
                              capacity: cat.capacity,
                              fee: cat.fee,
                              blocks: cat.blocks,
                            });
                            setShowAddCategoryModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              type: "category",
                              id: cat.id,
                              name: cat.name,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4. TAB 3: ROOMS & BED ALLOCATION (Screen 3)                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "allocations" && (
          <div>
            {/* Header Row */}
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3">
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <BedDouble size={24} className="text-sky-600 flex-shrink-0" />
                <span>Rooms &amp; Bed Allocation</span>
              </div>
              <button
                type="button"
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 border-0 flex-shrink-0"
                onClick={() => setShowAddRoomModal(true)}
              >
                <Plus size={15} />
                <span>Add New Room</span>
              </button>
            </div>

            {/* Filter Bar Container */}
            <div className="w-full max-w-full box-border p-3 bg-white rounded-2xl border border-sky-100 mb-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search room number, hostel..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-sky-100 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 transition placeholder:text-slate-400 box-border"
                />
                <Search
                  size={15}
                  className="text-slate-400 absolute left-3 pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter:</span>
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="h-10 w-48 sm:w-56 md:w-60 max-w-full px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border"
                >
                  <option value="">Select Hostel...</option>
                  <option value="all">All Hostels ({blocks.length})</option>
                  {blocks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Empty State vs Rooms Table */}
            {!roomFilter && !roomSearch ? (
              <div className="w-full max-w-full box-border bg-white border border-sky-100 rounded-3xl py-16 px-6 text-center my-3 shadow-sm">
                <div className="bg-sky-50 text-sky-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5">
                  <BedDouble size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  Select a Hostel
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto m-0 leading-relaxed">
                  Please select a hostel option from the filter dropdown above to view room allocations.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-full box-border bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm my-3">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-sky-50/60 border-b border-sky-100">
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">ROOM NUMBER</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">BLOCK CODE</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">FLOOR</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">TYPE</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">CAPACITY</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">OCCUPIED</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">MONTHLY FEE</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-sky-900 uppercase">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {filteredRooms.map((r, idx) => (
                        <tr key={idx} className="hover:bg-sky-50/40 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">Room #{r.roomNo}</td>
                          <td className="py-3 px-4">
                            <span className="bg-sky-50 border border-sky-200 text-sky-700 rounded-lg px-2.5 py-0.5 text-xs font-semibold">
                              {r.block}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-800">Floor {r.floor}</td>
                          <td className="py-3 px-4 text-sm text-slate-800">{r.type}</td>
                          <td className="py-3 px-4 text-sm text-slate-900 font-semibold">{r.capacity} Beds</td>
                          <td className="py-3 px-4">
                            <span
                              className={
                                r.occupied > 0
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                  : "text-slate-500 text-xs font-medium"
                              }
                            >
                              {r.occupied} Occupied
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-sky-600">{r.fee}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoom(r);
                                  setNewRoom({
                                    roomNo: r.roomNo,
                                    floor: r.floor,
                                    block: r.block,
                                    type: r.type,
                                    capacity: r.capacity,
                                    fee: r.fee,
                                  });
                                  setShowAddRoomModal(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "room",
                                    id: r.roomNo,
                                    name: `Room #${r.roomNo}`,
                                  })
                                }
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                Delete
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
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 5. TAB 4: WARDEN ALLOCATION (Screen 4)                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "wardens" && (
          <div>
            {/* Header Row */}
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3">
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2 min-w-0">
                <ShieldCheck size={24} className="text-sky-600 flex-shrink-0" />
                <span>Wardens</span>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 border-0"
                  onClick={() => setShowAssignWardenModal(true)}
                >
                  <UserPlus size={15} />
                  <span>Assign Warden</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const headers = "Employee ID,Warden Name,Designation,Phone,Email,Assigned Hostel\n";
                    const rows = wardens
                      .map((w) => `${w.empId},"${w.name}","${w.designation}",${w.phone},${w.email},"${w.assignedHostels}"`)
                      .join("\n");
                    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "Warden_Allocations.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast("Warden allocations exported successfully!");
                  }}
                  className="border border-sky-300 text-sky-700 hover:bg-sky-50 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer bg-white shadow-sm"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Filter Bar Container */}
            <div className="w-full max-w-full box-border p-3 bg-white rounded-2xl border border-sky-100 mb-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search warden by name, ID, hostel..."
                  value={wardenSearch}
                  onChange={(e) => setWardenSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-sky-100 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 transition placeholder:text-slate-400 box-border"
                />
                <Search
                  size={15}
                  className="text-slate-400 absolute left-3 pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={wardenFilter}
                  onChange={(e) => setWardenFilter(e.target.value)}
                  className="h-10 w-48 sm:w-56 md:w-60 max-w-full px-3 text-xs rounded-xl border border-sky-100 bg-white text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition box-border"
                >
                  <option value="">-- Select Hostel --</option>
                  <option value="all">All Hostels</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Empty State vs Wardens List */}
            {!wardenFilter && !wardenSearch ? (
              <div className="w-full max-w-full box-border bg-white border border-sky-100 rounded-3xl py-16 px-6 text-center my-3 shadow-sm">
                <div className="bg-sky-50 text-sky-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  No Hostel Filter Selected
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto m-0 leading-relaxed">
                  Please select a hostel block from the filter dropdown above or use search/manual entry to load warden records.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-full box-border bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm my-3">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-sky-50/60 border-b border-sky-100">
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">EMP ID</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">WARDEN NAME</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">DESIGNATION</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">ASSIGNED HOSTEL</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">PHONE</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">EMAIL</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-sky-900 uppercase">STATUS</th>
                        <th className="text-right py-3 px-4 text-xs font-bold text-sky-900 uppercase">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {filteredWardens.map((w) => (
                        <tr key={w.id} className="hover:bg-sky-50/40 transition">
                          <td className="py-3 px-4 font-semibold text-xs text-slate-700">{w.empId}</td>
                          <td className="py-3 px-4 font-bold text-sm text-slate-900">{w.name}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">{w.designation}</td>
                          <td className="py-3 px-4">
                            <span className="bg-sky-50 border border-sky-200 text-sky-700 rounded-lg px-2.5 py-0.5 text-xs font-semibold">
                              {w.assignedHostels}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Phone size={12} className="text-sky-600" />
                              <span>{w.phone}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">{w.email}</td>
                          <td className="py-3 px-4">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-semibold inline-block">
                              ✓ {w.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingWarden(w);
                                  setNewWarden({
                                    name: w.name,
                                    empId: w.empId,
                                    designation: w.designation,
                                    phone: w.phone,
                                    email: w.email,
                                    assignedHostels: w.assignedHostels,
                                    gender: w.gender || "Male",
                                  });
                                  setShowAssignWardenModal(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "warden",
                                    id: w.id,
                                    name: w.name,
                                  })
                                }
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                Delete
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
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 1: "ADD NEW HOSTEL BLOCK"                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {showAddBlockModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseAddBlockModal();
            }}
          >
            <div className="max-w-xl w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100">
              {/* Header */}
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-slate-900 m-0">
                  {editingBlock ? "Edit Hostel Block" : "Add New Hostel Block"}
                </h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseAddBlockModal}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddBlockSubmit}>
                {/* 1. Block Name * */}
                <div className="mb-3.5">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Block Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Boys Residence - Block A"
                    required
                    value={newBlock.name}
                    onChange={(e) => setNewBlock({ ...newBlock, name: e.target.value })}
                    className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 transition placeholder:text-slate-400 box-border"
                  />
                </div>

                {/* 2. Three fields in one row (grid grid-cols-3 gap-3) */}
                <div className="grid grid-cols-3 gap-3 mb-3.5">
                  {/* Block Code * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Block Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BLK-A"
                      required
                      value={newBlock.code}
                      onChange={(e) => setNewBlock({ ...newBlock, code: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 transition placeholder:text-slate-400 box-border"
                    />
                  </div>

                  {/* Category * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={newBlock.category}
                      onChange={(e) => setNewBlock({ ...newBlock, category: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer transition box-border"
                    >
                      <option value="">Select Category</option>
                      <option value="Boys">Boys</option>
                      <option value="Girls">Girls</option>
                      <option value="Co-ed">Co-ed</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>

                  {/* Total Floors * */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Total Floors <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={newBlock.floors}
                      onChange={(e) => setNewBlock({ ...newBlock, floors: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer transition box-border"
                    >
                      <option value="">Select Floor</option>
                      <option value="1 Floor">1 Floor</option>
                      <option value="2 Floors">2 Floors</option>
                      <option value="3 Floors">3 Floors</option>
                      <option value="4+ Floors">4+ Floors</option>
                    </select>
                  </div>
                </div>

                {/* 3. Location (Full width) */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. North Campus, Block A"
                    value={newBlock.location}
                    onChange={(e) => setNewBlock({ ...newBlock, location: e.target.value })}
                    className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 transition placeholder:text-slate-400 box-border"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-between items-center mt-6 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAddBlockModal}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer transition border-0"
                  >
                    {editingBlock ? "Update Block" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 2: "+ ADD ROOM TYPE" (CATEGORY MODAL)                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {showAddCategoryModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseAddCategoryModal();
            }}
          >
            <div className="max-w-xl w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-slate-900 m-0">
                  {editingCategory ? "Edit Room Category" : "Add Room Category"}
                </h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseAddCategoryModal}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddCategorySubmit}>
                <div className="mb-3.5">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Double Sharing AC Deluxe"
                    required
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 transition box-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Category Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newCategory.type}
                      onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      <option value="AC Accommodation">AC Accommodation</option>
                      <option value="Non-AC Standard">Non-AC Standard</option>
                      <option value="Special / Deluxe AC">Special / Deluxe AC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Sharing Capacity (Beds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={newCategory.capacity}
                      onChange={(e) => setNewCategory({ ...newCategory, capacity: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Base Monthly Fee
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹8,500/mo"
                      value={newCategory.fee}
                      onChange={(e) => setNewCategory({ ...newCategory, fee: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Associated Blocks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Block A, Block B"
                      value={newCategory.blocks}
                      onChange={(e) => setNewCategory({ ...newCategory, blocks: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Specifications / Amenities
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AC, Attached Bath, Wi-Fi, Balcony"
                    value={newCategory.specification}
                    onChange={(e) => setNewCategory({ ...newCategory, specification: e.target.value })}
                    className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                  />
                </div>

                <div className="flex justify-between items-center mt-6 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAddCategoryModal}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer transition border-0"
                  >
                    {editingCategory ? "Update Category" : "Save Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 3: "+ ADD NEW ROOM"                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {showAddRoomModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseAddRoomModal();
            }}
          >
            <div className="max-w-xl w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-slate-900 m-0">
                  {editingRoom ? "Edit Room Configuration" : "Configure New Room"}
                </h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseAddRoomModal}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddRoomSubmit}>
                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Room Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                      placeholder="e.g. 106"
                      required
                      value={newRoom.roomNo}
                      onChange={(e) => setNewRoom({ ...newRoom, roomNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Hostel Block</label>
                    <select
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                      value={newRoom.block}
                      onChange={(e) => setNewRoom({ ...newRoom, block: e.target.value })}
                    >
                      {blocks.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Floor</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                      value={newRoom.floor}
                      onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Sharing Capacity</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                      value={newRoom.capacity}
                      onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Room Type</label>
                    <select
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                      value={newRoom.type}
                      onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                    >
                      <option value="Single Occupancy">Single Occupancy</option>
                      <option value="Double Sharing">Double Sharing</option>
                      <option value="Triple Sharing">Triple Sharing</option>
                      <option value="Four Sharing">Four Sharing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Monthly Fee</label>
                    <input
                      type="text"
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                      value={newRoom.fee}
                      onChange={(e) => setNewRoom({ ...newRoom, fee: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAddRoomModal}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer transition border-0"
                  >
                    {editingRoom ? "Update Room" : "Save Room"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 4: "+ ASSIGN WARDEN"                                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {showAssignWardenModal && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseAssignWardenModal();
            }}
          >
            <div className="max-w-xl w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-slate-900 m-0">
                  {editingWarden ? "Edit Resident Warden" : "Assign Resident Warden"}
                </h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseAssignWardenModal}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignWardenSubmit}>
                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Warden Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. S. K. Murthy"
                      required
                      value={newWarden.name}
                      onChange={(e) => setNewWarden({ ...newWarden, name: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Employee ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WRD-2024-11"
                      required
                      value={newWarden.empId}
                      onChange={(e) => setNewWarden({ ...newWarden, empId: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={newWarden.phone}
                      onChange={(e) => setNewWarden({ ...newWarden, phone: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. warden@college.edu"
                      value={newWarden.email}
                      onChange={(e) => setNewWarden({ ...newWarden, email: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 box-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Assigned Hostel Block
                    </label>
                    <select
                      value={newWarden.assignedHostels}
                      onChange={(e) => setNewWarden({ ...newWarden, assignedHostels: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      {blocks.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Role / Designation
                    </label>
                    <select
                      value={newWarden.designation}
                      onChange={(e) => setNewWarden({ ...newWarden, designation: e.target.value })}
                      className="w-full border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm p-2.5 outline-none bg-white text-slate-800 cursor-pointer box-border"
                    >
                      <option value="Chief Resident Warden">Chief Resident Warden</option>
                      <option value="Senior Resident Warden">Senior Resident Warden</option>
                      <option value="Resident Warden">Resident Warden</option>
                      <option value="Assistant Resident Warden">Assistant Resident Warden</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAssignWardenModal}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer transition border-0"
                  >
                    {editingWarden ? "Update Warden" : "Assign Warden"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 5: DELETE CONFIRMATION MODAL                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {deleteTarget && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteTarget(null);
            }}
          >
            <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl modal-content-animated border border-sky-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 m-0">Confirm Deletion</h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={() => setDeleteTarget(null)}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">{deleteTarget.name}</span>?
                This record will be permanently removed.
              </p>
              <div className="flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition border-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { type, id, name } = deleteTarget;
                    if (type === "block") deleteHostelBlock(id);
                    else if (type === "category") deleteHostelCategory(id);
                    else if (type === "room") deleteHostelRoom(id);
                    else if (type === "warden") deleteHostelWarden(id);
                    setDeleteTarget(null);
                    showToast(`${name} has been deleted successfully.`);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm cursor-pointer transition border-0"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
