import { useState } from "react";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import { Button } from "@/Components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";

import { ProjectWizardProvider, useProjectWizard } from "@/Contexts/ProjectWizardContext";
import Step1ProjectInfo from "./wizard-steps/Step1ProjectInfo";
import Step2TeamMembers from "./wizard-steps/Step2TeamMembers";
import Step3Milestones from "./wizard-steps/Step3Milestones";
import Step4MaterialAllocation from "./wizard-steps/Step4MaterialAllocation";
import Step5LaborCost from "./wizard-steps/Step5LaborCost";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

const AddProjectWizard = ({ setShowAddModal, clients, users, inventoryItems }) => {
  const { currentStep, totalSteps, getAllData, resetWizard, nextStep, prevStep } = useProjectWizard();
  const [processing, setProcessing] = useState(false);

  const stepTitles = [
    "Project Information",
    "Team Members",
    "Milestones",
    "Material Allocation",
    "Labor Cost"
  ];

  const handleSubmit = () => {
    const allData = getAllData();
    setProcessing(true);
    
    router.post(route("project-management.store"), {
      ...allData.project,
      team_members: allData.teamMembers,
      milestones: allData.milestones,
      material_allocations: allData.materialAllocations,
      labor_costs: allData.laborCosts,
    }, {
      preserveScroll: true,
      onSuccess: (page) => {
        resetWizard();
        setShowAddModal(false);
        setProcessing(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Project created successfully with all related data!");
        }
      },
      onError: (errors) => {
        setProcessing(false);
        toast.error("Please check the form for errors");
      },
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ProjectInfo clients={clients} />;
      case 2:
        return <Step2TeamMembers users={users} />;
      case 3:
        return <Step3Milestones />;
      case 4:
        return <Step4MaterialAllocation inventoryItems={inventoryItems} />;
      case 5:
        return <Step5LaborCost users={users} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add New Project</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step < currentStep
                      ? "bg-green-500 text-white"
                      : step === currentStep
                      ? "bg-zinc-700 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step < currentStep ? <Check size={20} /> : step}
                </div>
                <span
                  className={`text-xs mt-2 text-center ${
                    step <= currentStep ? "text-zinc-700 font-medium" : "text-gray-400"
                  }`}
                >
                  {stepTitles[step - 1]}
                </span>
              </div>
              {step < totalSteps && (
                <div
                  className={`h-1 flex-1 mx-2 transition-all ${
                    step < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
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
                className="flex items-center gap-2"
              >
                <ChevronLeft size={18} />
                Previous
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={processing}
                className="bg-zinc-700 hover:bg-zinc-900 text-white flex items-center gap-2"
              >
                Next
                <ChevronRight size={18} />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                {processing ? "Creating..." : "Create Project"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AddProject = ({ setShowAddModal, clients, users, inventoryItems }) => {
  return (
    <ProjectWizardProvider>
      <AddProjectWizard
        setShowAddModal={setShowAddModal}
        clients={clients}
        users={users}
        inventoryItems={inventoryItems}
      />
    </ProjectWizardProvider>
  );
};

export default AddProject;
