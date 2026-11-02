import React, { useState, useMemo, useEffect } from "react";
import {
  Shield,
  Layers,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Search,
  Check,
  X,
  Sparkles,
  Copy,
  PlusCircle,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Sliders,
  AlertTriangle,
  FolderPlus,
  FileCheck,
} from "lucide-react";
import { ACTIONS, ACTION_LABELS, PERMISSION_PRESETS } from "../rolesPermissions.constants.js";
import { ScreenPreviewCard } from "./ScreenPreviewCard";
import { ScreenPreviewModal } from "./ScreenPreviewModal";
import { getScreenPreview } from "../screenPreviews";
import { syncServerPreviews } from "../services/screenImageService";
import "./VisualRoleWizard.css";

const SECTIONS = [
  "All",
  "Academic",
  "Student",
  "Staff",
  "Examinations",
  "Finance",
  "Documents & Reports",
  "Hostel Management",
  "Administration",
  "Operations",
];

export function VisualRoleWizard({
  roles = [],
  selectedRoleId,
  allModules = [],
  initialPermissions = [],
  onSavePermissions,
  onClose,
  onCreateRole,
  onCloneRole,
}) {
  // Stepper State: 1 = Role, 2 = Screens, 3 = Permissions, 4 = Review
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Role Setup State
  const [roleMode, setRoleMode] = useState("existing"); // "existing" | "new" | "clone"
  const [targetRoleId, setTargetRoleId] = useState(selectedRoleId || roles[0]?.id);
  const [roleSearch, setRoleSearch] = useState("");
  const [newRoleForm, setNewRoleForm] = useState({
    name: "",
    description: "",
    cloneSourceId: selectedRoleId || roles[0]?.id || "",
  });

  // Step 2: Screen Selection State
  const [selectedScreenKeys, setSelectedScreenKeys] = useState(new Set());
  const [gallerySearch, setGallerySearch] = useState("");
  const [activeSection, setActiveSection] = useState("All");
  const [activeModuleFilter, setActiveModuleFilter] = useState("all");

  // Lightbox Zoom Modal State
  const [inspectModal, setInspectModal] = useState({
    isOpen: false,
    screen: null,
    module: null,
    preview: null,
  });

  // Step 3: Granular Permissions State: Map of "moduleId:screenId" => Set of actions
  const [permissionsMap, setPermissionsMap] = useState(new Map());

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Sync server preview images on mount
  useEffect(() => {
    syncServerPreviews();
  }, []);

  // Find currently active role object
  const currentRole = useMemo(() => {
    return roles.find((r) => String(r.id) === String(targetRoleId)) || roles[0];
  }, [roles, targetRoleId]);

  // Initialize selected screens and permissions from initialPermissions or role changes
  useEffect(() => {
    const screensSet = new Set();
    const permMap = new Map();

    if (Array.isArray(initialPermissions) && initialPermissions.length > 0) {
      initialPermissions.forEach((mod) => {
        const modId = (mod.module || mod.id || "").toLowerCase();
        if (Array.isArray(mod.screens) && mod.screens.length > 0) {
          mod.screens.forEach((sc) => {
            const scId = sc.screenId || sc.id;
            const key = `${modId}:${scId}`;
            const actions = new Set(sc.actions || []);

            // If screen has any view/action permission, mark as selected
            if (actions.size > 0 && actions.has(ACTIONS.VIEW)) {
              screensSet.add(key);
              permMap.set(key, actions);
            }
          });
        }
      });
    }

    // If nothing was selected (e.g. brand new role), keep clean
    setSelectedScreenKeys(screensSet);
    setPermissionsMap(permMap);
  }, [initialPermissions, targetRoleId]);

  // Filtered Roles for Step 1
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      // Don't allow selecting super-admin or admin for full overhaul
      if (r.code === "super-admin" || r.code === "admin") return false;
      if (!roleSearch.trim()) return true;
      const q = roleSearch.toLowerCase();
      return (
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.code?.toLowerCase().includes(q)
      );
    });
  }, [roles, roleSearch]);

  // All Screens Flat List with Module Info
  const allScreensWithModule = useMemo(() => {
    const list = [];
    allModules.forEach((mod) => {
      if (Array.isArray(mod.screens)) {
        mod.screens.forEach((sc) => {
          list.push({
            screen: sc,
            module: mod,
            key: `${mod.id}:${sc.id}`,
          });
        });
      }
    });
    return list;
  }, [allModules]);

  // Filtered Screens for Step 2 Gallery
  const filteredScreens = useMemo(() => {
    return allScreensWithModule.filter(({ screen, module }) => {
      // Section filter
      if (activeSection !== "All" && module.section !== activeSection) {
        return false;
      }
      // Module filter
      if (activeModuleFilter !== "all" && module.id !== activeModuleFilter) {
        return false;
      }
      // Search term
      if (gallerySearch.trim()) {
        const q = gallerySearch.toLowerCase();
        const matchesName = screen.name?.toLowerCase().includes(q);
        const matchesDesc = screen.description?.toLowerCase().includes(q);
        const matchesMod = module.name?.toLowerCase().includes(q);
        const matchesRoute = screen.route?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesMod && !matchesRoute) {
          return false;
        }
      }
      return true;
    });
  }, [allScreensWithModule, activeSection, activeModuleFilter, gallerySearch]);

  // Selected Modules summary count
  const selectedModulesCount = useMemo(() => {
    const modSet = new Set();
    selectedScreenKeys.forEach((key) => {
      const [modId] = key.split(":");
      modSet.add(modId);
    });
    return modSet.size;
  }, [selectedScreenKeys]);

  // Toggle single screen selection in Step 2
  const handleToggleScreen = (screenId, moduleId) => {
    const key = `${moduleId}:${screenId}`;
    setSelectedScreenKeys((prev) => {
      const next = new Set(prev);
      const nextPerms = new Map(permissionsMap);

      if (next.has(key)) {
        next.delete(key);
        nextPerms.delete(key);
      } else {
        next.add(key);
        // Default to View permission when selected
        nextPerms.set(key, new Set([ACTIONS.VIEW]));
      }
      setPermissionsMap(nextPerms);
      return next;
    });
  };

  // Bulk select/deselect in filtered view
  const handleSelectAllFiltered = (shouldSelect) => {
    setSelectedScreenKeys((prev) => {
      const next = new Set(prev);
      const nextPerms = new Map(permissionsMap);

      filteredScreens.forEach(({ key }) => {
        if (shouldSelect) {
          next.add(key);
          if (!nextPerms.has(key) || nextPerms.get(key).size === 0) {
            nextPerms.set(key, new Set([ACTIONS.VIEW]));
          }
        } else {
          next.delete(key);
          nextPerms.delete(key);
        }
      });

      setPermissionsMap(nextPerms);
      return next;
    });
  };

  // Step 3: Toggle specific action permission for a screen
  const handleToggleAction = (key, action) => {
    setPermissionsMap((prev) => {
      const next = new Map(prev);
      const currentActions = new Set(next.get(key) || []);

      if (currentActions.has(action)) {
        currentActions.delete(action);
        // If unchecking VIEW, remove all modification actions
        if (action === ACTIONS.VIEW) {
          currentActions.clear();
        }
      } else {
        currentActions.add(action);
        // If checking any action, automatically ensure VIEW is granted
        currentActions.add(ACTIONS.VIEW);
      }

      next.set(key, currentActions);
      return next;
    });
  };

  // Step 3: Screen-level Preset Quick Setter
  const handleApplyScreenPreset = (key, presetType) => {
    setPermissionsMap((prev) => {
      const next = new Map(prev);
      if (presetType === "full") {
        next.set(key, new Set([ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE]));
      } else if (presetType === "view") {
        next.set(key, new Set([ACTIONS.VIEW]));
      } else if (presetType === "operational") {
        next.set(key, new Set([ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT]));
      } else if (presetType === "revoke") {
        next.set(key, new Set());
      }
      return next;
    });
  };

  // Step 3: Global Preset Setter for all selected screens
  const handleApplyGlobalPreset = (presetType) => {
    setPermissionsMap((prev) => {
      const next = new Map(prev);
      selectedScreenKeys.forEach((key) => {
        if (presetType === "full") {
          next.set(key, new Set([ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT, ACTIONS.DELETE]));
        } else if (presetType === "view") {
          next.set(key, new Set([ACTIONS.VIEW]));
        } else if (presetType === "operational") {
          next.set(key, new Set([ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.EDIT]));
        }
      });
      return next;
    });
  };

  // Step 4: Save & Deploy
  const handleSaveAndDeploy = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let finalRoleId = targetRoleId;
      let finalRoleName = currentRole?.name;

      // Handle Role Creation if in 'new' mode
      if (roleMode === "new") {
        if (!newRoleForm.name.trim()) {
          throw new Error("Please enter a name for the new role.");
        }
        const created = await onCreateRole({
          name: newRoleForm.name.trim(),
          description: newRoleForm.description.trim(),
        });
        if (!created || !created.id) {
          throw new Error("Failed to create role. Please try again.");
        }
        finalRoleId = created.id;
        finalRoleName = created.name;
      } else if (roleMode === "clone") {
        if (!newRoleForm.name.trim()) {
          throw new Error("Please enter a name for the cloned role.");
        }
        const cloned = await onCloneRole(newRoleForm.cloneSourceId, {
          newName: newRoleForm.name.trim(),
          description: newRoleForm.description.trim(),
        });
        if (!cloned || !cloned.id) {
          throw new Error("Failed to clone role. Please try again.");
        }
        finalRoleId = cloned.id;
        finalRoleName = cloned.name;
      }

      // Build structured payload for backend
      const moduleMap = new Map();

      allModules.forEach((mod) => {
        const modId = mod.id;
        const screensPayload = [];

        if (Array.isArray(mod.screens)) {
          mod.screens.forEach((sc) => {
            const key = `${modId}:${sc.id}`;
            const actions = Array.from(permissionsMap.get(key) || []);

            // Only include granted actions if screen was selected and has view
            if (selectedScreenKeys.has(key) && actions.includes(ACTIONS.VIEW)) {
              screensPayload.push({
                screenId: sc.id,
                screenName: sc.name,
                actions: actions,
              });
            } else {
              // Revoked/Unselected screen
              screensPayload.push({
                screenId: sc.id,
                screenName: sc.name,
                actions: [],
              });
            }
          });
        }

        // Aggregate module-level actions: grant action at module if any child screen has it
        const aggregatedModuleActions = new Set();
        screensPayload.forEach((sc) => {
          sc.actions.forEach((a) => aggregatedModuleActions.add(a));
        });

        moduleMap.set(modId, {
          module: modId,
          actions: Array.from(aggregatedModuleActions),
          screens: screensPayload,
        });
      });

      const finalPermissionsPayload = Array.from(moduleMap.values());

      await onSavePermissions(finalRoleId, finalPermissionsPayload, {
        id: finalRoleId,
        name: finalRoleName,
      });

      // Exit wizard
      onClose();
    } catch (err) {
      console.error("Deploy error in VisualRoleWizard:", err);
      setSubmitError(err.message || "An unexpected error occurred while deploying permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inspect Screen Lightbox Handler
  const handleOpenInspect = (screen, module, preview, imageUrl = null) => {
    setInspectModal({
      isOpen: true,
      screen,
      module,
      preview,
      imageUrl,
    });
  };

  return (
    <div className="visual-role-wizard-container">
      {/* Top Header with Stepper */}
      <div className="wizard-top-header">
        <div className="wizard-title-group">
          <h2>
            <Sparkles size={20} color="var(--cms-primary, #6F8400)" />
            Visual Role Builder
          </h2>
          <p>Guided, visual screen assignment & enterprise permission configuration</p>
        </div>

        {/* 4-Step Stepper Bar */}
        <div className="wizard-stepper">
          <div
            className={`wizard-step-node ${currentStep === 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}
            onClick={() => setCurrentStep(1)}
          >
            <span className="step-num-pill">{currentStep > 1 ? "✓" : "1"}</span>
            <span>Target Role</span>
          </div>

          <div className="step-divider" />

          <div
            className={`wizard-step-node ${currentStep === 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}
            onClick={() => {
              if (currentStep >= 1) setCurrentStep(2);
            }}
          >
            <span className="step-num-pill">{currentStep > 2 ? "✓" : "2"}</span>
            <span>Visual Screen Gallery</span>
          </div>

          <div className="step-divider" />

          <div
            className={`wizard-step-node ${currentStep === 3 ? "active" : ""} ${currentStep > 3 ? "completed" : ""}`}
            onClick={() => {
              if (selectedScreenKeys.size > 0) setCurrentStep(3);
            }}
          >
            <span className="step-num-pill">{currentStep > 3 ? "✓" : "3"}</span>
            <span>Action Permissions</span>
          </div>

          <div className="step-divider" />

          <div
            className={`wizard-step-node ${currentStep === 4 ? "active" : ""}`}
            onClick={() => {
              if (selectedScreenKeys.size > 0) setCurrentStep(4);
            }}
          >
            <span className="step-num-pill">4</span>
            <span>Review & Deploy</span>
          </div>
        </div>

        {/* Close / Cancel Button */}
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid var(--cms-border, #e4e8f0)",
            borderRadius: "8px",
            color: "var(--cms-muted, #7B8275)",
            padding: "7px 14px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.16s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--cms-bg, #f4f6fb)";
            e.currentTarget.style.color = "var(--cms-text, #10203c)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--cms-muted, #7B8275)";
          }}
        >
          <X size={15} />
          <span>Exit Wizard</span>
        </button>
      </div>

      {/* Main Wizard Viewport */}
      <div className="wizard-body-viewport">
        {/* =========================================================================
            STEP 1: ROLE SELECTION & SETUP
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="step1-container">
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "19px", fontWeight: 800, margin: 0, color: "var(--cms-text, #10203c)" }}>
                Step 1: Choose or Create Role
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--cms-muted, #7B8275)", margin: "4px 0 0 0" }}>
                Select an existing campus role to re-configure its screens, or create a brand new role.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="role-modes-tabs">
              <button
                className={`role-mode-btn ${roleMode === "existing" ? "active" : ""}`}
                onClick={() => setRoleMode("existing")}
              >
                <Shield size={16} /> Configure Existing Role
              </button>
              <button
                className={`role-mode-btn ${roleMode === "new" ? "active" : ""}`}
                onClick={() => setRoleMode("new")}
              >
                <PlusCircle size={16} /> Create Brand New Role
              </button>
              <button
                className={`role-mode-btn ${roleMode === "clone" ? "active" : ""}`}
                onClick={() => setRoleMode("clone")}
              >
                <Copy size={16} /> Clone from Existing Role
              </button>
            </div>

            {/* Sub-view: Existing Roles */}
            {roleMode === "existing" && (
              <div>
                <div style={{ position: "relative", marginBottom: "14px" }}>
                  <Search
                    size={17}
                    color="var(--cms-muted, #7B8275)"
                    style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Search roles by name, department, or keyword..."
                    style={{
                      width: "100%",
                      padding: "11px 14px 11px 40px",
                      borderRadius: "9px",
                      background: "#ffffff",
                      border: "1px solid var(--cms-border, #e4e8f0)",
                      color: "var(--cms-text, #10203c)",
                      fontSize: "13.5px",
                      outline: "none",
                      boxShadow: "0 1px 2px rgba(16, 32, 60, 0.03)",
                    }}
                  />
                </div>

                <div className="existing-roles-grid">
                  {filteredRoles.map((role) => {
                    const isSelected = String(role.id) === String(targetRoleId);
                    return (
                      <div
                        key={role.id}
                        className={`role-select-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setTargetRoleId(role.id)}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span
                            style={{
                              fontSize: "15px",
                              fontWeight: 800,
                              color: isSelected ? "var(--cms-primary-dark, #566900)" : "var(--cms-text, #10203c)",
                            }}
                          >
                            {role.name}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: "var(--cms-bg, #f4f6fb)",
                              color: "#16335e",
                              border: "1px solid var(--cms-border, #e4e8f0)",
                            }}
                          >
                            {role.assignedUserCount ?? role.userCount ?? role.usersCount ?? 0} Users
                          </span>
                        </div>

                        <p
                          style={{
                            margin: 0,
                            fontSize: "12.5px",
                            color: "var(--cms-muted, #7B8275)",
                            lineHeight: 1.45,
                            height: "36px",
                            overflow: "hidden",
                          }}
                        >
                          {role.description || "Campus institutional role."}
                        </p>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: "auto",
                            paddingTop: "8px",
                            borderTop: "1px solid var(--cms-border, #e4e8f0)",
                          }}
                        >
                          <span style={{ fontSize: "11px", color: "var(--cms-muted, #7B8275)", fontWeight: 600 }}>
                            Code: {role.code}
                          </span>
                          {isSelected && (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                                fontWeight: 800,
                                color: "var(--cms-primary-dark, #566900)",
                              }}
                            >
                              <Check size={14} strokeWidth={3} /> Selected
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-view: Create New Role */}
            {roleMode === "new" && (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px 28px",
                  border: "1px solid var(--cms-border, #e4e8f0)",
                  maxWidth: "580px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 1px 3px rgba(16, 32, 60, 0.04)",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--cms-text, #10203c)", marginBottom: "6px" }}>
                    Role Name *
                  </label>
                  <input
                    type="text"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Assistant Examination Officer"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid var(--cms-border, #e4e8f0)",
                      color: "var(--cms-text, #10203c)",
                      fontSize: "13.5px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--cms-text, #10203c)", marginBottom: "6px" }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Briefly describe what this role is responsible for..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid var(--cms-border, #e4e8f0)",
                      color: "var(--cms-text, #10203c)",
                      fontSize: "13.5px",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Sub-view: Clone Role */}
            {roleMode === "clone" && (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px 28px",
                  border: "1px solid var(--cms-border, #e4e8f0)",
                  maxWidth: "580px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: "0 1px 3px rgba(16, 32, 60, 0.04)",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--cms-text, #10203c)", marginBottom: "6px" }}>
                    Source Role to Clone From *
                  </label>
                  <select
                    value={newRoleForm.cloneSourceId}
                    onChange={(e) => setNewRoleForm((p) => ({ ...p, cloneSourceId: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid var(--cms-border, #e4e8f0)",
                      color: "var(--cms-text, #10203c)",
                      fontSize: "13.5px",
                      outline: "none",
                    }}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--cms-text, #10203c)", marginBottom: "6px" }}>
                    New Cloned Role Name *
                  </label>
                  <input
                    type="text"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Senior Faculty - Lab Lead"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid var(--cms-border, #e4e8f0)",
                      color: "var(--cms-text, #10203c)",
                      fontSize: "13.5px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--cms-text, #10203c)", marginBottom: "6px" }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Briefly describe what this cloned role is responsible for..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid var(--cms-border, #e4e8f0)",
                      color: "var(--cms-text, #10203c)",
                      fontSize: "13.5px",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STEP 2: VISUAL SCREEN GALLERY
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="step2-layout">
            {/* Left Module Navigation Sidebar */}
            <div className="module-nav-sidebar">
              <div
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--cms-border, #e4e8f0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--cms-surface, #ffffff)",
                }}
              >
                <span style={{ fontSize: "12.5px", fontWeight: 800, color: "var(--cms-text, #10203c)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Modules ({allModules.length})
                </span>
                <span style={{ fontSize: "11px", color: "var(--cms-primary-dark, #566900)", fontWeight: 700 }}>
                  {selectedModulesCount} Active
                </span>
              </div>

              <div className="module-nav-list">
                {/* All Modules option */}
                <div
                  className={`module-nav-item ${activeModuleFilter === "all" ? "active" : ""}`}
                  onClick={() => setActiveModuleFilter("all")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={15} color="var(--cms-primary, #6F8400)" />
                    <span>All Modules</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--cms-muted, #7B8275)", fontWeight: 600 }}>{allScreensWithModule.length}</span>
                </div>

                {allModules.map((mod) => {
                  const modScreens = mod.screens || [];
                  const selectedInMod = modScreens.filter((sc) => selectedScreenKeys.has(`${mod.id}:${sc.id}`)).length;
                  const isAllSelected = selectedInMod > 0 && selectedInMod === modScreens.length;
                  const isPartial = selectedInMod > 0 && selectedInMod < modScreens.length;

                  return (
                    <div
                      key={mod.id}
                      className={`module-nav-item ${activeModuleFilter === mod.id ? "active" : ""}`}
                      onClick={() => setActiveModuleFilter(mod.id)}
                    >
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px" }}>
                        {mod.name}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: isAllSelected
                            ? "#eef5e7"
                            : isPartial
                            ? "var(--cms-primary-soft, #F1F4E2)"
                            : "var(--cms-bg, #f4f6fb)",
                          color: isAllSelected || isPartial ? "var(--cms-primary-dark, #566900)" : "var(--cms-muted, #7B8275)",
                          border: isAllSelected ? "1px solid var(--cms-primary, #6F8400)" : "none",
                        }}
                      >
                        {selectedInMod}/{modScreens.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Visual Screen Grid */}
            <div className="screen-gallery-main">
              {/* Gallery Top Toolbar */}
              <div className="gallery-toolbar">
                <div className="gallery-search-row">
                  <div style={{ position: "relative", flex: 1, maxWidth: "500px" }}>
                    <Search
                      size={16}
                      color="var(--cms-muted, #7B8275)"
                      style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
                    />
                    <input
                      type="text"
                      value={gallerySearch}
                      onChange={(e) => setGallerySearch(e.target.value)}
                      placeholder="Search screens by name, purpose, or route..."
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 36px",
                        borderRadius: "8px",
                        background: "var(--cms-bg, #f4f6fb)",
                        border: "1px solid var(--cms-border, #e4e8f0)",
                        color: "var(--cms-text, #10203c)",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleSelectAllFiltered(true)}
                      style={{
                        padding: "7px 13px",
                        borderRadius: "8px",
                        background: "var(--cms-primary-soft, #F1F4E2)",
                        border: "1px solid var(--cms-primary-border, #c7d7fe)",
                        color: "var(--cms-primary-dark, #566900)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Select All in View
                    </button>
                    <button
                      onClick={() => handleSelectAllFiltered(false)}
                      style={{
                        padding: "7px 13px",
                        borderRadius: "8px",
                        background: "var(--cms-red-soft, #fdecec)",
                        border: "1px solid #fecaca",
                        color: "var(--cms-red, #d93636)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Section filter chips */}
                <div className="gallery-section-chips">
                  {SECTIONS.map((sec) => (
                    <button
                      key={sec}
                      className={`gallery-chip ${activeSection === sec ? "active" : ""}`}
                      onClick={() => setActiveSection(sec)}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards Grid */}
              <div className="gallery-cards-grid">
                {filteredScreens.map(({ screen, module, key }) => (
                  <ScreenPreviewCard
                    key={key}
                    screen={screen}
                    module={module}
                    isSelected={selectedScreenKeys.has(key)}
                    onToggleSelect={(scId) => handleToggleScreen(scId, module.id)}
                    onInspect={handleOpenInspect}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: ACTION PERMISSIONS CONFIGURATION
            ========================================================================= */}
        {currentStep === 3 && (
          <div className="step3-container">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ fontSize: "19px", fontWeight: 800, margin: 0, color: "var(--cms-text, #10203c)" }}>
                  Step 3: Configure Granular Permissions
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--cms-muted, #7B8275)", margin: "4px 0 0 0" }}>
                  Fine-tune View, Add, Edit, and Delete rights for the {selectedScreenKeys.size} selected screens.
                </p>
              </div>

              {/* Quick global preset buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleApplyGlobalPreset("full")}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    background: "#eef5e7",
                    border: "1px solid var(--cms-primary, #6F8400)",
                    color: "var(--cms-primary-dark, #566900)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ⚡ All: Full Access
                </button>
                <button
                  onClick={() => handleApplyGlobalPreset("operational")}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    background: "var(--cms-primary-soft, #F1F4E2)",
                    border: "1px solid var(--cms-primary-border, #c7d7fe)",
                    color: "var(--cms-primary-dark, #566900)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ⚡ All: Operational (No Delete)
                </button>
                <button
                  onClick={() => handleApplyGlobalPreset("view")}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    background: "var(--cms-bg, #f4f6fb)",
                    border: "1px solid var(--cms-border, #e4e8f0)",
                    color: "var(--cms-text, #10203c)",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ⚡ All: View Only
                </button>
              </div>
            </div>

            {/* List of Selected Screens grouped by Module */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {allModules.map((mod) => {
                const modScreens = (mod.screens || []).filter((sc) =>
                  selectedScreenKeys.has(`${mod.id}:${sc.id}`)
                );

                if (modScreens.length === 0) return null;

                return (
                  <div
                    key={mod.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid var(--cms-border, #e4e8f0)",
                      overflow: "hidden",
                      boxShadow: "0 1px 3px rgba(16, 32, 60, 0.04)",
                    }}
                  >
                    {/* Module Header Bar */}
                    <div
                      style={{
                        padding: "12px 20px",
                        background: "var(--cms-primary-soft, #F1F4E2)",
                        borderBottom: "1px solid var(--cms-border, #e4e8f0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--cms-primary-dark, #566900)" }}>
                          {mod.name}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: "#ffffff",
                            border: "1px solid var(--cms-border, #e4e8f0)",
                            color: "var(--cms-primary-dark, #566900)",
                            fontWeight: 700,
                          }}
                        >
                          {modScreens.length} Screens Selected
                        </span>
                      </div>
                    </div>

                    {/* Module Screens List */}
                    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px", background: "#ffffff" }}>
                      {modScreens.map((screen) => {
                        const key = `${mod.id}:${screen.id}`;
                        const currentActions = permissionsMap.get(key) || new Set();
                        const canView = currentActions.has(ACTIONS.VIEW);
                        const canAdd = currentActions.has(ACTIONS.CREATE);
                        const canEdit = currentActions.has(ACTIONS.EDIT);
                        const canDelete = currentActions.has(ACTIONS.DELETE);

                        return (
                          <div key={key} className="permission-screen-row">
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "260px" }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--cms-text, #10203c)" }}>
                                  {screen.name}
                                </h4>
                                <span style={{ fontSize: "11.5px", color: "var(--cms-muted, #7B8275)" }}>
                                  {screen.route || mod.route || "/dashboard"}
                                </span>
                              </div>
                            </div>

                            {/* Screen Quick Presets */}
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => handleApplyScreenPreset(key, "full")}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--cms-border, #e4e8f0)",
                                  background: "var(--cms-bg, #f4f6fb)",
                                  color: "var(--cms-text, #10203c)",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Full
                              </button>
                              <button
                                onClick={() => handleApplyScreenPreset(key, "operational")}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--cms-border, #e4e8f0)",
                                  background: "var(--cms-bg, #f4f6fb)",
                                  color: "var(--cms-text, #10203c)",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Operational
                              </button>
                              <button
                                onClick={() => handleApplyScreenPreset(key, "view")}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--cms-border, #e4e8f0)",
                                  background: "var(--cms-bg, #f4f6fb)",
                                  color: "var(--cms-text, #10203c)",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                View Only
                              </button>
                            </div>

                            {/* 4 CRUD Toggle Switches */}
                            <div className="action-switches-group">
                              {/* View */}
                              <div
                                className={`action-switch-pill ${canView ? "granted" : ""}`}
                                onClick={() => handleToggleAction(key, ACTIONS.VIEW)}
                              >
                                <Eye size={13} />
                                <span>View</span>
                              </div>

                              {/* Add / Create */}
                              <div
                                className={`action-switch-pill ${canAdd ? "granted" : ""}`}
                                onClick={() => handleToggleAction(key, ACTIONS.CREATE)}
                              >
                                <Plus size={13} />
                                <span>Add</span>
                              </div>

                              {/* Edit */}
                              <div
                                className={`action-switch-pill ${canEdit ? "granted" : ""}`}
                                onClick={() => handleToggleAction(key, ACTIONS.EDIT)}
                              >
                                <Edit3 size={13} />
                                <span>Edit</span>
                              </div>

                              {/* Delete */}
                              <div
                                className={`action-switch-pill ${canDelete ? "granted" : ""}`}
                                onClick={() => handleToggleAction(key, ACTIONS.DELETE)}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: REVIEW & DEPLOY
            ========================================================================= */}
        {currentStep === 4 && (
          <div className="step4-container">
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "var(--cms-text, #10203c)" }}>
                Step 4: Review & Deploy Permissions
              </h3>
              <p style={{ fontSize: "13.5px", color: "var(--cms-muted, #7B8275)", margin: "4px 0 0 0" }}>
                Confirm role scope and security settings before publishing to the system.
              </p>
            </div>

            {/* Target Role Card */}
            <div
              style={{
                background: "linear-gradient(135deg, var(--cms-primary-soft, #F1F4E2) 0%, #ffffff 100%)",
                borderRadius: "12px",
                padding: "18px 22px",
                border: "1px solid var(--cms-border, #e4e8f0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(16, 32, 60, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "#ffffff",
                    border: "1px solid var(--cms-primary-border, #c7d7fe)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(111, 132, 0, 0.15)",
                  }}
                >
                  <Shield size={22} color="var(--cms-primary, #6F8400)" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--cms-text, #10203c)" }}>
                    {roleMode === "existing" ? currentRole?.name : newRoleForm.name || "Custom Role"}
                  </h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "var(--cms-muted, #7B8275)" }}>
                    {roleMode === "existing"
                      ? currentRole?.description
                      : newRoleForm.description || "Newly configured role."}
                  </p>
                </div>
              </div>

              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "#eef5e7",
                  color: "var(--cms-primary-dark, #566900)",
                  border: "1px solid var(--cms-primary, #6F8400)",
                }}
              >
                {roleMode === "existing" ? "Updating Role" : roleMode === "new" ? "Creating Role" : "Cloning Role"}
              </span>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="review-stats-grid">
              <div className="review-stat-card">
                <span className="val">{selectedModulesCount}</span>
                <span className="lbl">Modules Assigned</span>
              </div>
              <div className="review-stat-card">
                <span className="val">{selectedScreenKeys.size}</span>
                <span className="lbl">Screens Enabled</span>
              </div>
              <div className="review-stat-card">
                <span className="val">
                  {Array.from(permissionsMap.values()).reduce((sum, s) => sum + s.size, 0)}
                </span>
                <span className="lbl">Active Permission Actions</span>
              </div>
            </div>

            {/* Error Banner if any */}
            {submitError && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "var(--cms-red-soft, #fdecec)",
                  border: "1px solid #fecaca",
                  color: "var(--cms-red, #d93636)",
                  fontSize: "13.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AlertTriangle size={18} color="#dc2626" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Safe Deployment Notice */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "10px",
                background: "var(--cms-primary-soft, #F1F4E2)",
                border: "1px solid var(--cms-primary-border, #c7d7fe)",
                fontSize: "13px",
                color: "var(--cms-text, #10203c)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <FileCheck size={18} color="var(--cms-primary, #6F8400)" />
              <span>
                Deploying will immediately update the database stored procedures and refresh dynamic sidebar
                navigation and route security checks for all members with this role.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Persistent Bottom Navigation Bar */}
      <div className="wizard-bottom-bar">
        <div className="wizard-summary-pill">
          {currentStep === 1 && (
            <span>
              Target: <strong>{roleMode === "existing" ? currentRole?.name : newRoleForm.name || "New Role"}</strong>
            </span>
          )}
          {currentStep === 2 && (
            <span>
              Selected: <strong>{selectedScreenKeys.size} Screens</strong> across{" "}
              <strong>{selectedModulesCount} Modules</strong>
            </span>
          )}
          {currentStep === 3 && (
            <span>
              Configuring: <strong>{selectedScreenKeys.size} Screens</strong>
            </span>
          )}
          {currentStep === 4 && (
            <span>
              Ready to deploy <strong>{selectedScreenKeys.size} screens</strong> to{" "}
              <strong>{roleMode === "existing" ? currentRole?.name : newRoleForm.name}</strong>
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep((p) => p - 1)}
              disabled={isSubmitting}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border, #e4e8f0)",
                background: "transparent",
                color: "var(--cms-text, #10203c)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}

          {currentStep === 1 && (
            <button
              onClick={() => setCurrentStep(2)}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, var(--cms-primary, #6F8400) 0%, var(--cms-primary-dark, #566900) 100%)",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(111, 132, 0, 0.35)",
              }}
            >
              Continue to Screen Gallery <ChevronRight size={15} />
            </button>
          )}

          {currentStep === 2 && (
            <button
              onClick={() => setCurrentStep(3)}
              disabled={selectedScreenKeys.size === 0}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                background:
                  selectedScreenKeys.size > 0
                    ? "linear-gradient(135deg, var(--cms-primary, #6F8400) 0%, var(--cms-primary-dark, #566900) 100%)"
                    : "#e2e8f0",
                color: selectedScreenKeys.size > 0 ? "#ffffff" : "#94a3b8",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: selectedScreenKeys.size > 0 ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: selectedScreenKeys.size > 0 ? "0 2px 8px rgba(111, 132, 0, 0.35)" : "none",
              }}
            >
              Configure Permissions ({selectedScreenKeys.size} screens) <ChevronRight size={15} />
            </button>
          )}

          {currentStep === 3 && (
            <button
              onClick={() => setCurrentStep(4)}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, var(--cms-primary, #6F8400) 0%, var(--cms-primary-dark, #566900) 100%)",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(111, 132, 0, 0.35)",
              }}
            >
              Review & Deploy <ChevronRight size={15} />
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={handleSaveAndDeploy}
              disabled={isSubmitting}
              style={{
                padding: "9px 24px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, var(--cms-primary, #6F8400) 0%, var(--cms-primary-dark, #566900) 100%)",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 800,
                cursor: isSubmitting ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 3px 12px rgba(111, 132, 0, 0.4)",
              }}
            >
              {isSubmitting ? (
                <>Deploying Permissions...</>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} /> Save & Deploy Role Permissions
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Screen Preview Lightbox Modal */}
      <ScreenPreviewModal
        isOpen={inspectModal.isOpen}
        onClose={() => setInspectModal((p) => ({ ...p, isOpen: false }))}
        screen={inspectModal.screen}
        module={inspectModal.module}
        preview={inspectModal.preview}
        initialImageUrl={inspectModal.imageUrl}
        isSelected={inspectModal.screen && inspectModal.module ? selectedScreenKeys.has(`${inspectModal.module.id}:${inspectModal.screen.id}`) : false}
        onToggleSelect={(screenId) => {
          if (inspectModal.module) {
            handleToggleScreen(screenId, inspectModal.module.id);
          }
        }}
      />
    </div>
  );
}
