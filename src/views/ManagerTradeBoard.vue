<template>
  <v-container fluid class="manager-trade-board pa-6">
    <v-row>
      <v-col cols="12" md="4">
        <v-card elevation="2" class="rounded-xl">
          <v-card-title class="text-subtitle-1 font-weight-bold">Filters</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="search"
              label="Search trades"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-4"
            />

            <v-chip-group
              v-model="activeFilter"
              selected-class="text-primary"
              mandatory
              class="mb-4"
            >
              <v-chip
                v-for="filter in boardFilters"
                :key="filter.value"
                :value="filter.value"
                filter
                variant="outlined"
              >
                {{ filter.label }}
              </v-chip>
            </v-chip-group>

            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
            >
              {{ error }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card elevation="2" class="rounded-xl">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <div class="text-h6 font-weight-bold">Manager Trade Board</div>
              <div class="text-body-2 text-medium-emphasis">
                Managers can review requests here, but workers still manage their own trades.
              </div>
            </div>
            <v-btn variant="text" :loading="loading" @click="loadManagerTradeBoard">
              Refresh
            </v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-4">
            <v-progress-linear
              v-if="loading"
              indeterminate
              color="primary"
              class="mb-4"
            />

            <v-alert
              v-if="!loading && !error && !visiblePosts.length"
              type="info"
              variant="tonal"
            >
              No trade requests found for your department.
            </v-alert>

            <v-row v-else>
              <v-col v-for="post in visiblePosts" :key="post.id" cols="12">
                <v-card variant="outlined" class="trade-post rounded-xl">
                  <v-card-text>
                    <div class="d-flex flex-wrap align-start justify-space-between ga-3 mb-3">
                      <div>
                        <div class="text-subtitle-1 font-weight-bold">
                          {{ post.positionTitle }}
                        </div>
                        <div class="text-body-2 text-medium-emphasis">
                          {{ formatShiftDate(post.shiftDate) }} |
                          {{ formatTimeRange(post.startTime, post.endTime) }}
                        </div>
                      </div>

                      <v-chip :color="statusColor(post.status)" size="small" variant="tonal">
                        {{ statusLabel(post.status) }}
                      </v-chip>
                    </div>

                    <div class="d-flex flex-wrap ga-2 mb-3">
                      <v-chip size="small" variant="outlined">
                        Worker: {{ post.authorName }}
                      </v-chip>
                      <v-chip size="small" variant="outlined">
                        Posted {{ formatDateTime(post.createdAt) }}
                      </v-chip>
                    </div>

                    <div v-if="post.reason" class="text-body-2 post-note">
                      {{ post.reason }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import Utils from "../config/utils.js";
import scheduleServices from "../services/scheduleServices.js";
import shiftServices from "../services/shiftServices.js";
import userShiftServices from "../services/userShiftServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import userServices from "../services/userServices.js";
import positionServices from "../services/positionServices.js";
import swapShiftRequestServices from "../services/swapShiftRequestServices.js";

export default {
  name: "ManagerTradeBoard",
  data() {
    return {
      loading: false,
      error: "",
      currentUser: null,
      currentUserID: null,
      managerDepartmentID: null,
      officialSchedule: null,
      departmentWorkersByID: {},
      positionsByID: {},
      officialShifts: [],
      officialAssignmentsByShiftID: {},
      tradePosts: [],
      search: "",
      activeFilter: "open",
      boardFilters: [
        { label: "Open", value: "open" },
        { label: "All", value: "all" },
        { label: "Accepted", value: "accepted" },
      ],
    };
  },
  computed: {
    allAssignmentsByID() {
      return Object.values(this.officialAssignmentsByShiftID).reduce((acc, assignments) => {
        assignments.forEach((assignment) => {
          if (assignment?.ID) acc[assignment.ID] = assignment;
        });
        return acc;
      }, {});
    },
    shiftsByID() {
      return this.officialShifts.reduce((acc, shift) => {
        if (shift?.ID) acc[shift.ID] = shift;
        return acc;
      }, {});
    },
    filteredTradePosts() {
      const term = String(this.search || "").trim().toLowerCase();
      const statusFiltered = this.tradePosts.filter((post) => {
        if (this.activeFilter === "open") return post.status === "open";
        if (this.activeFilter === "accepted") return post.status === "accepted";
        return true;
      });

      const searched = term
        ? statusFiltered.filter((post) =>
            [
              post.positionTitle,
              post.authorName,
              post.reason,
              post.shiftDate,
              post.startTime,
              post.endTime,
            ]
              .join(" ")
              .toLowerCase()
              .includes(term)
          )
        : statusFiltered;

      return searched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    visiblePosts() {
      return this.filteredTradePosts;
    },
  },
  async mounted() {
    this.currentUser = this.getCurrentUser();
    this.currentUserID = this.normalizeUserID(
      this.currentUser?.userID ?? this.currentUser?.ID ?? this.currentUser?.id
    );
    await this.loadManagerTradeBoard();
  },
  methods: {
    getCurrentUser() {
      const stored = Utils.getStore("user");
      return stored?.user ?? stored ?? null;
    },
    normalizeUserID(raw) {
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
    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },
    getDisplayName(user, fallbackID = "") {
      if (!user) return fallbackID ? `Worker ${fallbackID}` : "Worker";
      if (String(user.name || "").trim()) return String(user.name).trim();
      const id = this.normalizeUserID(user.userID ?? user.ID ?? user.id ?? fallbackID);
      return id ? `Worker ${id}` : "Worker";
    },
    formatShiftDate(dateValue) {
      if (!dateValue) return "Unknown date";
      const dateObj = new Date(`${dateValue}T00:00:00`);
      if (Number.isNaN(dateObj.getTime())) return dateValue;
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(dateObj);
    },
    formatTimeRange(startTime, endTime) {
      const toLabel = (value) => {
        const dateObj = new Date(`2000-01-01T${this.toHHMM(value)}:00`);
        if (Number.isNaN(dateObj.getTime())) return value;
        return new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(dateObj);
      };
      return `${toLabel(startTime)} - ${toLabel(endTime)}`;
    },
    formatDateTime(value) {
      if (!value) return "Unknown time";
      const dateObj = new Date(value);
      if (Number.isNaN(dateObj.getTime())) return value;
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(dateObj);
    },
    statusColor(status) {
      if (status === "accepted") return "success";
      if (status === "cancelled") return "grey";
      return "primary";
    },
    statusLabel(status) {
      if (status === "accepted") return "Accepted";
      if (status === "cancelled") return "Cancelled";
      return "Open";
    },
    normalizeRequestStatus(value) {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "accepted" || normalized === "approved") return "accepted";
      if (normalized === "cancelled" || normalized === "canceled" || normalized === "denied") {
        return "cancelled";
      }
      return "open";
    },
    normalizeSwapRequest(rawRequest) {
      const id = rawRequest?.ID ?? rawRequest?.id ?? rawRequest?.swapShiftRequestID;
      const userShiftID = Number(
        rawRequest?.userShiftID ??
        rawRequest?.userShiftId ??
        rawRequest?.user_shift_id
      );
      const assignment = this.allAssignmentsByID[userShiftID];
      if (!id || !assignment) return null;

      const shift = this.shiftsByID[assignment.shiftID];
      if (!shift) return null;

      const authorID = this.normalizeUserID(assignment.userID);
      const author = this.departmentWorkersByID[authorID];
      const position = this.positionsByID[shift.positionID] || {};

      return {
        id,
        status: this.normalizeRequestStatus(rawRequest?.status),
        userShiftID,
        shiftID: shift.ID,
        shiftDate: shift.shift_date,
        startTime: this.toHHMM(shift.start_time),
        endTime: this.toHHMM(shift.end_time),
        positionID: shift.positionID || null,
        positionTitle: position.title || `Shift ${shift.ID}`,
        authorID,
        authorName: this.getDisplayName(author, authorID),
        reason: rawRequest?.reason || "",
        createdAt:
          rawRequest?.createdAt ||
          rawRequest?.created_at ||
          rawRequest?.updatedAt ||
          new Date().toISOString(),
      };
    },
    async getManagerDepartmentID() {
      if (!this.currentUserID) return null;

      const linksRes = await departmentUsersServices.getByUser(this.currentUserID);
      const links = this.extractArray(linksRes, ["departmentusers"]);
      const managerLink =
        links.find((link) => String(link.role || "").trim().toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },
    async loadManagerTradeBoard() {
      this.loading = true;
      this.error = "";

      try {
        this.managerDepartmentID = await this.getManagerDepartmentID();
        if (!this.managerDepartmentID) {
          this.error = "No department found for this manager.";
          this.tradePosts = [];
          return;
        }

        const [departmentLinksRes, scheduleRes] = await Promise.all([
          departmentUsersServices.getByDepartment(this.managerDepartmentID),
          scheduleServices.getAll({ departmentID: this.managerDepartmentID, type: "official", limit: 1 }),
        ]);

        const departmentLinks = this.extractArray(departmentLinksRes, ["departmentusers"]);
        const workerIDs = departmentLinks
          .filter((link) => String(link.role || "").trim().toLowerCase() === "worker")
          .map((link) => Number(link.userID ?? link.userId ?? link.UserID))
          .filter((id) => Number.isFinite(id) && id > 0);

        const workerResults = await Promise.allSettled(workerIDs.map((id) => userServices.get(id)));
        this.departmentWorkersByID = workerResults.reduce((acc, result, index) => {
          const fallbackID = workerIDs[index];
          if (result.status !== "fulfilled") {
            acc[fallbackID] = { ID: fallbackID, userID: fallbackID, name: `Worker ${fallbackID}` };
            return acc;
          }
          const worker = result.value;
          const id = this.normalizeUserID(worker?.ID ?? worker?.id ?? worker?.userID);
          if (id) acc[id] = { ...worker, ID: id };
          return acc;
        }, {});

        try {
          const positionsRes = await positionServices.getAll({ departmentID: this.managerDepartmentID, limit: 200 });
          const positions = this.extractArray(positionsRes, ["positions"]);
          this.positionsByID = positions.reduce((acc, position) => {
            const id = position.positionID ?? position.ID;
            if (id) acc[id] = position;
            return acc;
          }, {});
        } catch (error) {
          console.warn("Could not load positions for manager trade board:", error?.response?.data || error);
          this.positionsByID = {};
        }

        const schedules = this.extractArray(scheduleRes, ["schedules"]);
        this.officialSchedule = schedules[0] || null;
        if (!this.officialSchedule?.ID) {
          this.tradePosts = [];
          this.officialShifts = [];
          this.officialAssignmentsByShiftID = {};
          return;
        }

        const shiftsRes = await shiftServices.getAll({ scheduleID: this.officialSchedule.ID });
        this.officialShifts = this.extractArray(shiftsRes, ["shifts"]);

        const assignmentResults = await Promise.allSettled(
          this.officialShifts.map((shift) => userShiftServices.getAll({ shiftID: shift.ID }))
        );
        this.officialAssignmentsByShiftID = Object.fromEntries(
          this.officialShifts.map((shift, index) => {
            const result = assignmentResults[index];
            if (result?.status !== "fulfilled") return [shift.ID, []];
            return [shift.ID, this.extractArray(result.value, ["usershifts"])];
          })
        );

        const requestsRes = await swapShiftRequestServices.getAll();
        const requests = this.extractArray(requestsRes, [
          "swapshiftrequests",
          "swapShiftRequests",
          "requests",
        ]);
        this.tradePosts = requests
          .map((request) => this.normalizeSwapRequest(request))
          .filter(Boolean);
      } catch (error) {
        console.error("Failed to load manager trade board:", error?.response?.data || error);
        this.error = "Could not load trade requests.";
        this.tradePosts = [];
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.manager-trade-board {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(114, 21, 26, 0.08), transparent 28%),
    linear-gradient(180deg, #f7f7f8 0%, #eceff1 100%);
}

.trade-post {
  background: rgba(255, 255, 255, 0.92);
}

.post-note {
  line-height: 1.6;
}
</style>
