import { createContext, useContext, useState } from 'react';

const ProjectWizardContext = createContext();

export const useProjectWizard = () => {
  const context = useContext(ProjectWizardContext);
  if (!context) {
    throw new Error('useProjectWizard must be used within ProjectWizardProvider');
  }
  return context;
};

export const ProjectWizardProvider = ({ children, totalSteps: totalStepsProp = 4 }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = totalStepsProp;

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

  // Step BOQ: sections with nested items
  // Shape: [{ code, name, description, sort_order, items: [{ item_code, description, unit, quantity, unit_cost, resource_type, planned_* refs, remarks, sort_order }] }]
  const [boqSections, setBoqSections] = useState([]);

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

  const addBoqSection = (section) => {
    setBoqSections(prev => [
      ...prev,
      { code: '', name: '', description: '', sort_order: prev.length, items: [], ...section },
    ]);
  };

  const removeBoqSection = (index) => {
    setBoqSections(prev => prev.filter((_, i) => i !== index));
  };

  const updateBoqSection = (index, data) => {
    setBoqSections(prev => prev.map((s, i) => i === index ? { ...s, ...data } : s));
  };

  const addBoqItem = (sectionIndex, item = {}) => {
    setBoqSections(prev => prev.map((s, i) => {
      if (i !== sectionIndex) return s;
      const nextItems = [...(s.items || []), {
        item_code: '',
        description: '',
        unit: '',
        quantity: 0,
        unit_cost: 0,
        resource_type: '',
        planned_inventory_item_id: '',
        planned_direct_supply_id: '',
        planned_user_id: '',
        planned_employee_id: '',
        remarks: '',
        sort_order: (s.items || []).length,
        ...item,
      }];
      return { ...s, items: nextItems };
    }));
  };

  const removeBoqItem = (sectionIndex, itemIndex) => {
    setBoqSections(prev => prev.map((s, i) => {
      if (i !== sectionIndex) return s;
      return { ...s, items: (s.items || []).filter((_, j) => j !== itemIndex) };
    }));
  };

  const updateBoqItem = (sectionIndex, itemIndex, data) => {
    setBoqSections(prev => prev.map((s, i) => {
      if (i !== sectionIndex) return s;
      const nextItems = (s.items || []).map((item, j) => j === itemIndex ? { ...item, ...data } : item);
      return { ...s, items: nextItems };
    }));
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
    setBoqSections([]);
  };

  const getAllData = () => {
    return {
      project: projectData,
      teamMembers,
      milestones,
      materialAllocations,
      laborCosts,
      boqSections,
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
    boqSections,
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
    addBoqSection,
    removeBoqSection,
    updateBoqSection,
    addBoqItem,
    removeBoqItem,
    updateBoqItem,
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

