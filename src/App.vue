<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useTheme } from "vuetify";
import Utils from "./config/utils";
import departmentUsersServices from "./services/departmentUsersServices.js";
import settingsServices from "./services/settingsServices.js";
import settingsValuesServices from "./services/settingsValuesServices.js";

import ManagerNavBar from "./components/ManagerNavBar.vue"; 
import WorkerNavBar from "./components/WorkerNavBar.vue"; 

const MANAGER_DARK_MODE_STORAGE_KEY = "manager_dark_mode_enabled";
const WORKER_DARK_MODE_STORAGE_KEY = "worker_dark_mode_enabled";
const user = ref(Utils.getStore("user"));
const route = useRoute();
const theme = useTheme();
const appThemeName = ref("myCustomLightTheme");

const getUserRole = (rawUser) => String(rawUser?.role || "").trim().toLowerCase();

window.updateUserState = () => {
  user.value = Utils.getStore("user");
};

const showNav = computed(() => {
  return route.path !== "/" && route.path !== "/login" && route.path !== "/signup"; 
});

const isManagerRoute = computed(() => route.path.startsWith("/manager"));
const isWorkerRoute = computed(() => route.path.startsWith("/worker"));
const isDarkAppMode = computed(
  () => appThemeName.value === "myCustomDarkTheme" && (isManagerRoute.value || isWorkerRoute.value)
);

