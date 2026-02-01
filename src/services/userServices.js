import apiClient from "./services.js";

export default {
  update(id, data) {
    return apiClient.put(`/users/${id}`, data);
  },
};
