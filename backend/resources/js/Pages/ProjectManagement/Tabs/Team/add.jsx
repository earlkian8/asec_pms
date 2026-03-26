import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog"
import { Input } from "@/Components/ui/input"
import { Button } from "@/Components/ui/button"
import { router } from "@inertiajs/react"
import { toast } from "sonner"
import {
  Loader2, SquarePen, Search, Zap, Calendar, CalendarRange,
  AlertCircle, ChevronDown, ChevronUp, X, Users, UserCheck, Building2,
  CheckCircle2
} from "lucide-react"
import InputError from "@/Components/InputError"

// ─── Date Presets ──────────────────────────────────────────────────────────────
const getDatePresets = (projectStartDate, projectEndDate) => {
  const today  = new Date().toISOString().split("T")[0]
  const pStart = projectStartDate || today
  const pEnd   = projectEndDate || ""

  const clamp = (dateStr) => pEnd && dateStr > pEnd ? pEnd : dateStr

  const addMonths = (dateStr, months) => {
    const d = new Date(dateStr)
    d.setMonth(d.getMonth() + months)
    return clamp(d.toISOString().split("T")[0])
  }
  const addWeeks = (dateStr, weeks) => {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + weeks * 7)
    return clamp(d.toISOString().split("T")[0])
  }

  return [
    { id: "full",        label: "Full Project", icon: "⚡", color: "indigo", description: "Entire project",   start: pStart, end: pEnd,                  disabled: !pEnd  },
    { id: "first_month", label: "1 Month",      icon: "📅", color: "blue",   description: "30 days",          start: pStart, end: addMonths(pStart, 1)                    },
    { id: "quarter",     label: "Quarter",       icon: "🗓", color: "violet", description: "3 months",         start: pStart, end: addMonths(pStart, 3)                    },
    { id: "two_weeks",   label: "2 Weeks",       icon: "⏱", color: "cyan",   description: "Sprint",           start: pStart, end: addWeeks(pStart, 2)                     },
    { id: "custom",      label: "Custom",        icon: "✏️", color: "gray",   description: "Manual dates",     start: "",     end: ""                                      },
  ]
}

