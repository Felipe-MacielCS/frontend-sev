import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/usernotifications", { params });
  },
  get(id) {
    return apiClient.get(`/usernotifications/${id}`);
  },
  create(data) {
    return apiClient.post("/usernotifications", data);
  },
  update(id, data) {
    return apiClient.put(`/usernotifications/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/usernotifications/${id}`);
  },
};