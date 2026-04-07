<script setup>
import { ref, onMounted } from "vue";
import AuthServices from "../services/authServices";
import Utils from "../config/utils.js";
import { useRouter } from "vue-router";
import { normalizeRole, withEffectiveRole } from "../services/userRoleResolver.js";

const router = useRouter();
const user = ref({});
const loading = ref(false);

const initGoogleSignUp = () => {
  const client = import.meta.env.VITE_APP_CLIENT_ID;
  window.google.accounts.id.initialize({
    client_id: client,
    callback: handleCredentialResponse, // Use the local function
    auto_select: false,
    cancel_on_tap_outside: false,
  });

  window.google.accounts.id.renderButton(document.getElementById("parent_id"), {
    type: "standard",
    theme: "outline",
    size: "large",
    width: 400,
  });
};

const handleCredentialResponse = async (response) => {
  loading.value = true;

  const payload = {
    credential: response.credential,
  };

  try {
    const res = await AuthServices.login(payload);
    
    user.value = await withEffectiveRole(res);
    console.log("Logged in user:", user.value);

    Utils.setStore("user", user.value);
    
    if (user.value.token) {
        Utils.setToken(user.value.token);
    }

    if (window.updateUserState) window.updateUserState();


    const role = normalizeRole(user.value.role);
    if (role === "admin") {
      router.push({ name: "adminDashboard" });
    } else if (role === "manager") {
      router.push({ name: "managerDashboard" });
    } else {
      router.push({ name: "workerDashboard" });
    }

  } catch (error) {
    console.error("Login error:", error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  initGoogleSignUp();
});
</script>

<template>
  <div class="signup-buttons">
    <v-row justify="center">
      <div id="parent_id"></div>
    </v-row>

    <v-dialog v-model="loading" persistent width="300">
      <v-card class="pa-6 text-center">
        <v-progress-circular indeterminate color="primary" size="40" />
        <p class="mt-4 mb-0">Signing you in...</p>
      </v-card>
    </v-dialog>
  </div>
</template>
