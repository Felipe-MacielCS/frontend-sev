import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/exercises");
  },
  get(id) {
    return apiClient.get(`/exercises/${id}`);
  },
  create(data) {
    return apiClient.post("/exercises", data);
  },
  update(id, data) {
    return apiClient.put(`/exercises/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/exercises/${id}`);
  },
  deleteAll() {
    return apiClient.delete("/exercises");
  },
};
