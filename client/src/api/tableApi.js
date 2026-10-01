import axiosClient from './axiosClient';

export const getTablesApi = async () => {
  const response = await axiosClient.get('/tables');
  return response.data;
};

export const getTableByIdApi = async (id) => {
  const response = await axiosClient.get(`/tables/${id}`);
  return response.data;
};

export const createTableApi = async (data) => {
  const response = await axiosClient.post('/tables', data);
  return response.data;
};

export const updateTableApi = async (id, data) => {
  const response = await axiosClient.put(`/tables/${id}`, data);
  return response.data;
};

export const deleteTableApi = async (id) => {
  const response = await axiosClient.delete(`/tables/${id}`);
  return response.data;
};

export const getTableQRApi = async (id) => {
  const response = await axiosClient.get(`/tables/${id}/qr`);
  return response.data;
};

// --- One-person-per-table occupancy ---------------------------------------

export const claimTableApi = async (id, customerSessionId) => {
  const response = await axiosClient.post(`/tables/${id}/claim`, {
    customerSessionId,
  });
  return response.data;
};

export const heartbeatTableApi = async (id, customerSessionId) => {
  const response = await axiosClient.post(`/tables/${id}/heartbeat`, {
    customerSessionId,
  });
  return response.data;
};

export const releaseTableApi = async (id, customerSessionId) => {
  const response = await axiosClient.post(`/tables/${id}/release`, {
    customerSessionId,
  });
  return response.data;
};

export const clearTableOccupancyApi = async (id) => {
  const response = await axiosClient.delete(`/tables/${id}/occupancy`);
  return response.data;
};
