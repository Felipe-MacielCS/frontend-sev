import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/tasklistitems", { params });
  },
  get(id) {
    return apiClient.get(`/tasklistitems/${id}`);
  },
  create(data) {
    return apiClient.post("/tasklistitems", data);
  },
  update(id, data) {
    return apiClient.put(`/tasklistitems/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/tasklistitems/${id}`);
  },
};