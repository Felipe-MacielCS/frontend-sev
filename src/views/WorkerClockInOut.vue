<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <v-col cols="12">
        <v-card elevation="2" class="bg-white rounded-lg">
          <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-3 px-4 pt-4">
            <span class="text-subtitle-1 font-weight-bold">Time Log</span>
            <div class="d-flex align-center ga-2">
              <v-btn
                icon="mdi-chevron-left"
                variant="text"
                color="primary"
                class="clock-week-arrow"
                @click="changeWeek(-1)"
              />
              <v-btn
                variant="tonal"
                color="primary"
                class="clock-week-current"
                @click="goToCurrentWeek"
              >
                This Week
              </v-btn>
              <v-btn
                icon="mdi-chevron-right"
                variant="text"
                color="primary"
                class="clock-week-arrow"
                @click="changeWeek(1)"
              />
            </div>
          </v-card-title>

          <v-card-text>
            <div class="text-body-2 font-weight-medium clock-week-label mb-4">
              {{ weekLabel }}
            </div>

            <v-table v-if="weeklyTimeRecords.length">
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
                <tr v-for="record in weeklyTimeRecords" :key="record.id">
                  <td>{{ formatDate(record.shiftDate) }}</td>
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
      error: "",
      assignmentContexts: [],
      timeRecords: [],
      weekStart: "",
    };
  },
  computed: {
    weekEnd() {
      if (!this.weekStart) return "";
      return this.toISODate(this.addDays(new Date(`${this.weekStart}T00:00:00`), 6));
    },
    weekLabel() {
      if (!this.weekStart || !this.weekEnd) return "";
      return `${this.formatDate(this.weekStart)} - ${this.formatDate(this.weekEnd)}`;
    },
    weeklyTimeRecords() {
      if (!this.weekStart || !this.weekEnd) return this.timeRecords;
      return this.timeRecords.filter((record) => {
        const shiftDate = String(record.shiftDate || "").slice(0, 10);
        return shiftDate >= this.weekStart && shiftDate <= this.weekEnd;
      });
    },
  },
  async mounted() {
    this.weekStart = this.toISODate(this.getStartOfWeek(new Date()));
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
    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },
    isOfficialSchedule(schedule) {
      const type = String(schedule?.type || "").trim().toLowerCase();
      const status = String(schedule?.status || "").trim().toLowerCase();
      return type === "official" || status === "published";
    },
    addDays(date, amount) {
      const next = new Date(date);
      next.setDate(next.getDate() + amount);
      return next;
    },
    getStartOfWeek(date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      return start;
    },
    toISODate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    formatDate(value) {
      if (!value) return "-";
      const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
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
    changeWeek(direction) {
      const start = this.weekStart
        ? new Date(`${this.weekStart}T00:00:00`)
        : this.getStartOfWeek(new Date());
      this.weekStart = this.toISODate(this.addDays(start, direction * 7));
    },
    goToCurrentWeek() {
      this.weekStart = this.toISODate(this.getStartOfWeek(new Date()));
    },
    async loadClockingData() {
      this.loading = true;
      this.error = "";
      this.assignmentContexts = [];
      this.timeRecords = [];

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
        this.error = error?.response?.data?.message || "Failed to load clocking data.";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.clock-week-label {
  color: #5f5f5f;
  font-size: 1rem;
}

.clock-week-arrow {
  min-width: 32px;
  width: 32px;
  height: 32px;
  background: transparent !important;
}

.clock-week-current {
  min-width: 112px;
  height: 34px;
  border-radius: 6px;
  font-size: 0.78rem;
}
</style>
