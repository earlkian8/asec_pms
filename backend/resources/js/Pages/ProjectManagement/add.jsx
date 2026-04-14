import { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import { Button } from "@/Components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { Loader2 } from "lucide-react";

import { ProjectWizardProvider, useProjectWizard } from "@/Contexts/ProjectWizardContext";
import Step1ProjectInfo from "./wizard-steps/Step1ProjectInfo";
import Step3BOQ from "./wizard-steps/Step3BOQ";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { usePermission } from "@/utils/permissions";

const WIZARD_STEP_PERMISSIONS = [
  "projects.create",
  "project-boq.create",
];

const buildWizardSteps = ({ clients, inventoryItems, directSupplyItems, projectTypes, clientTypes, errors }) => [
  {
    key: "project-information",
    title: "Project Information",
    permission: "projects.create",
    render: () => <Step1ProjectInfo clients={clients} projectTypes={projectTypes} clientTypes={clientTypes} errors={errors} />,
  },
  {
    key: "boq",
    title: "BOQ / Scope",
    permission: "project-boq.create",
    render: () => <Step3BOQ errors={errors} />,
  },
];

const AddProjectWizard = ({ open, setShowAddModal, clients, inventoryItems, directSupplyItems, projectTypes, clientTypes }) => {
  const { currentStep, totalSteps, getAllData, resetWizard, nextStep, prevStep, goToStep, projectData } = useProjectWizard();
  const { has } = usePermission();
  const [processing, setProcessing] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const visibleSteps = useMemo(
    () => buildWizardSteps({ clients, inventoryItems, directSupplyItems, projectTypes, clientTypes, errors: formErrors })
      .filter((step) => has(step.permission)),
    [has, clients, clientTypes, formErrors, inventoryItems, directSupplyItems, projectTypes]
  );

  const activeStep = visibleSteps[currentStep - 1];

  const validateStep1 = () => {
    const errors = {};

    if (!projectData.project_name || projectData.project_name.trim() === '') {
      errors.project_name = 'The project name field is required.';
    }

    if (!projectData.client_id || projectData.client_id === '') {
      errors.client_id = 'The client field is required.';
    }

    if (!projectData.project_type_id || projectData.project_type_id === '') {
      errors.project_type_id = 'The project type field is required.';
    }

    if (!projectData.contract_amount || projectData.contract_amount === '' || parseFloat(projectData.contract_amount) <= 0) {
      errors.contract_amount = 'The contract amount field is required and must be greater than 0.';
    }

    if (!projectData.start_date || projectData.start_date === '') {
      errors.start_date = 'The start date field is required.';
    }

    if (!projectData.planned_end_date || projectData.planned_end_date === '') {
      errors.planned_end_date = 'The planned end date field is required.';
    }
     
    if (projectData.start_date && projectData.planned_end_date < projectData.start_date) {
      errors.planned_end_date = 'Planned end date must not be before the start date.';
    }

    return errors;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      const stepErrors = validateStep1();
      if (Object.keys(stepErrors).length > 0) {
        setFormErrors(stepErrors);
        toast.error("Please fill in all required fields");
        return;
      }
    }

    setFormErrors({});
    nextStep();
  };

  const handleSubmit = () => {
    const stepErrors = validateStep1();
    if (Object.keys(stepErrors).length > 0) {
      setFormErrors(stepErrors);
      goToStep(1);
      toast.error("Please fill in all required fields");
      return;
    }

    const allData = getAllData();
    setProcessing(true);
    setFormErrors({});

    router.post(route("project-management.store"), {
      ...allData.project,
      team_members: allData.teamMembers,
      milestones: allData.milestones,
      material_allocations: allData.materialAllocations,
      labor_costs: allData.laborCosts || [],
      boq_sections: allData.boqSections || [],
    }, {
      preserveScroll: true,
      onSuccess: (page) => {
        resetWizard();
        setShowAddModal(false);
        setProcessing(false);
        setFormErrors({});
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Project created successfully with all related data!");
        }
      },
      onError: (errors) => {
        setProcessing(false);
        setFormErrors(errors);
        const projectFieldErrors = Object.keys(errors).filter(key =>
          ['project_name', 'client_id', 'project_type_id', 'contract_amount'].includes(key)
        );
        if (projectFieldErrors.length > 0) {
          goToStep(1);
        }
        toast.error("Please check the form for errors");
      },
    });
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setShowAddModal(false);
    }
  };

  const renderStep = () => {
    return activeStep?.render() || null;
  };

  if (!has("projects.create")) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[95vw] max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-zinc-800">Add New Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">You don't have permission to create projects.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add New Project</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6 px-2 gap-4">
          {visibleSteps.map((step, index) => {
            const stepNumber = index + 1;
            return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    stepNumber < currentStep
                      ? "bg-green-500 text-white"
                      : stepNumber === currentStep
                      ? "bg-zinc-700 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {stepNumber < currentStep ? <Check size={20} /> : stepNumber}
                </div>
                <span
                  className={`text-xs mt-2 text-center whitespace-nowrap ${
                    stepNumber <= currentStep ? "text-zinc-700 font-medium" : "text-gray-400"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {stepNumber < totalSteps && (
                <div
                  className={`h-1 w-16 mx-4 transition-all ${
                    stepNumber < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-1">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetWizard();
              setShowAddModal(false);
            }}
            disabled={processing}
            className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={processing}
                className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <ChevronLeft size={18} />
                Previous
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={processing}
                className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white flex items-center gap-2 shadow-md transition-all duration-200"
              >
                Next
                <ChevronRight size={18} />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={processing}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white flex items-center gap-2 shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Create Project
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AddProject = ({ open, setShowAddModal, clients, inventoryItems, directSupplyItems, projectTypes, clientTypes }) => {
  const { has } = usePermission();
  const visibleStepCount = useMemo(
    () => WIZARD_STEP_PERMISSIONS.filter((permission) => has(permission)).length,
    [has]
  );

  if (!has("projects.create")) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setShowAddModal(false);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-zinc-800">Add New Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">You don't have permission to create projects.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ProjectWizardProvider totalSteps={visibleStepCount || 1}>
      <AddProjectWizard
        open={open}
        setShowAddModal={setShowAddModal}
        clients={clients}
        inventoryItems={inventoryItems}
        directSupplyItems={directSupplyItems}
        projectTypes={projectTypes}
        clientTypes={clientTypes}
      />
    </ProjectWizardProvider>
  );
};

export default AddProject;