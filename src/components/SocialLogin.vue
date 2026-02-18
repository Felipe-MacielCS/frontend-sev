<script setup>
import { ref, onMounted } from "vue";
import AuthServices from "../services/authServices";
import Utils from "../config/utils.js";
import { useRouter } from "vue-router";

const router = useRouter();
const user = ref({});
const loading = ref(false);

const initGoogleSignUp = () => {
  // (Keep your existing initialization code here)
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

  // 1. We only need the credential. The backend handles the rest.
  const payload = {
    credential: response.credential,
  };

  try {
    const res = await AuthServices.login(payload);
    
    // 2. 'res' is { userID: 1, role: 'Worker', ... }
    user.value = res;
    console.log("Logged in user:", user.value);

    // 3. Store the user. 
    // Utils.setStore will save the object exactly as is (with 'userID').
    Utils.setStore("user", user.value);
    
    if (user.value.token) {
        Utils.setToken(user.value.token);
    }

    if (window.updateUserState) window.updateUserState();

    // 4. Redirect based on the role returned by the backend
    // Mapping: Admin -> Admin, Manager -> Coach, Worker -> Athlete
    if (user.value.role === 'Admin') {
      router.push({ name: "admin" });
    } else if (user.value.role === 'Manager') {
      router.push({ name: "coach" }); 
    } else {
      router.push({ name: "athlete" }); // Default for 'Worker'
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