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
