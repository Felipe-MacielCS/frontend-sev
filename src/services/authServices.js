import apiClient from "./services.js";

export default {
  login(data) {
    return apiClient.post("/login", data);
  },
  signup(data) {
    return apiClient.post("/signup", data);
  },
  googleLogin(data) {
    return apiClient.post("/google", data);
  },
  authorize(data) {
    return apiClient.post("/authorize", data);
  },
  logout(data) {
    return apiClient.post("/logout", data);
  },
};