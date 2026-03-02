import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/shifts", { params });
  },
  get(id) {
    return apiClient.get(`/shifts/${id}`);
  },
  create(data) {
    return apiClient.post("/shifts", data);
  },
  update(id, data) {
    return apiClient.put(`/shifts/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/shifts/${id}`);
  },
};