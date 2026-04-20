<template>
  <v-container fluid class="manager-clock-kiosk pa-6">
    <v-row justify="center">
      <v-col cols="12" lg="9" xl="7">
        <v-card class="kiosk-shell pa-6" elevation="2">
          <div class="kiosk-header mb-6">
            <div>
              <div class="text-overline kiosk-eyebrow">Eagles at Work</div>
              <h1 class="text-h4 font-weight-bold mb-2">Clock-In Kiosk</h1>
            </div>

          </div>

          <v-card class="email-card pa-4 mb-5" variant="flat">
            <v-form @submit.prevent="findWorker">
              <div class="d-flex flex-column flex-md-row ga-3">
                <v-text-field
                  v-model.trim="email"
                  label="School email"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  autofocus
                  class="flex-grow-1"
                />
                <v-btn
                  color="#8b1e1e"
                  class="text-white kiosk-action"
                  size="large"
                  type="submit"
                  :loading="loading"
                  :disabled="!canSearch"
                >
                  Continue
                </v-btn>
              </div>
            </v-form>
          </v-card>

          <v-card v-if="message" class="pa-4 mb-5 kiosk-message" variant="flat">
            {{ message }}
          </v-card>

          <div v-if="selectedWorker" class="worker-panel">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
              <div>
                <div class="text-h6 font-weight-bold">{{ selectedWorker.name }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ selectedWorker.email }}</div>
              </div>

              <v-chip color="primary" variant="tonal">
                {{ todayLabel }}
              </v-chip>
            </div>

            <div v-if="todayShiftContexts.length" class="shift-grid">
              <v-card
                v-for="context in todayShiftContexts"
                :key="context.userShiftID"
                class="shift-card pa-4"
                variant="outlined"
              >
                <div class="d-flex align-start justify-space-between ga-3 mb-3">
                  <div>
                    <div class="text-h6 font-weight-bold">
                      {{ context.positionTitle }}
                    </div>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ formatShiftTime(context.shift) }}
                    </div>
                  </div>
                </div>

                <v-btn
                  block
                  size="large"
                  :color="context.openRecord ? '#2f6f4e' : '#8b1e1e'"
                  class="text-white"
                  :loading="clockingUserShiftID === context.userShiftID"
                  :disabled="!!clockingUserShiftID"
                  @click="clockShift(context)"
                >
                  {{ context.openRecord ? "Clock Out" : "Clock In" }}
                </v-btn>
              </v-card>
            </div>

            <v-card v-else class="empty-state pa-5" variant="outlined">
              <v-icon size="32" class="mb-2">mdi-calendar-clock-outline</v-icon>
              <div class="text-subtitle-1 font-weight-bold mb-1">No shift found for today</div>
            </v-card>
          </div>
        </v-card>
      </v-col>
    </v-row>

  </v-container>
</template>

<script>
import clockInOutServices from "../services/clockInOutServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import positionServices from "../services/positionServices.js";
import scheduleServices from "../services/scheduleServices.js";
import shiftServices from "../services/shiftServices.js";
import userServices from "../services/userServices.js";
import userShiftServices from "../services/userShiftServices.js";

