<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-card class="pa-4" elevation="2">
      <div class="d-flex align-center justify-space-between mb-4">
        <h2 class="text-h6 font-weight-bold">Workers</h2>

        <v-text-field
          v-model="search"
          label="Search workers"
          variant="solo"
          density="compact"
          hide-details
          style="max-width: 320px;"
        />
      </div>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

      <v-alert
        v-if="!error && workers.length === 0 && !loading"
        type="info"
        variant="tonal"
        class="mb-4"
      >
        No workers found for your department.
      </v-alert>

      <v-table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="w in filteredWorkers" :key="w.ID">
            <td>{{ w.name }}</td>
            <td>{{ w.email }}</td>
            <td>{{ w.phone }}</td>
            <td>{{ w.status }}</td>
            <td>
              <v-btn size="small" variant="text" @click="viewUser(w)">View</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- View Worker Dialog -->
      <v-dialog v-model="viewDialog.open" max-width="1000">
        <v-card class="pa-4 d-flex flex-column" style="height: 85vh;">
          <!-- Header -->
          <div class="d-flex align-center justify-space-between mb-2">
            <h3 class="text-h6 font-weight-bold">
              {{ viewDialog.user?.name || "Worker" }}
            </h3>
            <v-btn icon="mdi-close" variant="text" @click="closeViewDialog" />
          </div>

          <!-- Tabs -->
          <v-tabs v-model="viewDialog.tab" color="primary" class="manager-user-tabs">
            <v-tab value="info">Info</v-tab>
            <v-tab value="calendar">Calendar</v-tab>
          </v-tabs>

          <!-- Body -->
          <div class="flex-grow-1 pt-3 manager-user-dialog-body">
            <v-window v-model="viewDialog.tab" class="manager-user-window">
              <!-- Info tab -->
              <v-window-item value="info">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-card class="pa-4" variant="tonal">
                      <div class="text-subtitle-2 font-weight-bold mb-2">User Details</div>
                      <div class="mb-2"><b>Name:</b> {{ viewDialog.user?.name }}</div>
                      <div class="mb-2"><b>Email:</b> {{ viewDialog.user?.email }}</div>
                      <div class="mb-2"><b>Phone:</b> {{ viewDialog.user?.phone || "N/A" }}</div>
                      <div class="mb-2"><b>Status:</b> {{ viewDialog.user?.status || "N/A" }}</div>
                      <div class="mb-2"><b>Role:</b> {{ viewDialog.user?.role || "N/A" }}</div>
                    </v-card>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-card class="pa-4" variant="tonal">
                      <div class="text-subtitle-2 font-weight-bold mb-2">Actions</div>
                      <v-btn disabled variant="outlined" block class="mb-2">Edit (soon)</v-btn>
                      <v-btn disabled variant="outlined" block>Deactivate (soon)</v-btn>
                    </v-card>
                  </v-col>
                </v-row>
              </v-window-item>

              <!-- Calendar tab -->
              <v-window-item value="calendar">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="d-flex align-center ga-4">
                    <v-checkbox
                      v-model="calendarFilters.showUnavailability"
                      label="Unavailability"
                      density="compact"
                      hide-details
                    />
                    <v-checkbox
                      v-model="calendarFilters.showShifts"
                      label="Shifts"
                      density="compact"
                      hide-details
                    />
                  </div>

                  <v-btn variant="text" @click="reloadUserCalendarData">Refresh</v-btn>
                </div>

                <div>
                  <UserCalendar
                    ref="userCalendar"
                    :events="filteredUserCalendarEvents"
                    initialView="timeGridWeek"
                    :isEditable="false"
                    :isSelectable="false"
                  />
                </div>

                <v-alert
                  v-if="filteredUserCalendarEvents.length === 0"
                  type="info"
                  variant="tonal"
                  class="mt-3"
                >
                  No events to display with the current filters.
                </v-alert>

              </v-window-item>
            </v-window>
          </div>

          <!-- Footer -->
          <div class="d-flex justify-end mt-2">
            <v-btn variant="text" @click="closeViewDialog">Close</v-btn>
          </div>
        </v-card>
      </v-dialog>
  </v-container>
</template>

