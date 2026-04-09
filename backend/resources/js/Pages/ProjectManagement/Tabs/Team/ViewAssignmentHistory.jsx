import {
  Dialog, DialogContent, DialogTitle,
} from "@/Components/ui/dialog"
import { useEffect, useState } from "react"
import {
  Clock, Loader2, AlertCircle, RotateCcw,
  Briefcase, Mail, DollarSign, Calendar, User, LogOut,
} from "lucide-react"

const STATUS_CONFIG = {
  active:    { label: "Active",    dot: "bg-green-500",  bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  released:  { label: "Released",  dot: "bg-gray-400",   bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200"  },
  completed: { label: "Completed", dot: "bg-blue-500",   bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"  },
}

function formatDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric"
  })
}

function formatDateTime(d) {
  if (!d) return null
  return new Date(d).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  })
}

function formatCurrency(amount) {
  if (!amount) return "—"
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount)
}

export default function ViewAssignmentHistory({ teamMember, onClose }) {
  const [statusLogs, setStatusLogs]     = useState([])
  const [logsLoading, setLogsLoading]   = useState(true)
  const [logsError, setLogsError]       = useState(null)
  const [activeTab, setActiveTab]       = useState("details")

  const memberName = teamMember?.assignable_name || "Team Member"
  const isEmployee = teamMember?.assignable_type === "employee"

  // Reset tab when member changes
  useEffect(() => {
    setActiveTab("details")
  }, [teamMember?.id])

  // Fetch status logs — employees only
  useEffect(() => {
    if (!teamMember?.id || !teamMember?.project_id || !isEmployee) {
      setLogsLoading(false)
      return
    }
    setLogsLoading(true)
    setLogsError(null)

    fetch(
      route("project-management.project-teams.status-logs", {
        project: teamMember.project_id,
        projectTeam: teamMember.id,
      }),
      { headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" } }
    )
      .then(res => { if (!res.ok) throw new Error(res.status); return res.json() })
      .then(data => { setStatusLogs(data.logs || []); setLogsLoading(false) })
      .catch(() => { setLogsError("Could not load status logs."); setLogsLoading(false) })
  }, [teamMember?.id, teamMember?.project_id])

  const tabs = [
    { id: "details", label: "Details" },
    ...(isEmployee ? [{ id: "logs", label: "Status Logs" }] : []),
  ]

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-xl p-0 border">

        {/* HEADER */}
        <div className="px-5 py-4 border-b bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold ${
              isEmployee ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
            }`}>
              {memberName[0]?.toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-gray-900">
                {memberName}
              </DialogTitle>
              <p className="text-xs text-gray-500">
                {isEmployee ? "Employee" : "User"} • {teamMember?.role || "No role"}
              </p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-1 mt-3 bg-gray-100 rounded-lg p-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.id === "logs" && statusLogs.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-gray-200 text-gray-600">
                    {statusLogs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ─── Details Tab ─── */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignment Info</h4>
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem icon={<Briefcase size={13} />} label="Role" value={teamMember?.role || "—"} />
                  <InfoItem icon={<DollarSign size={13} />} label="Hourly Rate" value={formatCurrency(teamMember?.hourly_rate)} />
                  <InfoItem icon={<Calendar size={13} />} label="Start Date" value={formatDate(teamMember?.start_date)} />
                  <InfoItem icon={<Calendar size={13} />} label="End Date" value={formatDate(teamMember?.end_date)} />
                </div>
                <div className="mt-2">
                  {(() => {
                    const status = STATUS_CONFIG[teamMember?.assignment_status] || STATUS_CONFIG.active
                    return (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.text} ${status.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</h4>
                <InfoItem
                  icon={<Mail size={13} />}
                  label="Email"
                  value={teamMember?.user?.email || teamMember?.employee?.email || "—"}
                />
                {isEmployee && teamMember?.employee?.position && (
                  <InfoItem icon={<User size={13} />} label="Position" value={teamMember.employee.position} />
                )}
              </div>
            </div>
          )}

          {/* ─── Status Logs Tab (employees only) ─── */}
          {activeTab === "logs" && isEmployee && (
            <div>
              {logsLoading && (
                <div className="flex flex-col items-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">Loading logs...</p>
                </div>
              )}

              {logsError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">
                  <AlertCircle size={14} /> {logsError}
                </div>
              )}

              {!logsLoading && !logsError && statusLogs.length === 0 && (
                <div className="text-center py-10">
                  <Clock className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No status changes recorded yet</p>
                  <p className="text-xs text-gray-400 mt-1">Logs appear when a member is released or reactivated</p>
                </div>
              )}

              {!logsLoading && !logsError && statusLogs.length > 0 && (
                <div className="space-y-2">
                  {statusLogs.map(log => (
                    <StatusLogCard key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value}</p>
      </div>
    </div>
  )
}

function StatusLogCard({ log }) {
  const isRelease = log.action === "released"

  return (
    <div className={`rounded-lg border p-3 flex items-start gap-3 ${
      isRelease ? "border-amber-200 bg-amber-50/40" : "border-green-200 bg-green-50/40"
    }`}>
      <div className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${
        isRelease ? "bg-amber-100" : "bg-green-100"
      }`}>
        {isRelease
          ? <LogOut size={12} className="text-amber-600" />
          : <RotateCcw size={12} className="text-green-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${isRelease ? "text-amber-700" : "text-green-700"}`}>
          {isRelease ? "Released" : "Reactivated"}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          By <span className="font-medium text-gray-700">{log.performed_by}</span>
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
          <Clock size={10} />
          {formatDateTime(log.created_at)}
        </p>
      </div>
    </div>
  )
}
