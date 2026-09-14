import React from 'react';
import { Outlet } from 'react-router-dom';
import CustomerAccessGate from '../components/customer/CustomerAccessGate';

const CustomerLayout = () => {
  return (
    <CustomerAccessGate>
      <div className="min-h-screen bg-cafe-100/50">
        <Outlet />
      </div>
    </CustomerAccessGate>
  );
};

export default CustomerLayout;
