<template>
  <v-container fluid class="manager-availability pa-6">
    <v-row>
      <v-col cols="12" md="4" lg="3">
        <v-card class="mb-4 rounded-xl filter-card" elevation="2">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Team Availability
          </v-card-title>
          <v-card-text>
            <v-select
              v-model="selectedWorkerID"
              :items="workerFilterItems"
              item-title="label"
              item-value="value"
              label="Worker"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              :disabled="loading"
            />

            <v-text-field
              v-model="search"
              label="Search reason or name"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-magnify"
              class="mb-3"
              :disabled="loading"
            />

            <v-btn
              color="primary"
              block
              prepend-icon="mdi-refresh"
              :loading="loading"
              @click="loadPageData"
            >
              Refresh
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8" lg="9">
        <v-card class="rounded-xl calendar-card" elevation="2">
          <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-3">
            <div>
              <div class="text-h6 font-weight-bold">Manager Availability Board</div>
            </div>

            <v-chip color="primary" variant="tonal" size="small">
              {{ selectedWorkerLabel }}
            </v-chip>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-4">
            <v-progress-linear
              v-if="loading"
              indeterminate
              color="primary"
              class="mb-4"
            />

            <Calendar
              ref="availabilityCalendar"
              :events="visibleEvents"
              initialView="timeGridWeek"
              :isEditable="false"
              :isSelectable="false"
              :height="760"
              :contentHeight="700"
              @shift-clicked="openBlockDetails"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="detailDialog" max-width="520">
      <v-card>
        <v-card-title class="text-h6">Unavailability Details</v-card-title>
        <v-card-text v-if="selectedBlock">
          <div class="detail-row">
            <div class="detail-label">Worker</div>
            <div class="detail-value">{{ selectedBlock.workerName }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Range</div>
            <div class="detail-value">{{ formatFullRange(selectedBlock) }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Reason</div>
            <div class="detail-value">{{ selectedBlock.reason || "Unavailable" }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Recurring</div>
            <div class="detail-value">{{ selectedBlock.isRecurring ? "Yes" : "No" }}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Email</div>
            <div class="detail-value">{{ selectedBlock.email || "Not provided" }}</div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="detailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import Calendar from "../components/Calendar.vue";
import Utils from "../config/utils.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import unavailableServices from "../services/unavailableServices.js";
import userServices from "../services/userServices.js";

const BLOCK_COLORS = [
  "#8E3B46",
  "#2D6A4F",
  "#1D4E89",
  "#C17C00",
  "#7B2CBF",
  "#0077B6",
  "#B56576",
];

export default {
  name: "ManagerAvailability",
  components: { Calendar },
  data() {
    return {
      loading: false,
      error: "",
      managerDepartmentID: null,
      departmentWorkersByID: {},
      blocks: [],
      selectedWorkerID: "all",
      search: "",
      selectedBlock: null,
      detailDialog: false,
    };
  },
  computed: {
    workerFilterItems() {
      const workers = Object.values(this.departmentWorkersByID)
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
        .map((worker) => ({
          label: worker.name || `Worker ${worker.ID}`,
          value: String(worker.ID),
        }));

      return [{ label: "All workers", value: "all" }, ...workers];
    },
    selectedWorkerLabel() {
      if (this.selectedWorkerID === "all") return "All workers";
      return this.departmentWorkersByID[Number(this.selectedWorkerID)]?.name || "Selected worker";
    },
    visibleBlocks() {
      const term = String(this.search || "").trim().toLowerCase();

      return this.blocks
        .filter((block) => {
          if (this.selectedWorkerID === "all") return true;
          return Number(block.userID) === Number(this.selectedWorkerID);
        })
        .filter((block) => {
          if (!term) return true;
          return [
            block.workerName,
            block.reason,
            block.email,
            block.start_date,
            block.end_date,
          ]
            .join(" ")
            .toLowerCase()
            .includes(term);
        })
        .sort((a, b) => new Date(a.start) - new Date(b.start));
    },
    visibleEvents() {
      return this.visibleBlocks.map((block) => ({
        id: block.id,
        title: `${block.workerName}: ${block.reason || "Unavailable"}`,
        start: block.start,
        end: block.end,
        color: block.color,
        extendedProps: block,
      }));
    },
  },
  async mounted() {
    await this.loadPageData();
  },
  methods: {
    getCurrentUser() {
      const stored = Utils.getStore("user");
      return stored?.user ?? stored ?? null;
    },
    normalizeID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
    normalizeArray(response, keys = []) {
      if (Array.isArray(response)) return response;
      for (const key of keys) {
        if (Array.isArray(response?.[key])) return response[key];
      }
      if (Array.isArray(response?.data)) return response.data;
      return [];
    },
    toTime(value, fallback) {
      return String(value || fallback).slice(0, 8);
    },
    toDateTime(dateValue, timeValue, isEndBoundary = false) {
      const safeDate = dateValue || new Date().toISOString().slice(0, 10);
      const safeTime = this.toTime(timeValue, isEndBoundary ? "23:59:59" : "00:00:00");
      return `${safeDate}T${safeTime}`;
    },
    colorForWorker(userID) {
      const numericID = this.normalizeID(userID) || 0;
      return BLOCK_COLORS[numericID % BLOCK_COLORS.length];
    },
    formatDate(value) {
      const dateObj = new Date(`${value}T00:00:00`);
      if (Number.isNaN(dateObj.getTime())) return value;
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(dateObj);
    },
    formatTime(value) {
      if (!value) return "All day";
      const dateObj = new Date(`2000-01-01T${String(value).slice(0, 5)}:00`);
      if (Number.isNaN(dateObj.getTime())) return value;
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(dateObj);
    },
    formatFullRange(block) {
      const sameDay = block.start_date === block.end_date;
      const startLabel = `${this.formatDate(block.start_date)} ${this.formatTime(block.start_time)}`;
      const endLabel = `${this.formatDate(block.end_date)} ${this.formatTime(block.end_time)}`;
      if (sameDay) {
        return `${this.formatDate(block.start_date)} | ${this.formatTime(block.start_time)} - ${this.formatTime(block.end_time)}`;
      }
      return `${startLabel} to ${endLabel}`;
    },
    async getManagerDepartmentID() {
      const currentUser = this.getCurrentUser();
      const managerID = this.normalizeID(
        currentUser?.ID ?? currentUser?.id ?? currentUser?.userID
      );
      if (!managerID) return null;

      const linksRes = await departmentUsersServices.getByUser(managerID);
      const links = this.normalizeArray(linksRes, ["departmentusers"]);
      const managerLink =
        links.find((link) => String(link.role || "").trim().toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },
    async loadDepartmentWorkers() {
      const departmentLinksRes = await departmentUsersServices.getByDepartment(this.managerDepartmentID);
      const departmentLinks = this.normalizeArray(departmentLinksRes, ["departmentusers"]);
      const workerIDs = departmentLinks
        .filter((link) => String(link.role || "").trim().toLowerCase() === "worker")
        .map((link) => this.normalizeID(link.userID ?? link.userId ?? link.UserID))
        .filter(Boolean);

      const uniqueWorkerIDs = [...new Set(workerIDs)];
      const workerResults = await Promise.allSettled(
        uniqueWorkerIDs.map((id) => userServices.get(id))
      );

      this.departmentWorkersByID = workerResults.reduce((acc, result, index) => {
        const fallbackID = uniqueWorkerIDs[index];
        if (result.status !== "fulfilled") {
          acc[fallbackID] = { ID: fallbackID, name: `Worker ${fallbackID}` };
          return acc;
        }

        const worker = result.value;
        const workerID = this.normalizeID(worker?.ID ?? worker?.id ?? worker?.userID) || fallbackID;
        acc[workerID] = { ...worker, ID: workerID };
        return acc;
      }, {});
    },
    normalizeBlock(rawBlock) {
      const userID = this.normalizeID(
        rawBlock?.userID ?? rawBlock?.user?.userID ?? rawBlock?.user?.ID
      );
      const worker = this.departmentWorkersByID[userID] || rawBlock?.user || {};

      return {
        id: rawBlock?.ID ?? rawBlock?.id,
        userID,
        workerName: worker?.name || `Worker ${userID || ""}`.trim(),
        email: worker?.email || rawBlock?.user?.email || "",
        start_date: rawBlock?.start_date,
        end_date: rawBlock?.end_date,
        start_time: this.toTime(rawBlock?.start_time, "00:00:00"),
        end_time: this.toTime(rawBlock?.end_time, "23:59:59"),
        reason: rawBlock?.reason || "",
        isRecurring: Boolean(rawBlock?.isRecurring),
        start: this.toDateTime(rawBlock?.start_date, rawBlock?.start_time, false),
        end: this.toDateTime(rawBlock?.end_date, rawBlock?.end_time, true),
        color: this.colorForWorker(userID),
      };
    },
    async loadUnavailability() {
      const workerIDs = new Set(
        Object.keys(this.departmentWorkersByID).map((key) => Number(key))
      );
      const unavailabilityRes = await unavailableServices.getAll({ limit: 500 });
      const rows = this.normalizeArray(unavailabilityRes, ["unavailabilities"]);

      this.blocks = rows
        .map((row) => this.normalizeBlock(row))
        .filter((block) => block.id && workerIDs.has(Number(block.userID)));
    },
    async loadPageData() {
      this.loading = true;
      this.error = "";

      try {
        this.managerDepartmentID = await this.getManagerDepartmentID();
        if (!this.managerDepartmentID) {
          this.blocks = [];
          return;
        }

        await this.loadDepartmentWorkers();
        await this.loadUnavailability();
      } catch (error) {
        console.error("Failed to load manager availability:", error?.response?.data || error);
        this.error = error?.response?.data?.message || "Could not load worker unavailability.";
        this.blocks = [];
      } finally {
        this.loading = false;
      }
    },
    openBlockDetails(eventOrBlock) {
      const block = eventOrBlock?.extendedProps || eventOrBlock;
      if (!block) return;
      this.selectedBlock = block;
      this.detailDialog = true;
    },
  },
};
</script>

<style scoped>
.manager-availability {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(114, 21, 26, 0.08), transparent 28%),
    linear-gradient(180deg, #f7f7f8 0%, #eceff1 100%);
}

.filter-card,
.calendar-card {
  background: rgba(255, 255, 255, 0.92);
}

.detail-row + .detail-row {
  margin-top: 14px;
}

.detail-label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.58);
  margin-bottom: 4px;
}

.detail-value {
  font-size: 0.975rem;
  line-height: 1.5;
}
</style>
