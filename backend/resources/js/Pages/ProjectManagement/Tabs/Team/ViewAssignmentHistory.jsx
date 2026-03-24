import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/Components/ui/dialog"
import { useEffect, useState } from "react"
import {
  Clock, Calendar, Building2, Loader2,
  ArrowLeftRight, AlertCircle,
} from "lucide-react"

const STATUS_CONFIG = {
  active:    { label: "Active",    dot: "bg-green-500",  bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  released:  { label: "Released",  dot: "bg-gray-400",   bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200"  },
  completed: { label: "Completed", dot: "bg-blue-500",   bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"  },
}

const SHIFT_LABELS = {
  morning:   { label: "Morning",   time: "08:00–12:00", color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200"  },
  afternoon: { label: "Afternoon", time: "13:00–17:00", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  evening:   { label: "Evening",   time: "18:00–22:00", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  fullday:   { label: "Full Day",  time: "08:00–17:00", color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200"  },
}

function formatDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
}

export default function ViewAssignmentHistory({ teamMember, onClose }) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const memberName = teamMember?.assignable_name || "Team Member"

  useEffect(() => {
    if (!teamMember) return

    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    if (teamMember.assignable_type === "employee" && teamMember.employee_id) {
      params.set("employee_id", teamMember.employee_id)
    } else if (teamMember.user_id) {
      params.set("user_id", teamMember.user_id)
    }

    fetch(route("project-management.project-teams.history") + "?" + params.toString(), {
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
    })
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        setAssignments(data.assignments || [])
        setLoading(false)
      })
      .catch(() => {
        setError("Could not load assignment history.")
        setLoading(false)
      })
  }, [teamMember])

  const activeAssignments   = assignments.filter(a => a.assignment_status === "active")
  const inactiveAssignments = assignments.filter(a => a.assignment_status !== "active")

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-lg max-h-[85vh] overflow-y-auto rounded-xl p-0 border">

        {/* SIMPLE HEADER */}
        <div className="px-5 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
              {memberName[0]?.toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-gray-900">
                {memberName}
              </DialogTitle>
              <p className="text-xs text-gray-500">
                Assignment history
              </p>
            </div>
          </div>

          {!loading && (
            <div className="flex gap-2 mt-3 text-xs">
              <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                {assignments.length} total
              </span>
              <span className="px-2 py-1 rounded-md bg-green-100 text-green-700">
                {activeAssignments.length} active
              </span>
              {activeAssignments.length >= 2 && (
                <span className="px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 flex items-center gap-1">
                  <ArrowLeftRight size={12} />
                  Split
                </span>
              )}
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="p-5">
          {loading && (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Loading...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {!loading && !error && assignments.length === 0 && (
            <div className="text-center py-10">
              <Building2 className="h-6 w-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No history found</p>
            </div>
          )}

          {!loading && !error && assignments.length > 0 && (
            <div className="space-y-4">

              {activeAssignments.length > 0 && (
                <Section title="Active">
                  {activeAssignments.map(a => (
                    <AssignmentCard key={a.id} assignment={a} />
                  ))}
                </Section>
              )}

              {inactiveAssignments.length > 0 && (
                <Section title="Past">
                  {inactiveAssignments.map(a => (
                    <AssignmentCard key={a.id} assignment={a} />
                  ))}
                </Section>
              )}

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function AssignmentCard({ assignment }) {
  const status = STATUS_CONFIG[assignment.assignment_status] || STATUS_CONFIG.released
  const shift  = assignment.time_slot ? SHIFT_LABELS[assignment.time_slot] : null
  const isActive = assignment.assignment_status === "active"

  return (
    <div className={`rounded-lg border p-3 text-sm ${
      isActive ? "border-green-200 bg-green-50/40" : "border-gray-200 bg-white"
    }`}>
      <div className="flex justify-between gap-2">
        <div className="flex-1 min-w-0">

          <p className="font-medium text-gray-900 truncate">
            {assignment.project?.project_name || "—"}
          </p>

          <p className="text-xs text-gray-500 mb-1">
            {assignment.role || "No role"}
          </p>

          {shift && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${shift.bg} ${shift.color} ${shift.border}`}>
              <Clock size={10} />
              {shift.label}
            </span>
          )}

          <div className="mt-1 text-[11px] text-gray-500">
            {formatDate(assignment.start_date)} → {assignment.end_date ? formatDate(assignment.end_date) : "ongoing"}
          </div>
        </div>

        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${status.bg} ${status.text} ${status.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>
      </div>
    </div>
  )
}