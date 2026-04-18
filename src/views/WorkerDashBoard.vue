<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-card elevation="2" class="pa-4 bg-white rounded-lg workspace-shell">
      <div class="workspace-header mb-4">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
          <div>
            <div class="text-overline workspace-kicker">Worker Schedule</div>
            <div v-if="officialSchedule" class="text-h5 font-weight-bold">
              {{ currentCalendarTitle }}
            </div>

          </div>
        </div>

        <v-row dense class="align-end schedule-toolbar">
          <v-col cols="12" md="6" lg="3">
            <div>
              <v-select
                v-model="selectedViewFilter"
                :items="workerFilterItems"
                item-title="label"
                item-value="value"
                label="Show"
                variant="outlined"
                density="compact"
                hide-details
                :menu-props="{ maxHeight: 280 }"
              />
            </div>
          </v-col>

        </v-row>
      </div>

      <div class="calendar-frame">
        <Calendar
          ref="workerCalendar"
          :events="teamShifts"
          initialView="timeGridWeek"
          :isEditable="false"
          :isSelectable="false"
          :height="760"
          :contentHeight="700"
          :slotEventOverlap="false"
        />
      </div>
    </v-card>
  </v-container>
</template>

<script>
import Calendar from "../components/Calendar.vue";
import scheduleServices from "../services/scheduleServices.js";
import shiftServices from "../services/shiftServices.js";
import userShiftServices from "../services/userShiftServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import userServices from "../services/userServices.js";
import positionServices from "../services/positionServices.js";
import { getPositionColor } from "../utils/positionColors.js";

export default {
  name: "WorkerDashBoard",
  components: { Calendar },
  data() {
    return {
      currentUser: null,
      currentUserID: null,
      officialSchedule: null,
      departmentWorkersByID: {},
      positionsByID: {},
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
    currentCalendarTitle() {
      if (!this.officialSchedule) return "No official schedule selected";
      return `${this.officialSchedule.start_date} to ${this.officialSchedule.end_date}`;
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
            const position = this.positionsByID[shift.positionID];
            const positionTitle = position?.title || "Shift";
            return {
              id: `${shift.ID}-${assignment.ID}`,
              title:
                this.selectedViewFilter === "all"
                  ? `${worker?.name || "Worker"} - ${positionTitle}`
                  : this.selectedViewFilter === "me"
                    ? positionTitle
                    : `${worker?.name || "Worker"} - ${positionTitle}`,
              start: `${shift.shift_date}T${this.toHHMM(shift.start_time)}:00`,
              end: `${shift.shift_date}T${this.toHHMM(shift.end_time)}:00`,
              color: getPositionColor(position, shift.positionID),
              textColor: "#ffffff",
              extendedProps: {
                shiftID: shift.ID,
                positionID: shift.positionID || null,
              },
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

        const positionsRes = await positionServices.getAll({ departmentID, limit: 200 });
        const positions = Array.isArray(positionsRes)
          ? positionsRes
          : Array.isArray(positionsRes?.positions)
            ? positionsRes.positions
            : Array.isArray(positionsRes?.data)
              ? positionsRes.data
              : [];
        this.positionsByID = positions.reduce((acc, position) => {
          const id = position.positionID ?? position.ID ?? position.id;
          if (id) acc[id] = position;
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
        this.positionsByID = {};
        this.officialShifts = [];
        this.officialAssignmentsByShiftID = {};
      }
    },
  },
};
</script>

<style scoped>
.workspace-kicker {
  letter-spacing: 0.12em;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.workspace-shell {
  border-radius: 24px;
}

.workspace-header {
  padding: 8px 8px 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.calendar-frame {
  padding: 4px;
}
</style>
