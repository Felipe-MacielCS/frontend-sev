import apiClient from "./services.js";

export default {
  getByDepartment(departmentID) {
    return apiClient.get(`/budgets/department/${departmentID}`);
  },

  saveDepartmentBudget(departmentID, data) {
    return apiClient.post(`/budgets/department/${departmentID}`, data);
  },

  addCost(data) {
    return apiClient.post("/budget-costs", data);
  },

  updateCost(id, data) {
    return apiClient.put(`/budget-costs/${id}`, data);
  },

  deleteCost(id) {
    return apiClient.delete(`/budget-costs/${id}`);
  },
};