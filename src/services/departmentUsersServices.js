import apiClient from "./services.js";

export default {
  getAll(params = {}) {
    return apiClient.get("/departmentusers", { params });
  },

  getByDepartment(departmentID) {
    return apiClient.get("/departmentusers", { params: { departmentID } });
  },

  getByUser(userID) {
    return apiClient.get("/departmentusers", { params: { userID } });
  },
};