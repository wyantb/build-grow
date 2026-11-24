// Format numbers to show scientific notation when appropriate
export const formatNumber = (num: number): string => {
  // Handle negative numbers
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  // For very small numbers, use scientific notation
  if (absNum > 0 && absNum < 0.01) {
    return isNegative ? '-' + absNum.toExponential(2) : absNum.toExponential(2);
  }

  // For very large numbers, use scientific notation
  if (absNum >= 1000000) {
    const millions = (absNum / 1000000).toFixed(2);

    return (isNegative ? '-' : '') + millions + 'M';
  }

  if (absNum >= 1000) {
    const thousands = (absNum / 1000).toFixed(2);

    return (isNegative ? '-' : '') + thousands + 'K';
  }

  // For regular numbers, show appropriate decimal places
  if (absNum >= 100) {
    return (isNegative ? '-' : '') + absNum.toFixed(0);
  }

  if (absNum >= 10) {
    return (isNegative ? '-' : '') + absNum.toFixed(1);
  }

  return (isNegative ? '-' : '') + absNum.toFixed(2);
};

// Alternative scientific notation formatter
export const formatScientific = (num: number): string => {
  if (num === 0) {return '0';}

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  // Always use scientific notation for consistency
  return isNegative ? '-' + absNum.toExponential(2) : absNum.toExponential(2);
};
