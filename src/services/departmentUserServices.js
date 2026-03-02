import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/departmentusers", { params });
  },
  create(data) {
    return apiClient.post("/departmentusers", data);
  },

  // Pattern A: DELETE /departmentusers/:id
  delete(id) {
    return apiClient.delete(`/departmentusers/${id}`);
  },

  // Pattern B: DELETE /departmentusers?userID=1&departmentID=2
  deleteByPair(userID, departmentID) {
    return apiClient.delete("/departmentusers", { params: { userID, departmentID } });
  },
};