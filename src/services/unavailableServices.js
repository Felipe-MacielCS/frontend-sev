import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/unavailable", { params });
  },
  get(id) {
    return apiClient.get(`/unavailable/${id}`);
  },
  create(data) {
    return apiClient.post("/unavailable", data);
  },
  update(id, data) {
    return apiClient.put(`/unavailable/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/unavailable/${id}`);
  },
};