import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/tasklist", { params });
  },
  get(id) {
    return apiClient.get(`/tasklist/${id}`);
  },
  create(data) {
    return apiClient.post("/tasklist", data);
  },
  update(id, data) {
    return apiClient.put(`/tasklist/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/tasklist/${id}`);
  },
};