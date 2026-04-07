import apiClient from "./services.js";

export default {
  getAll(params = {}) {
    return apiClient.get("/departmentusers", { params });
  },

  get(id) {
    return apiClient.get(`/departmentusers/${id}`);
  },

  getByDepartment(departmentID) {
    return apiClient.get("/departmentusers", { params: { departmentID } });
  },

  getByUser(userID) {
    return apiClient.get("/departmentusers", { params: { userID } });
  },

  create(data) {
    return apiClient.post("/departmentusers", data);
  },

  update(id, data) {
    return apiClient.put(`/departmentusers/${id}`, data);
  },

  delete(id) {
    return apiClient.delete(`/departmentusers/${id}`);
  },
};
