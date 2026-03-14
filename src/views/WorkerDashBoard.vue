<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <v-col cols="12">
      <v-col cols="12" md="3">
        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Current Official Schedule</h3>
          <div v-if="officialSchedule" class="text-body-2">
            <div><b>Name:</b> {{ officialSchedule.name || "Official Schedule" }}</div>
            <div><b>Range:</b> {{ officialSchedule.start_date }} to {{ officialSchedule.end_date }}</div>
          </div>
          <div v-else class="text-body-2 text-medium-emphasis">
            No official schedule found for your department.
          </div>
        </v-card>

        <v-card class="pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Alerts</h3>

          <div class="d-flex align-center justify-space-between mb-2">
            <div class="d-flex align-center">
              <v-icon color="blue-darken-1" size="small" class="mr-2">mdi-circle</v-icon>
              <span class="text-body-2">My Assigned Shifts</span>
            </div>
            <span class="font-weight-bold text-body-2">{{ teamShifts.length }}</span>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <v-card elevation="2" class="pa-2 bg-white rounded-lg">
          <Calendar
            ref="workerCalendar"
            :events="teamShifts"
            initialView="timeGridWeek"
            :isEditable="false"
            :isSelectable="false"
            :height="760"
            :contentHeight="700"
          />
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Calendar from "../components/Calendar.vue";
import scheduleServices from "../services/scheduleServices.js";
import shiftServices from "../services/shiftServices.js";
import userShiftServices from "../services/userShiftServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";

export default {
  name: "WorkerDashBoard",
  components: { Calendar },
  data() {
    return {
      officialSchedule: null,
      teamShifts: [],
    };
  },
  async mounted() {
    await this.loadOfficialScheduleForWorker();
  },
  methods: {
    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },
    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },
    async getWorkerDepartmentID() {
      const u = this.getCurrentUser();
      const workerID = u?.ID ?? u?.id ?? u?.userID;
      if (!workerID) return null;

      const linksRes = await departmentUsersServices.getByUser(workerID);
      const links = Array.isArray(linksRes)
        ? linksRes
        : Array.isArray(linksRes?.departmentusers)
          ? linksRes.departmentusers
          : Array.isArray(linksRes?.data)
            ? linksRes.data
            : [];

      const workerLink =
        links.find((l) => String(l.role || "").trim().toLowerCase() === "worker") || links[0];
      return workerLink?.departmentID ?? null;
    },
    async loadOfficialScheduleForWorker() {
      try {
        const u = this.getCurrentUser();
        const workerID = u?.ID ?? u?.id ?? u?.userID;
        if (!workerID) return;

        const departmentID = await this.getWorkerDepartmentID();
        if (!departmentID) return;

        const schedRes = await scheduleServices.getAll({
          departmentID,
          type: "official",
          limit: 1,
        });
        const schedules = Array.isArray(schedRes?.schedules) ? schedRes.schedules : [];
        const official = schedules[0] || null;
        this.officialSchedule = official;

        if (!official?.ID) {
          this.teamShifts = [];
          return;
        }

:deep(.fc-header-toolbar) {
 
}
</style>
        const shiftsRes = await shiftServices.getAll({ scheduleID: official.ID });
        const shifts = Array.isArray(shiftsRes) ? shiftsRes : [];

        const assignmentsRes = await userShiftServices.getAll({ userID: workerID });
        const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
        const assignedShiftIDs = new Set(assignments.map((a) => Number(a.shiftID)).filter((id) => id > 0));

        this.teamShifts = shifts
          .filter((s) => assignedShiftIDs.has(Number(s.ID)))
          .map((s) => ({
            id: String(s.ID),
            title: "My Shift",
            start: `${s.shift_date}T${this.toHHMM(s.start_time)}:00`,
            end: `${s.shift_date}T${this.toHHMM(s.end_time)}:00`,
            color: "#2e7d32",
          }));

        this.$nextTick(() => {
          this.$refs.workerCalendar?.goToDate?.(official.start_date);
          this.$refs.workerCalendar?.updateSize?.();
        });
      } catch (e) {
        console.error("Failed loading worker official schedule:", e);
      }
    },
  },
};
</script>
