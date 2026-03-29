<template>
  <v-app-bar color="#72151A" theme="dark" elevation="2" class="manager-topbar px-2">
    <v-btn
      icon
      variant="text"
      class="ml-1"
      aria-label="Open manager navigation menu"
      @click="drawer = !drawer"
    >
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <v-avatar rounded="0" size="110" class="mx-2">
      <v-img src="/src/Assets/plain_eagle.png" alt="OC Logo"></v-img>
    </v-avatar>

    <div class="text-subtitle-1 font-weight-medium d-none d-sm-block">
      Manager Menu
    </div>

    <v-spacer></v-spacer>

    <v-btn icon="mdi-cog" variant="text" class="mr-1" to="/manager/settings"></v-btn>
  </v-app-bar>

  <v-navigation-drawer
    v-model="drawer"
    location="left"
    app
    width="290"
    class="manager-drawer"
  >
    <div class="d-flex align-center px-4 py-4 drawer-header">
      <v-icon size="20" class="mr-2">mdi-briefcase-account-outline</v-icon>
      <span class="text-subtitle-1 font-weight-medium">Navigation</span>
    </div>

    <v-divider />

    <v-list nav density="comfortable" class="pt-2">
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :to="item.to"
        :title="item.title"
        :prepend-icon="item.icon"
        rounded="xl"
        class="mx-2 my-1"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";

const DRAWER_STORAGE_KEY = "manager_nav_drawer_open";
const drawer = ref(true);

onMounted(() => {
  const savedDrawerState = localStorage.getItem(DRAWER_STORAGE_KEY);
  if (savedDrawerState !== null) {
    drawer.value = savedDrawerState === "1";
  }
});

watch(drawer, (isOpen) => {
  localStorage.setItem(DRAWER_STORAGE_KEY, isOpen ? "1" : "0");
});

const navItems = [
  { title: "Templates", to: "/manager/templates", icon: "mdi-file-document-outline" },
  { title: "Schedule", to: "/manager", icon: "mdi-calendar-month-outline" },
  { title: "Users", to: "/manager/users", icon: "mdi-account-group-outline" },
  { title: "Budget", to: "/manager/budget", icon: "mdi-cash-multiple" },
  { title: "Trade Board", to: "/manager/tradeboard", icon: "mdi-swap-horizontal" },
  { title: "Announcements", to: "/manager/announcements", icon: "mdi-bullhorn-outline" },
  { title: "Availability", to: "/manager/availability", icon: "mdi-calendar-clock-outline" },
  { title: "Settings", to: "/manager/settings", icon: "mdi-cog-outline" },
];
</script>

<style scoped>
.manager-topbar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.manager-drawer {
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.drawer-header {
  background: linear-gradient(140deg, #f4ebe9 0%, #f9f4f3 100%);
  color: #3f0f12;
}

.manager-drawer :deep(.v-list-item--active) {
  background-color: #f1e2e1;
  color: #5a1217;
}
</style>
