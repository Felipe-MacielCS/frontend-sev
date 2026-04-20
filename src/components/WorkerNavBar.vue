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

    <v-chip
      v-if="nextShiftCountdownLabel"
      variant="tonal"
      color="white"
      class="mr-2 next-shift-chip"
    >
      <v-icon start size="18">mdi-timer-sand</v-icon>
      {{ nextShiftCountdownLabel }}
    </v-chip>

    <NotificationMenuButton
      :items="notifications"
      :loading="notificationsLoading"
      title="Notifications"
      button-label="Open worker notifications"
      icon="mdi-bell-outline"
    />

    <v-btn icon="mdi-cog" variant="text" class="mr-1" to="/worker/settings"></v-btn>
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

  </v-navigation-drawer>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import userShiftServices from "../services/userShiftServices.js";
import shiftServices from "../services/shiftServices.js";
import scheduleServices from "../services/scheduleServices.js";
import NotificationMenuButton from "./NotificationMenuButton.vue";
import { getWorkerNotificationFeed } from "../services/notificationFeedServices.js";
import { subscribeToNotificationRefresh } from "../services/notificationSync.js";

const DRAWER_STORAGE_KEY = "worker_nav_drawer_open";
const FILTER_STORAGE_KEY = "worker_dashboard_filters";
const NOTIFICATION_POLL_MS = 5000;

const drawer = ref(true);
const route = useRoute();
const isWorkerDashboard = computed(() => route.path === "/worker");
const quickClockContexts = ref([]);
const notifications = ref([]);
const notificationsLoading = ref(false);
const nowTick = ref(Date.now());
const filters = ref({
  position: "Positions",
  status: ["all"],
  worker: "Workers",
});
let countdownInterval = null;
let notificationInterval = null;
let unsubscribeNotificationRefresh = null;

