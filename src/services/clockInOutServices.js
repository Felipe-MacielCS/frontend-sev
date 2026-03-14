import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/clockinout", { params });
  },
  get(id) {
    return apiClient.get(`/clockinout/${id}`);
  },
  create(data) {
    return apiClient.post("/clockinout", data);
  },
  update(id, data) {
    return apiClient.put(`/clockinout/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/clockinout/${id}`);
  },
};