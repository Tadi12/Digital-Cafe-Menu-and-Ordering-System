import { useContext } from 'react';
import { CustomerUIContext } from '../context/CustomerUIContext';

export const useCustomerUI = () => {
  const context = useContext(CustomerUIContext);
  if (!context) {
    throw new Error('useCustomerUI must be used within a CustomerUIProvider');
  }
  return context;
};
