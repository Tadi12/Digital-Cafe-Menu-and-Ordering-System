/**
 * Format currency amount with ETB / ብር based on current language
 */
export const formatCurrency = (amount, lang = 'en') => {
  const num = Number(amount) || 0;
  if (lang === 'am') {
    return `${num.toLocaleString()} ብር`;
  }
  return `${num.toLocaleString()} ETB`;
};
