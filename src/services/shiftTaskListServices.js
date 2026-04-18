import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/shifttasklist", { params });
  },
  get(id) {
    return apiClient.get(`/shifttasklist/${id}`);
  },
  create(data) {
    return apiClient.post("/shifttasklist", data);
  },
  update(id, data) {
    return apiClient.put(`/shifttasklist/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/shifttasklist/${id}`);
  },
  deleteByPair(shiftID, task_listID) {
    return apiClient.delete("/shifttasklist", { params: { shiftID, task_listID } });
  },
};
