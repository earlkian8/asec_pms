import { useState } from "react"
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from "@/Components/ui/dialog"
import { Input } from "@/Components/ui/input"
import { Button } from "@/Components/ui/button"
import { router } from "@inertiajs/react"
import { toast } from "sonner"
import {
  Loader2, ArrowRight, Clock, SunMedium, Sunset, Moon,
  Building2, CheckCircle2, ArrowLeftRight, AlertCircle,
} from "lucide-react"
import InputError from "@/Components/InputError"

// ─── Shifts ─────────────────────────────────────────────────────────────
const SHIFTS = [
  { id: "morning",   label: "Morning",   time: "08:00–12:00", Icon: SunMedium },
  { id: "afternoon", label: "Afternoon", time: "13:00–17:00", Icon: Sunset },
  { id: "evening",   label: "Evening",   time: "18:00–22:00", Icon: Moon },
]

const SHIFT_HOURS = {
  morning:   { start: 8,  end: 12 },
  afternoon: { start: 13, end: 17 },
  evening:   { start: 18, end: 22 },
}

function shiftsOverlap(a, b) {
  if (!a || !b || !SHIFT_HOURS[a] || !SHIFT_HOURS[b]) return false
  return SHIFT_HOURS[a].start < SHIFT_HOURS[b].end && SHIFT_HOURS[b].start < SHIFT_HOURS[a].end
}

function ShiftPicker({ value, onChange, disabledShift, label, error }) {
  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          {label}
        </label>
      )}

      <div className="grid grid-cols-3 gap-2">
        {SHIFTS.map((shift) => {
          const isActive   = value === shift.id
          const isDisabled = disabledShift && shiftsOverlap(shift.id, disabledShift)
          const { Icon }   = shift

          return (
            <button
              key={shift.id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(shift.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition
                ${isDisabled
                  ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400"
                  : isActive
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }
              `}
            >
              <Icon size={16} />
              <span className="font-medium">{shift.label}</span>
              <span className="text-[10px] opacity-60">{shift.time}</span>
            </button>
          )
        })}
      </div>

      {error && <InputError message={error} className="mt-1" />}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────
export default function RotateTeamMember({
  currentTeam,
  currentProject,
  availableProjects = [],
  setShowModal,
}) {
  const [step, setStep] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState({})

  const [fromShift, setFromShift] = useState(null)
  const [toProject, setToProject] = useState(null)
  const [toShift, setToShift] = useState(null)
  const [toStartDate, setToStartDate] = useState("")
  const [toEndDate, setToEndDate] = useState("")
  const [toHourlyRate, setToHourlyRate] = useState(currentTeam?.hourly_rate ?? "")

  const memberName = currentTeam?.assignable_name || "Team Member"

  const handleFromShift = (s) => {
    setFromShift(s)
    if (toShift && shiftsOverlap(s, toShift)) setToShift(null)
  }

  const canStep1 = !!fromShift
  const canStep2 = !!toProject && !!toShift && !!toStartDate

  const handleSubmit = () => {
    setProcessing(true)
    setErrors({})

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
          toast.success(`${memberName} rotated successfully`)
          setShowModal(false)
        },
        onError: (errs) => {
          setProcessing(false)
          setErrors(errs)
          const first = Object.values(errs)[0]
          toast.error(Array.isArray(first) ? first[0] : first)
        },
      }
    )
  }

  return (
    <Dialog open onOpenChange={setShowModal}>
      <DialogContent className="w-[96vw] max-w-xl max-h-[90vh] overflow-y-auto rounded-xl p-0 border">

        {/* SIMPLE HEADER */}
        <div className="px-5 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
              {memberName[0]?.toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-gray-900">
                Rotate {memberName}
              </DialogTitle>
              <p className="text-xs text-gray-500">
                Assign to another project shift
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3 text-xs">
            <span className={`px-2 py-1 rounded ${step === 1 ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
              1. Current Shift
            </span>
            <span className={`px-2 py-1 rounded ${step === 2 ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
              2. New Project
            </span>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <div className="bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-600">
                Select which shift stays on <strong>{currentProject?.project_name}</strong>
              </div>

              <ShiftPicker
                value={fromShift}
                onChange={handleFromShift}
                error={errors.from_shift}
              />
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <div className="text-xs text-gray-500">
                Remaining shift will be assigned to another project
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Project
                </label>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableProjects.map((proj) => {
                    const isSelected = toProject?.id === proj.id

                    return (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => setToProject(proj)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left
                          ${isSelected
                            ? "border-gray-900 bg-gray-50"
                            : "border-gray-200 hover:bg-gray-50"
                          }`}
                      >
                        <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-xs font-semibold">
                          {proj.project_name?.[0]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{proj.project_name}</p>
                        </div>

                        {isSelected && <CheckCircle2 size={14} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {toProject && (
                <>
                  <ShiftPicker
                    value={toShift}
                    onChange={setToShift}
                    disabledShift={fromShift}
                    error={errors.to_shift}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <Input type="date" value={toStartDate} onChange={e => setToStartDate(e.target.value)} />
                    <Input type="date" value={toEndDate} onChange={e => setToEndDate(e.target.value)} />
                    <Input type="number" value={toHourlyRate} onChange={e => setToHourlyRate(e.target.value)} />
                  </div>
                </>
              )}

              <div className="text-xs text-gray-500 flex gap-1">
                <AlertCircle size={12} />
                Fully occupied after rotation
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="border-t bg-gray-50 px-5 py-3 flex justify-between">

          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(1)} disabled={processing}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={processing}>
              Cancel
            </Button>
          </div>

          {step === 1 && (
            <Button
              onClick={() => {
                if (!canStep1) return toast.error("Select a shift")
                setStep(2)
              }}
            >
              Continue
            </Button>
          )}

          {step === 2 && (
            <Button
              onClick={handleSubmit}
              disabled={processing || !canStep2}
              className="flex items-center gap-2"
            >
              {processing
                ? <Loader2 className="animate-spin h-4 w-4" />
                : <ArrowLeftRight size={14} />
              }
              Confirm
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}