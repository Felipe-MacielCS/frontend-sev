import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/usershifttasklist", { params });
  },
  create(data) {
    return apiClient.post("/usershifttasklist", data);
  },
  delete(id) {
    return apiClient.delete(`/usershifttasklist/${id}`);
  },
  deleteByPair(user_shiftID, task_listID) {
    return apiClient.delete("/usershifttasklist", { params: { user_shiftID, task_listID } });
  },
};