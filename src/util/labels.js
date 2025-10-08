export const toLabelCase = (inputString) => {
  if (!inputString || typeof inputString !== 'string') {
    return '';
  }

  // Check if the string contains underscores, indicating snake_case
  if (inputString.includes('_')) {
    return inputString
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } else {
    // Assume camelCase or PascalCase if no underscores
    // Insert a space before all caps that are not at the start of the string
    // and convert the first character to uppercase, and the rest to lowercase
    return inputString
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize the first letter
      .trim(); // Remove any leading space if the original string started with a capital
  }
};

// Formats a number to a string with significant digits
export const sigDigits = (value, sigDigits = 3) => {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    // leading zero string that's a number may be a zip code
    // should detect "0.01" though
    if (typeof value === 'string' && value[0] !== '0') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && isFinite(numValue)) {
        return Number(numValue.toPrecision(sigDigits));
      }
    }
    return value;
  } else {
    return Number(value.toPrecision(sigDigits));
  }
}