export const toSectionCode = (index) => {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};

export const toNumber = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

export const formatCurrency = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const getResourceTotal = (resource) =>
  toNumber(resource?.quantity) * toNumber(resource?.unit_price);

export const getMaterialCost = (item) =>
  (item?.resources || [])
    .filter((resource) => resource.resource_category === "material")
    .reduce((sum, resource) => sum + getResourceTotal(resource), 0);

export const getLaborCost = (item) =>
  (item?.resources || [])
    .filter((resource) => resource.resource_category === "labor")
    .reduce((sum, resource) => sum + getResourceTotal(resource), 0);

export const getItemUnitCost = (item) => {
  if (Array.isArray(item?.resources) && item.resources.length > 0) {
    return getMaterialCost(item) + getLaborCost(item);
  }

  return toNumber(item?.unit_cost);
};

export const getItemTotal = (item) => {
  const hasResources = Array.isArray(item?.resources) && item.resources.length > 0;
  const quantity = toNumber(item?.quantity);
  const normalizedQuantity = hasResources ? (quantity > 0 ? quantity : 1) : quantity;

  return getItemUnitCost(item) * normalizedQuantity;
};

export const getSectionSubtotal = (section) =>
  (section?.items || []).reduce((sum, item) => sum + getItemTotal(item), 0);

export const getGrandTotal = (sections = []) =>
  (sections || []).reduce((sum, section) => sum + getSectionSubtotal(section), 0);

export const getAllocatedByInventoryId = (sections = []) => {
  const map = {};

  (sections || []).forEach((section) => {
    (section.items || []).forEach((item) => {
      (item.resources || []).forEach((resource) => {
        if (resource.source_type === "inventory" && resource.inventory_item_id) {
          const id = String(resource.inventory_item_id);
          map[id] = (map[id] || 0) + toNumber(resource.quantity);
        }
      });
    });
  });

  return map;
};

export const getEffectiveInventoryStock = ({
  currentStock = 0,
  totalAllocated = 0,
  currentResourceQty = 0,
}) =>
  toNumber(currentStock) - (toNumber(totalAllocated) - toNumber(currentResourceQty));
