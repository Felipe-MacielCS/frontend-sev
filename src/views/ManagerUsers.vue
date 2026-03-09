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

                <v-alert type="info" variant="tonal" class="mt-3">
                  Placeholder calendar for now. Later we’ll load shifts + unavailability from the database.
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
import departmentUsersServices from "../services/departmentUsersServices.js";
import userServices from "../services/userServices.js";
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
      if (!user?.ID) return;

      this.userCalendarEvents = [];

      // ----------------------------------------------------
      // TODO (later) - pull from DB:
      // 1) Unavailability:
      //    const unavail = await unavailableServices.getByUser(user.ID)
      //    map to: { id, title, start, end, kind: 'unavailability' }
      //
      // 2) Shifts:
      //    const shifts = await usershiftServices.getByUser(user.ID)
      //    map to: { id, title, start, end, kind: 'shift' }
      // ----------------------------------------------------

      // Placeholder demo events (so the filters work now):
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const base = `${yyyy}-${mm}-${dd}`;

      const demoUnavailability = [
        {
          id: `u-${user.ID}-1`,
          title: "Unavailable (demo)",
          start: `${base}T10:00:00`,
          end: `${base}T12:00:00`,
          kind: "unavailability",
        },
      ];

      const demoShifts = [
        {
          id: `s-${user.ID}-1`,
          title: "Shift (demo)",
          start: `${base}T14:00:00`,
          end: `${base}T18:00:00`,
          kind: "shift",
        },
      ];

      this.userCalendarEvents = [...demoUnavailability, ...demoShifts];

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
  background: #fff;
}

.manager-user-dialog-body {
  overflow: auto;
  min-height: 0;
}

.manager-user-window {
  min-height: 0;
}
</style>
