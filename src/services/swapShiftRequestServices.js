import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/swapshiftrequest", { params });
  },
  get(id) {
    return apiClient.get(`/swapshiftrequest/${id}`);
  },
  create(data) {
    return apiClient.post("/swapshiftrequest", data);
  },
  update(id, data) {
    return apiClient.put(`/swapshiftrequest/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/swapshiftrequest/${id}`);
  },
};