import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/exerciseplans");
  },
  get(id) {
    return apiClient.get(`/exerciseplans/${id}`);
  },
  create(data) {
    return apiClient.post("/exerciseplans", data);
  },
  update(id, data) {
    return apiClient.put(`/exerciseplans/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/exerciseplans/${id}`);
  },
  deleteAll() {
    return apiClient.delete("/exerciseplans");
  },
};
