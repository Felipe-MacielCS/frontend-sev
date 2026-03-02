import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/settingsvalues", { params });
  },
  get(id) {
    return apiClient.get(`/settingsvalues/${id}`);
  },
  create(data) {
    return apiClient.post("/settingsvalues", data);
  },
  update(id, data) {
    return apiClient.put(`/settingsvalues/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/settingsvalues/${id}`);
  },
};