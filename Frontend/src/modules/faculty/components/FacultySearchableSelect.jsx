import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import "./FacultySearchableSelect.css";

/**
 * Standard Faculty Searchable Select Component
 * Matches design reference:
 * - Search icon on the left
 * - Value with ellipsis truncation and native tooltip on hover
 * - Chevron down on the right
 * - Floating popover with checkmark on the selected item
 * - Responsive 100% width matching dropdown container
 */
export default function FacultySearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  disabled = false,
  className = "",
  style = {},
  triggerStyle = {},
  emptyText = "No options found",
  name = "",
  required = false,
  error = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalize options to { id, name, original }
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => {
      if (opt === null || opt === undefined) return { id: "", name: "" };
      if (typeof opt === "string" || typeof opt === "number") {
        return { id: opt, name: String(opt), original: opt };
      }
      const id =
        opt.id ??
        opt.value ??
        opt.groupId ??
        opt.academicLevelId ??
        opt.programId ??
        opt.sectionId ??
        opt.examinationId ??
        opt.examId ??
        opt.subjectId ??
        "";
      const optName =
        opt.name ??
        opt.label ??
        opt.groupName ??
        opt.levelName ??
        opt.programName ??
        opt.sectionName ??
        opt.examName ??
        opt.subjectName ??
        String(id);
      return { id, name: optName, original: opt };
    });
  }, [options]);

  // Find currently selected option
  const selectedOpt = useMemo(() => {
    if (value === undefined || value === null || value === "") return null;
    const vStr = String(value).trim().toLowerCase();
    return normalizedOptions.find((o) => String(o.id).trim().toLowerCase() === vStr) || null;
  }, [normalizedOptions, value]);

  // Synchronize search text when selection changes
  useEffect(() => {
    if (selectedOpt) {
      setSearch(selectedOpt.name);
    } else {
      setSearch("");
    }
  }, [selectedOpt]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch(selectedOpt ? selectedOpt.name : "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, selectedOpt]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q || (selectedOpt && selectedOpt.name.toLowerCase() === q)) {
      return normalizedOptions;
    }
    return normalizedOptions.filter((o) =>
      String(o.name || "").toLowerCase().includes(q)
    );
  }, [normalizedOptions, search, selectedOpt]);

  const handleSelect = (opt) => {
    const optId = opt ? opt.id : "";
    setSearch(opt ? opt.name : "");
    setOpen(false);
    if (onChange) {
      // Fire synthetic event compatible with (e) => e.target.value as well as direct (value)
      const syntheticEvent = {
        target: { value: optId, name },
        value: optId,
      };
      onChange(syntheticEvent, optId);
    }
  };

  const selectedDisplay = selectedOpt ? selectedOpt.name : "";
  const dynamicTitle = selectedDisplay || placeholder || "";

  return (
    <div
      className={`cms-searchable-select ${disabled ? "is-disabled" : ""} ${open ? "is-open" : ""} ${className}`}
      style={style}
      ref={containerRef}
    >
      {label && (
        <label className="cms-field-label">
          {label}
          {required && <span className="cms-required-mark"> *</span>}
        </label>
      )}

      <div
        className={`cms-searchable-select-trigger staff-search-input-wrap ${open ? "is-active" : ""}`}
        style={{
          ...triggerStyle,
          cursor: disabled ? "not-allowed" : "pointer",
          ...(error ? { borderColor: "#ef4444" } : {}),
        }}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
          if (!open && inputRef.current) {
            inputRef.current.focus();
            try {
              inputRef.current.select();
            } catch {
              /* ignore select error */
            }
          }
        }}
      >
        <Search className="staff-search-icon" aria-hidden="true" size={14} />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={open ? search : selectedDisplay}
          title={dynamicTitle}
          placeholder={placeholder}
          autoComplete="off"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              setOpen(true);
              try {
                e.target.select();
              } catch {
                /* ignore */
              }
            }
          }}
          onFocus={(e) => {
            if (disabled) return;
            setOpen(true);
            try {
              e.target.select();
            } catch {
              /* ignore focus select */
            }
          }}
          onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            setOpen(true);
            const exact = normalizedOptions.find(
              (o) => o.name.toLowerCase() === val.trim().toLowerCase()
            );
            if (exact) {
              const syntheticEvent = {
                target: { value: exact.id, name },
                value: exact.id,
              };
              onChange?.(syntheticEvent, exact.id);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filteredOptions.length > 0) {
                handleSelect(filteredOptions[0]);
              } else {
                setOpen(false);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
              setSearch(selectedOpt ? selectedOpt.name : "");
            }
          }}
        />
        <ChevronDown
          className={`staff-dropdown-caret ${open ? "is-rotated" : ""}`}
          size={14}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            setOpen((prev) => !prev);
            if (!open && inputRef.current) {
              inputRef.current.focus();
            }
          }}
        />
      </div>

      {open && !disabled && (
        <div className="cms-searchable-select-dropdown">
          <div className="cms-searchable-select-options" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = selectedOpt && String(opt.id) === String(selectedOpt.id);
                return (
                  <div
                    key={String(opt.id) + "-" + opt.name}
                    className={`cms-searchable-select-option staff-search-dropdown-item ${
                      isSelected ? "selected is-selected" : ""
                    }`}
                    role="option"
                    aria-selected={isSelected}
                    title={opt.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt);
                    }}
                  >
                    <span className="cms-searchable-opt-name">{opt.name}</span>
                    {isSelected && <Check size={14} className="cms-searchable-check-icon" />}
                  </div>
                );
              })
            ) : (
              <div className="cms-searchable-no-options staff-search-dropdown-empty">
                <span>{emptyText}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
