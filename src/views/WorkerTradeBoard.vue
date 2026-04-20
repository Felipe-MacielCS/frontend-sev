<template>
  <v-container fluid class="trade-board-page pa-6">
    <v-row class="mb-2" align="stretch">
      <v-col cols="12" md="4">
        <v-card elevation="2" class="mb-4 rounded-xl">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <div class="text-h5 font-weight-bold">Worker Trade Board</div>
            </div>
            <v-chip color="primary" variant="tonal">
              {{ openPostCount }} Active
            </v-chip>
          </v-card-title>

          <v-card-text>

            <div class="text-subtitle-2 font-weight-medium mb-2">Choose a Date</div>
            <v-text-field
              v-model="selectedTradeDate"
              type="date"
              label="Trade Date"
              variant="outlined"
              density="comfortable"
              :disabled="loading || !availableTradeDates.length"
              class="mb-4"
            />

            <v-select
              v-model="newRequest.shiftKey"
              :items="myAssignedShiftOptions"
              item-title="label"
              item-value="value"
              label="Shift to trade"
              variant="outlined"
              density="comfortable"
              :loading="loading"
              :disabled="loading || !myAssignedShiftOptions.length"
              class="mb-3"
            />

            <v-textarea
              v-model="newRequest.reason"
              label="Reason"
              variant="outlined"
              density="comfortable"
              rows="4"
              auto-grow
              class="mb-3"
            />

            <div v-if="selectedShiftToTrade" class="selected-shift mb-4">
              <div class="text-overline">Selected Shift</div>
              <div class="text-subtitle-2 font-weight-medium">
                {{ selectedShiftToTrade.positionTitle }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{ formatShiftDate(selectedShiftToTrade.shiftDate) }} |
                {{ formatTimeRange(selectedShiftToTrade.startTime, selectedShiftToTrade.endTime) }}
              </div>
            </div>

            <v-btn
              color="primary"
              block
              size="large"
              prepend-icon="mdi-plus"
              :loading="isSubmitting"
              :disabled="loading || !selectedShiftToTrade"
              @click="submitTradeRequest"
            >
              Post Trade Request
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card elevation="2" class="rounded-xl">
          <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-3">
            <div>
              <div class="text-h6 font-weight-bold">Shift Requests</div>
            </div>

            <div class="d-flex flex-wrap ga-2 align-center">
              <v-chip-group
                v-model="activeFilter"
                selected-class="text-primary"
                mandatory
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
            </div>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-4">
            <v-progress-linear
              v-if="loading"
              indeterminate
              color="primary"
              class="mb-4"
            />

            <div v-if="!loading && !visiblePosts.length" class="empty-state">
              <v-icon size="34" color="grey-darken-1" class="mb-2">
                mdi-swap-horizontal-circle-outline
              </v-icon>
              <div class="text-subtitle-1 font-weight-medium mb-1">
                No trade requests match this view.
              </div>
            </div>

            <v-row v-else class="mt-0">
              <v-col
                v-for="post in visiblePosts"
                :key="post.id"
                cols="12"
              >
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
                        Posted by {{ post.authorName }}
                      </v-chip>
                      <v-chip size="small" variant="outlined">
                        Posted {{ formatDateTime(post.createdAt) }}
                      </v-chip>
                    </div>

                    <div v-if="post.reason" class="text-body-2 mb-3 post-note">
                      {{ post.reason }}
                    </div>

                    <div
                      v-if="post.status === 'pending_approval' && post.responseCount"
                      class="text-body-2 text-medium-emphasis mb-3"
                    >
                      {{ pendingApprovalSummary(post) }}
                    </div>

                    <div
                      v-else-if="post.approvedResponderName"
                      class="text-body-2 text-medium-emphasis mb-3"
                    >
                      Approved for <strong>{{ post.approvedResponderName }}</strong>
                      on {{ formatDateTime(post.approvedAt || post.updatedAt) }}
                    </div>

                    <div
                      v-if="hasCurrentUserResponded(post) && post.status === 'pending_approval'"
                      class="text-body-2 text-warning-darken-2 mb-3"
                    >
                      You accepted this trade. It is waiting for manager approval.
                    </div>

                    <div class="d-flex flex-wrap ga-2">
                      <v-btn
                        v-if="canAcceptPost(post)"
                        color="primary"
                        prepend-icon="mdi-check"
                        @click="acceptTradeRequest(post)"
                      >
                        Accept For Approval
                      </v-btn>

                      <v-btn
                        v-if="isOwnPost(post) && ['open', 'pending_approval'].includes(post.status)"
                        color="error"
                        variant="outlined"
                        prepend-icon="mdi-close"
                        @click="cancelTradeRequest(post)"
                      >
                        Cancel Post
                      </v-btn>

                      <v-btn
                        v-if="isOwnPost(post) && post.status === 'cancelled'"
                        color="primary"
                        variant="outlined"
                        prepend-icon="mdi-refresh"
                        @click="reopenTradeRequest(post)"
                      >
                        Reopen
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3500"
      location="bottom right"
    >
      {{ snackbar.message }}
    </v-snackbar>
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
import { emitNotificationRefresh } from "../services/notificationSync.js";

