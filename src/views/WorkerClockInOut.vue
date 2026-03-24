<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="pa-4 bg-grey-lighten-3" elevation="1">
          <h2 class="text-h6 font-weight-bold mb-3">Clock In / Out</h2>

          <div v-if="primaryShiftContext" class="text-body-2">
            <div class="mb-2"><b>Shift Date:</b> {{ primaryShiftContext.shift.shift_date }}</div>
            <div class="mb-2">
              <b>Shift Time:</b>
              {{ toHHMM(primaryShiftContext.shift.start_time) }} -
              {{ toHHMM(primaryShiftContext.shift.end_time) }}
            </div>
            <div class="mb-4">
              <b>Status:</b>
              {{ primaryOpenRecord ? "Clocked In" : "Ready to Clock In" }}
            </div>

            <v-btn
              color="primary"
              block
              :loading="clockActionLoading"
              @click="handleClockAction"
            >
              {{ primaryOpenRecord ? "Clock Out" : "Clock In" }}
            </v-btn>
          </div>

          <div v-else class="text-body-2 text-medium-emphasis">
            No assigned official shift is available right now for clocking.
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card elevation="2" class="bg-white rounded-lg">
          <v-card-title class="d-flex align-center justify-space-between px-4 pt-4">
            <span class="text-subtitle-1 font-weight-bold">Time Log</span>
            <v-btn variant="text" :loading="loading" @click="loadClockingData">Refresh</v-btn>
          </v-card-title>

          <v-card-text>
            <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
              {{ error }}
            </v-alert>

            <v-alert
              v-else-if="timeRecords.length === 0 && !loading"
              type="info"
              variant="tonal"
              class="mb-4"
            >
              No clock records yet.
            </v-alert>

            <v-table v-else>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Time Worked</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in timeRecords" :key="record.id">
                  <td>{{ record.shiftDate }}</td>
                  <td>{{ record.shiftLabel }}</td>
                  <td>{{ formatDateTime(record.clockInTime) }}</td>
                  <td>{{ record.clockOutTime ? formatDateTime(record.clockOutTime) : "Active" }}</td>
                  <td>{{ formatWorkedDuration(record.clockInTime, record.clockOutTime) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom right">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import userShiftServices from "../services/userShiftServices.js";
import shiftServices from "../services/shiftServices.js";
import scheduleServices from "../services/scheduleServices.js";
import clockInOutServices from "../services/clockInOutServices.js";

export default {
  name: "WorkerClockInOut",
  data() {
    return {
      loading: false,
      clockActionLoading: false,
      error: "",
      assignmentContexts: [],
      timeRecords: [],
      primaryShiftContext: null,
      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },
  computed: {
    primaryOpenRecord() {
      return this.primaryShiftContext?.clockRecords?.find((record) => !record.clock_out_time) || null;
    },
  },
  async mounted() {
    await this.loadClockingData();
  },
  methods: {
    normalizeID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },
    getCurrentUserID() {
      const user = this.getCurrentUser();
      return this.normalizeID(user?.ID ?? user?.id ?? user?.userID);
    },
    isOfficialSchedule(schedule) {
      const type = String(schedule?.type || "").trim().toLowerCase();
      const status = String(schedule?.status || "").trim().toLowerCase();
      return type === "official" || status === "published";
    },
    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },
    formatDateTime(value) {
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString();
    },
    formatWorkedDuration(clockInTime, clockOutTime) {
      if (!clockInTime) return "-";
      const start = new Date(clockInTime);
      const end = clockOutTime ? new Date(clockOutTime) : new Date();
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";

      const totalMinutes = Math.max(0, Math.round((end - start) / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    },
    getShiftDateTime(shift, key) {
      return new Date(`${shift.shift_date}T${this.toHHMM(shift[key])}:00`);
    },
    getPrimaryShiftContext(contexts) {
      if (!contexts.length) return null;

      const withOpenRecord = contexts.find((context) =>
        context.clockRecords.some((record) => !record.clock_out_time)
      );
      if (withOpenRecord) return withOpenRecord;

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const todayContexts = contexts.filter((context) => context.shift.shift_date === today);

      const activeToday = todayContexts.find((context) => {
        const start = this.getShiftDateTime(context.shift, "start_time");
        const end = this.getShiftDateTime(context.shift, "end_time");
        return start <= now && now <= end;
      });
      if (activeToday) return activeToday;

      const upcomingToday = todayContexts.find(
        (context) => this.getShiftDateTime(context.shift, "start_time") >= now
      );
      if (upcomingToday) return upcomingToday;

      if (todayContexts.length) return todayContexts[0];

      return contexts[0];
    },
    showMessage(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },
    async loadClockingData() {
      this.loading = true;
      this.error = "";
      this.assignmentContexts = [];
      this.timeRecords = [];
      this.primaryShiftContext = null;

      try {
        const userID = this.getCurrentUserID();
        if (!userID) {
          this.error = "Could not identify the current worker.";
          return;
        }

        const assignmentsRes = await userShiftServices.getAll({ userID });
        const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];

        const shiftIDs = [...new Set(
          assignments
            .map((assignment) => this.normalizeID(assignment?.shiftID))
            .filter(Boolean)
        )];
        const shifts = await Promise.all(shiftIDs.map((shiftID) => shiftServices.get(shiftID)));
        const shiftsByID = Object.fromEntries(
          shifts
            .filter(Boolean)
            .map((shift) => [this.normalizeID(shift?.ID), shift])
        );

        const scheduleIDs = [...new Set(
          shifts
            .map((shift) => this.normalizeID(shift?.scheduleID))
            .filter(Boolean)
        )];
        const schedules = await Promise.all(scheduleIDs.map((scheduleID) => scheduleServices.get(scheduleID)));
        const schedulesByID = Object.fromEntries(
          schedules
            .filter(Boolean)
            .map((schedule) => [this.normalizeID(schedule?.ID), schedule])
        );

        const contexts = await Promise.all(
          assignments.map(async (assignment) => {
            const userShiftID = this.normalizeID(assignment?.ID);
            const shiftID = this.normalizeID(assignment?.shiftID);
            const shift = shiftsByID[shiftID];
            const schedule = schedulesByID[this.normalizeID(shift?.scheduleID)];
            if (!userShiftID || !shift || !schedule || !this.isOfficialSchedule(schedule)) return null;

            const clockRes = await clockInOutServices.getByUserShift(userShiftID);
            const clockRecords = Array.isArray(clockRes) ? clockRes : [];

            return {
              userShiftID,
              assignment,
              shift,
              schedule,
              clockRecords,
            };
          })
        );

        this.assignmentContexts = contexts
          .filter(Boolean)
          .sort((a, b) => {
            const aDate = this.getShiftDateTime(a.shift, "start_time");
            const bDate = this.getShiftDateTime(b.shift, "start_time");
            return bDate - aDate;
          });

        this.primaryShiftContext = this.getPrimaryShiftContext(this.assignmentContexts);

        this.timeRecords = this.assignmentContexts
          .flatMap((context) =>
            context.clockRecords.map((record) => ({
              id: record.ID,
              shiftDate: context.shift.shift_date,
              shiftLabel: `${this.toHHMM(context.shift.start_time)} - ${this.toHHMM(context.shift.end_time)}`,
              clockInTime: record.clock_in_time,
              clockOutTime: record.clock_out_time,
            }))
          )
          .sort((a, b) => new Date(b.clockInTime) - new Date(a.clockInTime));
      } catch (error) {
        console.error("Failed to load clocking data:", error?.response?.data || error);
        this.error = error?.response?.data?.message || "Failed to load clocking data.";
      } finally {
        this.loading = false;
      }
    },
    async handleClockAction() {
      const userShiftID = this.primaryShiftContext?.userShiftID;
      if (!userShiftID) return;

      try {
        this.clockActionLoading = true;
        if (this.primaryOpenRecord) {
          await clockInOutServices.clockOut(userShiftID);
          this.showMessage("Clocked out successfully.");
        } else {
          await clockInOutServices.clockIn(userShiftID);
          this.showMessage("Clocked in successfully.");
        }

        await this.loadClockingData();
      } catch (error) {
        console.error("Clock action failed:", error?.response?.data || error);
        this.showMessage(error?.response?.data?.message || "Clock action failed.", "error");
      } finally {
        this.clockActionLoading = false;
      }
    },
  },
};
</script>
