import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
import { Upload, FileText, X } from "lucide-react";
import AddClient from "../../ClientManagement/add";
import AddProjectType from "../../ProjectTypeManagement/add";
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

export default function Step1ProjectInfo({ clients, projectTypes = [], clientTypes = [], errors = {} }) {
  const { projectData, updateProjectData } = useProjectWizard();
  const [showAddClient, setShowAddClient]         = useState(false);
  const [showAddProjectType, setShowAddProjectType] = useState(false);
  const [contractAmountDisplay, setContractAmountDisplay] = useState('');
  const [selectedFiles, setSelectedFiles] = useState({});
  const fileRefs = useRef({});

  useEffect(() => {
    if (projectData.contract_amount) {
      setContractAmountDisplay(formatNumberWithCommas(projectData.contract_amount));
    } else {
      setContractAmountDisplay('');
    }
  }, [projectData.contract_amount]);

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleProjectTypeAdded = () => {
    setShowAddProjectType(false);
    router.reload({ only: ['projectTypes'], preserveState: true });
  };

  const handleFileChange = (fieldKey, file) => {
    updateProjectData({ [fieldKey]: file || null });
    setSelectedFiles(prev => ({ ...prev, [fieldKey]: file?.name || null }));
  };

  const clearFile = (fieldKey) => {
    updateProjectData({ [fieldKey]: null });
    setSelectedFiles(prev => ({ ...prev, [fieldKey]: null }));
    if (fileRefs.current[fieldKey]) fileRefs.current[fieldKey].value = '';
  };

  return (
    <>
      {showAddClient && <AddClient setShowAddModal={setShowAddClient} clientTypes={clientTypes} />}
      {showAddProjectType && <AddProjectType setShowAddModal={setShowAddProjectType} onSuccess={handleProjectTypeAdded} />}

      <div className="space-y-6">
        {/* ─── Basic Info ─── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
            Project Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Name */}
            <div className="md:col-span-2">
              <Label className="text-zinc-800">Project Name <span className="text-red-500">*</span></Label>
              <Input type="text" value={projectData.project_name}
                onChange={(e) => updateProjectData({ project_name: e.target.value })}
                placeholder="Enter project name"
                className={inputClass(errors.project_name)} />
              <InputError message={errors.project_name} />
            </div>

            {/* Client */}
            <div>
              <Label className="text-zinc-800">Client <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 items-center">
                <Select value={projectData.client_id} onValueChange={(v) => updateProjectData({ client_id: v })}>
                  <SelectTrigger className={inputClass(errors.client_id)}>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.client_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" className="whitespace-nowrap" onClick={() => setShowAddClient(true)}>New</Button>
              </div>
              <InputError message={errors.client_id} />
            </div>

            {/* Project Type */}
            <div>
              <Label className="text-zinc-800">Project Type <span className="text-red-500">*</span></Label>
              <div className="flex gap-2 items-center">
                <Select value={projectData.project_type_id} onValueChange={(v) => updateProjectData({ project_type_id: v })}>
                  <SelectTrigger className={inputClass(errors.project_type_id)}>
                    <SelectValue placeholder="Project Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes?.length > 0
                      ? projectTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)
                      : <SelectItem value="" disabled>No project types available</SelectItem>}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" className="whitespace-nowrap" onClick={() => setShowAddProjectType(true)}>New</Button>
              </div>
              <InputError message={errors.project_type_id} />
            </div>

            {/* Status */}
            <div>
              <Label className="text-zinc-800">Status</Label>
              <Select value={projectData.status} onValueChange={(v) => updateProjectData({ status: v })}>
                <SelectTrigger className={inputClass(false)}><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-zinc-800">Priority</Label>
              <Select value={projectData.priority} onValueChange={(v) => updateProjectData({ priority: v })}>
                <SelectTrigger className={inputClass(false)}><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contract Amount */}
            <div>
              <Label className="text-zinc-800">Contract Amount <span className="text-red-500">*</span></Label>
              <Input type="text" value={contractAmountDisplay}
                onChange={(e) => {
                  let v = e.target.value;
                  if (v === '') { setContractAmountDisplay(''); updateProjectData({ contract_amount: '' }); return; }
                  v = v.replace(/[^\d.]/g, '');
                  const parts = v.split('.');
                  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
                  if (parts.length === 2 && parts[1].length > 2) v = parts[0] + '.' + parts[1].substring(0, 2);
                  setContractAmountDisplay(formatNumberWithCommas(v));
                  updateProjectData({ contract_amount: parseFormattedNumber(v) });
                }}
                placeholder="Enter amount"
                className={inputClass(errors.contract_amount)} />
              <InputError message={errors.contract_amount} />
            </div>

            {/* Start Date */}
            <div>
              <Label className="text-zinc-800">Start Date</Label>
              <Input type="date" value={projectData.start_date}
                onChange={(e) => updateProjectData({ start_date: e.target.value })} className={inputClass(false)} />
            </div>

            {/* Planned End Date */}
            <div>
              <Label className="text-zinc-800">Planned End Date</Label>
              <Input type="date" value={projectData.planned_end_date}
                onChange={(e) => updateProjectData({ planned_end_date: e.target.value })} className={inputClass(false)} />
            </div>

            {/* Billing Type */}
            <div>
              <Label className="text-zinc-800">Billing Type</Label>
              <Select value={projectData.billing_type} onValueChange={(v) => updateProjectData({ billing_type: v })}>
                <SelectTrigger className={inputClass(false)}><SelectValue placeholder="Select billing type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_price">Fixed Price</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <Label className="text-zinc-800">Location</Label>
              <Textarea value={projectData.location} onChange={(e) => updateProjectData({ location: e.target.value })}
                placeholder="Enter project location" className={inputClass(false)} />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label className="text-zinc-800">Description</Label>
              <Textarea value={projectData.description} onChange={(e) => updateProjectData({ description: e.target.value })}
                placeholder="Enter project description" rows={3} className={inputClass(false)} />
            </div>
          </div>
        </div>

        {/* ─── Documents ─── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1 pb-2 border-b border-gray-200">
            Project Documents <span className="text-gray-400 font-normal normal-case">(optional)</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">Accepted: PDF, Word (DOCX), or image files (max 10MB each).</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {DOCUMENT_FIELDS.map(({ key, label }) => {
              const selected = selectedFiles[key];
              const file = projectData[key];
              const ext = selected?.split('.')?.pop()?.toLowerCase();
              const isImage = ['jpg','jpeg','png','webp'].includes(ext);
              const isPdf   = ext === 'pdf';
              const isDocx  = ['doc','docx'].includes(ext);

              return (
                <div key={key} className="flex flex-col gap-1">
                  <Label className="text-zinc-700 text-xs font-semibold">{label}</Label>
                  <div
                    className={`relative rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer group
                      ${selected
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                      }`}
                    style={{ aspectRatio: '3/4' }}
                    onClick={() => fileRefs.current[key]?.click()}
                  >
                    {selected ? (
                      <>
                        {isImage && file ? (
                          <img
                            src={URL.createObjectURL(file)}
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
                            <span className="text-xs text-red-500 text-center leading-tight truncate w-full text-center">{selected}</span>
                          </div>
                        ) : isDocx ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 gap-2 px-2">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-600" fill="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v5h5v11H6z"/>
                              </svg>
                            </div>
                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">DOCX</span>
                            <span className="text-xs text-blue-500 text-center leading-tight truncate w-full text-center">{selected}</span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 gap-2 px-2">
                            <FileText className="w-10 h-10 text-gray-400" />
                            <span className="text-xs text-gray-500 text-center truncate w-full">{selected}</span>
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); fileRefs.current[key]?.click(); }}
                            className="p-2 bg-white rounded-lg text-gray-700 hover:text-blue-600 shadow" title="Replace">
                            <Upload size={14} />
                          </button>
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); clearFile(key); }}
                            className="p-2 bg-white rounded-lg text-gray-700 hover:text-red-600 shadow" title="Remove">
                            <X size={14} />
                          </button>
                        </div>

                        <div className="absolute top-1.5 right-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                          New
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}