import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("/userpositions", { params });
  },
  create(data) {
    return apiClient.post("/userpositions", data);
  },
  delete(id) {
    return apiClient.delete(`/userpositions/${id}`);
  },
  deleteByPair(userID, positionID) {
    return apiClient.delete("/userpositions", { params: { userID, positionID } });
  },
};