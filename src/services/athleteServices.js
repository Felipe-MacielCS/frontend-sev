import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/athletes");
  },
  get(id) {
    return apiClient.get(`/athletes/${id}`);
  },
  create(data) {
    return apiClient.post("/athletes", data);
  },
  update(id, data) {
    return apiClient.put(`/athletes/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/athletes/${id}`);
  },
  deleteAll() {
    return apiClient.delete(`/athletes`);
  },
  
};