export default {
  name: "WorkerTradeBoard",
  data() {
    return {
      loading: false,
      isSubmitting: false,
      currentUser: null,
      currentUserID: null,
      departmentID: null,
      officialSchedule: null,
      departmentWorkersByID: {},
      positionsByID: {},
      officialShifts: [],
      officialAssignmentsByShiftID: {},
      tradePosts: [],
      activeFilter: "open",
      search: "",
      selectedTradeDate: null,
      newRequest: {
        shiftKey: null,
        reason: "",
      },
      boardFilters: [
        { label: "Open", value: "open" },
        { label: "Awaiting Approval", value: "pending_approval" },
        { label: "All", value: "all" },
        { label: "Mine", value: "mine" },
        { label: "Accepted", value: "accepted" },
      ],
      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },
  computed: {
    myAssignedShifts() {
      return this.officialShifts
        .flatMap((shift) => {
          const assignments = this.officialAssignmentsByShiftID[shift.ID] || [];
          return assignments
            .filter((assignment) => Number(assignment.userID) === Number(this.currentUserID))
            .map((assignment) => {
              const startDate = new Date(`${shift.shift_date}T${this.toHHMM(shift.start_time)}:00`);
              const position = this.positionsByID[shift.positionID] || {};
              return {
                key: `${shift.ID}-${assignment.ID || assignment.userID}`,
                shiftID: shift.ID,
                assignmentID: assignment.ID || null,
                shiftDate: shift.shift_date,
                startTime: this.toHHMM(shift.start_time),
                endTime: this.toHHMM(shift.end_time),
                positionID: shift.positionID || null,
                positionTitle: position.title || `Position ${shift.positionID || ""}`.trim(),
                startsAt: startDate,
              };
            });
        })
        .filter((shift) => shift.startsAt instanceof Date && !Number.isNaN(shift.startsAt.getTime()))
        .sort((a, b) => a.startsAt - b.startsAt);
    },
    myAssignedShiftOptions() {
      return this.filteredAssignedShifts.map((shift) => ({
        value: shift.key,
        label: `${this.formatShiftDate(shift.shiftDate)} | ${this.formatTimeRange(shift.startTime, shift.endTime)} | ${shift.positionTitle}`,
      }));
    },
    availableTradeDates() {
      return [...new Set(this.myAssignedShifts.map((shift) => shift.shiftDate))].sort();
    },
    filteredAssignedShifts() {
      const selectedDate = this.normalizeDateValue(this.selectedTradeDate);
      if (!selectedDate) return [];
      return this.myAssignedShifts.filter((shift) => shift.shiftDate === selectedDate);
    },
    selectedShiftToTrade() {
      return this.filteredAssignedShifts.find((shift) => shift.key === this.newRequest.shiftKey) || null;
    },
    filteredTradePosts() {
      const term = String(this.search || "").trim().toLowerCase();
      const scopedPosts = this.tradePosts
        .filter((post) => {
          if (!this.departmentID) return true;
          return Number(post.departmentID) === Number(this.departmentID);
        })
        .filter((post) => {
          if (this.activeFilter === "open") {
            return post.status === "open" || post.status === "pending_approval";
          }
          if (this.activeFilter === "pending_approval") return post.status === "pending_approval";
          if (this.activeFilter === "mine") return Number(post.authorID) === Number(this.currentUserID);
          if (this.activeFilter === "accepted") return post.status === "accepted";
          return true;
        });

      const searchedPosts = term
        ? scopedPosts.filter((post) =>
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
        : scopedPosts;

      return searchedPosts.sort((a, b) => {
        const order = { open: 0, pending_approval: 1, accepted: 2, cancelled: 3 };
        const statusCompare = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        if (statusCompare !== 0) return statusCompare;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    },
    visiblePosts() {
      return this.filteredTradePosts;
    },
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
    openPostCount() {
      return this.tradePosts.filter(
        (post) =>
          (post.status === "open" || post.status === "pending_approval") &&
          (!this.departmentID || Number(post.departmentID) === Number(this.departmentID))
      ).length;
    },
    acceptedPostCount() {
      return this.tradePosts.filter(
        (post) =>
          post.status === "accepted" &&
          (!this.departmentID || Number(post.departmentID) === Number(this.departmentID))
      ).length;
    },
    myPostCount() {
      return this.tradePosts.filter(
        (post) =>
          Number(post.authorID) === Number(this.currentUserID) &&
          (!this.departmentID || Number(post.departmentID) === Number(this.departmentID))
      ).length;
    },
    myOpenPostCount() {
      return this.tradePosts.filter(
        (post) =>
          Number(post.authorID) === Number(this.currentUserID) &&
          post.status === "open" &&
          (!this.departmentID || Number(post.departmentID) === Number(this.departmentID))
      ).length;
    },
  },
  async mounted() {
    this.currentUser = this.getCurrentUser();
    this.currentUserID = this.normalizeUserID(
      this.currentUser?.userID ?? this.currentUser?.ID ?? this.currentUser?.id
    );
    await this.loadTradeBoardData();
  },
  watch: {
    myAssignedShifts: {
      immediate: true,
      handler(shifts) {
        this.syncSelectedTradeDate(shifts);
      },
    },
    selectedTradeDate() {
      const normalizedDate = this.normalizeDateValue(this.selectedTradeDate);
      if (normalizedDate !== this.selectedTradeDate) {
        this.selectedTradeDate = normalizedDate;
        return;
      }

      if (!this.filteredAssignedShifts.some((shift) => shift.key === this.newRequest.shiftKey)) {
        this.newRequest.shiftKey = null;
      }
    },
  },
  methods: {
    showSnackbar(message, color = "success") {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
    getCurrentUser() {
      const stored = Utils.getStore("user");
      return stored?.user ?? stored ?? null;
    },
    normalizeUserID(raw) {
      const id = Number(raw);
      return Number.isFinite(id) && id > 0 ? id : null;
    },
    normalizeDateValue(value) {
      if (!value) return null;
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
      }
      const normalized = String(value).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
    },
    isTradeDateSelectable(value) {
      return this.availableTradeDates.includes(this.normalizeDateValue(value));
    },
    syncSelectedTradeDate(shifts = this.myAssignedShifts) {
      const availableDates = [...new Set((shifts || []).map((shift) => shift.shiftDate))].sort();

      if (!availableDates.length) {
        this.selectedTradeDate = null;
        this.newRequest.shiftKey = null;
        return;
      }

      const selectedDate = this.normalizeDateValue(this.selectedTradeDate);

      if (!selectedDate || !availableDates.includes(selectedDate)) {
        this.selectedTradeDate = availableDates[0];
        return;
      }

      if (!shifts.some((shift) => shift.key === this.newRequest.shiftKey && shift.shiftDate === selectedDate)) {
        this.newRequest.shiftKey = null;
      }
    },
    toHHMM(value) {
      if (!value) return "00:00";
      return String(value).slice(0, 5);
    },
    extractArray(response, keys = []) {
      if (Array.isArray(response)) return response;
      for (const key of keys) {
        if (Array.isArray(response?.[key])) return response[key];
      }
      if (Array.isArray(response?.data)) return response.data;
      return [];
    },
    getDisplayName(user, fallbackID = "") {
      if (!user) return fallbackID ? `Worker ${fallbackID}` : "Worker";
      if (String(user.name || "").trim()) return String(user.name).trim();
      const first = String(user.firstName || user.firstname || "").trim();
      const last = String(user.lastName || user.lastname || "").trim();
      const fullName = `${first} ${last}`.trim();
      if (fullName) return fullName;
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
    isOwnPost(post) {
      return Number(post.authorID) === Number(this.currentUserID);
    },
    hasCurrentUserResponded(post) {
      return (post.responses || []).some(
        (response) => Number(response.responderUserID) === Number(this.currentUserID)
      );
    },
    canAcceptPost(post) {
      return (
        ["open", "pending_approval"].includes(post.status) &&
        !this.isOwnPost(post) &&
        !this.hasCurrentUserResponded(post)
      );
    },
    statusColor(status) {
      if (status === "pending_approval") return "warning";
      if (status === "accepted") return "success";
      if (status === "cancelled") return "grey";
      return "primary";
    },
    statusLabel(status) {
      if (status === "pending_approval") return "Awaiting Approval";
      if (status === "accepted") return "Accepted";
      if (status === "cancelled") return "Cancelled";
      return "Open";
    },
    normalizeRequestStatus(value) {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "accepted" || normalized === "approved") return "accepted";
      if (
        normalized === "pending approval" ||
        normalized === "pending_approval" ||
        normalized === "needs approval"
      ) {
        return "pending_approval";
      }
      if (normalized === "cancelled" || normalized === "canceled" || normalized === "denied") {
        return "cancelled";
      }
      return "open";
    },
    normalizeResponse(rawResponse) {
      const responderID = this.normalizeUserID(
        rawResponse?.responderUserID ??
          rawResponse?.responderUserId ??
          rawResponse?.userID ??
          rawResponse?.userId ??
          rawResponse?.responder?.ID ??
          rawResponse?.responder?.id
      );
      const responder =
        rawResponse?.responder ||
        (responderID ? this.departmentWorkersByID[responderID] : null) ||
        null;

      return {
        id: rawResponse?.ID ?? rawResponse?.id ?? null,
        responderUserID: responderID,
        responderName: this.getDisplayName(responder, responderID),
        status: String(rawResponse?.status || "Pending"),
        respondedAt:
          rawResponse?.createdAt ||
          rawResponse?.created_at ||
          rawResponse?.updatedAt ||
          rawResponse?.updated_at ||
          null,
      };
    },
    pendingApprovalSummary(post) {
      if (!post.responseCount) return "Waiting for workers to accept this trade request.";

      if (post.responseCount === 1) {
        return `Accepted by ${post.firstResponderName} on ${this.formatDateTime(post.firstRespondedAt)}. Waiting for manager approval.`;
      }

      return `${post.responseCount} workers accepted this trade. ${post.firstResponderName} was first on ${this.formatDateTime(post.firstRespondedAt)}. Waiting for manager approval.`;
    },
    normalizeSwapRequest(rawRequest) {
      const id = rawRequest?.ID ?? rawRequest?.id ?? rawRequest?.swapShiftRequestID;
      const requestAssignment =
        rawRequest?.userShift ||
        rawRequest?.usershift ||
        rawRequest?.UserShift ||
        null;
      const userShiftID = Number(
        rawRequest?.userShiftID ??
        requestAssignment?.ID ??
        rawRequest?.userShiftId ??
        rawRequest?.user_shift_id
      );
      const assignment = this.allAssignmentsByID[userShiftID] || requestAssignment || null;
      if (!id || !userShiftID) return null;

      const shiftID = assignment?.shiftID ?? rawRequest?.shiftID ?? rawRequest?.shiftId ?? null;
      const shift = this.shiftsByID[shiftID] || null;

      const authorID = this.normalizeUserID(
        assignment?.userID ?? rawRequest?.userID ?? rawRequest?.authorID ?? this.currentUserID
      );
      const author = this.departmentWorkersByID[authorID];
      const positionID = shift?.positionID ?? rawRequest?.positionID ?? null;
      const position = this.positionsByID[positionID] || {};
      const responses = this.extractArray(rawRequest?.responses || rawRequest?.swapShiftResponses || [], [])
        .map((response) => this.normalizeResponse(response))
        .filter((response) => response.responderUserID)
        .sort((a, b) => new Date(a.respondedAt || 0) - new Date(b.respondedAt || 0));
      const approvedResponse =
        responses.find((response) => String(response.status || "").trim().toLowerCase() === "approved") ||
        null;
      const firstResponse = responses[0] || null;

      return {
        id,
        departmentID: this.departmentID,
        backendStatus: rawRequest?.status || "Pending",
        status: this.normalizeRequestStatus(rawRequest?.status),
        userShiftID,
        shiftID: shift?.ID ?? shiftID ?? null,
        shiftDate: shift?.shift_date || rawRequest?.shiftDate || "",
        startTime: this.toHHMM(shift?.start_time || rawRequest?.startTime || ""),
        endTime: this.toHHMM(shift?.end_time || rawRequest?.endTime || ""),
        positionID: positionID || null,
        positionTitle: position.title || (shift?.ID ? `Shift ${shift.ID}` : "Shift Request"),
        authorID,
        authorName: this.getDisplayName(author, authorID || this.currentUserID),
        reason: rawRequest?.reason || "",
        responses,
        responseCount: responses.length,
        firstResponderID: firstResponse?.responderUserID || null,
        firstResponderName: firstResponse?.responderName || "",
        firstRespondedAt: firstResponse?.respondedAt || null,
        approvedResponderID: approvedResponse?.responderUserID || null,
        approvedResponderName: approvedResponse?.responderName || "",
        approvedAt: approvedResponse?.respondedAt || null,
        createdAt:
          rawRequest?.createdAt ||
          rawRequest?.created_at ||
          rawRequest?.updatedAt ||
          new Date().toISOString(),
        updatedAt: rawRequest?.updatedAt || rawRequest?.updated_at || null,
      };
    },
    async loadTradeRequests() {
      try {
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
        console.error("Failed to load swap shift requests:", error?.response?.data || error);
        this.tradePosts = [];
        this.showSnackbar("Could not load shift trade requests.", "error");
      }
    },
    async getWorkerDepartmentID() {
      if (!this.currentUserID) return null;

      const linksRes = await departmentUsersServices.getByUser(this.currentUserID);
      const links = this.extractArray(linksRes, ["departmentusers"]);
      const workerLink =
        links.find((link) => String(link.role || "").trim().toLowerCase() === "worker") || links[0];

      return workerLink?.departmentID ?? null;
    },
    async loadTradeBoardData() {
      if (!this.currentUserID) {
        this.showSnackbar("Could not determine the logged-in worker.", "error");
        return;
      }

      this.loading = true;
      try {
        this.departmentID = await this.getWorkerDepartmentID();
        if (!this.departmentID) {
          this.officialSchedule = null;
          this.officialShifts = [];
          this.officialAssignmentsByShiftID = {};
          return;
        }

        const [departmentLinksRes, scheduleRes] = await Promise.all([
          departmentUsersServices.getByDepartment(this.departmentID),
          scheduleServices.getAll({ departmentID: this.departmentID, type: "official", limit: 1 }),
        ]);

        const departmentLinks = this.extractArray(departmentLinksRes, ["departmentusers"]);
        const workerIDs = departmentLinks
          .filter((link) => String(link.role || "").trim().toLowerCase() === "worker")
          .map((link) => Number(link.userID ?? link.userId ?? link.UserID))
          .filter((id) => Number.isFinite(id) && id > 0);

        const workerProfileResults = await Promise.allSettled(workerIDs.map((id) => userServices.get(id)));
        this.departmentWorkersByID = workerProfileResults.reduce((acc, result, index) => {
          if (result.status !== "fulfilled") {
            const fallbackID = workerIDs[index];
            acc[fallbackID] = { ID: fallbackID, userID: fallbackID, name: `Worker ${fallbackID}` };
            return acc;
          }

          const worker = result.value;
          const id = this.normalizeUserID(worker?.ID ?? worker?.id ?? worker?.userID);
          if (id) acc[id] = { ...worker, ID: id };
          return acc;
        }, {});

        try {
          const positionsRes = await positionServices.getAll({ departmentID: this.departmentID, limit: 200 });
          const positions = this.extractArray(positionsRes, ["positions"]);
          this.positionsByID = positions.reduce((acc, position) => {
            const id = position.positionID ?? position.ID;
            if (id) acc[id] = position;
            return acc;
          }, {});
        } catch (error) {
          console.warn("Could not load positions for trade board:", error?.response?.data || error);
          this.positionsByID = {};
        }

        const schedules = this.extractArray(scheduleRes, ["schedules"]);
        this.officialSchedule = schedules[0] || null;

        if (!this.officialSchedule?.ID) {
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
            if (result?.status !== "fulfilled") {
              console.warn(
                `Could not load assignments for shift ${shift.ID}:`,
                result?.reason?.response?.data || result?.reason || result
              );
              return [shift.ID, []];
            }

            return [shift.ID, this.extractArray(result.value, ["usershifts"])];
          })
        );
        await this.loadTradeRequests();
      } catch (error) {
        console.error("Failed to load worker trade board data:", error?.response?.data || error);
        this.showSnackbar("Could not load trade board data.", "error");
        this.departmentWorkersByID = {};
        this.positionsByID = {};
        this.officialShifts = [];
        this.officialAssignmentsByShiftID = {};
      } finally {
        this.loading = false;
      }
    },
    async submitTradeRequest() {
      if (!this.selectedShiftToTrade) {
        this.showSnackbar("Select one of your shifts first.", "error");
        return;
      }

      const alreadyOpen = this.tradePosts.some(
        (post) =>
          Number(post.authorID) === Number(this.currentUserID) &&
          Number(post.shiftID) === Number(this.selectedShiftToTrade.shiftID) &&
          ["open", "pending_approval"].includes(post.status)
      );

      if (alreadyOpen) {
        this.showSnackbar("You already posted an active request for that shift.", "warning");
        return;
      }

      this.isSubmitting = true;
      try {
        await swapShiftRequestServices.create({
          userShiftID: this.selectedShiftToTrade.assignmentID,
          status: "Pending",
          reason: String(this.newRequest.reason || "").trim(),
        });

        try {
          await this.loadTradeRequests();
        } catch (refreshError) {
          console.error("Trade request posted, but trade list refresh failed:", refreshError);
        }

        this.newRequest = {
          shiftKey: null,
          reason: "",
        };
        this.activeFilter = "open";
        emitNotificationRefresh();
        this.showSnackbar("Trade request posted.");
      } catch (error) {
        console.error("Could not create swap shift request:", error?.response?.data || error);
        this.showSnackbar("Could not post trade request.", "error");
      } finally {
        this.isSubmitting = false;
      }
    },
    async acceptTradeRequest(post) {
      if (!this.canAcceptPost(post)) return;

      try {
        await swapShiftRequestServices.update(post.id, { status: "Accepted" });
        await this.loadTradeBoardData();
        emitNotificationRefresh();
        this.showSnackbar("Trade request sent to the manager for approval.");
      } catch (error) {
        console.error("Could not accept swap shift request:", error?.response?.data || error);
        this.showSnackbar("Could not accept trade request.", "error");
      }
    },
    async cancelTradeRequest(post) {
      if (!this.isOwnPost(post) || !["open", "pending_approval"].includes(post.status)) return;

      try {
        await swapShiftRequestServices.update(post.id, { status: "Cancelled" });
        await this.loadTradeRequests();
        emitNotificationRefresh();
        this.showSnackbar("Trade request cancelled.");
      } catch (error) {
        console.error("Could not cancel swap shift request:", error?.response?.data || error);
        this.showSnackbar("Could not cancel trade request.", "error");
      }
    },
    async reopenTradeRequest(post) {
      if (!this.isOwnPost(post) || post.status !== "cancelled") return;

      try {
        await swapShiftRequestServices.update(post.id, { status: "Pending" });
        await this.loadTradeRequests();
        emitNotificationRefresh();
        this.showSnackbar("Trade request reopened.");
      } catch (error) {
        console.error("Could not reopen swap shift request:", error?.response?.data || error);
        this.showSnackbar("Could not reopen trade request.", "error");
      }
    },
  },
};
</script>

<style scoped>
.trade-board-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(114, 21, 26, 0.08), transparent 28%),
    linear-gradient(180deg, #f7f7f8 0%, #eceff1 100%);
}

.selected-shift {
  border: 1px solid rgba(114, 21, 26, 0.15);
  border-radius: 16px;
  padding: 14px 16px;
  background: rgba(114, 21, 26, 0.04);
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.summary-row:last-child {
  border-bottom: none;
}

.board-search {
  width: 220px;
  max-width: 100%;
}

.empty-state {
  border: 1px dashed rgba(0, 0, 0, 0.14);
  border-radius: 18px;
  padding: 48px 24px;
  text-align: center;
  background: rgba(255, 255, 255, 0.72);
}

.trade-post {
  background: rgba(255, 255, 255, 0.9);
}

.post-note {
  line-height: 1.6;
}
</style>
