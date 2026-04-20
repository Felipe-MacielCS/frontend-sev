import apiClient from "./services.js";

export default {
  getStatus(userID) {
    return apiClient.get("/calendar/status", { params: { userID } });
  },
  getStudentStatus(userID) {
    return apiClient.get("/calendar/student-status", { params: { userID } });
  },
  connect(payload) {
    return apiClient.post("/calendar/connect", payload ?? {});
  },
  sync(payload) {
    return apiClient.post("/calendar/sync", payload ?? {});
  },
  syncStudentSchedule(payload) {
    return apiClient.post("/calendar/student-sync", payload ?? {});
  },
};
