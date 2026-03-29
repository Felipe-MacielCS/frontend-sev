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

      <v-list-group value="clock-in-out">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            title="Clock In / Out"
            prepend-icon="mdi-timer-outline"
            rounded="xl"
            class="mx-2 my-1"
          />
        </template>

        <div class="px-4 pb-3">
          <div v-if="quickClockContext" class="text-body-2 mb-3">
            <div><b>Date:</b> {{ quickClockContext.shift.shift_date }}</div>
            <div>
              <b>Shift:</b>
              {{ toHHMM(quickClockContext.shift.start_time) }} -
              {{ toHHMM(quickClockContext.shift.end_time) }}
            </div>
          </div>
          <div v-else class="text-body-2 text-medium-emphasis mb-3">
            No official shift is available right now.
          </div>

          <v-btn
            color="primary"
            block
            size="small"
            class="mb-2"
            :disabled="!quickClockContext"
            :loading="quickClockLoading"
            @click="handleQuickClockAction"
          >
            {{ quickClockOpenRecord ? "Clock Out" : "Clock In" }}
          </v-btn>

          <v-btn
            to="/worker/clock"
            variant="tonal"
            color="primary"
            block
            size="small"
          >
            Open Time Log
          </v-btn>
        </div>
      </v-list-group>
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
import userShiftServices from "../services/userShiftServices.js";
import shiftServices from "../services/shiftServices.js";
import scheduleServices from "../services/scheduleServices.js";
import clockInOutServices from "../services/clockInOutServices.js";

const DRAWER_STORAGE_KEY = "worker_nav_drawer_open";
const FILTER_STORAGE_KEY = "worker_dashboard_filters";

const drawer = ref(true);
const route = useRoute();
const isWorkerDashboard = computed(() => route.path === "/worker");
const quickClockLoading = ref(false);
const quickClockContext = ref(null);
const filters = ref({
  position: "Positions",
  status: ["all"],
  worker: "Workers",
});

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

const pickPrimaryClockContext = (contexts) => {
  if (!contexts.length) return null;

  const openContext = contexts.find((context) =>
    context.clockRecords.some((record) => !record.clock_out_time)
  );
  if (openContext) return openContext;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const todayContexts = contexts.filter((context) => context.shift.shift_date === today);

  const activeToday = todayContexts.find((context) => {
    const start = getShiftDateTime(context.shift, "start_time");
    const end = getShiftDateTime(context.shift, "end_time");
    return start <= now && now <= end;
  });
  if (activeToday) return activeToday;

  const upcomingToday = todayContexts.find(
    (context) => getShiftDateTime(context.shift, "start_time") >= now
  );
  if (upcomingToday) return upcomingToday;

  if (todayContexts.length) return todayContexts[0];
  return contexts[0];
};

const loadQuickClockData = async () => {
  try {
    const userID = getCurrentUserID();
    if (!userID) {
      quickClockContext.value = null;
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

        const clockRes = await clockInOutServices.getByUserShift(userShiftID);
        const clockRecords = Array.isArray(clockRes) ? clockRes : [];
        return { userShiftID, shift, schedule, clockRecords };
      })
    );

    const normalizedContexts = contexts
      .filter(Boolean)
      .sort((a, b) => getShiftDateTime(b.shift, "start_time") - getShiftDateTime(a.shift, "start_time"));

    quickClockContext.value = pickPrimaryClockContext(normalizedContexts);
  } catch (error) {
    console.error("Failed to load quick clock data:", error?.response?.data || error);
    quickClockContext.value = null;
  }
};

const quickClockOpenRecord = computed(
  () => quickClockContext.value?.clockRecords?.find((record) => !record.clock_out_time) || null
);

const handleQuickClockAction = async () => {
  if (!quickClockContext.value?.userShiftID) return;

  try {
    quickClockLoading.value = true;
    if (quickClockOpenRecord.value) {
      await clockInOutServices.clockOut(quickClockContext.value.userShiftID);
    } else {
      await clockInOutServices.clockIn(quickClockContext.value.userShiftID);
    }
    await loadQuickClockData();
  } catch (error) {
    console.error("Quick clock action failed:", error?.response?.data || error);
  } finally {
    quickClockLoading.value = false;
  }
};

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

watch(
  () => route.path,
  () => {
    loadQuickClockData();
  }
);

const navItems = [
  { title: "Settings", to: "/worker/settings", icon: "mdi-cog-outline" },
  { title: "Schedule", to: "/worker", icon: "mdi-calendar-month-outline" },
  { title: "Clock In / Out", to: "/worker/clock", icon: "mdi-timer-outline" },
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
