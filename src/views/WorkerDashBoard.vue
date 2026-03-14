<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <v-col cols="12" md="3">
        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Official Schedule</h3>
          <div v-if="officialSchedule" class="text-body-2">
            <div><b>Name:</b> {{ officialSchedule.name || "Official Schedule" }}</div>
            <div><b>Range:</b> {{ officialSchedule.start_date }} to {{ officialSchedule.end_date }}</div>
          </div>
          <div v-else class="text-body-2 text-medium-emphasis">
            No official schedule is available for your department.
          </div>
        </v-card>

        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">View Filter</h3>
          <v-select
            v-model="selectedViewFilter"
            :items="workerFilterItems"
            item-title="label"
            item-value="value"
            label="Show"
            variant="solo"
            density="compact"
            hide-details
          />
        </v-card>

        <v-card class="pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Alerts</h3>

          <div class="d-flex align-center justify-space-between mb-2">
            <div class="d-flex align-center">
              <v-icon color="blue-darken-1" size="small" class="mr-2">mdi-circle</v-icon>
              <span class="text-body-2">{{ filterSummaryLabel }}</span>
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
import userServices from "../services/userServices.js";

export default {
  name: "WorkerDashBoard",
  components: { Calendar },
  data() {
    return {
      currentUser: null,
      currentUserID: null,
      officialSchedule: null,
      departmentWorkersByID: {},
      officialShifts: [],
      officialAssignmentsByShiftID: {},
      selectedViewFilter: "me",
    };
  },
  computed: {
    workerFilterItems() {
      const items = [
        { label: "My shifts", value: "me" },
        { label: "All coworkers", value: "all" },
      ];

      const coworkerItems = Object.values(this.departmentWorkersByID)
        .filter((worker) => Number(worker.ID) !== Number(this.currentUserID))
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
        .map((worker) => ({
          label: worker.name || `Worker ${worker.ID}`,
          value: String(worker.ID),
        }));

      return [...items, ...coworkerItems];
    },
    filterSummaryLabel() {
      if (this.selectedViewFilter === "me") return "My Assigned Shifts";
      if (this.selectedViewFilter === "all") return "All Coworker Shifts";

      const selectedWorker = this.departmentWorkersByID[Number(this.selectedViewFilter)];
      return selectedWorker?.name ? `${selectedWorker.name}'s Shifts` : "Assigned Shifts";
    },
    teamShifts() {
      const selectedWorkerID =
        this.selectedViewFilter === "me"
          ? Number(this.currentUserID)
          : this.selectedViewFilter === "all"
            ? null
            : Number(this.selectedViewFilter);

      return this.officialShifts.flatMap((shift) => {
        const assignments = this.officialAssignmentsByShiftID[shift.ID] || [];
        const relevantAssignments =
          selectedWorkerID === null
            ? assignments
            : assignments.filter((assignment) => Number(assignment.userID) === selectedWorkerID);

        return relevantAssignments.map((assignment) => {
          const worker = this.departmentWorkersByID[Number(assignment.userID)];
          return {
            id: `${shift.ID}-${assignment.ID}`,
            title:
              this.selectedViewFilter === "all"
                ? `${worker?.name || "Worker"}`
                : this.selectedViewFilter === "me"
                  ? "My Shift"
                  : `${worker?.name || "Worker"}'s Shift`,
            start: `${shift.shift_date}T${this.toHHMM(shift.start_time)}:00`,
            end: `${shift.shift_date}T${this.toHHMM(shift.end_time)}:00`,
            color: Number(assignment.userID) === Number(this.currentUserID) ? "#2e7d32" : "#1565c0",
          };
        });
      });
    },
  },
  async mounted() {
    this.currentUser = this.getCurrentUser();
    this.currentUserID = this.normalizeUserID(
      this.currentUser?.ID ?? this.currentUser?.id ?? this.currentUser?.userID
    );
    await this.loadOfficialScheduleForWorker();
  },
  methods: {
    normalizeUserID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
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
      const workerID = this.currentUserID;
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
        links.find((link) => String(link.role || "").trim().toLowerCase() === "worker") || links[0];

      return workerLink?.departmentID ?? null;
    },
    async loadOfficialScheduleForWorker() {
      try {
        const workerID =
          this.currentUserID ||
          this.normalizeUserID(this.currentUser?.ID ?? this.currentUser?.id ?? this.currentUser?.userID);
        if (!workerID) return;

        const departmentID = await this.getWorkerDepartmentID();
        if (!departmentID) return;

        const departmentLinksRes = await departmentUsersServices.getByDepartment(departmentID);
        const departmentLinks = Array.isArray(departmentLinksRes)
          ? departmentLinksRes
          : Array.isArray(departmentLinksRes?.departmentusers)
            ? departmentLinksRes.departmentusers
            : Array.isArray(departmentLinksRes?.data)
              ? departmentLinksRes.data
              : [];

        const workerIDs = departmentLinks
          .filter((link) => String(link.role || "").trim().toLowerCase() === "worker")
          .map((link) => Number(link.userID ?? link.userId ?? link.UserID))
          .filter((id) => Number.isFinite(id) && id > 0);

        const workers = await Promise.all(workerIDs.map((id) => userServices.get(id)));
        this.departmentWorkersByID = workers.reduce((acc, worker) => {
          const id = this.normalizeUserID(worker?.ID ?? worker?.id ?? worker?.userID);
          if (id) acc[id] = { ...worker, ID: id };
          return acc;
        }, {});

        const scheduleRes = await scheduleServices.getAll({
          departmentID,
          type: "official",
          limit: 1,
        });
        const schedules = Array.isArray(scheduleRes?.schedules) ? scheduleRes.schedules : [];
        this.officialSchedule = schedules[0] || null;

        if (!this.officialSchedule?.ID) {
          this.officialShifts = [];
          this.officialAssignmentsByShiftID = {};
          return;
        }

        const shiftsRes = await shiftServices.getAll({ scheduleID: this.officialSchedule.ID });
        this.officialShifts = Array.isArray(shiftsRes) ? shiftsRes : [];

        const assignmentEntries = await Promise.all(
          this.officialShifts.map(async (shift) => {
            const assignmentsRes = await userShiftServices.getAll({ shiftID: shift.ID });
            const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
            return [shift.ID, assignments];
          })
        );
        this.officialAssignmentsByShiftID = Object.fromEntries(assignmentEntries);

        this.$nextTick(() => {
          this.$refs.workerCalendar?.goToDate?.(this.officialSchedule.start_date);
          this.$refs.workerCalendar?.updateSize?.();
        });
      } catch (e) {
        console.error("Failed to load official schedule for worker:", e?.response?.data || e);
        this.officialSchedule = null;
        this.departmentWorkersByID = {};
        this.officialShifts = [];
        this.officialAssignmentsByShiftID = {};
      }
    },
  },
};
</script>
