<script setup>
import { ref, onMounted } from "vue";
import logo from "../Assets/avocado.png";
import { useRouter } from "vue-router";
import AuthServices from "../services/authServices";
import Utils from "../config/utils";

const logoURL = ref("");
const router = useRouter();

const logout = async () => {
  const user = Utils.getStore("user");
  await AuthServices.logoutUser(user)
    .then(() => {
      Utils.removeItem("user");
      if (window.updateUserState) window.updateUserState();
      router.push({ name: "login" });
    })
    .catch((err) => console.error("Logout error:", err));
};

onMounted(() => {
  logoURL.value = logo;
});

const navItems = [
  { text: "Athletes", to: "/coach/athletes" },
  { text: "Exercises", to: "/coach/exercises" },
  { text: "Exercise Plans", to: "/coach/exerciseplans" },
];
</script>

<template>
  <v-app-bar color="#9BBDCD" elevation="0" height="70">
    <v-container
      fluid
      class="d-flex align-center justify-space-between"
      style="max-width: 100%;"
    >
      <div class="d-flex align-center">
        <v-btn
          icon
          variant="text"
          class="pa-0"
          @click="router.push({ name: 'coach' })"
        >
          <v-img :src="logoURL" height="45" width="45" contain />
        </v-btn>
      </div>

      <!-- Center: Navigation Buttons -->
      <div class="d-flex align-center flex-grow-1">
        <v-btn
          v-for="item in navItems"
          :key="item.text"
          :to="item.to"
          variant="text"
          class="nav-btn"
          router
        >
          {{ item.text }}
        </v-btn>
      </div>

      <!-- Right: User Dropdown -->
      <v-menu offset-y rounded>
        <template #activator="{ props }">
          <v-btn icon v-bind="props">
            <v-avatar size="40">
              <v-img
                v-if="user?.picture"
                :src="user.picture"
                alt="Profile"
              ></v-img>
              <v-icon v-else size="32" color="black">mdi-account-circle-outline</v-icon>
            </v-avatar>
          </v-btn>
        </template>

        <v-card min-width="240" class="pa-4">
          <div class="text-center mb-3">
            <v-avatar size="60" class="mb-2">
              <v-img
                v-if="user?.picture"
                :src="user.picture"
                alt="Profile"
              ></v-img>
              <v-icon v-else size="48" color="black">mdi-account</v-icon>
            </v-avatar>

            <div class="font-weight-bold text-h6">{{ user?.name }}</div>
            <div class="text-caption text-grey">{{ user?.email }}</div>
          </div>

          <v-divider class="my-2" />

          <v-btn
            block
            color="red-darken-2"
            variant="flat"
            class="text-white mt-2"
            @click="logout"
          >
            <v-icon start>mdi-logout</v-icon>
            Logout
          </v-btn>
        </v-card>
      </v-menu>

    </v-container>
  </v-app-bar>
</template>

<style scoped>
.v-app-bar {
  background-color: #9BBDCD !important;
}

/* Ensure buttons are visible and centered */
.nav-btn {
  color: black !important;
  font-weight: 600;
  font-size: 1.05rem;
  margin: 0 12px;
  text-transform: none;
  background-color: transparent !important;
  min-width: 120px; /* ✅ ensures they have width */
}

/* Add a visible hover background */
.nav-btn:hover {
  background-color: rgba(0, 0, 0, 0.12) !important;
  border-radius: 8px;
  transition: 0.2s ease-in-out;
}
</style>