const normalizeID = (raw) => {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const getCurrentUser = () => {
  const raw = localStorage.getItem("user");
  const stored = raw ? JSON.parse(raw) : null;
  return stored?.user ?? stored ?? null;
};

const getCurrentUserID = () => {
  const user = getCurrentUser();
  return normalizeID(user?.ID ?? user?.id ?? user?.userID);
};

const isOfficialSchedule = (schedule) => {
  const type = String(schedule?.type || "").trim().toLowerCase();
  const status = String(schedule?.status || "").trim().toLowerCase();
  return type === "official" || status === "published";
};

const toHHMM = (value) => {
  if (!value) return "00:00";
  return String(value).slice(0, 5);
};

const getShiftDateTime = (shift, key) => new Date(`${shift.shift_date}T${toHHMM(shift[key])}:00`);

const loadQuickClockData = async () => {
  try {
    const userID = getCurrentUserID();
    if (!userID) {
      quickClockContexts.value = [];
      return;
    }

    const assignmentsRes = await userShiftServices.getAll({ userID });
    const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
    const shiftIDs = [...new Set(
      assignments.map((assignment) => normalizeID(assignment?.shiftID)).filter(Boolean)
    )];
    const shifts = await Promise.all(shiftIDs.map((shiftID) => shiftServices.get(shiftID)));
    const shiftsByID = Object.fromEntries(
      shifts.filter(Boolean).map((shift) => [normalizeID(shift?.ID), shift])
    );

    const scheduleIDs = [...new Set(
      shifts.map((shift) => normalizeID(shift?.scheduleID)).filter(Boolean)
    )];
    const schedules = await Promise.all(scheduleIDs.map((scheduleID) => scheduleServices.get(scheduleID)));
    const schedulesByID = Object.fromEntries(
      schedules.filter(Boolean).map((schedule) => [normalizeID(schedule?.ID), schedule])
    );

    const contexts = await Promise.all(
      assignments.map(async (assignment) => {
        const userShiftID = normalizeID(assignment?.ID);
        const shift = shiftsByID[normalizeID(assignment?.shiftID)];
        const schedule = schedulesByID[normalizeID(shift?.scheduleID)];
        if (!userShiftID || !shift || !schedule || !isOfficialSchedule(schedule)) return null;

        return { userShiftID, shift, schedule };
      })
    );

    const normalizedContexts = contexts
      .filter(Boolean)
      .sort((a, b) => getShiftDateTime(b.shift, "start_time") - getShiftDateTime(a.shift, "start_time"));

    quickClockContexts.value = normalizedContexts;
  } catch (error) {
    console.error("Failed to load quick clock data:", error?.response?.data || error);
    quickClockContexts.value = [];
  }
};

const loadNotifications = async () => {
  try {
    notificationsLoading.value = true;
    const userID = getCurrentUserID();
    notifications.value = userID ? await getWorkerNotificationFeed(userID) : [];
  } catch (error) {
    console.error("Failed to load worker notifications:", error?.response?.data || error);
    notifications.value = [];
  } finally {
    notificationsLoading.value = false;
  }
};

const handleNotificationRefresh = () => {
  loadNotifications();
};

const nextUpcomingShiftContext = computed(() => {
  const now = nowTick.value;
  return quickClockContexts.value
    .filter((context) => getShiftDateTime(context.shift, "start_time").getTime() > now)
    .sort(
      (a, b) =>
        getShiftDateTime(a.shift, "start_time").getTime() -
        getShiftDateTime(b.shift, "start_time").getTime()
    )[0] || null;
});

const nextShiftCountdownLabel = computed(() => {
  const nextContext = nextUpcomingShiftContext.value;
  if (!nextContext) return "";

  const shiftStart = getShiftDateTime(nextContext.shift, "start_time").getTime();
  const msUntilShift = shiftStart - nowTick.value;
  if (msUntilShift <= 0 || msUntilShift > 24 * 60 * 60 * 1000) return "";

  const totalSeconds = Math.floor(msUntilShift / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `Next shift in ${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `Next shift in ${minutes}m ${String(seconds).padStart(2, "0")}s`;
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

  loadQuickClockData();
  loadNotifications();

  countdownInterval = window.setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
  notificationInterval = window.setInterval(loadNotifications, NOTIFICATION_POLL_MS);
  unsubscribeNotificationRefresh = subscribeToNotificationRefresh(handleNotificationRefresh);
});

onBeforeUnmount(() => {
  if (countdownInterval) {
    window.clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (notificationInterval) {
    window.clearInterval(notificationInterval);
    notificationInterval = null;
  }
  if (unsubscribeNotificationRefresh) {
    unsubscribeNotificationRefresh();
    unsubscribeNotificationRefresh = null;
  }
});

watch(drawer, (isOpen) => {
  localStorage.setItem(DRAWER_STORAGE_KEY, isOpen ? "1" : "0");
  window.dispatchEvent(
    new CustomEvent("app-drawer-toggled", {
      detail: { scope: "worker", open: isOpen },
    })
  );
});

watch(
  filters,
  (newFilters) => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters));
  },
  { deep: true }
);

watch(
  () => route.path,
  () => {
    loadQuickClockData();
    loadNotifications();
  }
);

const navItems = [
  { title: "Schedule", to: "/worker", icon: "mdi-calendar-month-outline" },
  { title: "Time Log", to: "/worker/clock", icon: "mdi-timer-outline" },
  { title: "Trade Board", to: "/worker/tradeboard", icon: "mdi-swap-horizontal" },
  { title: "Announcements", to: "/worker/announcements", icon: "mdi-bullhorn-outline" },
  { title: "Unvailability", to: "/worker/availability", icon: "mdi-calendar-clock-outline" },
  { title: "Settings", to: "/worker/settings", icon: "mdi-cog-outline" },
];
</script>

<style scoped>
.worker-topbar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.next-shift-chip {
  font-weight: 600;
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
