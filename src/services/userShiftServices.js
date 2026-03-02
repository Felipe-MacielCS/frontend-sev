import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/usershifts", { params });
  },
  get(id) {
    return apiClient.get(`/usershifts/${id}`);
  },
  create(data) {
    return apiClient.post("/usershifts", data);
  },
  update(id, data) {
    return apiClient.put(`/usershifts/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/usershifts/${id}`);
  },
};