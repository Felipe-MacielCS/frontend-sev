import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/departments", { params });
  },
  get(id) {
    return apiClient.get(`/departments/${id}`);
  },
  create(data) {
    return apiClient.post("/departments", data);
  },
  update(id, data) {
    return apiClient.put(`/departments/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/departments/${id}`);
  },
};