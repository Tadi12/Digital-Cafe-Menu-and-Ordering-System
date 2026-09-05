import React from 'react';
import { Outlet } from 'react-router-dom';

const CustomerLayout = () => {
  return (
    <div className="min-h-screen bg-cafe-100/50">
      <Outlet />
    </div>
  );
};

export default CustomerLayout;
