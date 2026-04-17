import apiClient from "./services.js";

export default {
  getWeeklyPayroll(departmentID, weekStart) {
    return apiClient.get(`/payroll/department/${departmentID}`, {
      params: { week_start: weekStart },
    });
  },

  saveOverride(userShiftID, data) {
    return apiClient.put(`/payroll/override/${userShiftID}`, data);
  },

  clearOverride(userShiftID, departmentID, weekStart) {
    return apiClient.delete(`/payroll/override/${userShiftID}`, {
      params: {
        departmentID,
        week_start: weekStart,
      },
    });
  },
};