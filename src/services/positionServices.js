import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/positions", { params });
  },
  get(id) {
    return apiClient.get(`/positions/${id}`);
  },
  create(data) {
    return apiClient.post("/positions", data);
  },
  update(id, data) {
    return apiClient.put(`/positions/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/positions/${id}`);
  },
};