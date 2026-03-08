<template>
  <v-app-bar color="#72151A" theme="dark" elevation="2" class="worker-topbar px-2">
    <v-btn
      icon
      variant="text"
      class="ml-1"
      aria-label="Open worker navigation menu"
      @click="drawer = !drawer"
    >
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <v-avatar rounded="0" size="110" class="mx-2">
      <v-img src="/src/Assets/plain_eagle.png" alt="OC Logo"></v-img>
    </v-avatar>

    <div class="text-subtitle-1 font-weight-medium d-none d-sm-block">
      Worker Menu
    </div>

    <v-spacer></v-spacer>

    <v-btn icon="mdi-cog" variant="text" class="mr-1"></v-btn>
  </v-app-bar>

  <v-navigation-drawer
    v-model="drawer"
    location="left"
    app
    width="290"
    class="worker-drawer"
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

    <template v-if="isWorkerDashboard">
      <v-divider class="my-2" />
      <div class="px-4 pt-2 pb-1 text-overline filter-title">Schedule Filters</div>

      <div class="px-3 pb-4">
        <v-select
          v-model="filters.position"
          :items="['Positions', 'Lifeguard', 'Desk']"
          variant="outlined"
          density="compact"
          hide-details
          class="mb-3"
        />

        <div class="text-caption font-weight-medium mb-1">Status</div>
        <v-checkbox
          v-model="filters.status"
          label="All"
          value="all"
          density="compact"
          hide-details
          class="mb-n2"
        />
        <v-checkbox
          v-model="filters.status"
          label="Assigned"
          value="assigned"
          density="compact"
          hide-details
          class="mb-n2"
        />
        <v-checkbox
          v-model="filters.status"
          label="Open"
          value="open"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-select
          v-model="filters.worker"
          :items="['Workers', 'Felipe', 'John']"
          variant="outlined"
          density="compact"
          hide-details
        />
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

const DRAWER_STORAGE_KEY = "worker_nav_drawer_open";
const FILTER_STORAGE_KEY = "worker_dashboard_filters";
const drawer = ref(true);
const route = useRoute();
const isWorkerDashboard = computed(() => route.path === "/worker");
const filters = ref({
  position: "Positions",
  status: ["all"],
  worker: "Workers",
});

onMounted(() => {
  const savedDrawerState = localStorage.getItem(DRAWER_STORAGE_KEY);
  if (savedDrawerState !== null) {
    drawer.value = savedDrawerState === "1";
  }

  const savedFilters = localStorage.getItem(FILTER_STORAGE_KEY);
  if (savedFilters) {
    try {
      const parsed = JSON.parse(savedFilters);
      filters.value = {
        position: parsed.position || "Positions",
        status: Array.isArray(parsed.status) && parsed.status.length ? parsed.status : ["all"],
        worker: parsed.worker || "Workers",
      };
    } catch (error) {
      console.error("Could not parse worker filters:", error);
    }
  }
});

watch(drawer, (isOpen) => {
  localStorage.setItem(DRAWER_STORAGE_KEY, isOpen ? "1" : "0");
});

watch(
  filters,
  (newFilters) => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters));
  },
  { deep: true }
);

const navItems = [
  { title: "Schedule", to: "/worker", icon: "mdi-calendar-month-outline" },
  { title: "Trade Board", to: "/manager/users", icon: "mdi-swap-horizontal" },
  { title: "Announcements", to: "/manager/budget", icon: "mdi-bullhorn-outline" },
  { title: "Availability", to: "/worker/availability", icon: "mdi-calendar-clock-outline" },
];
</script>

<style scoped>
.worker-topbar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.worker-drawer {
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.drawer-header {
  background: linear-gradient(140deg, #f4ebe9 0%, #f9f4f3 100%);
  color: #3f0f12;
}

.worker-drawer :deep(.v-list-item--active) {
  background-color: #f1e2e1;
  color: #5a1217;
}

.filter-title {
  color: #6d1b22;
  letter-spacing: 0.08em;
}
</style>
