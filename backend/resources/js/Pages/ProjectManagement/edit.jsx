import { useForm } from "@inertiajs/react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import { Loader2, Save, Lock, Upload, FileText, X, AlertTriangle } from "lucide-react";
import AddClient from "../ClientManagement/add";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/numberFormat";

const DOCUMENT_FIELDS = [
  { key: 'building_permit',          label: 'Building Permit'          },
  { key: 'business_permit',          label: 'Business Permit'          },
  { key: 'environmental_compliance', label: 'Environmental Compliance' },
  { key: 'contractor_license',       label: 'Contractor License'       },
  { key: 'surety_bond',              label: 'Surety Bond'              },
  { key: 'signed_contract',          label: 'Signed Contract'          },
  { key: 'notice_to_proceed',        label: 'Notice to Proceed'        },
];

const EditProject = ({ open, setShowEditModal, clients, projectTypes, project }) => {
  const hasBillings = project?.has_billings ?? (project?.billings_count > 0) ?? false;

  const { data, setData, post, errors, processing } = useForm({
    _method: 'PUT',
    project_name:     project?.project_name     || "",
    client_id:        project?.client_id?.toString() || "",
    project_type_id:  project?.project_type_id?.toString() || "",
    status:           project?.status           || "active",
    priority:         project?.priority         || "medium",
    contract_amount:  project?.contract_amount  || "",
    start_date:       project?.start_date       || "",
    planned_end_date: project?.planned_end_date || "",
    actual_end_date:  project?.actual_end_date  || "",
    location:         project?.location         || "",
    description:      project?.description      || "",
    building_permit:          null,
    business_permit:          null,
    environmental_compliance: null,
    contractor_license:       null,
    surety_bond:              null,
    signed_contract:          null,
    notice_to_proceed:        null,
  });

  const [showAddClient, setShowAddClient]           = useState(false);
  const [contractAmountDisplay, setContractAmountDisplay] = useState('');
  const [validationErrors, setValidationErrors]     = useState({});
  const [selectedFiles, setSelectedFiles]           = useState({});
  const fileRefs = useRef({});

  useEffect(() => {
    if (data.contract_amount) {
      setContractAmountDisplay(formatNumberWithCommas(data.contract_amount));
    } else {
      setContractAmountDisplay('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unified error getter — local validation takes priority over server errors
  const getFieldError = (f) => validationErrors[f] || errors[f];

  const validateForm = () => {
    const errs = {};

    if (!data.project_name?.trim()) {
      errs.project_name = 'The project name field is required.';
    }
    if (!data.client_id) {
      errs.client_id = 'The client field is required.';
    }
    if (!data.project_type_id) {
      errs.project_type_id = 'The project type field is required.';
    }
    if (!hasBillings && (!data.contract_amount || parseFloat(data.contract_amount) <= 0)) {
      errs.contract_amount = 'The contract amount field is required and must be greater than 0.';
    }
    if (!data.start_date) {
      errs.start_date = 'The start date field is required.';
    }
    if (!data.planned_end_date) {
      errs.planned_end_date = 'The planned end date field is required.';
    } else if (data.start_date && data.planned_end_date < data.start_date) {
      errs.planned_end_date = 'Planned end date must not be before the start date.';
    }

    return errs;
  };

  const buildErrorSummary = (errs) => {
    const messages = Object.values(errs).flat().filter(Boolean);
    if (messages.length === 0) return "Failed to update project. Please try again.";
    if (messages.length === 1) return messages[0];
    return `${messages.length} fields have errors — please review the highlighted fields.`;
  };

  // Start date — re-validate planned end date whenever start date changes
  const handleStartDateChange = (value) => {
    setData("start_date", value);
    if (data.planned_end_date && data.planned_end_date < value) {
      setValidationErrors(prev => ({
        ...prev,
        planned_end_date: 'Planned end date must not be before the start date.',
      }));
    } else {
      setValidationErrors(prev => { const next = { ...prev }; delete next.planned_end_date; return next; });
    }
  };

  // Planned end date — validate against start date live
  const handlePlannedEndDateChange = (value) => {
    setData("planned_end_date", value);
    if (data.start_date && value < data.start_date) {
      setValidationErrors(prev => ({
        ...prev,
        planned_end_date: 'Planned end date must not be before the start date.',
      }));
    } else {
      setValidationErrors(prev => { const next = { ...prev }; delete next.planned_end_date; return next; });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs);
      toast.error("Please fill in all required fields");
      return;
    }

    post(route("project-management.update", project.id), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: (page) => {
        setShowEditModal(false);
        setValidationErrors({});
        const flash = page.props.flash;
        if (flash?.error) toast.error(flash.error);
        else toast.success("Project updated successfully!");
      },
      onError: (errs) => {
        toast.error(buildErrorSummary(errs));
      },
    });
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleFileChange = (fieldKey, file) => {
    setData(fieldKey, file || null);
    setSelectedFiles(prev => ({ ...prev, [fieldKey]: file?.name || null }));
  };

  const clearFile = (fieldKey) => {
    setData(fieldKey, null);
    setSelectedFiles(prev => ({ ...prev, [fieldKey]: null }));
    if (fileRefs.current[fieldKey]) fileRefs.current[fieldKey].value = '';
  };

  const getExistingFilename = (fieldKey) => project?.[fieldKey] || null;

  if (!project) return null;

  return (
    <>
      {showAddClient && <AddClient setShowAddModal={setShowAddClient} />}

      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) setShowEditModal(false); }}>
        <DialogContent className="w-[95vw] max-w-[750px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-zinc-800">Edit Project</DialogTitle>
            <DialogDescription className="text-zinc-600">
              Update the project details below. Fields marked with <span className="text-red-500 font-bold">*</span> are required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">

            {/* ─── Basic Info ─── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
                Project Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Project Name */}
                <div className="md:col-span-2">
                  <Label className="text-zinc-800">Project Name <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    value={data.project_name}
                    onChange={(e) => setData("project_name", e.target.value)}
                    placeholder="Enter project name"
                    className={inputClass(getFieldError('project_name'))}
                  />
                  <InputError message={getFieldError('project_name')} />
                </div>

                {/* Client */}
                <div>
                  <Label className="text-zinc-800">Client <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2 items-center">
                    <Select value={data.client_id} onValueChange={(v) => setData("client_id", v)}>
                      <SelectTrigger className={inputClass(getFieldError('client_id'))}>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.client_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="whitespace-nowrap" onClick={() => setShowAddClient(true)}>New</Button>
                  </div>
                  <InputError message={getFieldError('client_id')} />
                </div>

                {/* Project Type */}
                <div>
                  <Label className="text-zinc-800">Project Type <span className="text-red-500">*</span></Label>
                  <Select value={data.project_type_id} onValueChange={(v) => setData("project_type_id", v)}>
                    <SelectTrigger className={inputClass(getFieldError('project_type_id'))}>
                      <SelectValue placeholder="Project Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes?.length > 0
                        ? projectTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)
                        : <SelectItem value="" disabled>No project types available</SelectItem>}
                    </SelectContent>
                  </Select>
                  <InputError message={getFieldError('project_type_id')} />
                </div>

                {/* Status */}
                <div>
                  <Label className="text-zinc-800">Status</Label>
                  <Select value={data.status} onValueChange={(v) => setData("status", v)}>
                    <SelectTrigger className={inputClass(getFieldError('status'))}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <InputError message={getFieldError('status')} />
                </div>

                {/* Priority */}
                <div>
                  <Label className="text-zinc-800">Priority</Label>
                  <Select value={data.priority} onValueChange={(v) => setData("priority", v)}>
                    <SelectTrigger className={inputClass(getFieldError('priority'))}>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <InputError message={getFieldError('priority')} />
                </div>

                {/* Contract Amount */}
                <div>
                  <Label className="text-zinc-800 flex items-center gap-1.5">
                    Contract Amount <span className="text-red-500">*</span>
                    {hasBillings && <Lock className="h-3.5 w-3.5 text-amber-600" />}
                  </Label>
                  {hasBillings ? (
                    <>
                      <div className="relative">
                        <Input
                          type="text"
                          value={`₱${parseFloat(project.contract_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          readOnly
                          className="w-full border text-sm rounded-md px-4 py-2 bg-amber-50 border-amber-300 text-amber-800 cursor-not-allowed"
                        />
                      </div>
                      <div className="flex items-start gap-1.5 mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700">
                          Contract amount cannot be edited because this project already has billing records. Contact your administrator if a change is needed.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Input
                        type="text"
                        value={contractAmountDisplay}
                        onChange={(e) => {
                          let v = e.target.value;
                          if (v === '') { setContractAmountDisplay(''); setData("contract_amount", ''); return; }
                          v = v.replace(/[^\d.]/g, '');
                          const parts = v.split('.');
                          if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
                          if (parts.length === 2 && parts[1].length > 2) v = parts[0] + '.' + parts[1].substring(0, 2);
                          setContractAmountDisplay(formatNumberWithCommas(v));
                          setData("contract_amount", parseFormattedNumber(v));
                        }}
                        placeholder="Enter amount"
                        className={inputClass(getFieldError('contract_amount'))}
                      />
                      <InputError message={getFieldError('contract_amount')} />
                    </>
                  )}
                </div>

                {/* Start Date */}
                <div>
                  <Label className="text-zinc-800">Start Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={data.start_date || ""}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className={inputClass(getFieldError('start_date'))}
                  />
                  <InputError message={getFieldError('start_date')} />
                </div>

                {/* Planned End Date */}
                <div>
                  <Label className="text-zinc-800">Planned End Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={data.planned_end_date || ""}
                    min={data.start_date || undefined}
                    onChange={(e) => handlePlannedEndDateChange(e.target.value)}
                    className={inputClass(getFieldError('planned_end_date'))}
                  />
                  <InputError message={getFieldError('planned_end_date')} />
                </div>

                {/* Actual End Date */}
                <div>
                  <Label className="text-zinc-800">Actual End Date</Label>
                  <Input
                    type="date"
                    value={data.actual_end_date || ""}
                    onChange={(e) => setData("actual_end_date", e.target.value)}
                    className={inputClass(getFieldError('actual_end_date'))}
                  />
                  <InputError message={getFieldError('actual_end_date')} />
                </div>

                {/* Location */}
                <div className="md:col-span-2">
                  <Label className="text-zinc-800">Location</Label>
                  <Textarea
                    value={data.location}
                    onChange={(e) => setData("location", e.target.value)}
                    placeholder="Enter project location"
                    className={inputClass(getFieldError('location'))}
                  />
                  <InputError message={getFieldError('location')} />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <Label className="text-zinc-800">Description</Label>
                  <Textarea
                    value={data.description}
                    onChange={(e) => setData("description", e.target.value)}
                    placeholder="Enter project description"
                    rows={3}
                    className={inputClass(getFieldError('description'))}
                  />
                  <InputError message={getFieldError('description')} />
                </div>
              </div>
            </div>

            {/* ─── Documents ─── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
                Project Documents
              </h3>
              <p className="text-xs text-gray-500 mb-4">Accepted: PDF, Word (DOCX), or image files (max 10MB each). Uploading a new file will delete and replace the existing one.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {DOCUMENT_FIELDS.map(({ key, label }) => {
                  const existingFile = getExistingFilename(key);
                  const selectedFile = selectedFiles[key];
                  const hasFile      = selectedFile || existingFile;
                  const displayName  = selectedFile || existingFile || '';
                  const ext          = displayName.split('.').pop()?.toLowerCase();
                  const isImage      = ['jpg','jpeg','png','webp'].includes(ext);
                  const isPdf        = ext === 'pdf';
                  const isDocx       = ['doc','docx'].includes(ext);

                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <Label className="text-zinc-700 text-xs font-semibold">{label}</Label>
                      <div
                        className={`relative rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer group
                          ${hasFile
                            ? selectedFile
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-green-400 bg-green-50'
                            : 'border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                          }`}
                        style={{ aspectRatio: '3/4' }}
                        onClick={() => fileRefs.current[key]?.click()}
                      >
                        {hasFile ? (
                          <>
                            {isImage ? (
                              <img
                                src={selectedFile
                                  ? URL.createObjectURL(data[key])
                                  : route('project-management.document', { project: project.id, field: key })}
                                alt={label}
                                className="w-full h-full object-cover"
                              />
                            ) : isPdf ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 gap-2 px-2">
                                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-600" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v5h5v11H6z"/>
                                  </svg>
                                </div>
                                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">PDF</span>
                                <span className="text-xs text-red-500 text-center leading-tight truncate w-full text-center">{displayName}</span>
                              </div>
                            ) : isDocx ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 gap-2 px-2">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-600" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v5h5v11H6z"/>
                                    <path d="M8 12.5l1.5 4 1.5-4 1.5 4 1.5-4" stroke="white" strokeWidth="1" fill="none"/>
                                  </svg>
                                </div>
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">DOCX</span>
                                <span className="text-xs text-blue-500 text-center leading-tight truncate w-full text-center">{displayName}</span>
                              </div>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 gap-2 px-2">
                                <FileText className="w-10 h-10 text-gray-400" />
                                <span className="text-xs text-gray-500 text-center truncate w-full text-center">{displayName}</span>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                              <button type="button"
                                onClick={(e) => { e.stopPropagation(); fileRefs.current[key]?.click(); }}
                                className="p-2 bg-white rounded-lg text-gray-700 hover:text-blue-600 shadow"
                                title="Replace">
                                <Upload size={14} />
                              </button>
                              <button type="button"
                                onClick={(e) => { e.stopPropagation(); clearFile(key); }}
                                className="p-2 bg-white rounded-lg text-gray-700 hover:text-red-600 shadow"
                                title="Remove">
                                <X size={14} />
                              </button>
                            </div>

                            <div className={`absolute top-1.5 right-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                              selectedFile ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                            }`}>
                              {selectedFile ? 'New' : '✓'}
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                            <Upload className="h-6 w-6 text-gray-400" />
                            <span className="text-xs text-gray-500 font-medium text-center leading-tight">Click to upload</span>
                            <span className="text-xs text-gray-400 text-center">PDF, DOCX, JPG, PNG</span>
                          </div>
                        )}
                        <input
                          ref={el => fileRefs.current[key] = el}
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
                        />
                      </div>
                      <InputError message={getFieldError(key)} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}
                disabled={processing} className="border-gray-300 hover:bg-gray-50 transition-all duration-200">
                Cancel
              </Button>
              <Button type="submit"
                className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={processing}>
                {processing ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save size={16} />Save Changes</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditProject;