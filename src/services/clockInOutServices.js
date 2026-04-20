import apiClient from "./services.js";

export default {
  create(data) {
    return apiClient.post("/clockinout", data);
  },
  update(id, data) {
    return apiClient.put(`/clockinout/${id}`, data);
  },
  clockIn(userShiftID) {
    return apiClient.post(`/clockinout/user-shifts/${userShiftID}/clock-in`);
  },
  clockOut(userShiftID) {
    return apiClient.post(`/clockinout/user-shifts/${userShiftID}/clock-out`);
  },
  getByUserShift(userShiftID) {
    return apiClient.get(`/clockinout/user-shifts/${userShiftID}`);
  },
};
