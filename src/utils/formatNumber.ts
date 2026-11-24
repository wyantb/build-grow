// Format numbers to show scientific notation when appropriate
export const formatNumber = (num: number): string => {
  // Handle negative numbers
  const isNegative = num < 0
  const absNum = Math.abs(num)
  
  // For very small numbers, use scientific notation
  if (absNum > 0 && absNum < 0.01) {
    return isNegative ? '-' + absNum.toExponential(2) : absNum.toExponential(2)
  }
  
  // For very large numbers, use scientific notation
  if (absNum >= 1000000) {
    return isNegative ? '-' + (absNum / 1000000).toFixed(2) + 'M' : (absNum / 1000000).toFixed(2) + 'M'
  } else if (absNum >= 1000) {
    return isNegative ? '-' + (absNum / 1000).toFixed(2) + 'K' : (absNum / 1000).toFixed(2) + 'K'
  } else {
    // For regular numbers, show appropriate decimal places
    if (absNum >= 100) {
      return isNegative ? '-' + absNum.toFixed(0) : absNum.toFixed(0)
    } else if (absNum >= 10) {
      return isNegative ? '-' + absNum.toFixed(1) : absNum.toFixed(1)
    } else {
      return isNegative ? '-' + absNum.toFixed(2) : absNum.toFixed(2)
    }
  }
}

// Alternative scientific notation formatter
export const formatScientific = (num: number): string => {
  if (num === 0) return '0'
  
  const isNegative = num < 0
  const absNum = Math.abs(num)
  
  // Always use scientific notation for consistency
  return isNegative ? '-' + absNum.toExponential(2) : absNum.toExponential(2)
}