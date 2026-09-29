import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

const StaffManagerPage = () => {
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('waiter');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStaff = async () => {
    try {
      const res = await axiosClient.get('/auth/staff');
      if (res.data?.success) {
        setStaff(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await axiosClient.post('/auth/staff', { name, email, password, role });
      if (res.data?.success) {
        setSuccess('Staff account created successfully!');
        setName(''); setEmail(''); setPassword('');
        fetchStaff();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-cafe-900">Staff Management</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-200">
        <h2 className="text-lg font-semibold mb-4">Create New Staff Account</h2>
        {error && <div className="text-red-500 mb-4 bg-red-50 p-3 rounded-xl text-sm">{error}</div>}
        {success && <div className="text-green-600 mb-4 bg-green-50 p-3 rounded-xl text-sm">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="w-full border rounded-xl px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-cafe-700 mb-1">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full border rounded-xl px-4 py-2">
                <option value="waiter">Waiter</option>
                <option value="chef">Kitchen Chef</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="bg-cafe-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-cafe-900 transition">Create Account</button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-200">
        <h2 className="text-lg font-semibold mb-4">Current Staff</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-cafe-50 text-cafe-600">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-l-xl">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold rounded-r-xl">Role</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s._id} className="border-b border-cafe-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-cafe-900">{s.name}</td>
                  <td className="px-4 py-3 text-cafe-600">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className="bg-cafe-100 text-cafe-800 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{s.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffManagerPage;