const normalizeID = (raw) => {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const getManagerDepartmentID = async () => {
  const currentUser = user.value;
  const managerID = normalizeID(currentUser?.ID ?? currentUser?.id ?? currentUser?.userID);
  if (!managerID) return null;

  const linksRes = await departmentUsersServices.getByUser(managerID);
  const links = Array.isArray(linksRes)
    ? linksRes
    : Array.isArray(linksRes?.departmentusers)
      ? linksRes.departmentusers
      : Array.isArray(linksRes?.data)
        ? linksRes.data
        : [];

  const managerLink =
    links.find((link) => String(link.role || "").trim().toLowerCase() === "manager") || links[0];

  return managerLink?.departmentID ?? null;
};

const setAppTheme = (enabled) => {
  const nextTheme = enabled ? "myCustomDarkTheme" : "myCustomLightTheme";
  appThemeName.value = nextTheme;
  theme.global.name.value = nextTheme;
};

const applyAppThemePreference = async () => {
  const currentUser = user.value;
  const role = getUserRole(currentUser);

  if (!currentUser || (!isManagerRoute.value && !isWorkerRoute.value)) {
    setAppTheme(false);
    return;
  }

  try {
    if (role === "manager" && isManagerRoute.value) {
      const localPreference = localStorage.getItem(MANAGER_DARK_MODE_STORAGE_KEY);
      if (localPreference !== null) {
        setAppTheme(localPreference === "1");
      }

      const departmentID = await getManagerDepartmentID();
      if (!departmentID) {
        setAppTheme(false);
        return;
      }

      const settings = await settingsServices.getAll({ key: "manager_dark_mode" });
      const setting = Array.isArray(settings) ? settings[0] : null;
      if (!setting?.ID) {
        setAppTheme(localPreference === "1");
        return;
      }

      const values = await settingsValuesServices.getAll({
        departmentID,
        settingID: setting.ID,
      });
      const row = Array.isArray(values) ? values[0] : null;
      const enabled = String(row?.value ?? "false").trim().toLowerCase() === "true";
      localStorage.setItem(MANAGER_DARK_MODE_STORAGE_KEY, enabled ? "1" : "0");
      setAppTheme(enabled);
      return;
    }

    if (role === "worker" && isWorkerRoute.value) {
      const localPreference = localStorage.getItem(WORKER_DARK_MODE_STORAGE_KEY);
      if (localPreference !== null) {
        setAppTheme(localPreference === "1");
      }

      const currentUserID = normalizeID(currentUser?.ID ?? currentUser?.id ?? currentUser?.userID);
      if (!currentUserID) {
        setAppTheme(false);
        return;
      }

      const settings = await settingsServices.getAll({ key: "worker_dark_mode" });
      const setting = Array.isArray(settings) ? settings[0] : null;
      if (!setting?.ID) {
        setAppTheme(localPreference === "1");
        return;
      }

      const values = await settingsValuesServices.getAll({
        userID: currentUserID,
        settingID: setting.ID,
      });
      const row = Array.isArray(values) ? values[0] : null;
      const enabled = String(row?.value ?? "false").trim().toLowerCase() === "true";
      localStorage.setItem(WORKER_DARK_MODE_STORAGE_KEY, enabled ? "1" : "0");
      setAppTheme(enabled);
      return;
    }

    setAppTheme(false);
  } catch (error) {
    console.error("Failed to apply app theme preference:", error?.response?.data || error);
    const fallbackPreference = role === "manager"
      ? localStorage.getItem(MANAGER_DARK_MODE_STORAGE_KEY)
      : localStorage.getItem(WORKER_DARK_MODE_STORAGE_KEY);
    setAppTheme(fallbackPreference === "1");
  }
};

const handleStorageUpdate = () => {
  user.value = Utils.getStore("user");
  applyAppThemePreference();
};

const handleManagerThemeUpdate = () => {
  applyAppThemePreference();
};

const handleWorkerThemeUpdate = () => {
  applyAppThemePreference();
};

onMounted(() => {
  applyAppThemePreference();
  window.addEventListener("storage", handleStorageUpdate);
  window.addEventListener("manager-theme-updated", handleManagerThemeUpdate);
  window.addEventListener("worker-theme-updated", handleWorkerThemeUpdate);
});

onBeforeUnmount(() => {
  window.removeEventListener("storage", handleStorageUpdate);
  window.removeEventListener("manager-theme-updated", handleManagerThemeUpdate);
  window.removeEventListener("worker-theme-updated", handleWorkerThemeUpdate);
});

watch(
  () => [getUserRole(user.value), route.path],
  () => {
    applyAppThemePreference();
  }
);
</script>

<template>
  <v-app :theme="appThemeName" :class="{ 'dark-app-mode': isDarkAppMode }">
    <template v-if="showNav && user">
      
      <ManagerNavBar v-if="getUserRole(user) === 'manager'" />
      
      <WorkerNavBar v-else-if="getUserRole(user) === 'worker'" :user="user" />

      </template>
    
    <v-main class="app-main-shell">
      <router-view />
    </v-main>
  </v-app>
</template>

<style>
.app-main-shell {
  min-height: 100vh;
}

.dark-app-mode,
.dark-app-mode .v-application,
.dark-app-mode .v-main,
.dark-app-mode .app-main-shell {
  background: #11161d;
}

.dark-app-mode .bg-grey-lighten-4 {
  background-color: #11161d !important;
}

.dark-app-mode .bg-grey-lighten-3 {
  background-color: #1a222d !important;
}

.dark-app-mode .bg-white {
  background-color: #1f2834 !important;
}

.dark-app-mode .v-card {
  color: rgba(255, 255, 255, 0.92);
}

.dark-app-mode .text-body-1,
.dark-app-mode .text-body-2,
.dark-app-mode .text-caption,
.dark-app-mode .text-subtitle-1,
.dark-app-mode .text-subtitle-2,
.dark-app-mode .text-h6,
.dark-app-mode .font-weight-bold,
.dark-app-mode b,
.dark-app-mode strong,
.dark-app-mode label,
.dark-app-mode .v-label,
.dark-app-mode .v-field__input,
.dark-app-mode input,
.dark-app-mode textarea {
  color: rgba(255, 255, 255, 0.92) !important;
}

.dark-app-mode .text-medium-emphasis {
  color: rgba(255, 255, 255, 0.7) !important;
}

.dark-app-mode .v-field {
  background-color: rgba(255, 255, 255, 0.04) !important;
}

.dark-app-mode .manager-drawer,
.dark-app-mode .worker-drawer {
  background-color: #151c25 !important;
  color: rgba(255, 255, 255, 0.92) !important;
}

.dark-app-mode .drawer-header {
  background: linear-gradient(140deg, #1c2430 0%, #232d39 100%) !important;
  color: rgba(255, 255, 255, 0.92) !important;
}

.dark-app-mode .manager-drawer .v-divider,
.dark-app-mode .worker-drawer .v-divider {
  border-color: rgba(255, 255, 255, 0.08) !important;
}

.dark-app-mode .manager-drawer .v-list-item,
.dark-app-mode .worker-drawer .v-list-item,
.dark-app-mode .manager-drawer .v-list-item-title,
.dark-app-mode .worker-drawer .v-list-item-title,
.dark-app-mode .manager-drawer .v-icon,
.dark-app-mode .worker-drawer .v-icon,
.dark-app-mode .manager-drawer .text-overline,
.dark-app-mode .worker-drawer .text-overline {
  color: rgba(255, 255, 255, 0.88) !important;
}

.dark-app-mode .manager-drawer .v-list-item--active,
.dark-app-mode .worker-drawer .v-list-item--active {
  background-color: rgba(180, 74, 95, 0.2) !important;
  color: #ffd8e0 !important;
}
</style>
