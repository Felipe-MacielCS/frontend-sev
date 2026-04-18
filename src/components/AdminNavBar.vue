<template>
  <v-app-bar color="#72151A" theme="dark" elevation="2" class="admin-topbar px-2">
    <v-btn
      icon
      variant="text"
      class="ml-1"
      aria-label="Open admin navigation menu"
      @click="drawer = !drawer"
    >
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <v-avatar rounded="0" size="110" class="mx-2">
      <v-img src="/src/Assets/plain_eagle.png" alt="OC Logo"></v-img>
    </v-avatar>

    <div class="text-subtitle-1 font-weight-medium d-none d-sm-block">
      Admin Menu
    </div>

    <v-spacer></v-spacer>
  </v-app-bar>

  <v-navigation-drawer
    v-model="drawer"
    location="left"
    app
    width="290"
    class="admin-drawer"
  >
    <div class="d-flex align-center px-4 py-4 drawer-header">
      <v-icon size="20" class="mr-2">mdi-shield-crown-outline</v-icon>
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

const DRAWER_STORAGE_KEY = "admin_nav_drawer_open";
const drawer = ref(true);

onMounted(() => {
  const savedDrawerState = localStorage.getItem(DRAWER_STORAGE_KEY);
  if (savedDrawerState !== null) {
    drawer.value = savedDrawerState === "1";
  }
});

watch(drawer, (isOpen) => {
  localStorage.setItem(DRAWER_STORAGE_KEY, isOpen ? "1" : "0");
  window.dispatchEvent(
    new CustomEvent("app-drawer-toggled", {
      detail: { scope: "admin", open: isOpen },
    })
  );
});

const navItems = [
  { title: "Dashboard", to: "/admin", icon: "mdi-view-dashboard-outline" },
];
</script>

<style scoped>
.admin-topbar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.admin-drawer {
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.drawer-header {
  background: linear-gradient(140deg, #f4ebe9 0%, #f9f4f3 100%);
  color: #3f0f12;
}

.admin-drawer :deep(.v-list-item--active) {
  background-color: #f1e2e1;
  color: #5a1217;
}
</style>
