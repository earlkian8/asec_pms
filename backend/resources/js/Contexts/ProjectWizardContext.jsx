import { createContext, useContext, useState } from 'react';

const ProjectWizardContext = createContext();

export const useProjectWizard = () => {
  const context = useContext(ProjectWizardContext);
  if (!context) {
    throw new Error('useProjectWizard must be used within ProjectWizardProvider');
  }
  return context;
};

export const ProjectWizardProvider = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Project Basic Info
  const [projectData, setProjectData] = useState({
    project_name: '',
    client_id: '',
    project_type_id: '',
    status: 'active',
    priority: 'medium',
    contract_amount: '',
    start_date: '',
    planned_end_date: '',
    actual_end_date: '',
    location: '',
    description: '',
    billing_type: 'fixed_price',
  });

  // Step 2: Team Members
  const [teamMembers, setTeamMembers] = useState([]);

  // Step 3: Milestones
  const [milestones, setMilestones] = useState([]);

  // Step 4: Material Allocations
  const [materialAllocations, setMaterialAllocations] = useState([]);

  // Step 5: Labor Costs
  const [laborCosts, setLaborCosts] = useState([]);

  const updateProjectData = (data) => {
    setProjectData(prev => ({ ...prev, ...data }));
  };

  const addTeamMember = (member) => {
    setTeamMembers(prev => [...prev, member]);
  };

  const removeTeamMember = (index) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index, data) => {
    setTeamMembers(prev => prev.map((member, i) => i === index ? { ...member, ...data } : member));
  };

  const addMilestone = (milestone) => {
    setMilestones(prev => [...prev, milestone]);
  };

  const removeMilestone = (index) => {
    setMilestones(prev => prev.filter((_, i) => i !== index));
  };

  const updateMilestone = (index, data) => {
    setMilestones(prev => prev.map((milestone, i) => i === index ? { ...milestone, ...data } : milestone));
  };

  const addMaterialAllocation = (allocation) => {
    setMaterialAllocations(prev => [...prev, allocation]);
  };

  const removeMaterialAllocation = (index) => {
    setMaterialAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const updateMaterialAllocation = (index, data) => {
    setMaterialAllocations(prev => prev.map((allocation, i) => i === index ? { ...allocation, ...data } : allocation));
  };

  const addLaborCost = (laborCost) => {
    setLaborCosts(prev => [...prev, laborCost]);
  };

  const removeLaborCost = (index) => {
    setLaborCosts(prev => prev.filter((_, i) => i !== index));
  };

  const updateLaborCost = (index, data) => {
    setLaborCosts(prev => prev.map((laborCost, i) => i === index ? { ...laborCost, ...data } : laborCost));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setProjectData({
      project_name: '',
      client_id: '',
      project_type_id: '',
      status: 'active',
      priority: 'medium',
      contract_amount: '',
      start_date: '',
      planned_end_date: '',
      actual_end_date: '',
      location: '',
      description: '',
      billing_type: 'fixed_price',
    });
    setTeamMembers([]);
    setMilestones([]);
    setMaterialAllocations([]);
    setLaborCosts([]);
  };

  const getAllData = () => {
    return {
      project: projectData,
      teamMembers,
      milestones,
      materialAllocations,
      laborCosts,
    };
  };

  const value = {
    currentStep,
    totalSteps,
    projectData,
    teamMembers,
    milestones,
    materialAllocations,
    laborCosts,
    updateProjectData,
    addTeamMember,
    removeTeamMember,
    updateTeamMember,
    addMilestone,
    removeMilestone,
    updateMilestone,
    addMaterialAllocation,
    removeMaterialAllocation,
    updateMaterialAllocation,
    addLaborCost,
    removeLaborCost,
    updateLaborCost,
    nextStep,
    prevStep,
    goToStep,
    resetWizard,
    getAllData,
  };

  return (
    <ProjectWizardContext.Provider value={value}>
      {children}
    </ProjectWizardContext.Provider>
  );
};