const PRESET_STYLE = {
  indigo: { base: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100", active: "bg-indigo-600 border-indigo-600 text-white shadow-md" },
  blue:   { base: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",         active: "bg-blue-600 border-blue-600 text-white shadow-md"   },
  violet: { base: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100", active: "bg-violet-600 border-violet-600 text-white shadow-md" },
  cyan:   { base: "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100",         active: "bg-cyan-600 border-cyan-600 text-white shadow-md"   },
  gray:   { base: "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100",         active: "bg-gray-700 border-gray-700 text-white shadow-md"   },
}

// ─── Assignable Row Card ───────────────────────────────────────────────────────
function AssignableCard({ assignable, isSelected, onToggle, formData, errors, onFormChange, project }) {
  const [expanded, setExpanded] = useState(false)
  const presets = useMemo(
    () => getDatePresets(project?.start_date, project?.planned_end_date),
    [project?.start_date, project?.planned_end_date]
  )

  const compositeId = `${assignable.type || "user"}-${assignable.id}`
  const isEmployee  = assignable.type === "employee"
  const role        = isEmployee ? (assignable.position || "No Position") : (assignable.role || "No Role")
  const activePreset = formData?.date_preset

  const applyPreset = (preset) => {
    onFormChange(compositeId, "date_preset", preset.id)
    if (preset.id !== "custom") {
      onFormChange(compositeId, "start_date", preset.start)
      onFormChange(compositeId, "end_date", preset.end)
    }
  }

  const hasErrors  = errors?.role || errors?.hourly_rate || errors?.start_date
  const hasData    = formData?.hourly_rate || formData?.start_date

  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
      isSelected
        ? hasErrors
          ? "border-red-300 bg-red-50/30"
          : "border-indigo-400 bg-gradient-to-br from-indigo-50/60 to-white shadow-md"
        : "border-gray-200 bg-white hover:border-gray-300"
    }`}>
      {/* Row header — always visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => onToggle(compositeId)}
      >
        {/* Checkbox */}
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300 hover:border-indigo-400"
        }`}>
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Avatar */}
        <div className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center flex-shrink-0 ${
          isEmployee ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
        }`}>
          {(assignable.name || "?")[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{assignable.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              isEmployee ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>{isEmployee ? "Employee" : "User"}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400 truncate">{assignable.email || "—"}</span>
            <span className="text-xs font-medium text-gray-600">{role}</span>
          </div>
        </div>

        {/* Summary chips when selected and collapsed */}
        {isSelected && !expanded && hasData && (
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
            {formData?.hourly_rate && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-medium">
                ₱{parseFloat(formData.hourly_rate || 0).toFixed(2)}/hr
              </span>
            )}
            {activePreset && activePreset !== "custom" && (
              <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2 py-0.5">
                ⚡ {presets.find(p => p.id === activePreset)?.label}
              </span>
            )}
          </div>
        )}

        {/* Expand/Error indicator */}
        {isSelected && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            className={`p-1.5 rounded-lg transition flex-shrink-0 ${
              hasErrors ? "text-red-500 hover:bg-red-50" : "text-indigo-500 hover:bg-indigo-50"
            }`}
          >
            {hasErrors
              ? <AlertCircle size={16} />
              : expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
            }
          </button>
        )}
      </div>

      {/* Expanded form */}
      {isSelected && expanded && (
        <div className="border-t border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-transparent p-4 space-y-4">

          {/* Hourly Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Hourly Rate (₱) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData?.hourly_rate || ""}
                  onChange={(e) => onFormChange(compositeId, "hourly_rate", e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`pl-7 text-sm ${errors?.hourly_rate ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 focus:border-indigo-400"}`}
                />
              </div>
              {errors?.hourly_rate && <InputError message={errors.hourly_rate} className="mt-1" />}
            </div>

            {/* Role (read-only) */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Role</label>
              <Input
                readOnly
                value={role}
                className="text-sm bg-gray-50 border-gray-200 text-gray-600 cursor-default"
              />
            </div>
          </div>

          {/* Duration Presets */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1">
              <Zap size={11} className="text-indigo-500" />
              Assignment Duration <span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {presets.map((p) => {
                const style = PRESET_STYLE[p.color] || PRESET_STYLE.gray
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={p.disabled}
                    onClick={(e) => { e.stopPropagation(); applyPreset(p) }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      activePreset === p.id ? style.active : style.base
                    }`}
                  >
                    {p.icon} {p.label}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">Start Date</label>
                <Input
                  type="date"
                  value={formData?.start_date || ""}
                  onChange={(e) => { onFormChange(compositeId, "start_date", e.target.value); onFormChange(compositeId, "date_preset", "custom") }}
                  onClick={(e) => e.stopPropagation()}
                  min={project?.start_date || undefined}
                  max={project?.planned_end_date || undefined}
                  className={`text-sm ${errors?.start_date ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 focus:border-indigo-400"}`}
                />
                {errors?.start_date && <InputError message={errors.start_date} className="mt-1" />}
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wide">End Date</label>
                <Input
                  type="date"
                  value={formData?.end_date || ""}
                  onChange={(e) => { onFormChange(compositeId, "end_date", e.target.value); onFormChange(compositeId, "date_preset", "custom") }}
                  onClick={(e) => e.stopPropagation()}
                  min={formData?.start_date || project?.start_date || undefined}
                  max={project?.planned_end_date || undefined}
                  className="text-sm border-gray-300 focus:border-indigo-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AddProjectTeam({ setShowAddModal, assignables = [], project }) {
  const [search,              setSearch]              = useState("")
  const [selectedIds,         setSelectedIds]         = useState([])
  const [formData,            setFormData]            = useState({})
  const [processing,          setProcessing]          = useState(false)
  const [errors,              setErrors]              = useState({})
  const [typeFilter,          setTypeFilter]          = useState("all")

  const safeAssignables = Array.isArray(assignables) ? assignables : []

  const getCompositeId = (a) => `${a?.type || "user"}-${a?.id}`

  const filtered = safeAssignables.filter((a) => {
    if (!a) return false
    if (typeFilter !== "all" && (a.type || "user") !== typeFilter) return false
    const s = search.toLowerCase()
    return (
      `${a.name || ""}`.toLowerCase().includes(s) ||
      (a.email || "").toLowerCase().includes(s) ||
      (a.position || "").toLowerCase().includes(s) ||
      (a.role || "").toLowerCase().includes(s)
    )
  })

  const toggleSelectAll = (checked) =>
    setSelectedIds(checked ? filtered.map(getCompositeId) : [])

  const toggleAssignable = (compositeId) =>
    setSelectedIds((prev) =>
      prev.includes(compositeId) ? prev.filter((id) => id !== compositeId) : [...prev, compositeId]
    )

  const handleChange = (compositeId, field, value) => {
    setFormData((prev) => ({ ...prev, [compositeId]: { ...prev[compositeId], [field]: value } }))
    const key = `assignable_${compositeId}_${field}`
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  const applyPresetToAll = (preset) => {
    selectedIds.forEach((id) => {
      if (preset) {
        handleChange(id, "date_preset", preset.id)
        if (preset.id !== "custom") {
          handleChange(id, "start_date", preset.start)
          handleChange(id, "end_date",   preset.end)
        }
      }
    })
    toast.success(`Applied to all ${selectedIds.length} selected members`)
  }

  const handleSubmit = () => {
    setProcessing(true)
    setErrors({})

    if (selectedIds.length === 0) {
      toast.error("Select at least one team member")
      setProcessing(false)
      return
    }

    const validationErrors = {}
    for (const compositeId of selectedIds) {
      const a    = safeAssignables.find((x) => getCompositeId(x) === compositeId)
      const name = a?.name || "Team Member"
      const fd   = formData[compositeId] || {}

      const role = fd.role || (a?.type === "user" ? a.role : null) || (a?.type === "employee" ? a.position : null) || ""
      if (!role.trim()) validationErrors[`assignable_${compositeId}_role`] = `Role required for ${name}`

      if (!fd.hourly_rate || parseFloat(fd.hourly_rate) < 0) {
        validationErrors[`assignable_${compositeId}_hourly_rate`] = `Hourly rate required for ${name}`
      }
      if (!fd.start_date) validationErrors[`assignable_${compositeId}_start_date`] = `Start date required for ${name}`
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setProcessing(false)
      toast.error("Please fill in required fields")
      return
    }

    const payload = selectedIds.map((compositeId) => {
      const a    = safeAssignables.find((x) => getCompositeId(x) === compositeId)
      const fd   = formData[compositeId] || {}
      const role = fd.role || (a?.type === "user" ? a.role : null) || (a?.type === "employee" ? a.position : null) || ""
      return {
        id:          parseInt(a.id, 10),
        type:        a.type || "user",
        role:        role,
        hourly_rate: parseFloat(fd.hourly_rate) || 0,
        start_date:  fd.start_date,
        end_date:    fd.end_date || null,
      }
    }).filter(Boolean)

    router.post(
      route("project-management.project-teams.store", project.id),
      { assignables: payload },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setProcessing(false)
          const flash = page.props?.flash
          if (flash?.error) {
            toast.error(flash.error)
          } else {
            toast.success(flash?.success || "Team members assigned successfully")
            setShowAddModal(false)
          }
        },
        onError: (errs) => { setProcessing(false); setErrors(errs); toast.error("Failed to assign some team members.") },
      }
    )
  }

  const presets       = getDatePresets(project?.start_date, project?.planned_end_date)

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[92vh] overflow-hidden flex flex-col rounded-3xl p-0">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 pt-6 pb-5 flex-shrink-0">
          <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
            <Users size={20} />
            Add Team Members
          </DialogTitle>
          <p className="text-indigo-200 text-sm mt-1">
            Select people and configure their assignment. Use ⚡ presets to set dates in one click.
          </p>

          {/* Project date display */}
          {(project?.start_date || project?.planned_end_date) && (
            <div className="mt-3 flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white">
              <CalendarRange size={12} />
              <span className="font-medium">Project:</span>
              <span className="font-mono">{project.start_date || "—"} → {project.planned_end_date || "—"}</span>
            </div>
          )}
        </div>

        {/* ── Info notice ── */}
        {/* <div className="mx-6 mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-xs text-amber-800 flex-shrink-0">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Employees</strong> can only be active on one project at a time. To move an employee here,
            release them from their current project first.{" "}
            <strong>Users/contractors</strong> can appear on multiple projects.
          </span>
        </div> */}

        {/* ── Search + Filter ── */}
        <div className="px-6 pt-3 pb-2 space-y-2 flex-shrink-0">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search name, email, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-gray-300 rounded-xl h-9 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Type tabs */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs bg-white">
              {[
                { id: "all",      label: `All (${safeAssignables.length})`  },
                { id: "employee", label: `Employees (${safeAssignables.filter(a => a.type === "employee").length})` },
                { id: "user",     label: `Users (${safeAssignables.filter(a => a.type !== "employee").length})`     },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1.5 font-medium transition-all ${
                    typeFilter === tab.id ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => toggleSelectAll(selectedIds.length < filtered.length)}
              className="text-xs px-3 py-1.5 h-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition"
            >
              <Users size={12} />
              {selectedIds.length === filtered.length && filtered.length > 0 ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Bulk preset bar */}
          {selectedIds.length >= 2 && (
            <div className="bg-indigo-600 rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap">
              <span className="text-white text-xs font-medium whitespace-nowrap">
                Apply to {selectedIds.length}:
              </span>
              {presets.filter(p => p.id !== "custom").map(p => (
                <button
                  key={p.id}
                  type="button"
                  disabled={p.disabled}
                  onClick={() => applyPresetToAll(p)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium border border-white/30 transition disabled:opacity-40"
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Member list ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-2">
          {filtered.length > 0 ? (
            filtered.map((a) => {
              const compositeId = getCompositeId(a)
              const isSelected  = selectedIds.includes(compositeId)
              const memberErrors = {
                role:        errors[`assignable_${compositeId}_role`],
                hourly_rate: errors[`assignable_${compositeId}_hourly_rate`],
                start_date:  errors[`assignable_${compositeId}_start_date`],
              }
              return (
                <AssignableCard
                  key={compositeId}
                  assignable={a}
                  isSelected={isSelected}
                  onToggle={toggleAssignable}
                  formData={formData[compositeId]}
                  errors={memberErrors}
                  onFormChange={handleChange}
                  project={project}
                />
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium text-sm">No members found</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filter</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="flex-shrink-0 border-t border-gray-100 bg-gray-50/80 px-6 py-4 flex items-center justify-between gap-3 rounded-b-3xl">
          <div className="text-sm text-gray-500">
            {selectedIds.length > 0 ? (
              <span className="font-semibold text-indigo-700">{selectedIds.length} selected</span>
            ) : (
              <span>Select members to add</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={processing}
              className="rounded-xl border-gray-300 h-9 px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={processing || selectedIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 h-9 text-sm font-medium shadow-md shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</>
              ) : (
                <><CheckCircle2 size={15} /> Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}