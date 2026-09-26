import React from 'react';
import { Outlet } from 'react-router-dom';
import CustomerAccessGate from '../components/customer/CustomerAccessGate';
import CustomerTabBar from '../components/customer/CustomerTabBar';
import CustomerSearchOverlay from '../components/customer/CustomerSearchOverlay';
import { useCustomerUI } from '../hooks/useCustomerUI';

const CustomerLayout = () => {
  const { isSearchOpen, closeSearch } = useCustomerUI();

  return (
    <CustomerAccessGate>
      <div className="min-h-screen bg-cafe-100/50">
        <Outlet />
        <CustomerTabBar />
        <CustomerSearchOverlay isOpen={isSearchOpen} onClose={closeSearch} />
      </div>
    </CustomerAccessGate>
  );
};

export default CustomerLayout;
