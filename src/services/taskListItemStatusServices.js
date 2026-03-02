import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/tasklistitemstatus", { params });
  },
  get(id) {
    return apiClient.get(`/tasklistitemstatus/${id}`);
  },
  create(data) {
    return apiClient.post("/tasklistitemstatus", data);
  },
  update(id, data) {
    return apiClient.put(`/tasklistitemstatus/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/tasklistitemstatus/${id}`);
  },
};