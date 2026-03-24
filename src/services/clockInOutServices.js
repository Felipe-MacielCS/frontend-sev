import apiClient from "./services.js";

export default {
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