export default {
  name: "ManagerClockin",
  data() {
    return {
      email: "",
      loading: false,
      managerDepartmentID: null,
      selectedWorker: null,
      todayShiftContexts: [],
      message: "",
      clockingUserShiftID: null,
      resetTimer: null,
    };
  },
  computed: {
    canSearch() {
      return this.email.includes("@") && !this.loading;
    },
    todayISO() {
      return this.toISODate(new Date());
    },
    todayLabel() {
      return new Date(`${this.todayISO}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
  },
  async mounted() {
    this.managerDepartmentID = await this.getManagerDepartmentID();
  },
  beforeUnmount() {
    if (this.resetTimer) {
      window.clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  },
  methods: {
    normalizeID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
    extractArray(response, keys = []) {
      if (Array.isArray(response)) return response;
      for (const key of keys) {
        if (Array.isArray(response?.[key])) return response[key];
      }
      if (Array.isArray(response?.data)) return response.data;
      return [];
    },
    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },
    toISODate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },
    getRecordID(record) {
      return this.normalizeID(
        record?.ID ?? record?.id ?? record?.userShiftID ?? record?.user_shiftID ?? record?.user_shift_id
      );
    },
    getShiftID(record) {
      return this.normalizeID(record?.shiftID ?? record?.shiftId ?? record?.shift_id);
    },
    getScheduleID(record) {
      return this.normalizeID(record?.scheduleID ?? record?.scheduleId ?? record?.schedule_id);
    },
    getPositionID(record) {
      return this.normalizeID(record?.positionID ?? record?.positionId ?? record?.position_id);
    },
    isSameDate(value, isoDate) {
      if (!value) return false;
      const raw = String(value);
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10) === isoDate;

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return false;
      return this.toISODate(parsed) === isoDate;
    },
    formatShiftTime(shift) {
      return `${this.toHHMM(shift?.start_time)} - ${this.toHHMM(shift?.end_time)}`;
    },
    async getManagerDepartmentID() {
      const user = this.getCurrentUser();
      const managerID = this.normalizeID(user?.ID ?? user?.id ?? user?.userID);
      if (!managerID) return null;

      const response = await departmentUsersServices.getByUser(managerID);
      const links = this.extractArray(response, ["departmentusers"]);
      const managerLink =
        links.find((link) => String(link.role || "").trim().toLowerCase() === "manager") || links[0];

      return this.normalizeID(managerLink?.departmentID);
    },
    async findUserByEmail(email) {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await userServices.getAll({ email: normalizedEmail, limit: 500 });
      let users = this.extractArray(response, ["users"]);
      let worker = users.find((user) => String(user?.email || "").trim().toLowerCase() === normalizedEmail);

      if (!worker) {
        const fallbackResponse = await userServices.getAll({ limit: 500 });
        users = this.extractArray(fallbackResponse, ["users"]);
        worker = users.find((user) => String(user?.email || "").trim().toLowerCase() === normalizedEmail);
      }

      return worker || null;
    },
    async workerBelongsToManagerDepartment(workerID) {
      if (!this.managerDepartmentID) return true;

      const response = await departmentUsersServices.getByUser(workerID);
      const links = this.extractArray(response, ["departmentusers"]);
      return links.some(
        (link) => this.normalizeID(link?.departmentID) === this.managerDepartmentID
      );
    },
    async loadPositionsByID(departmentID) {
      if (!departmentID) return {};

      const response = await positionServices.getAll({ departmentID, limit: 300 });
      const positions = this.extractArray(response, ["positions"]);
      return positions.reduce((acc, position) => {
        const id = this.normalizeID(position?.positionID ?? position?.ID ?? position?.id);
        if (id) acc[id] = position;
        return acc;
      }, {});
    },
    async loadTodayShiftsForWorker(worker) {
      const userID = this.normalizeID(worker?.ID ?? worker?.id ?? worker?.userID);
      if (!userID) return [];

      const assignmentsResponse = await userShiftServices.getAll({ userID });
      const assignments = this.extractArray(assignmentsResponse, ["usershifts"]);
      const shiftIDs = [
        ...new Set(
          assignments
            .map((assignment) => this.getShiftID(assignment))
            .filter(Boolean)
        ),
      ];

      if (!shiftIDs.length) return [];

      const shifts = (await Promise.all(shiftIDs.map((shiftID) => shiftServices.get(shiftID))))
        .filter((shift) => this.isSameDate(shift?.shift_date, this.todayISO));

      if (!shifts.length) return [];

      const scheduleIDs = [
        ...new Set(
          shifts
            .map((shift) => this.getScheduleID(shift))
            .filter(Boolean)
        ),
      ];
      const schedules = await Promise.all(scheduleIDs.map((scheduleID) => scheduleServices.get(scheduleID)));
      const schedulesByID = schedules.reduce((acc, schedule) => {
        const id = this.getScheduleID(schedule) || this.getRecordID(schedule);
        if (id) acc[id] = schedule;
        return acc;
      }, {});
      const positionsByID = await this.loadPositionsByID(this.managerDepartmentID);

      const assignmentsByShiftID = assignments.reduce((acc, assignment) => {
        const shiftID = this.getShiftID(assignment);
        if (shiftID) acc[shiftID] = assignment;
        return acc;
      }, {});

      const contexts = await Promise.all(
        shifts.map(async (shift) => {
          const shiftID = this.getRecordID(shift);
          const assignment = assignmentsByShiftID[shiftID];
          const userShiftID = this.getRecordID(assignment);
          const schedule = schedulesByID[this.getScheduleID(shift)] || null;
          if (!shiftID || !userShiftID) return null;

          const clockResponse = await clockInOutServices.getByUserShift(userShiftID);
          const clockRecords = this.extractArray(clockResponse, ["clockinouts", "clockInOuts"]);
          const openRecord = clockRecords.find((record) => !record?.clock_out_time) || null;
          const positionID = this.getPositionID(shift);
          const position =
            positionsByID[positionID] ||
            (positionID ? await positionServices.get(positionID).catch(() => null) : null);

          return {
            userShiftID,
            shift,
            schedule,
            clockRecords,
            openRecord,
            positionTitle: position?.title || "Position",
          };
        })
      );

      return contexts
        .filter(Boolean)
        .sort((a, b) => this.toHHMM(a.shift.start_time).localeCompare(this.toHHMM(b.shift.start_time)));
    },
    async findWorker() {
      if (this.resetTimer) {
        window.clearTimeout(this.resetTimer);
        this.resetTimer = null;
      }

      this.loading = true;
      this.message = "";
      this.selectedWorker = null;
      this.todayShiftContexts = [];

      try {
        if (!this.managerDepartmentID) {
          this.managerDepartmentID = await this.getManagerDepartmentID();
        }

        const worker = await this.findUserByEmail(this.email);
        if (!worker) {
          this.message = "No worker found with that school email.";
          this.scheduleKioskReset();
          return;
        }

        const workerID = this.normalizeID(worker?.ID ?? worker?.id ?? worker?.userID);
        const belongsToDepartment = await this.workerBelongsToManagerDepartment(workerID);
        if (!belongsToDepartment) {
          this.scheduleKioskReset();
          return;
        }

        this.selectedWorker = worker;
        this.todayShiftContexts = await this.loadTodayShiftsForWorker(worker);
        if (this.todayShiftContexts.length === 0) {
          this.scheduleKioskReset();
        }
      } catch (error) {
        this.message = error?.response?.data?.message || "Could not load this worker's kiosk options.";
        this.scheduleKioskReset();
      } finally {
        this.loading = false;
      }
    },
    async refreshCurrentWorker() {
      if (!this.selectedWorker) {
        if (this.email) await this.findWorker();
        return;
      }

      this.loading = true;
      this.message = "";

      try {
        this.todayShiftContexts = await this.loadTodayShiftsForWorker(this.selectedWorker);
      } catch (error) {
        this.message = error?.response?.data?.message || "Could not refresh this worker.";
      } finally {
        this.loading = false;
      }
    },
    async clockShift(context) {
      if (!context?.userShiftID) return;

      this.clockingUserShiftID = context.userShiftID;
      this.message = "";

      try {
        if (context.openRecord) {
          await clockInOutServices.clockOut(context.userShiftID);
        } else {
          await clockInOutServices.clockIn(context.userShiftID);
        }

        await this.refreshCurrentWorker();
        this.scheduleKioskReset();
      } catch (error) {
      } finally {
        this.clockingUserShiftID = null;
      }
    },
    scheduleKioskReset() {
      if (this.resetTimer) {
        window.clearTimeout(this.resetTimer);
      }

      this.resetTimer = window.setTimeout(() => {
        this.email = "";
        this.selectedWorker = null;
        this.todayShiftContexts = [];
        this.message = "";
        this.resetTimer = null;
      }, 2500);
    },
  },
};
</script>

<style scoped>
.manager-clock-kiosk {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(139, 30, 30, 0.1), transparent 28rem),
    #f5f5f5;
}

.kiosk-shell {
  border-radius: 22px;
}

.kiosk-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.kiosk-eyebrow {
  color: #8b1e1e;
  letter-spacing: 0.18em;
}

.email-card {
  background: transparent;
  border-radius: 18px;
}

.kiosk-action {
  min-width: 150px;
}

.kiosk-message {
  background: #f7eeee;
  color: #6f171a;
  border-radius: 16px;
}

.worker-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-top: 1.25rem;
}

.shift-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.shift-card,
.empty-state {
  border-radius: 18px;
}

.empty-state {
  text-align: center;
}

@media (max-width: 600px) {
  .manager-clock-kiosk {
    padding: 1rem !important;
  }

  .kiosk-header {
    align-items: stretch;
    flex-direction: column;
  }

  .kiosk-action {
    width: 100%;
  }
}
</style>
