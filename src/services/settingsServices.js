import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/settings", { params });
  },
  get(id) {
    return apiClient.get(`/settings/${id}`);
  },
  create(data) {
    return apiClient.post("/settings", data);
  },
  update(id, data) {
    return apiClient.put(`/settings/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/settings/${id}`);
  },
};