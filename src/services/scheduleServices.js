import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/schedules", { params });
  },
  get(id) {
    return apiClient.get(`/schedules/${id}`);
  },
  create(data) {
    return apiClient.post("/schedules", data);
  },
  update(id, data) {
    return apiClient.put(`/schedules/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/schedules/${id}`);
  },
};