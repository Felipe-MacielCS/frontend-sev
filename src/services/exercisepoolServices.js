import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/exercisepools");
  },
  create(data) {
    return apiClient.post("/exercisepools", data);
  },
  update(exerciseID, planID, data) {
    return apiClient.put(`/exercisepools/${exerciseID}/${planID}`, data);
  },
  delete(exerciseID, planID) {
    return apiClient.delete(`/exercisepools/${exerciseID}/${planID}`);
  },
};
