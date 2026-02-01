import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/coaches");
  },
  get(id) {
    return apiClient.get(`/coaches/${id}`);
  },
  create(data) {
    return apiClient.post("/coaches", data);
  },
  update(id, data) {
    return apiClient.put(`/coaches/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/coaches/${id}`);
  },
  deleteAll() {
    return apiClient.delete("/coaches");
  },
};
