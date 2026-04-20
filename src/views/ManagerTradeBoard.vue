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

          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card elevation="2" class="rounded-xl">
          <v-card-title class="d-flex align-center justify-space-between ga-3 flex-wrap">
            <div>
              <div class="text-h6 font-weight-bold">Manager Trade Board</div>
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

            <v-row v-if="visiblePosts.length">
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
                        Posted by {{ post.authorName }}
                      </v-chip>
                      <v-chip size="small" variant="outlined">
                        Posted {{ formatDateTime(post.createdAt) }}
                      </v-chip>
                    </div>

                    <div v-if="post.reason" class="text-body-2 mb-3 post-note">
                      {{ post.reason }}
                    </div>

                    <div class="candidate-section">
                      <div class="d-flex align-center justify-space-between ga-3 mb-2 flex-wrap">
                        <div class="text-subtitle-2 font-weight-bold">
                          Assignment Decision
                        </div>
                        <div
                          v-if="post.firstResponderName"
                          class="text-body-2 text-medium-emphasis"
                        >
                          First accepted: <strong>{{ post.firstResponderName }}</strong>
                        </div>
                      </div>

                      <div class="d-flex flex-wrap ga-3 align-end mb-4">
                        <v-select
                          :model-value="selectedCandidateByRequest[post.id] ?? null"
                          :items="candidateOptions(post)"
                          item-title="label"
                          item-value="value"
                          label="Assign this shift to"
                          variant="outlined"
                          density="comfortable"
                          hide-details
                          class="candidate-select"
                          @update:model-value="setSelectedCandidate(post.id, $event)"
                        />

                        <v-btn
                          color="primary"
                          prepend-icon="mdi-account-check"
                          :disabled="!selectedCandidateByRequest[post.id] || post.status === 'cancelled'"
                          @click="approveSelectedCandidate(post)"
                        >
                          Assign Selected Person
                        </v-btn>
                      </div>

                      <div v-if="post.responses.length" class="d-flex flex-column ga-3">
                        <div class="text-body-2 text-medium-emphasis">
                          Accepted responses are shown below for reference.
                        </div>

                        <v-card
                          v-for="response in post.responses"
                          :key="`${post.id}-${response.responderUserID}`"
                          variant="tonal"
                          class="candidate-card"
                        >
                          <v-card-text class="py-3">
                            <div class="d-flex flex-wrap align-center justify-space-between ga-3">
                              <div>
                                <div class="text-subtitle-2 font-weight-medium">
                                  {{ response.responderName }}
                                </div>
                                <div class="text-body-2 text-medium-emphasis">
                                  Accepted {{ formatDateTime(response.respondedAt) }}
                                </div>
                              </div>

                              <div class="d-flex flex-wrap ga-2 align-center">
                                <v-chip
                                  v-if="post.firstResponderID === response.responderUserID"
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                >
                                  First Accepted
                                </v-chip>

                                <v-chip
                                  v-if="post.approvedResponderID === response.responderUserID"
                                  size="small"
                                  color="success"
                                  variant="tonal"
                                >
                                  Approved
                                </v-chip>

                                <v-btn
                                  v-if="canQuickSelectResponse(post, response)"
                                  color="primary"
                                  size="small"
                                  variant="outlined"
                                  prepend-icon="mdi-cursor-default-click-outline"
                                  @click="selectResponseCandidate(post, response)"
                                >
                                  Select
                                </v-btn>
                              </div>
                            </div>
                          </v-card-text>
                        </v-card>
                      </div>
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
  name: "ManagerTradeBoard",
  data() {
    return {
      loading: false,
      error: "",
      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
      currentUser: null,
      currentUserID: null,
      managerDepartmentID: null,
      officialSchedule: null,
      departmentMembersByID: {},
      positionsByID: {},
      officialShifts: [],
      officialAssignmentsByShiftID: {},
      tradePosts: [],
      selectedCandidateByRequest: {},
      search: "",
      activeFilter: "needs_approval",
      boardFilters: [
        { label: "Needs Approval", value: "needs_approval" },
        { label: "All", value: "all" },
        { label: "Accepted", value: "accepted" },
        { label: "Cancelled", value: "cancelled" },
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
        if (this.activeFilter === "needs_approval") {
          return post.status === "pending_approval" || post.status === "open";
        }
        if (this.activeFilter === "accepted") return post.status === "accepted";
        if (this.activeFilter === "cancelled") return post.status === "cancelled";
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
              ...post.responses.map((response) => response.responderName),
            ]
              .join(" ")
              .toLowerCase()
              .includes(term)
          )
        : statusFiltered;

      return searched.sort((a, b) => {
        const order = { pending_approval: 0, open: 1, accepted: 2, cancelled: 3 };
        const statusCompare = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        if (statusCompare !== 0) return statusCompare;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
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
        (responderID ? this.departmentMembersByID[responderID] : null) ||
        null;

      return {
        id: rawResponse?.ID ?? rawResponse?.id ?? null,
        responderUserID: responderID,
        responderName: this.getDisplayName(responder, responderID),
        responderRole: String(responder?.departmentRole || responder?.role || "").trim(),
        status: String(rawResponse?.status || "Pending"),
        respondedAt:
          rawResponse?.createdAt ||
          rawResponse?.created_at ||
          rawResponse?.updatedAt ||
          rawResponse?.updated_at ||
          null,
      };
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
        assignment?.userID ?? rawRequest?.userID ?? rawRequest?.authorID ?? null
      );
      const author = this.departmentMembersByID[authorID];
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
        status: this.normalizeRequestStatus(rawRequest?.status),
        userShiftID,
        shiftID: shift?.ID ?? shiftID ?? null,
        shiftDate: shift?.shift_date || rawRequest?.shiftDate || "",
        startTime: this.toHHMM(shift?.start_time || rawRequest?.startTime || ""),
        endTime: this.toHHMM(shift?.end_time || rawRequest?.endTime || ""),
        positionID: positionID || null,
        positionTitle: position.title || (shift?.ID ? `Shift ${shift.ID}` : "Shift Request"),
        authorID,
        authorName: this.getDisplayName(author, authorID),
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
      };
    },
    candidateOptions(post) {
      return Object.values(this.departmentMembersByID)
        .filter((member) => Number(member.ID) !== Number(post.authorID))
        .map((member) => {
          const departmentRole = String(member.departmentRole || member.role || "Worker").trim();
          return {
            value: member.ID,
            label: `${this.getDisplayName(member, member.ID)} (${departmentRole})`,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    setSelectedCandidate(requestID, userID) {
      this.selectedCandidateByRequest = {
        ...this.selectedCandidateByRequest,
        [requestID]: userID ? Number(userID) : null,
      };
    },
    selectResponseCandidate(post, response) {
      this.setSelectedCandidate(post.id, response.responderUserID);
    },
    canQuickSelectResponse(post, response) {
      return (
        post.status !== "accepted" &&
        post.status !== "cancelled" &&
        Number(this.selectedCandidateByRequest[post.id] ?? 0) !== Number(response.responderUserID)
      );
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
        const eligibleLinks = departmentLinks.filter((link) =>
          ["worker", "manager"].includes(String(link.role || "").trim().toLowerCase())
        );
        const memberIDs = eligibleLinks
          .map((link) => Number(link.userID ?? link.userId ?? link.UserID))
          .filter((id) => Number.isFinite(id) && id > 0);

        const memberResults = await Promise.allSettled(memberIDs.map((id) => userServices.get(id)));
        this.departmentMembersByID = memberResults.reduce((acc, result, index) => {
          const fallbackID = memberIDs[index];
          const fallbackLink = eligibleLinks[index];
          const departmentRole = String(fallbackLink?.role || "").trim() || "Worker";
          if (result.status !== "fulfilled") {
            acc[fallbackID] = {
              ID: fallbackID,
              userID: fallbackID,
              name: `User ${fallbackID}`,
              role: departmentRole,
              departmentRole,
            };
            return acc;
          }
          const member = result.value;
          const id = this.normalizeUserID(member?.ID ?? member?.id ?? member?.userID);
          if (id) {
            acc[id] = {
              ...member,
              ID: id,
              role: member?.role || departmentRole,
              departmentRole,
            };
          }
          return acc;
        }, {});

        try {
          const positionsRes = await positionServices.getAll({
            departmentID: this.managerDepartmentID,
            limit: 200,
          });
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
          .filter((post) => post && this.departmentMembersByID[post.authorID]);
        this.selectedCandidateByRequest = this.tradePosts.reduce((acc, post) => {
          const defaultCandidate =
            post.approvedResponderID ||
            post.firstResponderID ||
            this.candidateOptions(post)[0]?.value ||
            null;
          acc[post.id] = defaultCandidate;
          return acc;
        }, {});
      } catch (error) {
        console.error("Failed to load manager trade board:", error?.response?.data || error);
        this.error = "Could not load trade requests.";
        this.tradePosts = [];
      } finally {
        this.loading = false;
      }
    },
    async approveSelectedCandidate(post) {
      const approvedUserID = Number(this.selectedCandidateByRequest[post.id]);
      if (!approvedUserID || post.status === "cancelled") return;

      const selectedMember = this.departmentMembersByID[approvedUserID];
      const selectedName = this.getDisplayName(selectedMember, approvedUserID);

      try {
        await swapShiftRequestServices.update(post.id, {
          status: "Accepted",
          approvedUserID,
        });
        await this.loadManagerTradeBoard();
        emitNotificationRefresh();
        this.showSnackbar(`${selectedName} was assigned to the trade request.`);
      } catch (error) {
        console.error("Failed to approve trade response:", error?.response?.data || error);
        this.showSnackbar("Could not assign that person to the trade request.", "error");
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

.candidate-section {
  border-top: 1px solid rgba(114, 21, 26, 0.12);
  padding-top: 16px;
}

.candidate-card {
  background: rgba(114, 21, 26, 0.04);
}

.candidate-select {
  min-width: 280px;
  flex: 1 1 320px;
}

.post-note {
  line-height: 1.6;
}
</style>
