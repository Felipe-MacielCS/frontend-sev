import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/announcements");
  },
  send(data) {
    return apiClient.post("/announcements/send", data);
  },
};
