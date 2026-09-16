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
      <div className="hostel-page-wrapper w-full max-w-full box-border">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="pc-toast-banner" role="status">
            <CheckCircle2 size={18} className="text-[var(--cms-primary)] flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. TOP NAVIGATION TAB BAR (CMS Pill Bar) */}
        <nav
          className="cms-card p-1.5 md:p-2 mb-5 flex items-center gap-1.5 flex-wrap"
          aria-label="Hostel Master Navigation Tabs"
        >
          <button
            type="button"
            className={
              activeTab === "blocks"
                ? "cms-btn cms-btn-primary rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 whitespace-nowrap"
                : "cms-btn cms-btn-ghost rounded-xl px-3.5 py-2 text-xs text-[var(--cms-muted)] hover:text-[var(--cms-text)] flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => setActiveTab("blocks")}
          >
            <Building2 size={15} />
            <span>Hostel Blocks</span>
          </button>
          <button
            type="button"
            className={
              activeTab === "categories"
                ? "cms-btn cms-btn-primary rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 whitespace-nowrap"
                : "cms-btn cms-btn-ghost rounded-xl px-3.5 py-2 text-xs text-[var(--cms-muted)] hover:text-[var(--cms-text)] flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => setActiveTab("categories")}
          >
            <Layers size={15} />
            <span>Room Categories</span>
          </button>
          <button
            type="button"
            className={
              activeTab === "allocations"
                ? "cms-btn cms-btn-primary rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 whitespace-nowrap"
                : "cms-btn cms-btn-ghost rounded-xl px-3.5 py-2 text-xs text-[var(--cms-muted)] hover:text-[var(--cms-text)] flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => setActiveTab("allocations")}
          >
            <BedDouble size={15} />
            <span>Rooms &amp; Bed Allocation</span>
          </button>
          <button
            type="button"
            className={
              activeTab === "wardens"
                ? "cms-btn cms-btn-primary rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 whitespace-nowrap"
                : "cms-btn cms-btn-ghost rounded-xl px-3.5 py-2 text-xs text-[var(--cms-muted)] hover:text-[var(--cms-text)] flex items-center gap-2 whitespace-nowrap"
            }
            onClick={() => setActiveTab("wardens")}
          >
            <ShieldCheck size={15} />
            <span>Warden Allocation</span>
          </button>
        </nav>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. TAB 1: HOSTEL BLOCKS (Screen 1)                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "blocks" && (
          <div>
            {/* Header Row */}
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="text-xl font-bold text-[var(--cms-text)] flex items-center gap-2 min-w-0">
                <Building2 size={22} className="text-[var(--cms-primary)] flex-shrink-0" />
                <span>Hostels</span>
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-primary rounded-xl px-3.5 py-2 text-xs flex items-center gap-1.5 flex-shrink-0"
                onClick={() => setShowAddBlockModal(true)}
              >
                <Plus size={14} />
                <span>Add New Hostel Block</span>
              </button>
            </div>

            {/* Filter Bar Container */}
            <div className="cms-card p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={blockSearch}
                  onChange={(e) => setBlockSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface)] outline-none focus:border-[var(--cms-primary)] focus:ring-1 focus:ring-[var(--cms-primary)] text-[var(--cms-text)] transition placeholder:text-[var(--cms-muted)] box-border"
                />
                <Search
                  size={14}
                  className="text-[var(--cms-muted)] absolute left-2.5 pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-[var(--cms-muted)] font-medium whitespace-nowrap">Filter:</span>
                <select
                  value={blockFilter}
                  onChange={(e) => setBlockFilter(e.target.value)}
                  className="h-9 w-48 sm:w-56 md:w-60 max-w-full px-2.5 text-xs rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)] outline-none focus:border-[var(--cms-primary)] focus:ring-1 focus:ring-[var(--cms-primary)] cursor-pointer transition box-border"
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
              <div className="cms-card rounded-2xl py-14 px-6 text-center my-3 shadow-sm">
                <div className="bg-[var(--cms-primary-soft)] text-[var(--cms-primary)] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Building2 size={24} />
                </div>
                <h3 className="text-sm font-bold text-[var(--cms-text)] mb-1">
                  Select a Hostel
                </h3>
                <p className="text-xs text-[var(--cms-muted)] max-w-md mx-auto m-0 leading-relaxed">
                  Please select a hostel option from the filter dropdown above to render operational hostel blocks.
                </p>
              </div>
            ) : (
              <div className="cms-card rounded-2xl border border-[var(--cms-border)] overflow-hidden shadow-sm my-3">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-[var(--cms-table-header)] border-b border-[var(--cms-border)]">
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">BLOCK NAME &amp; CODE</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">CATEGORY</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">FLOORS</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">ROOMS</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">CAPACITY</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">OCCUPIED / VACANT</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">RESIDENT WARDEN</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">STATUS</th>
                        <th className="text-right py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--cms-border)]">
                      {filteredBlocks.map((b) => (
                        <tr key={b.id} className="hover:bg-[var(--cms-hover)] transition border-b border-[var(--cms-border)]">
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[var(--cms-text)] text-sm">{b.name}</span>
                              <span className="bg-[var(--cms-primary-soft)] border border-[var(--cms-primary-border)] text-[var(--cms-primary)] rounded-md px-2 py-0.5 text-xs font-semibold">
                                {b.code}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="bg-[var(--cms-subtle)] text-[var(--cms-text)] rounded-full px-2.5 py-0.5 text-xs font-medium inline-block">
                              {b.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-xs text-[var(--cms-text)] font-medium">{b.floors} Floors</td>
                          <td className="py-2.5 px-3.5 text-xs text-[var(--cms-text)] font-medium">{b.totalRooms} Rooms</td>
                          <td className="py-2.5 px-3.5 text-xs text-[var(--cms-text)] font-bold">{b.totalBeds} Beds</td>
                          <td className="py-2.5 px-3.5">
                            <div className="text-xs font-semibold">
                              <span className="text-[var(--cms-amber)]">{b.occupiedBeds} Occ</span>
                              <span className="text-[var(--cms-muted)] mx-1">/</span>
                              <span className="text-[var(--cms-green)]">{b.vacantBeds} Vac</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="text-xs font-semibold text-[var(--cms-text)]">{b.warden}</div>
                            <div className="text-[11px] text-[var(--cms-muted)] flex items-center gap-1 mt-0.5">
                              <Phone size={10} className="text-[var(--cms-primary)]" /> {b.wardenPhone}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="cms-badge cms-badge-active">
                              {b.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
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
                                className="cms-btn cms-btn-ghost px-2.5 py-1 text-xs"
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
                                className="cms-btn cms-btn-ghost danger px-2.5 py-1 text-xs"
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
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[var(--cms-text)] m-0">Room Categories</h2>
              <button
                type="button"
                className="cms-btn cms-btn-primary rounded-xl px-3.5 py-2 text-xs flex items-center gap-1.5 flex-shrink-0"
                onClick={() => setShowAddCategoryModal(true)}
              >
                <Plus size={14} />
                <span>Add Room Type</span>
              </button>
            </div>

            {/* Filter Bar Container */}
            <div className="cms-card p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search by category or specification..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface)] outline-none focus:border-[var(--cms-primary)] focus:ring-1 focus:ring-[var(--cms-primary)] text-[var(--cms-text)] transition placeholder:text-[var(--cms-muted)] box-border"
                />
                <Search
                  size={14}
                  className="text-[var(--cms-muted)] absolute left-2.5 pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 w-52 sm:w-60 md:w-64 max-w-full px-2.5 text-xs rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)] outline-none focus:border-[var(--cms-primary)] focus:ring-1 focus:ring-[var(--cms-primary)] cursor-pointer transition box-border"
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
              <div className="cms-card rounded-2xl py-14 px-6 text-center my-3 shadow-sm">
                <div className="bg-[var(--cms-primary-soft)] text-[var(--cms-primary)] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Layers size={24} />
                </div>
                <h3 className="text-sm font-bold text-[var(--cms-text)] mb-1">
                  Select a Filter Option
                </h3>
                <p className="text-xs text-[var(--cms-muted)] max-w-md mx-auto m-0 leading-relaxed">
                  Please select an option from the dropdown above to view room categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-3 w-full max-w-full box-border">
                {filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="cms-card p-4 rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-[var(--cms-text)] m-0">
                          {cat.name}
                        </h4>
                        <span className="bg-[var(--cms-primary-soft)] text-[var(--cms-primary)] border border-[var(--cms-primary-border)] rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap">
                          {cat.type}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--cms-muted)] m-0 mb-3 leading-relaxed">
                        {cat.specification}
                      </p>
                      <div className="text-xs text-[var(--cms-text)] space-y-1 py-2 border-y border-[var(--cms-border)]">
                        <div>
                          <span className="font-semibold text-[var(--cms-text)]">Capacity:</span>{" "}
                          {cat.capacity} Bed{cat.capacity > 1 ? "s" : ""} per Room
                        </div>
                        <div>
                          <span className="font-semibold text-[var(--cms-text)]">Blocks:</span>{" "}
                          <span className="text-[var(--cms-muted)]">{cat.blocks}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-[var(--cms-border)]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--cms-primary)]">{cat.fee}</span>
                        <span className="cms-badge cms-badge-active">
                          {cat.status}
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
                          className="cms-btn cms-btn-ghost px-2.5 py-1 text-xs"
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
                          className="cms-btn cms-btn-ghost danger px-2.5 py-1 text-xs"
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
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="text-xl font-bold text-[var(--cms-text)] flex items-center gap-2 min-w-0">
                <BedDouble size={22} className="text-[var(--cms-primary)] flex-shrink-0" />
                <span>Rooms &amp; Bed Allocation</span>
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-primary rounded-xl px-3.5 py-2 text-xs flex items-center gap-1.5 flex-shrink-0"
                onClick={() => setShowAddRoomModal(true)}
              >
                <Plus size={14} />
                <span>Add New Room</span>
              </button>
            </div>

            {/* Filter Bar Container */}
            <div className="cms-card p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search room number, hostel..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface)] outline-none focus:border-[var(--cms-primary)] focus:ring-1 focus:ring-[var(--cms-primary)] text-[var(--cms-text)] transition placeholder:text-[var(--cms-muted)] box-border"
                />
                <Search
                  size={14}
                  className="text-[var(--cms-muted)] absolute left-2.5 pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-[var(--cms-muted)] font-medium whitespace-nowrap">Filter:</span>
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="h-9 w-48 sm:w-56 md:w-60 max-w-full px-2.5 text-xs rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)] outline-none focus:border-[var(--cms-primary)] focus:ring-1 focus:ring-[var(--cms-primary)] cursor-pointer transition box-border"
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
              <div className="cms-card rounded-2xl py-14 px-6 text-center my-3 shadow-sm">
                <div className="bg-[var(--cms-primary-soft)] text-[var(--cms-primary)] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <BedDouble size={24} />
                </div>
                <h3 className="text-sm font-bold text-[var(--cms-text)] mb-1">
                  Select a Hostel
                </h3>
                <p className="text-xs text-[var(--cms-muted)] max-w-md mx-auto m-0 leading-relaxed">
                  Please select a hostel option from the filter dropdown above to view room allocations.
                </p>
              </div>
            ) : (
              <div className="cms-card rounded-2xl border border-[var(--cms-border)] overflow-hidden shadow-sm my-3">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-[var(--cms-table-header)] border-b border-[var(--cms-border)]">
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">ROOM NUMBER</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">BLOCK CODE</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">FLOOR</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">TYPE</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">CAPACITY</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">OCCUPIED</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">MONTHLY FEE</th>
                        <th className="text-right py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--cms-border)]">
                      {filteredRooms.map((r, idx) => (
                        <tr key={idx} className="hover:bg-[var(--cms-hover)] transition border-b border-[var(--cms-border)]">
                          <td className="py-2.5 px-3.5 font-bold text-[var(--cms-text)]">Room #{r.roomNo}</td>
                          <td className="py-2.5 px-3.5">
                            <span className="bg-[var(--cms-primary-soft)] border border-[var(--cms-primary-border)] text-[var(--cms-primary)] rounded-md px-2 py-0.5 text-xs font-semibold">
                              {r.block}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-xs text-[var(--cms-text)]">Floor {r.floor}</td>
                          <td className="py-2.5 px-3.5 text-xs text-[var(--cms-text)]">{r.type}</td>
                          <td className="py-2.5 px-3.5 text-xs text-[var(--cms-text)] font-semibold">{r.capacity} Beds</td>
                          <td className="py-2.5 px-3.5">
                            <span
                              className={
                                r.occupied > 0
                                  ? "cms-badge cms-badge-warn"
                                  : "cms-badge cms-badge-inactive"
                              }
                            >
                              {r.occupied} Occupied
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-[var(--cms-primary)]">{r.fee}</td>
                          <td className="py-2.5 px-3.5 text-right">
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
                                className="cms-btn cms-btn-ghost px-2.5 py-1 text-xs"
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
                                className="cms-btn cms-btn-ghost danger px-2.5 py-1 text-xs"
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
            <div className="w-full max-w-full box-border flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="text-xl font-bold text-[var(--cms-text)] flex items-center gap-2 min-w-0">
                <ShieldCheck size={22} className="text-[var(--cms-primary)] flex-shrink-0" />
                <span>Wardens</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  className="cms-btn cms-btn-primary rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
                  onClick={() => setShowAssignWardenModal(true)}
                >
                  <UserPlus size={14} />
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
                  className="cms-btn cms-btn-ghost rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Filter Bar Container */}
            <div className="cms-card p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex items-center flex-1 max-w-sm min-w-0">
                <input
                  type="text"
                  placeholder="Search warden by name, ID, hostel..."
                  value={wardenSearch}
                  onChange={(e) => setWardenSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface)] outline-none focus:border-[var(--cms-primary)] focus:ring-1 focus:ring-[var(--cms-primary)] text-[var(--cms-text)] transition placeholder:text-[var(--cms-muted)] box-border"
                />
                <Search
                  size={14}
                  className="text-[var(--cms-muted)] absolute left-2.5 pointer-events-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={wardenFilter}
                  onChange={(e) => setWardenFilter(e.target.value)}
                  className="h-9 w-48 sm:w-56 md:w-60 max-w-full px-2.5 text-xs rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)] outline-none focus:border-[var(--cms-primary)] focus:ring-1 focus:ring-[var(--cms-primary)] cursor-pointer transition box-border"
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
              <div className="cms-card rounded-2xl py-14 px-6 text-center my-3 shadow-sm">
                <div className="bg-[var(--cms-primary-soft)] text-[var(--cms-primary)] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-sm font-bold text-[var(--cms-text)] mb-1">
                  No Hostel Filter Selected
                </h3>
                <p className="text-xs text-[var(--cms-muted)] max-w-md mx-auto m-0 leading-relaxed">
                  Please select a hostel block from the filter dropdown above or use search/manual entry to load warden records.
                </p>
              </div>
            ) : (
              <div className="cms-card rounded-2xl border border-[var(--cms-border)] overflow-hidden shadow-sm my-3">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table w-full">
                    <thead>
                      <tr className="bg-[var(--cms-table-header)] border-b border-[var(--cms-border)]">
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">EMP ID</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">WARDEN NAME</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">DESIGNATION</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">ASSIGNED HOSTEL</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">PHONE</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">EMAIL</th>
                        <th className="text-left py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">STATUS</th>
                        <th className="text-right py-2.5 px-3.5 text-xs font-bold text-[var(--cms-muted)] uppercase">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--cms-border)]">
                      {filteredWardens.map((w) => (
                        <tr key={w.id} className="hover:bg-[var(--cms-hover)] transition border-b border-[var(--cms-border)]">
                          <td className="py-2.5 px-3.5 font-semibold text-xs text-[var(--cms-muted)]">{w.empId}</td>
                          <td className="py-2.5 px-3.5 font-bold text-sm text-[var(--cms-text)]">{w.name}</td>
                          <td className="py-2.5 px-3.5 text-xs text-[var(--cms-muted)]">{w.designation}</td>
                          <td className="py-2.5 px-3.5">
                            <span className="bg-[var(--cms-primary-soft)] border border-[var(--cms-primary-border)] text-[var(--cms-primary)] rounded-md px-2 py-0.5 text-xs font-semibold">
                              {w.assignedHostels}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-xs text-[var(--cms-text)]">
                            <div className="flex items-center gap-1">
                              <Phone size={11} className="text-[var(--cms-primary)]" />
                              <span>{w.phone}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-xs text-[var(--cms-text)]">{w.email}</td>
                          <td className="py-2.5 px-3.5">
                            <span className="cms-badge cms-badge-active">
                              {w.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
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
                                className="cms-btn cms-btn-ghost px-2.5 py-1 text-xs"
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
                                className="cms-btn cms-btn-ghost danger px-2.5 py-1 text-xs"
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
            className="cms-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseAddBlockModal();
            }}
          >
            <div className="cms-modal max-w-xl w-full bg-[var(--cms-surface)] rounded-3xl p-6 shadow-2xl modal-content-animated border border-[var(--cms-border)]">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--cms-border)]">
                <h3 className="text-base md:text-lg font-bold text-[var(--cms-text)] m-0">
                  {editingBlock ? "Edit Hostel Block" : "Add New Hostel Block"}
                </h3>
                <button
                  type="button"
                  className="text-[var(--cms-muted)] hover:text-[var(--cms-text)] text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseAddBlockModal}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddBlockSubmit}>
                {/* 1. Block Name * */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                    Block Name <span className="text-[var(--cms-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Boys Residence - Block A"
                    required
                    value={newBlock.name}
                    onChange={(e) => setNewBlock({ ...newBlock, name: e.target.value })}
                    className="hostel-input text-xs sm:text-sm"
                  />
                </div>

                {/* 2. Three fields in one row (grid grid-cols-3 gap-3) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {/* Block Code * */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Block Code <span className="text-[var(--cms-red)]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BLK-A"
                      required
                      value={newBlock.code}
                      onChange={(e) => setNewBlock({ ...newBlock, code: e.target.value })}
                      className="hostel-input text-xs sm:text-sm"
                    />
                  </div>

                  {/* Category * */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Category <span className="text-[var(--cms-red)]">*</span>
                    </label>
                    <select
                      required
                      value={newBlock.category}
                      onChange={(e) => setNewBlock({ ...newBlock, category: e.target.value })}
                      className="hostel-select text-xs sm:text-sm cursor-pointer"
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
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Total Floors <span className="text-[var(--cms-red)]">*</span>
                    </label>
                    <select
                      required
                      value={newBlock.floors}
                      onChange={(e) => setNewBlock({ ...newBlock, floors: e.target.value })}
                      className="hostel-select text-xs sm:text-sm cursor-pointer"
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
                  <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. North Campus, Block A"
                    value={newBlock.location}
                    onChange={(e) => setNewBlock({ ...newBlock, location: e.target.value })}
                    className="hostel-input text-xs sm:text-sm"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-between items-center mt-5 pt-3 border-t border-[var(--cms-border)]">
                  <button
                    type="button"
                    onClick={handleCloseAddBlockModal}
                    className="cms-btn cms-btn-ghost px-4 py-2 rounded-xl text-xs sm:text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cms-btn cms-btn-primary px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold"
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
            className="cms-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseAddCategoryModal();
            }}
          >
            <div className="cms-modal max-w-xl w-full bg-[var(--cms-surface)] rounded-3xl p-6 shadow-2xl modal-content-animated border border-[var(--cms-border)]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--cms-border)]">
                <h3 className="text-base md:text-lg font-bold text-[var(--cms-text)] m-0">
                  {editingCategory ? "Edit Room Category" : "Add Room Category"}
                </h3>
                <button
                  type="button"
                  className="text-[var(--cms-muted)] hover:text-[var(--cms-text)] text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseAddCategoryModal}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddCategorySubmit}>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                    Category Name <span className="text-[var(--cms-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Double Sharing AC Deluxe"
                    required
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="hostel-input text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Category Type <span className="text-[var(--cms-red)]">*</span>
                    </label>
                    <select
                      value={newCategory.type}
                      onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                      className="hostel-select text-xs sm:text-sm cursor-pointer"
                    >
                      <option value="AC Accommodation">AC Accommodation</option>
                      <option value="Non-AC Standard">Non-AC Standard</option>
                      <option value="Special / Deluxe AC">Special / Deluxe AC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Sharing Capacity (Beds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={newCategory.capacity}
                      onChange={(e) => setNewCategory({ ...newCategory, capacity: e.target.value })}
                      className="hostel-input text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Base Monthly Fee
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹8,500/mo"
                      value={newCategory.fee}
                      onChange={(e) => setNewCategory({ ...newCategory, fee: e.target.value })}
                      className="hostel-input text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Associated Blocks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Block A, Block B"
                      value={newCategory.blocks}
                      onChange={(e) => setNewCategory({ ...newCategory, blocks: e.target.value })}
                      className="hostel-input text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                    Specifications / Amenities
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AC, Attached Bath, Wi-Fi, Balcony"
                    value={newCategory.specification}
                    onChange={(e) => setNewCategory({ ...newCategory, specification: e.target.value })}
                    className="hostel-input text-xs sm:text-sm"
                  />
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-[var(--cms-border)]">
                  <button
                    type="button"
                    onClick={handleCloseAddCategoryModal}
                    className="cms-btn cms-btn-ghost px-4 py-2 rounded-xl text-xs sm:text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cms-btn cms-btn-primary px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold"
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
            className="cms-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseAddRoomModal();
            }}
          >
            <div className="cms-modal max-w-xl w-full bg-[var(--cms-surface)] rounded-3xl p-6 shadow-2xl modal-content-animated border border-[var(--cms-border)]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--cms-border)]">
                <h3 className="text-base md:text-lg font-bold text-[var(--cms-text)] m-0">
                  {editingRoom ? "Edit Room Configuration" : "Configure New Room"}
                </h3>
                <button
                  type="button"
                  className="text-[var(--cms-muted)] hover:text-[var(--cms-text)] text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseAddRoomModal}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddRoomSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Room Number <span className="text-[var(--cms-red)]">*</span>
                    </label>
                    <input
                      type="text"
                      className="hostel-input text-xs sm:text-sm"
                      placeholder="e.g. 106"
                      required
                      value={newRoom.roomNo}
                      onChange={(e) => setNewRoom({ ...newRoom, roomNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">Hostel Block</label>
                    <select
                      className="hostel-select text-xs sm:text-sm cursor-pointer"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">Floor</label>
                    <input
                      type="number"
                      min="1"
                      className="hostel-input text-xs sm:text-sm"
                      value={newRoom.floor}
                      onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">Sharing Capacity</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      className="hostel-input text-xs sm:text-sm"
                      value={newRoom.capacity}
                      onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">Room Type</label>
                    <select
                      className="hostel-select text-xs sm:text-sm cursor-pointer"
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
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">Monthly Fee</label>
                    <input
                      type="text"
                      className="hostel-input text-xs sm:text-sm"
                      value={newRoom.fee}
                      onChange={(e) => setNewRoom({ ...newRoom, fee: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-[var(--cms-border)]">
                  <button
                    type="button"
                    onClick={handleCloseAddRoomModal}
                    className="cms-btn cms-btn-ghost px-4 py-2 rounded-xl text-xs sm:text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cms-btn cms-btn-primary px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold"
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
            className="cms-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseAssignWardenModal();
            }}
          >
            <div className="cms-modal max-w-xl w-full bg-[var(--cms-surface)] rounded-3xl p-6 shadow-2xl modal-content-animated border border-[var(--cms-border)]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--cms-border)]">
                <h3 className="text-base md:text-lg font-bold text-[var(--cms-text)] m-0">
                  {editingWarden ? "Edit Resident Warden" : "Assign Resident Warden"}
                </h3>
                <button
                  type="button"
                  className="text-[var(--cms-muted)] hover:text-[var(--cms-text)] text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={handleCloseAssignWardenModal}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignWardenSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Warden Name <span className="text-[var(--cms-red)]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. S. K. Murthy"
                      required
                      value={newWarden.name}
                      onChange={(e) => setNewWarden({ ...newWarden, name: e.target.value })}
                      className="hostel-input text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Employee ID <span className="text-[var(--cms-red)]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WRD-2024-11"
                      required
                      value={newWarden.empId}
                      onChange={(e) => setNewWarden({ ...newWarden, empId: e.target.value })}
                      className="hostel-input text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={newWarden.phone}
                      onChange={(e) => setNewWarden({ ...newWarden, phone: e.target.value })}
                      className="hostel-input text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. warden@college.edu"
                      value={newWarden.email}
                      onChange={(e) => setNewWarden({ ...newWarden, email: e.target.value })}
                      className="hostel-input text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Assigned Hostel Block
                    </label>
                    <select
                      value={newWarden.assignedHostels}
                      onChange={(e) => setNewWarden({ ...newWarden, assignedHostels: e.target.value })}
                      className="hostel-select text-xs sm:text-sm cursor-pointer"
                    >
                      {blocks.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--cms-text)] mb-1">
                      Role / Designation
                    </label>
                    <select
                      value={newWarden.designation}
                      onChange={(e) => setNewWarden({ ...newWarden, designation: e.target.value })}
                      className="hostel-select text-xs sm:text-sm cursor-pointer"
                    >
                      <option value="Chief Resident Warden">Chief Resident Warden</option>
                      <option value="Senior Resident Warden">Senior Resident Warden</option>
                      <option value="Resident Warden">Resident Warden</option>
                      <option value="Assistant Resident Warden">Assistant Resident Warden</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-[var(--cms-border)]">
                  <button
                    type="button"
                    onClick={handleCloseAssignWardenModal}
                    className="cms-btn cms-btn-ghost px-4 py-2 rounded-xl text-xs sm:text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cms-btn cms-btn-primary px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold"
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
            className="cms-overlay fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteTarget(null);
            }}
          >
            <div className="cms-modal max-w-md w-full bg-[var(--cms-surface)] rounded-3xl p-6 shadow-2xl modal-content-animated border border-[var(--cms-border)]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--cms-border)]">
                <h3 className="text-base md:text-lg font-bold text-[var(--cms-text)] m-0">Confirm Deletion</h3>
                <button
                  type="button"
                  className="text-[var(--cms-muted)] hover:text-[var(--cms-text)] text-lg cursor-pointer bg-transparent border-0 p-1 transition leading-none"
                  onClick={() => setDeleteTarget(null)}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs sm:text-sm text-[var(--cms-muted)] mb-5 leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-[var(--cms-text)]">{deleteTarget.name}</span>?
                This record will be permanently removed.
              </p>
              <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-[var(--cms-border)]">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="cms-btn cms-btn-ghost px-4 py-2 rounded-xl text-xs sm:text-sm font-medium"
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
                  className="cms-btn cms-btn-ghost danger px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold"
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
