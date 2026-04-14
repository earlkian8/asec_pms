import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import { Checkbox } from "@/Components/ui/checkbox";
import { Search, Users, Clock, Calendar, ChevronDown, ChevronUp, Zap, CalendarRange, Sunset, SunMedium, Moon, AlertCircle, Building2 } from "lucide-react";
import InputError from "@/Components/InputError";

// ─── Date Preset Engine ────────────────────────────────────────────────────────
const toDateString = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (dateStr) => {
  const [year, month, day] = (dateStr || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const clampToProjectEnd = (dateStr, projectEndDate) => {
  if (!projectEndDate || !dateStr) return dateStr;
  return dateStr > projectEndDate ? projectEndDate : dateStr;
};

const addMonthsToDate = (dateStr, months, projectEndDate) => {
  const date = parseDateInput(dateStr);
  if (!date) return "";
  date.setMonth(date.getMonth() + months);
  return clampToProjectEnd(toDateString(date), projectEndDate);
};

const addWeeksToDate = (dateStr, weeks, projectEndDate) => {
  const date = parseDateInput(dateStr);
  if (!date) return "";
  date.setDate(date.getDate() + weeks * 7);
  return clampToProjectEnd(toDateString(date), projectEndDate);
};

const getPresetDateRange = (presetId, projectStartDate, projectEndDate, currentStartDate) => {
  const today = toDateString(new Date());
  const fallbackStart = projectStartDate || today;
  const anchorStart = currentStartDate || fallbackStart;

  if (presetId === "full") {
    return {
      start: projectStartDate || anchorStart,
      end: projectEndDate || "",
    };
  }

  if (presetId === "first_month") {
    return {
      start: anchorStart,
      end: addMonthsToDate(anchorStart, 1, projectEndDate),
    };
  }

  if (presetId === "quarter") {
    return {
      start: anchorStart,
      end: addMonthsToDate(anchorStart, 3, projectEndDate),
    };
  }

  if (presetId === "two_weeks") {
    return {
      start: anchorStart,
      end: addWeeksToDate(anchorStart, 2, projectEndDate),
    };
  }

  return { start: "", end: "" };
};

const getDatePresets = (projectStartDate, projectEndDate, currentStartDate) => {
  const fullRange = getPresetDateRange("full", projectStartDate, projectEndDate, currentStartDate);
  const firstMonthRange = getPresetDateRange("first_month", projectStartDate, projectEndDate, currentStartDate);
  const quarterRange = getPresetDateRange("quarter", projectStartDate, projectEndDate, currentStartDate);
  const twoWeeksRange = getPresetDateRange("two_weeks", projectStartDate, projectEndDate, currentStartDate);

  return [
    {
      id: "full",
      label: "Full Project",
      icon: "⚡",
      color: "indigo",
      description: "Entire project duration",
      start: fullRange.start,
      end: fullRange.end,
      disabled: !projectEndDate,
    },
    {
      id: "first_month",
      label: "1st Month",
      icon: "📅",
      color: "blue",
      description: "First 30 days",
      start: firstMonthRange.start,
      end: firstMonthRange.end,
    },
    {
      id: "quarter",
      label: "Quarter",
      icon: "🗓",
      color: "violet",
      description: "First 3 months",
      start: quarterRange.start,
      end: quarterRange.end,
    },
    {
      id: "two_weeks",
      label: "2 Weeks",
      icon: "⏱",
      color: "cyan",
      description: "Sprint / short burst",
      start: twoWeeksRange.start,
      end: twoWeeksRange.end,
    },
    {
      id: "custom",
      label: "Custom",
      icon: "✏️",
      color: "gray",
      description: "Pick specific dates",
      start: "",
      end: "",
    },
  ];
};

// ─── Time Slot Presets ─────────────────────────────────────────────────────────
// const TIME_SLOTS = [
//   { id: "morning", label: "Morning", time: "08:00–12:00", icon: SunMedium, color: "amber" },
//   { id: "afternoon", label: "Afternoon", time: "13:00–17:00", icon: Sunset, color: "orange" },
//   { id: "evening", label: "Evening", time: "18:00–22:00", icon: Moon, color: "indigo" },
//   { id: "fullday", label: "Full Day", time: "08:00–17:00", icon: Calendar, color: "green" },
// ];

// ─── Color map ─────────────────────────────────────────────────────────────────
const COLOR = {
  indigo: "bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100",
  blue:   "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100",
  violet: "bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100",
  cyan:   "bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100",
  gray:   "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100",
  amber:  "bg-amber-50 border-amber-300 text-amber-700",
  orange: "bg-orange-50 border-orange-300 text-orange-700",
  green:  "bg-green-50 border-green-300 text-green-700",
};

const ACTIVE_COLOR = {
  indigo: "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200",
  blue:   "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200",
  violet: "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200",
  cyan:   "bg-cyan-600 border-cyan-600 text-white shadow-md shadow-cyan-200",
  gray:   "bg-gray-700 border-gray-700 text-white shadow-md shadow-gray-200",
};

// ─── Member Card Component ─────────────────────────────────────────────────────
function MemberCard({ member, isSelected, compositeId, onToggle, formData, errors, onFormChange, onFormPatch, projectData }) {
  const [expanded, setExpanded] = useState(false);
  const presets = useMemo(
    () => getDatePresets(projectData.start_date, projectData.planned_end_date, formData?.start_date),
    [projectData.start_date, projectData.planned_end_date, formData?.start_date]
  );

  const activePreset = formData?.date_preset || null;
  const isEmployee = member.type === "employee";
  const payType = formData?.pay_type || "hourly";

  const handleToggle = (id) => {
    const willSelect = !isSelected;
    onToggle(id);
    // Auto-expand when selecting so the form is immediately visible
    if (willSelect) setExpanded(true);
  };

  const applyPreset = (preset) => {
    if (preset.id === "custom") {
      onFormPatch(compositeId, { date_preset: "custom" });
      return;
    }

    const range = getPresetDateRange(
      preset.id,
      projectData.start_date,
      projectData.planned_end_date,
      formData?.start_date
    );

    onFormPatch(compositeId, {
      date_preset: preset.id,
      start_date: range.start,
      end_date: range.end,
    });
  };

  const role = isEmployee ? (member.position || "No Position") : (member.role || "No Role");

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        isSelected
          ? "border-indigo-400 bg-gradient-to-br from-indigo-50 to-white shadow-lg shadow-indigo-100"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
      }`}
    >
      {/* Card Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => handleToggle(compositeId)}
      >
        <div className="mt-0.5 flex-shrink-0">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300 hover:border-indigo-400"
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>

        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            isEmployee ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
          }`}
        >
          {(member.name || "?").charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{member.name}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isEmployee
                  ? "bg-orange-100 text-orange-700 border border-orange-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              {isEmployee ? "Employee" : "User"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{member.email || "—"}</p>
          <p className="text-xs font-medium text-gray-600 mt-0.5">{role}</p>
        </div>

        {/* Expand toggle (only when selected) */}
        {isSelected && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 transition flex-shrink-0"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Inline summary when selected but collapsed */}
      {isSelected && !expanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 border-t border-indigo-100">
          {payType === "hourly" && formData?.hourly_rate !== undefined && formData?.hourly_rate !== "" && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1">
              ₱{parseFloat(formData.hourly_rate || 0).toFixed(2)}/hr
            </span>
          )}
          {payType === "salary" && formData?.monthly_salary !== undefined && formData?.monthly_salary !== "" && (
            <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-1">
              ₱{parseFloat(formData.monthly_salary || 0).toFixed(2)}/mo
            </span>
          )}
          {payType === "fixed" && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">
              Fixed
            </span>
          )}
          {formData?.date_preset && formData.date_preset !== "custom" && (
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-1">
              <Zap size={10} />
              {presets.find(p => p.id === formData.date_preset)?.label || formData.date_preset}
            </span>
          )}
          {formData?.start_date && (
            <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-2.5 py-1">
              <Calendar size={10} />
              {formData.start_date} → {formData.end_date || "?"}
            </span>
          )}
          {formData?.work_hours && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">
              <Clock size={10} />
              {formData.work_hours}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Edit details →
          </button>
        </div>
      )}

      {/* Expanded Form */}
      {isSelected && expanded && (
        <div className="border-t border-indigo-100 bg-indigo-50/30 p-4 space-y-4">

          {/* Pay Type */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
              Pay Type <span className="text-red-500">*</span>
            </label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs bg-white">
              {[
                { id: "hourly",  label: "Hourly"         },
                { id: "salary", label: "Monthly Salary" },
                { id: "fixed",  label: "Fixed"          },
              ].map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onFormChange(compositeId, "pay_type", pt.id); }}
                  className={`flex-1 py-2 font-medium transition-all ${
                    payType === pt.id
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rate field — conditional on pay_type */}
          {payType === "hourly" && (
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Hourly Rate (₱) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱</span>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={formData?.hourly_rate ?? ""}
                  onChange={(e) => onFormChange(compositeId, "hourly_rate", e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`pl-7 text-sm ${errors?.rate ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"}`}
                />
              </div>
              {errors?.rate && <InputError message={errors.rate} className="mt-1" />}
            </div>
          )}
          {payType === "salary" && (
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Monthly Salary (₱) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱</span>
                <Input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={formData?.monthly_salary ?? ""}
                  onChange={(e) => onFormChange(compositeId, "monthly_salary", e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`pl-7 text-sm ${errors?.rate ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"}`}
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Daily equivalent: ₱{formData?.monthly_salary ? (parseFloat(formData.monthly_salary) / 26).toFixed(2) : "0.00"}/day (÷26 working days)
              </p>
              {errors?.rate && <InputError message={errors.rate} className="mt-1" />}
            </div>
          )}
          {payType === "fixed" && (
            <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2">
              Fixed pay — gross amount will be entered per payroll period.
            </p>
          )}

          {/* Date Presets */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Zap size={12} className="text-indigo-500" />
              Assignment Duration <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={preset.disabled}
                  onClick={(e) => { e.stopPropagation(); applyPreset(preset); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                    activePreset === preset.id
                      ? ACTIVE_COLOR[preset.color] || ACTIVE_COLOR.gray
                      : COLOR[preset.color] || COLOR.gray
                  }`}
                >
                  <span>{preset.icon}</span>
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Date inputs — always shown, preset fills them */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={formData?.start_date ?? ""}
                  onChange={(e) => {
                    onFormChange(compositeId, "start_date", e.target.value);
                    onFormChange(compositeId, "date_preset", "custom");
                  }}
                  onClick={(e) => e.stopPropagation()}
                  min={projectData.start_date || undefined}
                  max={projectData.planned_end_date || undefined}
                  className={`text-sm ${errors?.start_date ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 focus:border-indigo-400"}`}
                />
                {errors?.start_date && <InputError message={errors.start_date} className="mt-1" />}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={formData?.end_date ?? ""}
                  onChange={(e) => {
                    onFormChange(compositeId, "end_date", e.target.value);
                    onFormChange(compositeId, "date_preset", "custom");
                  }}
                  onClick={(e) => e.stopPropagation()}
                  min={formData?.start_date || projectData.start_date || undefined}
                  max={projectData.planned_end_date || undefined}
                  className={`text-sm ${errors?.end_date ? "border-red-400 ring-1 ring-red-300" : "border-gray-300 focus:border-indigo-400"}`}
                />
                {errors?.end_date && <InputError message={errors.end_date} className="mt-1" />}
              </div>
            </div>
          </div>

          {/* Work Hours / Time Slot */}
          {/* <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-1.5">
              <Clock size={12} className="text-indigo-500" />
              Work Shift
              <span className="font-normal text-gray-400 ml-1">(optional — for rotation tracking)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((slot) => {
                const Icon = slot.icon;
                const isActive = formData?.time_slot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); applyTimeSlot(slot); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? ACTIVE_COLOR[slot.color] || "bg-gray-700 border-gray-700 text-white"
                        : COLOR[slot.color] || COLOR.gray
                    }`}
                  >
                    <Icon size={12} />
                    <span>{slot.label}</span>
                    <span className="opacity-70">{slot.time}</span>
                  </button>
                );
              })}
            </div>
          </div> */}
        </div>
      )}
    </div>
  );
}

// ─── Bulk Action Bar ───────────────────────────────────────────────────────────
function BulkPresetBar({ selectedIds, onApplyAll, projectData }) {
  const presets = getDatePresets(projectData.start_date, projectData.planned_end_date, null);
  const [open, setOpen] = useState(false);

  if (selectedIds.length < 2) return null;

  return (
    <div className="bg-indigo-600 rounded-2xl p-3 flex items-center gap-3 flex-wrap shadow-lg shadow-indigo-200">
      <span className="text-white text-sm font-medium">
        Apply to all {selectedIds.length} selected:
      </span>
      <div className="flex flex-wrap gap-1.5">
        {presets.filter(p => p.id !== "custom").map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={preset.disabled}
            onClick={() => onApplyAll(preset)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium border border-white/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {preset.icon} {preset.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex gap-1.5">
        {/* {TIME_SLOTS.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onApplyAll(null, slot)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/25 text-white text-xs font-medium border border-white/20 transition"
            title={`Apply ${slot.label} shift to all`}
          >
            <Clock size={11} /> {slot.label}
          </button>
        ))} */}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Step2TeamMembers({ users }) {
  const { teamMembers, addTeamMember, removeTeamMember, projectData } = useProjectWizard();
  const [search, setSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [typeFilter, setTypeFilter] = useState("all"); // all | employee | user

  const safeUsers = Array.isArray(users) ? users : [];

  const availableMembers = safeUsers.filter((member) => {
    if (!member?.id) return false;
    const memberType = member.type || "user";

    if (typeFilter !== "all" && memberType !== typeFilter) return false;

    const searchLower = search.toLowerCase();
    return (
      `${member.name || ""}`.toLowerCase().includes(searchLower) ||
      (member.email || "").toLowerCase().includes(searchLower) ||
      (member.position || "").toLowerCase().includes(searchLower)
    );
  });

  const getMemberRole = (member) =>
    member.type === "employee" ? member.position || "No Position" : member.role || "No Role";

  const getCompositeId = (member) => {
    const id = typeof member.id === "number" ? member.id : parseInt(member.id, 10);
    return `${member.type || "user"}-${id}`;
  };

  const findMemberByCompositeId = (compositeId) => {
    const [memberType, memberIdStr] = compositeId.split("-");
    const memberIdInt = parseInt(memberIdStr, 10);
    return safeUsers.find(
      (m) => (typeof m.id === "number" ? m.id : parseInt(m.id, 10)) === memberIdInt && (m.type || "user") === memberType
    );
  };

  const removeTeamMemberByCompositeId = (compositeId) => {
    const [memberType, memberIdStr] = compositeId.split("-");
    const memberIdInt = parseInt(memberIdStr, 10);

    for (let i = teamMembers.length - 1; i >= 0; i--) {
      const tm = teamMembers[i];
      const tmId = typeof tm.id === "string" ? parseInt(tm.id, 10) : tm.id;
      if (tmId === memberIdInt && (tm.type || "user") === memberType) {
        removeTeamMember(i);
      }
    }
  };

  const upsertTeamMemberFromSelection = (compositeId, draftFormData = formData) => {
    const [memberType, memberIdStr] = compositeId.split("-");
    const memberIdInt = parseInt(memberIdStr, 10);
    const member = findMemberByCompositeId(compositeId);
    if (!member) return;

    removeTeamMemberByCompositeId(compositeId);

    addTeamMember({
      id:             memberIdInt,
      type:           memberType,
      name:           member.name || "Unknown",
      email:          member.email || "",
      role:           getMemberRole(member),
      pay_type:       draftFormData[compositeId]?.pay_type       || "hourly",
      hourly_rate:    parseFloat(draftFormData[compositeId]?.hourly_rate)    || 0,
      monthly_salary: parseFloat(draftFormData[compositeId]?.monthly_salary) || 0,
      start_date:     draftFormData[compositeId]?.start_date || "",
      end_date:       draftFormData[compositeId]?.end_date   || "",
      time_slot:      draftFormData[compositeId]?.time_slot  || null,
      work_hours:     draftFormData[compositeId]?.work_hours || null,
    });
  };

  const validateMemberSelection = (ids, draftFormData = formData, showRequired = false) => {
    const validationErrors = {};
    const validIds = [];

    for (const compositeId of ids) {
      const member = availableMembers.find((m) => getCompositeId(m) === compositeId);
      if (!member) continue;

      const name = member.name || "Team Member";
      const fd = draftFormData[compositeId] || {};
      const payType = fd.pay_type || "hourly";

      const hasHourlyRate = fd.hourly_rate !== undefined && fd.hourly_rate !== "";
      const hasMonthlySalary = fd.monthly_salary !== undefined && fd.monthly_salary !== "";
      const hasStartDate = !!fd.start_date;
      const hasEndDate = !!fd.end_date;

      if (payType === "hourly" && showRequired && !hasHourlyRate) {
        validationErrors[`${compositeId}_rate`] = `Hourly rate required for ${name}`;
      }
      if (payType === "hourly" && hasHourlyRate && parseFloat(fd.hourly_rate) < 0) {
        validationErrors[`${compositeId}_rate`] = `Hourly rate required for ${name}`;
      }
      if (payType === "salary" && showRequired && !hasMonthlySalary) {
        validationErrors[`${compositeId}_rate`] = `Monthly salary required for ${name}`;
      }
      if (payType === "salary" && hasMonthlySalary && parseFloat(fd.monthly_salary) < 0) {
        validationErrors[`${compositeId}_rate`] = `Monthly salary required for ${name}`;
      }

      if (showRequired && !hasStartDate) {
        validationErrors[`${compositeId}_start_date`] = `Start date required for ${name}`;
      } else if (hasStartDate) {
        if (projectData.start_date && fd.start_date < projectData.start_date) {
          validationErrors[`${compositeId}_start_date`] = `Cannot be before project start (${projectData.start_date})`;
        } else if (projectData.planned_end_date && fd.start_date > projectData.planned_end_date) {
          validationErrors[`${compositeId}_start_date`] = `Cannot be after project end (${projectData.planned_end_date})`;
        }
      }

      if (showRequired && !hasEndDate) {
        validationErrors[`${compositeId}_end_date`] = `End date required for ${name}`;
      } else if (hasStartDate && hasEndDate && fd.end_date < fd.start_date) {
        validationErrors[`${compositeId}_end_date`] = "End date must be after start date";
      }

      const hasRequiredForPayType =
        payType === "hourly" ? hasHourlyRate
        : payType === "salary" ? hasMonthlySalary
        : true;

      const hasAllRequired = hasRequiredForPayType && hasStartDate && hasEndDate;
      if (hasAllRequired && !validationErrors[`${compositeId}_rate`] && !validationErrors[`${compositeId}_start_date`] && !validationErrors[`${compositeId}_end_date`]) {
        validIds.push(compositeId);
      }
    }

    return { validationErrors, validIds };
  };

  const syncSelectedMembers = (ids, draftFormData = formData, showRequired = false) => {
    if (!ids.length) return;

    const { validationErrors, validIds } = validateMemberSelection(ids, draftFormData, showRequired);

    setErrors((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        delete next[`${id}_rate`];
        delete next[`${id}_start_date`];
        delete next[`${id}_end_date`];
      });
      return { ...next, ...validationErrors };
    });

    ids.forEach((compositeId) => {
      if (!validIds.includes(compositeId)) {
        removeTeamMemberByCompositeId(compositeId);
      }
    });

    ids.forEach((compositeId) => {
      if (validIds.includes(compositeId)) {
        upsertTeamMemberFromSelection(compositeId, draftFormData);
      }
    });
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      const nextSelected = availableMembers.map(getCompositeId);
      setSelectedMemberIds(nextSelected);
      syncSelectedMembers(nextSelected);
    } else {
      selectedMemberIds.forEach((compositeId) => removeTeamMemberByCompositeId(compositeId));
      setSelectedMemberIds([]);
    }
  };

  const toggleMember = (compositeId) => {
    if (selectedMemberIds.includes(compositeId)) {
      removeTeamMemberByCompositeId(compositeId);
      setSelectedMemberIds((prev) => prev.filter((id) => id !== compositeId));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`${compositeId}_rate`];
        delete next[`${compositeId}_start_date`];
        delete next[`${compositeId}_end_date`];
        return next;
      });
      return;
    }

    const nextSelected = [...selectedMemberIds, compositeId];
    setSelectedMemberIds(nextSelected);
    syncSelectedMembers([compositeId]);
  };

  const handleFormChange = (compositeId, field, value) => {
    handleFormPatch(compositeId, { [field]: value });
  };

  const handleFormPatch = (compositeId, patch) => {
    const nextFormData = {
      ...formData,
      [compositeId]: { ...formData[compositeId], ...patch },
    };
    setFormData(nextFormData);

    const patchFields = Object.keys(patch);
    if (patchFields.length) {
      setErrors((prev) => {
        const n = { ...prev };
        patchFields.forEach((field) => {
          const errorKey = `${compositeId}_${field}`;
          if (n[errorKey]) delete n[errorKey];
        });
        return n;
      });
    }

    if (selectedMemberIds.includes(compositeId)) {
      syncSelectedMembers([compositeId], nextFormData);
    }
  };

  const applyPresetToAll = (preset, timeSlot) => {
    selectedMemberIds.forEach((compositeId) => {
      const patch = {};

      if (preset) {
        const memberStart = formData[compositeId]?.start_date || "";
        const range = getPresetDateRange(
          preset.id,
          projectData.start_date,
          projectData.planned_end_date,
          memberStart
        );
        patch.date_preset = preset.id;
        if (preset.id !== "custom") {
          patch.start_date = range.start;
          patch.end_date = range.end;
        }
      }

      if (timeSlot) {
        patch.time_slot = timeSlot.id;
        patch.work_hours = timeSlot.time;
      }

      if (Object.keys(patch).length) {
        handleFormPatch(compositeId, patch);
      }
    });
    toast.success(`Applied to all ${selectedMemberIds.length} selected members`);
  };

  const employeeCount  = availableMembers.filter((m) => m.type === "employee").length;
  const userCount      = availableMembers.filter((m) => m.type !== "employee").length;
  const allSelectedCount = availableMembers.length;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h3 className="text-xl font-bold text-gray-900">Assign Team Members</h3>
        <p className="text-sm text-gray-500 mt-1">
          Select members and configure their assignment details. Use presets for faster setup.
        </p>
      </div>

      {/* ── Project Date Hint ── */}
      {(projectData.start_date || projectData.planned_end_date) && (
        <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl px-4 py-2.5">
          <CalendarRange size={15} className="text-indigo-500 flex-shrink-0" />
          <div className="text-xs text-indigo-700">
            <span className="font-semibold">Project window: </span>
            <span className="font-mono bg-indigo-100 px-1.5 py-0.5 rounded">
              {projectData.start_date || "—"} → {projectData.planned_end_date || "—"}
            </span>
            <span className="ml-2 text-indigo-500">All member dates must fall within this range.</span>
          </div>
        </div>
      )}

      {/* ── Rotation Notice ── */}
      {/* <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-800">
        <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
        <span>
          <strong>Employees</strong> follow a single-assignment rule — only one active project at a time. Use{" "}
          <strong>Work Shift</strong> to enable partial-day rotation (e.g. 8am–12pm on Project A, 1pm–5pm on Project B).{" "}
          <strong>Users/contractors</strong> can be on multiple projects simultaneously.
        </span>
      </div> */}

      {/* ── Search + Filter Row ── */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, email, position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-gray-300 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 h-10"
          />
        </div>

        {/* Type Filter Tabs */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          {[
            { id: "all",      label: `All (${allSelectedCount})` },
            { id: "employee", label: `Employees (${employeeCount})`,  color: "orange" },
            { id: "user",     label: `Users (${userCount})`,          color: "blue"   },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                typeFilter === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Select All */}
        <button
          type="button"
          onClick={() => toggleSelectAll(selectedMemberIds.length < availableMembers.length)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition h-10"
        >
          <Users size={13} />
          {selectedMemberIds.length === availableMembers.length && availableMembers.length > 0
            ? "Deselect All"
            : "Select All"}
        </button>
      </div>

      {/* ── Bulk Preset Bar ── */}
      <BulkPresetBar
        selectedIds={selectedMemberIds}
        onApplyAll={applyPresetToAll}
        projectData={projectData}
      />

      {/* ── Member Cards Grid ── */}
      {availableMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {availableMembers.map((member) => {
            const compositeId = getCompositeId(member);
            const isSelected  = selectedMemberIds.includes(compositeId);
            const memberErrors = {
              rate:       errors[`${compositeId}_rate`],
              start_date: errors[`${compositeId}_start_date`],
              end_date:   errors[`${compositeId}_end_date`],
            };
            return (
              <MemberCard
                key={compositeId}
                member={member}
                isSelected={isSelected}
                compositeId={compositeId}
                onToggle={toggleMember}
                formData={formData[compositeId]}
                errors={memberErrors}
                onFormChange={handleFormChange}
                onFormPatch={handleFormPatch}
                projectData={projectData}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Users className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-gray-500 font-semibold">
            {search ? "No members match your search" : "All available members have been selected"}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {search ? "Try a different search term" : "Check the team members list below"}
          </p>
        </div>
      )}

    </div>
  );
}