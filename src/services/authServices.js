import apiClient from "./services.js";

export default {
  login(user) {
    return apiClient.post("login", user);
  },
  authorizeUser(code) {
    return apiClient.post("authorize", code);
  },
  logoutUser(token) {
    return apiClient.post("logout", token);
  },
};