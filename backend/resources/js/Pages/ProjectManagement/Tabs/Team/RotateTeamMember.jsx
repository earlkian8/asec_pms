import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import { Loader2, ArrowRight, Clock, SunMedium, Sunset, Moon, Building2, CheckCircle2, ArrowLeftRight, AlertCircle } from "lucide-react";
import InputError from "@/Components/InputError";

// ─── Shifts (no fullday — it blocks rotation) ─────────────────────────────────
const SHIFTS = [
  { id: "morning", label: "Morning", time: "08:00–12:00", Icon: SunMedium, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", activeBg: "bg-amber-500", activeBorder: "border-amber-500" },
  { id: "afternoon", label: "Afternoon", time: "13:00–17:00", Icon: Sunset, bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", activeBg: "bg-orange-500", activeBorder: "border-orange-500" },
  { id: "evening", label: "Evening", time: "18:00–22:00", Icon: Moon, bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", activeBg: "bg-indigo-600", activeBorder: "border-indigo-600" },
];

const SHIFT_HOURS = {
  morning: { start: 8, end: 12 },
  afternoon: { start: 13, end: 17 },
  evening: { start: 18, end: 22 },
};

function shiftsOverlap(a, b) {
  if (!a || !b || !SHIFT_HOURS[a] || !SHIFT_HOURS[b]) return false;
  return SHIFT_HOURS[a].start < SHIFT_HOURS[b].end && SHIFT_HOURS[b].start < SHIFT_HOURS[a].end;
}

function ShiftPicker({ value, onChange, disabledShift, label, error }) {
  return (
    <div>
      {label && (
        <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5 block">
          <Clock size={13} className="text-indigo-400" />
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 gap-2">
        {SHIFTS.map((shift) => {
          const isActive = value === shift.id;
          const isDisabled = disabledShift && shiftsOverlap(shift.id, disabledShift);
          const { Icon } = shift;
          return (
            <button
              key={shift.id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(shift.id)}
              title={isDisabled ? "Overlaps with current project shift" : undefined}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 relative ${
                isDisabled 
                  ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400" 
                  : isActive 
                    ? `${shift.activeBg} ${shift.activeBorder} text-white shadow-md` 
                    : `${shift.bg} ${shift.border} ${shift.text} hover:opacity-80`
              }`}
            >
              <Icon size={18} />
              <span className="font-semibold">{shift.label}</span>
              <span className={`text-xs ${isActive && !isDisabled ? "opacity-80" : "opacity-60"}`}>
                {shift.time}
              </span>
              {isDisabled && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-400 text-white text-[9px] rounded-full px-1 font-bold">
                  overlap
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && <InputError message={error} className="mt-1" />}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RotateTeamMember({ currentTeam, currentProject, availableProjects = [], setShowModal }) {
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Step 1 — current project shift
  const [fromShift, setFromShift] = useState(null);
  
  // Step 2 — new project
  const [toProject, setToProject] = useState(null);
  const [toShift, setToShift] = useState(null);
  const [toStartDate, setToStartDate] = useState("");
  const [toEndDate, setToEndDate] = useState("");
  const [toHourlyRate, setToHourlyRate] = useState(currentTeam?.hourly_rate ?? "");
  
  const memberName = currentTeam?.assignable_name || "Team Member";
  
  // Reset toShift when fromShift changes (avoid stale overlap)
  const handleFromShift = (s) => {
    setFromShift(s);
    if (toShift && shiftsOverlap(s, toShift)) setToShift(null);
  };
  
  const canStep1 = !!fromShift;
  const canStep2 = !!toProject && !!toShift && !!toStartDate;
  
  const handleSubmit = () => {
    setProcessing(true);
    setErrors({});
    
    router.post(
      route("project-management.project-teams.rotate", currentProject.id),
      {
        team_id: currentTeam.id,
        from_shift: fromShift,
        to_project_id: toProject.id,
        to_shift: toShift,
        to_start_date: toStartDate,
        to_end_date: toEndDate || null,
        to_hourly_rate: parseFloat(toHourlyRate) || 0,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(`${memberName} rotated successfully`);
          setShowModal(false);
        },
        onError: (errs) => {
          setProcessing(false);
          setErrors(errs);
          const first = Object.values(errs)[0];
          toast.error(Array.isArray(first) ? first[0] : first);
        },
      }
    );
  };
  
  return (
    <Dialog open onOpenChange={setShowModal}>
      <DialogContent className="w-[96vw] max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-indigo-900 px-6 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-white font-bold text-sm">
              {memberName[0]?.toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-white text-base font-bold">
                Rotate {memberName}
              </DialogTitle>
              <p className="text-slate-400 text-xs mt-0.5">
                Split their day across two projects
              </p>
            </div>
          </div>
          
          {/* Step pills */}
          <div className="flex items-center gap-2">
            {["Set shift on current project", "Assign to new project"].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  step === i + 1 
                    ? "bg-white text-slate-800 border-white" 
                    : step > i + 1 
                      ? "bg-white/20 text-white border-white/30" 
                      : "bg-transparent text-white/40 border-white/20"
                }`}>
                  {step > i + 1 ? <CheckCircle2 size={11} /> : <span className="font-bold w-3 text-center">{i + 1}</span>}
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < 1 && <ArrowRight size={11} className="text-white/30 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-5 space-y-5">
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Explanation banner */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700 flex gap-2">
                <ArrowLeftRight size={15} className="flex-shrink-0 mt-0.5 text-indigo-500" />
                <span>
                  Choose which shift {memberName} keeps on{" "}
                  <strong>{currentProject?.project_name}</strong>.{" "}
                  The other shift hours will go to the new project.
                </span>
              </div>
              
              {/* Current assignment summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Role</p>
                  <p className="font-semibold text-slate-800">{currentTeam?.role || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Rate</p>
                  <p className="font-semibold text-slate-800">₱{parseFloat(currentTeam?.hourly_rate || 0).toFixed(2)}/hr</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Project</p>
                  <p className="font-semibold text-slate-800 truncate">{currentProject?.project_name}</p>
                </div>
              </div>
              
              <ShiftPicker 
                label={<>Shift to keep on <span className="text-indigo-700">{currentProject?.project_name}</span> <span className="text-red-500">*</span></>}
                value={fromShift}
                onChange={handleFromShift}
                error={errors.from_shift}
              />
            </div>
          )}
          
          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Reminder of step 1 choice */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
                <Clock size={13} className="text-slate-400" />
                <span className="text-slate-600">
                  Stays on <strong>{currentProject?.project_name}</strong> during{" "}
                  <strong className="text-indigo-700">
                    {SHIFTS.find(s => s.id === fromShift)?.time} ({fromShift})
                  </strong>
                </span>
              </div>
              
              {/* Project picker */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  New Project <span className="text-red-500">*</span>
                </label>
                {availableProjects.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {availableProjects.map((proj) => {
                      const isSelected = toProject?.id === proj.id;
                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => setToProject(proj)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all ${
                            isSelected 
                              ? "border-indigo-400 bg-indigo-50" 
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isSelected 
                              ? "bg-indigo-600 text-white" 
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {proj.project_name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{proj.project_name}</p>
                            <p className="text-xs text-gray-400">{proj.start_date || "—"} → {proj.planned_end_date || "—"}</p>
                          </div>
                          {isSelected && <CheckCircle2 size={15} className="text-indigo-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center">
                    <Building2 className="h-7 w-7 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm font-medium">No available projects</p>
                    <p className="text-gray-400 text-xs mt-1">Create another active project first.</p>
                  </div>
                )}
                {errors.to_project_id && <InputError message={errors.to_project_id} className="mt-1" />}
              </div>
              
              {/* Only show shift + dates after project is selected */}
              {toProject && (
                <>
                  <ShiftPicker 
                    label={<>Shift on <span className="text-indigo-700">{toProject.project_name}</span> <span className="text-red-500">*</span></>}
                    value={toShift}
                    onChange={setToShift}
                    disabledShift={fromShift}
                    error={errors.to_shift}
                  />
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        type="date" 
                        value={toStartDate} 
                        onChange={e => setToStartDate(e.target.value)}
                        min={toProject?.start_date || undefined}
                        max={toProject?.planned_end_date || undefined}
                        className={`text-sm rounded-lg ${errors.to_start_date ? "border-red-400" : "border-gray-300 focus:border-indigo-400"}`}
                      />
                      {errors.to_start_date && <InputError message={errors.to_start_date} className="mt-1" />}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">End Date</label>
                      <Input 
                        type="date" 
                        value={toEndDate} 
                        onChange={e => setToEndDate(e.target.value)}
                        min={toStartDate || undefined}
                        max={toProject?.planned_end_date || undefined}
                        className="text-sm border-gray-300 rounded-lg focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Rate (₱/hr)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          value={toHourlyRate} 
                          onChange={e => setToHourlyRate(e.target.value)}
                          className="pl-7 text-sm border-gray-300 rounded-lg focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary preview */}
                  {toShift && toStartDate && (
                    <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-200 rounded-xl p-4 text-sm">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Summary</p>
                      <div className="flex items-stretch gap-3">
                        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-3">
                          <p className="text-xs text-slate-500 mb-1">Stays on</p>
                          <p className="font-bold text-slate-800 text-xs truncate">{currentProject?.project_name}</p>
                          <p className="text-indigo-600 font-medium text-xs mt-0.5">
                            {SHIFTS.find(s => s.id === fromShift)?.time}
                          </p>
                        </div>
                        <div className="flex items-center text-indigo-400">
                          <ArrowRight size={16} />
                        </div>
                        <div className="flex-1 bg-white rounded-lg border border-indigo-200 p-3">
                          <p className="text-xs text-indigo-500 mb-1">Also works on</p>
                          <p className="font-bold text-indigo-800 text-xs truncate">{toProject?.project_name}</p>
                          <p className="text-indigo-600 font-medium text-xs mt-0.5">
                            {SHIFTS.find(s => s.id === toShift)?.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                <span>
                  {memberName} will be <strong>fully occupied</strong> across both projects. No further assignments will be possible until one slot is released.
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <DialogFooter className="border-t border-gray-100 bg-gray-50 px-5 py-3.5 flex items-center justify-between gap-3 rounded-b-2xl">
          <div className="flex gap-2">
            {step > 1 && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep(1)} 
                disabled={processing} 
                className="rounded-lg h-9 px-3 text-sm border-gray-300"
              >
                ← Back
              </Button>
            )}
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowModal(false)} 
              disabled={processing} 
              className="rounded-lg h-9 px-3 text-sm border-gray-300"
            >
              Cancel
            </Button>
          </div>
          
          {step === 1 && (
            <Button 
              type="button" 
              onClick={() => {
                if (!canStep1) {
                  toast.error("Select a shift first");
                  return;
                }
                setStep(2);
              }} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 h-9 text-sm font-medium"
            >
              Continue →
            </Button>
          )}
          
          {step === 2 && (
            <Button 
              type="button" 
              onClick={() => {
                if (!canStep2) {
                  toast.error("Complete all required fields");
                  return;
                }
                handleSubmit();
              }} 
              disabled={processing || !canStep2} 
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg px-4 h-9 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {processing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Rotating...</> : <><ArrowLeftRight size={14} /> Confirm Rotation</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}