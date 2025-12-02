/**
 * Format a number with commas for display
 * @param {string|number} value - The number value to format
 * @returns {string} - Formatted string with commas
 */
export const formatNumberWithCommas = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  
  // Convert to string and remove any existing commas
  const stringValue = String(value).replace(/,/g, '');
  
  // Check if it's a valid number
  if (stringValue === '' || stringValue === '.') return stringValue;
  
  // Split by decimal point
  const parts = stringValue.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combine with decimal part if exists
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

/**
 * Parse a formatted string (with commas) back to a numeric string
 * @param {string} value - The formatted string value
 * @returns {string} - Numeric string without commas
 */
export const parseFormattedNumber = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  
  // Remove all commas
  return String(value).replace(/,/g, '');
};

/**
 * Handle number input change with comma formatting
 * @param {Event} e - The input change event
 * @param {Function} setValue - Function to set the numeric value (without commas)
 * @param {Function} setDisplayValue - Optional function to set display value (with commas)
 * @returns {string} - The numeric value (without commas) to store
 */
export const handleNumberInputChange = (e, setValue, setDisplayValue = null) => {
  let inputValue = e.target.value;
  
  // Allow empty string
  if (inputValue === '') {
    if (setDisplayValue) setDisplayValue('');
    setValue('');
    return '';
  }
  
  // Remove all non-numeric characters except decimal point
  inputValue = inputValue.replace(/[^\d.]/g, '');
  
  // Prevent multiple decimal points
  const parts = inputValue.split('.');
  if (parts.length > 2) {
    inputValue = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places to 2
  if (parts.length === 2 && parts[1].length > 2) {
    inputValue = parts[0] + '.' + parts[1].substring(0, 2);
  }
  
  // Format with commas for display
  const formattedValue = formatNumberWithCommas(inputValue);
  
  // Store numeric value (without commas)
  const numericValue = parseFormattedNumber(inputValue);
  
  if (setDisplayValue) {
    setDisplayValue(formattedValue);
  }
  
  setValue(numericValue);
  return numericValue;
};