<script>
import apiClient from "../services/services.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import userServices from "../services/userServices.js";
import userShiftServices from "../services/userShiftServices.js";
import shiftServices from "../services/shiftServices.js";
import scheduleServices from "../services/scheduleServices.js";
import UserCalendar from "../components/UserCalendar.vue";

export default {
  name: "ManagerUsers",
  components: { UserCalendar },
  data() {
    return {
      loading: false,
      error: "",
      search: "",
      workers: [],

      viewDialog: {
        open: false,
        tab: "info",
        user: null,
      },

      calendarFilters: {
        showUnavailability: true,
        showShifts: true,
      },

      // all events for the selected user (unavailability + shifts)
      userCalendarEvents: [],
    };
  },

  computed: {
    filteredWorkers() {
      const q = this.search.trim().toLowerCase();
      if (!q) return this.workers;
      return this.workers.filter((u) => {
        const name = String(u.name ?? "").toLowerCase();
        const email = String(u.email ?? "").toLowerCase();
        const phone = String(u.phone ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    },

    

    filteredUserCalendarEvents() {
      return this.userCalendarEvents.filter((e) => {
        if (e.kind === "unavailability" && !this.calendarFilters.showUnavailability) return false;
        if (e.kind === "shift" && !this.calendarFilters.showShifts) return false;
        return true;
      });
    },
  },
  async mounted() {
    await this.loadWorkers();
  },

  watch: {
    "viewDialog.open"(open) {
      if (open) {
        this.$nextTick(() => setTimeout(() => this.$refs.userCalendar?.updateSize(), 100));
      }
    },
    "viewDialog.tab"(tab) {
      if (tab === "calendar") {
        this.$nextTick(() => setTimeout(() => this.$refs.userCalendar?.updateSize(), 100));
      }
    },
    filteredUserCalendarEvents() {
      this.$nextTick(() => setTimeout(() => this.$refs.userCalendar?.updateSize(), 50));
    },
  },

  methods: {
    isNotFound(error) {
      return Boolean(error?.response?.status === 404);
    },

    getDateTime(date, time) {
      if (!date && !time) return null;
      const safeDate = date || "1970-01-01";
      const safeTime = (time || "00:00:00").toString().substring(0, 8);
      return `${safeDate}T${safeTime}`;
    },

    getUserId(user) {
      return user?.ID ?? user?.id ?? user?.userID ?? null;
    },

    normalizeUnavailabilityEvent(rawBlock) {
      const start =
        rawBlock?.start ||
        rawBlock?.startDateTime ||
        rawBlock?.start_datetime ||
        this.getDateTime(rawBlock?.start_date, rawBlock?.start_time);
      const end =
        rawBlock?.end ||
        rawBlock?.endDateTime ||
        rawBlock?.end_datetime ||
        this.getDateTime(rawBlock?.end_date, rawBlock?.end_time);
      const id =
        rawBlock?.unavailabilityID ||
        rawBlock?.unavailableID ||
        rawBlock?.ID ||
        rawBlock?.id;

      if (!id || !start || !end) return null;

      return {
        id: `unavailability-${id}`,
        title: rawBlock?.reason || rawBlock?.title || "Unavailable",
        start,
        end,
        kind: "unavailability",
        color: "#c62828",
      };
    },

    async fetchUserUnavailability(userID) {
      const endpoints = [
        { path: `/unavailable/user/${userID}` },
        { path: "/unavailable", params: { userID } },
        { path: "/unavailable" },
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint.path, {
            params: endpoint.params || {},
          });
          const blocks = response?.unavailabilities || response?.data || response;

          if (Array.isArray(blocks)) {
            return blocks.filter((block) => {
              if (endpoint.path !== "/unavailable") return true;
              const blockUserID =
                block?.userID ?? block?.userId ?? block?.UserID ?? block?.employeeID ?? null;
              return String(blockUserID) === String(userID);
            });
          }
        } catch (error) {
          if (!this.isNotFound(error)) {
            console.error("Failed to load user unavailability:", error?.response?.data || error);
            return [];
          }
        }
      }

      return [];
    },

    async getManagerDepartmentID() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      const u = stored?.user ?? stored;

      const managerID = u?.ID ?? u?.id ?? u?.userID;
      if (!managerID) return null;

      const res = await departmentUsersServices.getByUser(managerID);

      const links = Array.isArray(res)
        ? res
        : Array.isArray(res?.departmentusers)
        ? res.departmentusers
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const managerLink =
        links.find((l) => String(l.role || "").trim().toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },

    async loadWorkers() {
      this.loading = true;
      this.error = "";
      this.workers = [];

      try {
        const departmentID = await this.getManagerDepartmentID();
        if (!departmentID) {
          this.error = "No department found for this manager (check department_users for manager row).";
          return;
        }

        const duRes = await departmentUsersServices.getByDepartment(departmentID);

        const links = Array.isArray(duRes)
          ? duRes
          : Array.isArray(duRes?.departmentusers)
          ? duRes.departmentusers
          : Array.isArray(duRes?.data)
          ? duRes.data
          : [];

        const userIDs = links
          .filter((l) => String(l.role || "").trim().toLowerCase() === "worker")
          .map((l) => l.userID ?? l.userId ?? l.UserID)
          .filter(Boolean);

        const users = await Promise.all(userIDs.map((id) => userServices.get(id)));

        this.workers = users.filter((u) => String(u.role || "").toLowerCase() === "worker");
      } catch (e) {
        this.error = e?.response?.data?.message || "Failed to load workers.";
        console.error(e?.response?.data || e);
      } finally {
        this.loading = false;
      }
    },

    async viewUser(user) {
      this.viewDialog.user = user;
      this.viewDialog.tab = "info";
      this.viewDialog.open = true;

      await this.reloadUserCalendarData();
    },

    closeViewDialog() {
      this.viewDialog.open = false;
      this.viewDialog.user = null;
      this.userCalendarEvents = [];
    },

    async reloadUserCalendarData() {
      const user = this.viewDialog.user;
      const userID = this.getUserId(user);
      if (!userID) return;

      this.userCalendarEvents = [];
      try {
        const departmentID = await this.getManagerDepartmentID();
        const [schedulesRes, assignmentsRes, unavailabilityBlocks] = await Promise.all([
          scheduleServices.getAll({
            departmentID,
            type: "official",
            limit: 200,
          }),
          userShiftServices.getAll({ userID }),
          this.fetchUserUnavailability(userID),
        ]);
        const officialSchedules = Array.isArray(schedulesRes?.schedules) ? schedulesRes.schedules : [];
        const officialScheduleIDs = new Set(
          officialSchedules
            .map((schedule) => Number(schedule?.ID))
            .filter((id) => Number.isFinite(id) && id > 0)
        );

        const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
        const shiftIDs = assignments
          .map((row) => row?.shiftID)
          .filter((id) => Number.isFinite(Number(id)))
          .map((id) => Number(id));

        const shiftEvents =
          shiftIDs.length === 0
            ? []
            : (await Promise.all(shiftIDs.map((id) => shiftServices.get(id))))
                .filter(
                  (shift) =>
                    !!shift &&
                    officialScheduleIDs.has(Number(shift.scheduleID))
                )
                .map((shift) => ({
                  id: `shift-${shift.ID}`,
                  title: "Assigned Shift",
                  start: `${shift.shift_date}T${String(shift.start_time || "").slice(0, 5)}:00`,
                  end: `${shift.shift_date}T${String(shift.end_time || "").slice(0, 5)}:00`,
                  kind: "shift",
                  color: "#2e7d32",
                }));

        const unavailabilityEvents = unavailabilityBlocks
          .map((block) => this.normalizeUnavailabilityEvent(block))
          .filter(Boolean);

        this.userCalendarEvents = [...unavailabilityEvents, ...shiftEvents];
      } catch (e) {
        console.error("Failed to load user calendar data:", e?.response?.data || e);
        this.userCalendarEvents = [];
      }

      this.$nextTick(() => {
        setTimeout(() => {
          this.$refs.userCalendar?.updateSize();
        }, 100);
      });
    },
  },
};
</script>

<style scoped>
.manager-user-tabs {
  flex: 0 0 auto;
  position: relative;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.manager-user-dialog-body {
  overflow: auto;
  min-height: 0;
}

.manager-user-window {
  min-height: 0;
}
</style>
