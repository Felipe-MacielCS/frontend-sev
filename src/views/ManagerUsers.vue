<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-card class="pa-4" elevation="2">
      <div class="d-flex justify-space-between align-start mb-4">
        <div>
          <h2 class="text-h6 font-weight-bold mb-3">Workers</h2>

          <v-btn
            color="#8b1e1e"
            class="text-white"
            elevation="0"
            @click="openManagePositionsDialog()"
          >
            Manage Positions
          </v-btn>
        </div>

        <v-text-field
          v-model="search"
          label="Search workers"
          variant="solo"
          density="compact"
          hide-details
          style="max-width: 320px;"
        />
      </div>

      <v-table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Positions</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="w in filteredWorkers" :key="w.ID">
            <td>{{ w.name }}</td>
            <td style="min-width: 260px;">
              <div v-if="getWorkerPositionNames(w).length">
                {{ getWorkerPositionNames(w).join(", ") }}
              </div>
              <div v-else class="text-medium-emphasis">
                None assigned
              </div>
            </td>
            <td>{{ w.status }}</td>
            <td>
              <div class="d-flex align-center ga-2">
                <v-btn
                  size="small"
                  variant="text"
                  icon="mdi-pencil"
                  @click="openEditUserDialog(w)"
                />
                <v-btn
                  size="small"
                  color="#8b1e1e"
                  class="text-white"
                  elevation="0"
                  @click="viewUser(w)"
                >
                  View
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- View Worker Dialog -->
      <v-dialog v-model="viewDialog.open" max-width="1000">
        <v-card class="pa-4 d-flex flex-column" style="height: 85vh;">
          <!-- Header -->
          <div class="d-flex align-center justify-space-between mb-2">
            <h3 class="text-h6 font-weight-bold">
              {{ viewDialog.user?.name || "Worker" }}
            </h3>
            <v-btn icon="mdi-close" variant="text" @click="closeViewDialog" />
          </div>

          <!-- Tabs -->
          <v-tabs v-model="viewDialog.tab" color="primary" class="manager-user-tabs">
            <v-tab value="info">Info</v-tab>
            <v-tab value="calendar">Calendar</v-tab>
            <v-tab value="clock-history">Clock History</v-tab>
          </v-tabs>

          <!-- Body -->
          <div class="flex-grow-1 pt-3 manager-user-dialog-body">
            <v-window v-model="viewDialog.tab" class="manager-user-window">
              <!-- Info tab -->
              <v-window-item value="info">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-card class="pa-4" variant="tonal">
                      <div class="text-subtitle-2 font-weight-bold mb-2">User Details</div>
                      <div class="mb-2"><b>Name:</b> {{ viewDialog.user?.name }}</div>
                      <div class="mb-2">
                        <b>Positions:</b>
                        {{ getWorkerPositionNames(viewDialog.user).length ? getWorkerPositionNames(viewDialog.user).join(", ") : "None assigned" }}
                      </div>
                      <div class="mb-2"><b>Email:</b> {{ viewDialog.user?.email }}</div>
                      <div class="mb-2"><b>Phone:</b> {{ viewDialog.user?.phone || "N/A" }}</div>
                      <div class="mb-2"><b>Status:</b> {{ viewDialog.user?.status || "N/A" }}</div>
                    </v-card>
                  </v-col>
                </v-row>
              </v-window-item>

              <!-- Calendar tab -->
              <v-window-item value="calendar">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="d-flex align-center ga-4">
                    <v-checkbox
                      v-model="calendarFilters.showUnavailability"
                      label="Unavailability"
                      density="compact"
                      hide-details
                    />
                    <v-checkbox
                      v-model="calendarFilters.showShifts"
                      label="Shifts"
                      density="compact"
                      hide-details
                    />
                  </div>

                  <v-btn variant="text" @click="reloadUserCalendarData">Refresh</v-btn>
                </div>

                <div>
                  <UserCalendar
                    ref="userCalendar"
                    :events="filteredUserCalendarEvents"
                    initialView="timeGridWeek"
                    :isEditable="false"
                    :isSelectable="false"
                  />
                </div>

              </v-window-item>

              <v-window-item value="clock-history">
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="text-subtitle-2 font-weight-bold">Clock History</div>
                  <v-btn variant="text" :loading="clockHistory.loading" @click="reloadClockHistoryForDialog('view')">
                    Refresh
                  </v-btn>
                </div>

                <div v-if="clockHistory.records.length" class="clock-history-table-wrap">
                  <v-table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Shift</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Time Worked</th>
                        <th class="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="record in clockHistory.records" :key="record.id">
                        <td>{{ record.shiftDate }}</td>
                        <td>{{ record.shiftLabel }}</td>
                        <td>{{ record.clockInTime ? formatClockDateTime(record.clockInTime) : "-" }}</td>
                        <td>{{ record.isMissingLog ? "-" : record.clockOutTime ? formatClockDateTime(record.clockOutTime) : "Active" }}</td>
                        <td>{{ formatWorkedDuration(record.clockInTime, record.clockOutTime) }}</td>
                        <td class="text-right">
                          <v-btn
                            size="small"
                            color="#8b1e1e"
                            prepend-icon="mdi-pencil"
                            class="clock-edit-btn text-white"
                            @click="openClockCorrectionDialog(record)"
                          >
                            {{ record.isMissingLog ? "Add Log" : "Edit" }}
                          </v-btn>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </v-window-item>
            </v-window>
          </div>

          <!-- Footer -->
          <div class="d-flex justify-end mt-2">
            <v-btn variant="text" @click="closeViewDialog">Close</v-btn>
          </div>
        </v-card>
      </v-dialog>

  <v-dialog v-model="editDialog.open" max-width="1000">
    <v-card class="pa-4 d-flex flex-column" style="height: 85vh;">
      <div class="d-flex align-center justify-space-between mb-2">
        <h3 class="text-h6 font-weight-bold">
          {{ editDialog.user?.name || "Worker" }}
        </h3>
        <v-btn icon="mdi-close" variant="text" @click="closeEditUserDialog" />
      </div>

      <v-tabs v-model="editDialog.tab" color="primary" class="manager-user-tabs">
        <v-tab value="info">Info</v-tab>
        <v-tab value="calendar">Calendar</v-tab>
        <v-tab value="clock-history">Clock History</v-tab>
      </v-tabs>

      <div class="flex-grow-1 pt-3 manager-user-dialog-body">
        <v-window v-model="editDialog.tab" class="manager-user-window">
          <v-window-item value="info">
            <v-card class="pa-4 edit-user-details-card" variant="tonal">
              <div class="text-subtitle-2 font-weight-bold mb-4">User Details</div>

              <div class="mb-3"><b>Name:</b> {{ editDialog.user?.name }}</div>
              <div class="mb-3"><b>Email:</b> {{ editDialog.user?.email }}</div>
              <div class="mb-4"><b>Phone:</b> {{ editDialog.user?.phone || "N/A" }}</div>

              <div class="d-flex align-center justify-space-between mb-4">
                <div class="font-weight-medium">Status</div>
                <v-radio-group
                  v-model="editDialog.form.status"
                  inline
                  hide-details
                  color="#8b1e1e"
                >
                  <v-radio label="Active" value="active" />
                  <v-radio label="Inactive" value="inactive" />
                </v-radio-group>
              </div>

              <div class="font-weight-medium mb-2">Positions</div>
              <div class="edit-position-list">
                <v-checkbox
                  v-for="position in availablePositions"
                  :key="getPositionId(position)"
                  v-model="editDialog.form.positionIDs"
                  :label="position.title || `Position ${getPositionId(position)}`"
                  :value="getPositionId(position)"
                  density="compact"
                  hide-details
                />
              </div>
            </v-card>
          </v-window-item>

          <v-window-item value="calendar">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center ga-4">
                <v-checkbox
                  v-model="calendarFilters.showUnavailability"
                  label="Unavailability"
                  density="compact"
                  hide-details
                />
                <v-checkbox
                  v-model="calendarFilters.showShifts"
                  label="Shifts"
                  density="compact"
                  hide-details
                />
              </div>

              <v-btn variant="text" @click="reloadEditUserCalendarData">Refresh</v-btn>
            </div>

            <UserCalendar
              ref="editUserCalendar"
              :events="filteredUserCalendarEvents"
              initialView="timeGridWeek"
              :isEditable="false"
              :isSelectable="false"
            />

          </v-window-item>

          <v-window-item value="clock-history">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-subtitle-2 font-weight-bold">Clock History</div>
              <v-btn variant="text" :loading="clockHistory.loading" @click="reloadClockHistoryForDialog('edit')">
                Refresh
              </v-btn>
            </div>

            <div v-if="clockHistory.records.length" class="clock-history-table-wrap">
              <v-table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Time Worked</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in clockHistory.records" :key="record.id">
                    <td>{{ record.shiftDate }}</td>
                    <td>{{ record.shiftLabel }}</td>
                    <td>{{ record.clockInTime ? formatClockDateTime(record.clockInTime) : "-" }}</td>
                    <td>{{ record.isMissingLog ? "-" : record.clockOutTime ? formatClockDateTime(record.clockOutTime) : "Active" }}</td>
                    <td>{{ formatWorkedDuration(record.clockInTime, record.clockOutTime) }}</td>
                    <td class="text-right">
                      <v-btn
                        size="small"
                        color="#8b1e1e"
                        prepend-icon="mdi-pencil"
                        class="clock-edit-btn text-white"
                        @click="openClockCorrectionDialog(record)"
                      >
                        {{ record.isMissingLog ? "Add Log" : "Edit" }}
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-window-item>
        </v-window>
      </div>

      <div class="d-flex justify-end ga-2 mt-2">
        <v-btn variant="text" @click="closeEditUserDialog">Close</v-btn>
        <v-btn
          color="#8b1e1e"
          class="text-white"
          :loading="editDialog.saving"
          :disabled="editDialog.saving"
          @click="saveEditUserDialog"
        >
          Save
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
  </v-container>

  <v-dialog v-model="clockCorrectionDialog.open" max-width="560">
    <v-card class="pa-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <div>
          <div class="text-h6 font-weight-bold">
            {{ clockCorrectionDialog.mode === "create" ? "Add Clock Log" : "Edit Clock Log" }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ clockCorrectionDialog.record?.shiftDate }}
            {{ clockCorrectionDialog.record?.shiftLabel }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="closeClockCorrectionDialog" />
      </div>

      <v-text-field
        v-model="clockCorrectionDialog.form.clockIn"
        label="Clock in"
        type="datetime-local"
        variant="outlined"
        density="comfortable"
        class="mb-3"
      />

      <v-text-field
        v-model="clockCorrectionDialog.form.clockOut"
        label="Clock out"
        type="datetime-local"
        variant="outlined"
        density="comfortable"
      />

      <div v-if="clockCorrectionDialog.error" class="clock-correction-error mt-3">
        {{ clockCorrectionDialog.error }}
      </div>

      <div class="d-flex justify-end ga-2 mt-5">
        <v-btn variant="text" @click="closeClockCorrectionDialog">Cancel</v-btn>
        <v-btn
          color="#8b1e1e"
          class="text-white"
          :loading="clockCorrectionDialog.saving"
          :disabled="clockCorrectionDialog.saving"
          @click="saveClockCorrection"
        >
          Approved
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog v-model="managePositionsDialog.open" max-width="860">
    <v-card class="pa-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <h3 class="text-h6 font-weight-bold">Manage Positions</h3>
        <v-btn icon="mdi-close" variant="text" @click="closeManagePositionsDialog" />
      </div>

      <v-card variant="outlined" class="manage-position-list-card">
        <div class="manage-position-table-scroll">
          <v-table>
          <thead>
            <tr>
              <th>Position</th>
              <th>Color</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="position in availablePositions" :key="getPositionId(position)">
              <td>{{ position.title || `Position ${getPositionId(position)}` }}</td>
              <td>
                <span
                  class="position-color-swatch"
                  :style="{ backgroundColor: getManagedPositionColor(position) }"
                />
              </td>
              <td class="text-right">
                <v-btn
                  size="small"
                  variant="text"
                  class="text-none"
                  @click="startEditManagedPosition(position)"
                >
                  Edit
                </v-btn>
                <v-btn
                  size="small"
                  variant="text"
                  icon="mdi-account"
                  @click="openManagedPositionAssignments(position)"
                />
                <v-btn
                  size="small"
                  variant="text"
                  color="error"
                  class="text-none"
                  :loading="managePositionsDialog.deletingID === getPositionId(position)"
                  @click="deleteManagedPosition(position)"
                >
                  Delete
                </v-btn>
              </td>
            </tr>
            <tr @click="startAddManagedPosition" class="manage-position-add-row">
              <td colspan="3">
                <div class="d-flex align-center ga-2">
                  <v-icon size="18">mdi-plus</v-icon>
                  <span>Add new position</span>
                </div>
              </td>
            </tr>
          </tbody>
          </v-table>
        </div>
      </v-card>

      <v-expand-transition>
        <v-card
          v-if="managePositionsDialog.form.open"
          variant="outlined"
          class="pa-4 mt-4 manage-position-form-card"
        >
          <div class="text-subtitle-1 font-weight-bold mb-3">
            {{ managePositionsDialog.form.positionID ? "Edit Position" : "Add Position" }}
          </div>

          <v-row dense>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="managePositionsDialog.form.title"
                label="Position name"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                autofocus
                class="mb-4"
                @keyup.enter="submitManagedPosition"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="managePositionsDialog.form.color"
                label="Color"
                :items="positionColorOptions"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="comfortable"
                hide-details="auto"
                class="mb-4"
                :menu-props="{ maxHeight: 280 }"
              >
                <template #selection="{ item }">
                  <div class="d-flex align-center ga-4">
                    <span
                      class="position-color-swatch"
                      :style="{ backgroundColor: item.raw.value }"
                    />
                    <span>{{ item.raw.label }}</span>
                  </div>
                </template>

                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <span
                        class="position-color-swatch"
                        :style="{ backgroundColor: item.raw.value }"
                      />
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
          </v-row>

          <div class="d-flex justify-end ga-2">
            <v-btn variant="text" @click="resetManagePositionForm">Cancel</v-btn>
            <v-btn
              color="#8b1e1e"
              class="text-white"
              :loading="managePositionsDialog.saving"
              :disabled="managePositionsDialog.saving"
              @click="submitManagedPosition"
            >
              {{ managePositionsDialog.form.positionID ? "Save Changes" : "Add Position" }}
            </v-btn>
          </div>
        </v-card>
      </v-expand-transition>

      <v-expand-transition>
        <v-card
          v-if="managePositionsDialog.assignment.open && selectedManagedPosition"
          variant="outlined"
          class="pa-4 mt-4 manage-position-form-card manage-position-assignment-card"
        >
          <div class="manage-position-assignment-content">
            <div class="text-subtitle-1 font-weight-bold mb-1">
              Assign Workers
            </div>

            <div class="text-body-2 text-medium-emphasis mb-4">
              {{ selectedManagedPosition.title || `Position ${getPositionId(selectedManagedPosition)}` }}
            </div>

            <div class="manage-position-assignment-list">
              <v-checkbox
                v-for="worker in workers"
                :key="getUserId(worker)"
                v-model="managePositionsDialog.assignment.selectedUserIDs"
                :label="worker.name"
                :value="getUserId(worker)"
                density="compact"
                hide-details
              />
            </div>
          </div>

          <div class="d-flex justify-end ga-2 mt-4 manage-position-assignment-actions">
            <v-btn variant="text" @click="closeManagedPositionAssignments">Cancel</v-btn>
            <v-btn
              color="#8b1e1e"
              class="text-white"
              :loading="managePositionsDialog.assignmentSaving"
              :disabled="managePositionsDialog.assignmentSaving"
              @click="saveManagedPositionAssignments"
            >
              Save Assignments
            </v-btn>
          </div>
        </v-card>
      </v-expand-transition>

      <div class="d-flex justify-end ga-2 mt-4">
        <v-btn variant="text" @click="closeManagePositionsDialog">Close</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script>
import apiClient from "../services/services.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import positionServices from "../services/positionServices.js";
import userServices from "../services/userServices.js";
import userPostionServices from "../services/userPostionServices.js";
import userShiftServices from "../services/userShiftServices.js";
import shiftServices from "../services/shiftServices.js";
import scheduleServices from "../services/scheduleServices.js";
import clockInOutServices from "../services/clockInOutServices.js";
import UserCalendar from "../components/UserCalendar.vue";
import {
  COLOR_OPTIONS,
  getDefaultPositionColor,
  getPositionColor,
  normalizePositionColor,
} from "../utils/positionColors.js";

export default {
  name: "ManagerUsers",
  components: { UserCalendar },
  data() {
    return {
      loading: false,
      error: "",
      search: "",
      workers: [],

      viewDialog: {
        open: false,
        tab: "info",
        user: null,
      },
      editDialog: {
        open: false,
        tab: "info",
        user: null,
        saving: false,
        error: "",
        form: {
          status: "active",
          positionIDs: [],
        },
      },

      calendarFilters: {
        showUnavailability: true,
        showShifts: true,
      },

      availablePositions: [],
      workerPositionsByUserID: {},
      workerPositionSelections: {},
      positionsLoading: false,
      savingPositionUserIDs: {},
      managerDepartmentID: null,
      managePositionsDialog: {
        open: false,
        saving: false,
        deletingID: null,
        assignmentSaving: false,
        error: "",
        pendingUserID: null,
        selectedPositionID: null,
        form: {
          open: false,
          positionID: null,
          title: "",
          color: getDefaultPositionColor(),
        },
        assignment: {
          open: false,
          selectedUserIDs: [],
        },
      },

      // all events for the selected user (unavailability + shifts)
      userCalendarEvents: [],
      clockHistory: {
        loading: false,
        error: "",
        records: [],
      },
      clockCorrectionDialog: {
        open: false,
        saving: false,
        mode: "update",
        record: null,
        form: {
          clockIn: "",
          clockOut: "",
        },
        error: "",
      },
    };
  },

  computed: {
    filteredWorkers() {
      const q = this.search.trim().toLowerCase();
      if (!q) return this.workers;
      return this.workers.filter((u) => {
        const name = String(u.name ?? "").toLowerCase();
        const email = String(u.email ?? "").toLowerCase();
        const phone = String(u.phone ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    },

    selectedManagedPosition() {
      const selectedID = this.managePositionsDialog.selectedPositionID;
      if (!selectedID) return null;
      return (
        this.availablePositions.find(
          (position) => String(this.getPositionId(position)) === String(selectedID)
        ) || null
      );
    },

    positionColorOptions() {
      return COLOR_OPTIONS;
    },

    filteredUserCalendarEvents() {
      return this.userCalendarEvents.filter((e) => {
        if (e.kind === "unavailability" && !this.calendarFilters.showUnavailability) return false;
        if (e.kind === "shift" && !this.calendarFilters.showShifts) return false;
        return true;
      });
    },
  },
  async mounted() {
    await this.loadWorkers();
  },

  watch: {
    "viewDialog.open"(open) {
      if (open) {
        this.$nextTick(() => setTimeout(() => this.$refs.userCalendar?.updateSize(), 100));
      }
    },
    "viewDialog.tab"(tab) {
      if (tab === "calendar") {
        this.$nextTick(() => setTimeout(() => this.$refs.userCalendar?.updateSize(), 100));
      }
      if (tab === "clock-history" && this.viewDialog.user) {
        this.loadClockHistoryForUser(this.viewDialog.user);
      }
    },
    "editDialog.open"(open) {
      if (open) {
        this.$nextTick(() => setTimeout(() => this.$refs.editUserCalendar?.updateSize(), 100));
      }
    },
    "editDialog.tab"(tab) {
      if (tab === "calendar") {
        this.$nextTick(() => setTimeout(() => this.$refs.editUserCalendar?.updateSize(), 100));
      }
      if (tab === "clock-history" && this.editDialog.user) {
        this.loadClockHistoryForUser(this.editDialog.user);
      }
    },
    filteredUserCalendarEvents() {
      this.$nextTick(() => {
        setTimeout(() => {
          this.$refs.userCalendar?.updateSize();
          this.$refs.editUserCalendar?.updateSize();
        }, 50);
      });
    },
  },

  methods: {
    isNotFound(error) {
      return Boolean(error?.response?.status === 404);
    },

    extractArray(payload, keys = []) {
      if (Array.isArray(payload)) return payload;
      for (const key of keys) {
        if (Array.isArray(payload?.[key])) return payload[key];
      }
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    },

    getDateTime(date, time) {
      if (!date && !time) return null;
      const safeDate = date || "1970-01-01";
      const safeTime = (time || "00:00:00").toString().substring(0, 8);
      return `${safeDate}T${safeTime}`;
    },

    getUserId(user) {
      return user?.ID ?? user?.id ?? user?.userID ?? null;
    },

    getPositionId(position) {
      return position?.positionID ?? position?.ID ?? position?.id ?? null;
    },

    getManagedPositionColor(position) {
      return normalizePositionColor(
        getPositionColor(position, this.getPositionId(position)),
        getDefaultPositionColor()
      );
    },

    async loadPositions(departmentID) {
      const res = await positionServices.getAll({ departmentID, isActive: true, limit: 200 });
      this.availablePositions = this.extractArray(res, ["positions"]);
    },

    buildPositionItems(positions) {
      const items = positions.map((position) => ({
        value: this.getPositionId(position),
        title: position.title || `Position ${this.getPositionId(position)}`,
      }));

      items.push({
        value: "__add_new__",
        title: "Manage positions",
      });

      return items;
    },

    async loadWorkerPositions() {
      const res = await userPostionServices.getAll();
      const links = this.extractArray(res, ["userpositions"]);
      const workerIDs = new Set(this.workers.map((worker) => String(this.getUserId(worker))));
      const positionsByID = this.availablePositions.reduce((acc, position) => {
        const positionID = this.getPositionId(position);
        if (positionID) acc[String(positionID)] = position;
        return acc;
      }, {});

      this.workerPositionsByUserID = links.reduce((acc, link) => {
        const userID = String(link?.userID ?? link?.UserID ?? "");
        const positionID = String(link?.positionID ?? link?.PositionID ?? "");

        if (!workerIDs.has(userID)) return acc;
        if (!positionsByID[positionID]) return acc;

        if (!acc[userID]) acc[userID] = [];
        acc[userID].push(positionsByID[positionID]);
        return acc;
      }, {});
    },

    getWorkerPositionNames(worker) {
      const userID = String(this.getUserId(worker) ?? "");
      const positions = this.workerPositionsByUserID[userID] || [];
      return positions.map(
        (position) => position.title || `Position ${this.getPositionId(position)}`
      );
    },

    getWorkerPositionIDs(worker) {
      const userID = String(this.getUserId(worker) ?? "");
      const positions = this.workerPositionsByUserID[userID] || [];
      return positions.map((position) => this.getPositionId(position)).filter(Boolean);
    },

    getManagedPositionWorkers() {
      const positionID = this.managePositionsDialog.selectedPositionID;
      if (!positionID) return [];

      return this.workers.filter((worker) => {
        const userID = String(this.getUserId(worker) ?? "");
        const positions = this.workerPositionsByUserID[userID] || [];
        return positions.some(
          (position) => String(this.getPositionId(position)) === String(positionID)
        );
      });
    },

    getWorkerPositionItems(worker) {
      const userID = String(this.getUserId(worker) ?? "");
      const assignedIDs = new Set(
        (this.workerPositionsByUserID[userID] || []).map((position) =>
          String(this.getPositionId(position))
        )
      );

      const unassignedPositions = this.availablePositions.filter(
        (position) => !assignedIDs.has(String(this.getPositionId(position)))
      );

      return this.buildPositionItems(unassignedPositions);
    },

    isSavingWorkerPosition(worker) {
      return Boolean(this.savingPositionUserIDs[String(this.getUserId(worker) ?? "")]);
    },

    selectManagedPosition(position) {
      const positionID = this.getPositionId(position);
      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        selectedPositionID: positionID,
      };
    },

    startAddManagedPosition() {
      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        error: "",
        form: {
          open: true,
          positionID: null,
          title: "",
          color: getDefaultPositionColor(),
        },
        assignment: {
          ...this.managePositionsDialog.assignment,
          open: false,
          selectedUserIDs: [],
        },
      };
    },

    normalizeUnavailabilityEvent(rawBlock) {
      const start =
        rawBlock?.start ||
        rawBlock?.startDateTime ||
        rawBlock?.start_datetime ||
        this.getDateTime(rawBlock?.start_date, rawBlock?.start_time);
      const end =
        rawBlock?.end ||
        rawBlock?.endDateTime ||
        rawBlock?.end_datetime ||
        this.getDateTime(rawBlock?.end_date, rawBlock?.end_time);
      const id =
        rawBlock?.unavailabilityID ||
        rawBlock?.unavailableID ||
        rawBlock?.ID ||
        rawBlock?.id;

      if (!id || !start || !end) return null;

      return {
        id: `unavailability-${id}`,
        title: rawBlock?.reason || rawBlock?.title || "Unavailable",
        start,
        end,
        kind: "unavailability",
        color: "#c62828",
      };
    },

    async fetchUserUnavailability(userID) {
      const endpoints = [
        { path: `/unavailable/user/${userID}` },
        { path: "/unavailable", params: { userID } },
        { path: "/unavailable" },
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint.path, {
            params: endpoint.params || {},
          });
          const blocks = response?.unavailabilities || response?.data || response;

          if (Array.isArray(blocks)) {
            return blocks.filter((block) => {
              if (endpoint.path !== "/unavailable") return true;
              const blockUserID =
                block?.userID ?? block?.userId ?? block?.UserID ?? block?.employeeID ?? null;
              return String(blockUserID) === String(userID);
            });
          }
        } catch (error) {
          if (!this.isNotFound(error)) {
            console.error("Failed to load user unavailability:", error?.response?.data || error);
            return [];
          }
        }
      }

      return [];
    },

    async getManagerDepartmentID() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      const u = stored?.user ?? stored;

      const managerID = u?.ID ?? u?.id ?? u?.userID;
      if (!managerID) return null;

      const res = await departmentUsersServices.getByUser(managerID);

      const links = Array.isArray(res)
        ? res
        : Array.isArray(res?.departmentusers)
        ? res.departmentusers
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const managerLink =
        links.find((l) => String(l.role || "").trim().toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },

    async loadManagerContext() {
      const departmentID = await this.getManagerDepartmentID();
      this.managerDepartmentID = departmentID ?? null;
      return { departmentID };
    },

    async loadWorkers() {
      this.loading = true;
      this.error = "";
      this.workers = [];

      try {
        const { departmentID } = await this.loadManagerContext();
        if (!departmentID) {
          this.error = "No department found for this manager (check department_users for manager row).";
          return;
        }

        const duRes = await departmentUsersServices.getByDepartment(departmentID);

        const links = Array.isArray(duRes)
          ? duRes
          : Array.isArray(duRes?.departmentusers)
          ? duRes.departmentusers
          : Array.isArray(duRes?.data)
          ? duRes.data
          : [];

        const userIDs = links
          .filter((l) => String(l.role || "").trim().toLowerCase() === "worker")
          .map((l) => l.userID ?? l.userId ?? l.UserID)
          .filter(Boolean);

        const users = await Promise.all(userIDs.map((id) => userServices.get(id)));

        this.workers = users.filter((u) => String(u.role || "").toLowerCase() === "worker");
        this.positionsLoading = true;
        await this.loadPositions(departmentID);
        await this.loadWorkerPositions();
      } catch (e) {
        this.error = e?.response?.data?.message || "Failed to load workers.";
        console.error(e?.response?.data || e);
      } finally {
        this.loading = false;
        this.positionsLoading = false;
      }
    },

    async viewUser(user) {
      this.viewDialog.user = user;
      this.viewDialog.tab = "info";
      this.viewDialog.open = true;
      await this.loadCalendarDataForUser(user);
    },

    closeViewDialog() {
      this.viewDialog.open = false;
      this.viewDialog.user = null;
      this.userCalendarEvents = [];
      this.resetClockHistory();
    },

    async openEditUserDialog(user) {
      this.editDialog.user = user;
      this.editDialog.tab = "info";
      this.editDialog.error = "";
      this.editDialog.form = {
        status: String(user?.status || "").toLowerCase() === "active" ? "active" : "inactive",
        positionIDs: this.getWorkerPositionIDs(user),
      };
      this.editDialog.open = true;
      await this.loadCalendarDataForUser(user);
    },

    closeEditUserDialog() {
      this.editDialog.open = false;
      this.editDialog.user = null;
      this.editDialog.error = "";
      this.editDialog.saving = false;
      this.editDialog.form = {
        status: "active",
        positionIDs: [],
      };
      this.resetClockHistory();
    },
    resetClockHistory() {
      this.clockHistory = {
        loading: false,
        error: "",
        records: [],
      };
    },
    formatClockDateTime(value) {
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString();
    },
    toDateTimeLocal(value) {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      const offsetMs = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
    },
    getShiftDateTimeLocal(record, key) {
      const time = key === "end" ? record?.shiftEndTime : record?.shiftStartTime;
      if (!record?.shiftDate || !time) return "";
      return this.toDateTimeLocal(`${record.shiftDate}T${String(time).slice(0, 5)}:00`);
    },
    normalizeClockInput(value) {
      if (!value) return "";
      const raw = String(value).trim();
      const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T${isoMatch[4]}:${isoMatch[5]}:00`;
      }

      const localMatch = raw.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i
      );
      if (localMatch) {
        const month = String(localMatch[1]).padStart(2, "0");
        const day = String(localMatch[2]).padStart(2, "0");
        const year = localMatch[3];
        let hour = Number(localMatch[4]);
        const minute = String(localMatch[5]).padStart(2, "0");
        const meridiem = String(localMatch[6] || "").toUpperCase();
        if (meridiem === "PM" && hour < 12) hour += 12;
        if (meridiem === "AM" && hour === 12) hour = 0;
        return `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${minute}:00`;
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "";
      return `${this.toDateTimeLocal(parsed)}:00`;
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
    async loadClockHistoryForUser(user) {
      const userID = this.getUserId(user);
      if (!userID) return;

      this.clockHistory = {
        loading: true,
        error: "",
        records: [],
      };

      try {
        const assignmentsRes = await userShiftServices.getAll({ userID });
        const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];

        const historyRows = await Promise.all(
          assignments.map(async (assignment) => {
            const userShiftID = this.getUserId({ ID: assignment?.ID });
            const shiftID = Number(assignment?.shiftID);
            if (!userShiftID || !Number.isFinite(shiftID)) return [];

            const [shift, clockRecords] = await Promise.all([
              shiftServices.get(shiftID),
              clockInOutServices.getByUserShift(userShiftID),
            ]);

            const rows = Array.isArray(clockRecords) ? clockRecords : [];
            const shiftDate = shift?.shift_date || "Unknown date";
            const shiftStartTime = String(shift?.start_time || "").slice(0, 5);
            const shiftEndTime = String(shift?.end_time || "").slice(0, 5);
            if (!rows.length) {
              return [{
                id: `missing-${userShiftID}`,
                userShiftID,
                shiftDate,
                shiftLabel: `${shiftStartTime} - ${shiftEndTime}`,
                shiftStartTime,
                shiftEndTime,
                clockInTime: null,
                clockOutTime: null,
                isMissingLog: true,
              }];
            }

            return rows.map((record) => ({
              id: record.ID,
              userShiftID,
              shiftDate,
              shiftLabel: `${shiftStartTime} - ${shiftEndTime}`,
              shiftStartTime,
              shiftEndTime,
              clockInTime: record.clock_in_time,
              clockOutTime: record.clock_out_time,
              isMissingLog: false,
            }));
          })
        );

        this.clockHistory = {
          loading: false,
          error: "",
          records: historyRows.flat().sort((a, b) => {
            const aTime = new Date(a.clockInTime || `${a.shiftDate}T${a.shiftStartTime || "00:00"}:00`);
            const bTime = new Date(b.clockInTime || `${b.shiftDate}T${b.shiftStartTime || "00:00"}:00`);
            return bTime - aTime;
          }),
        };
      } catch (error) {
        console.error("Failed to load clock history:", error?.response?.data || error);
        this.clockHistory = {
          loading: false,
          error: error?.response?.data?.message || "Failed to load clock history.",
          records: [],
        };
      }
    },
    async reloadClockHistoryForDialog(source) {
      const user = source === "edit" ? this.editDialog.user : this.viewDialog.user;
      await this.loadClockHistoryForUser(user);
    },
    openClockCorrectionDialog(record) {
      this.clockCorrectionDialog = {
        open: true,
        saving: false,
        mode: record.isMissingLog ? "create" : "update",
        record,
        form: {
          clockIn: record.clockInTime
            ? this.toDateTimeLocal(record.clockInTime)
            : this.getShiftDateTimeLocal(record, "start"),
          clockOut: record.clockOutTime
            ? this.toDateTimeLocal(record.clockOutTime)
            : this.getShiftDateTimeLocal(record, "end"),
        },
        error: "",
      };
    },
    closeClockCorrectionDialog() {
      this.clockCorrectionDialog = {
        open: false,
        saving: false,
        mode: "update",
        record: null,
        form: {
          clockIn: "",
          clockOut: "",
        },
        error: "",
      };
    },
    async saveClockCorrection() {
      const record = this.clockCorrectionDialog.record;
      if (!record) return;
      const clockInValue = this.normalizeClockInput(this.clockCorrectionDialog.form.clockIn);
      const clockOutValue = this.normalizeClockInput(this.clockCorrectionDialog.form.clockOut);
      const clockIn = new Date(clockInValue);
      const clockOut = clockOutValue ? new Date(clockOutValue) : null;
      if (
        !clockInValue ||
        Number.isNaN(clockIn.getTime()) ||
        (clockOut && Number.isNaN(clockOut.getTime())) ||
        (clockOut && clockOut < clockIn)
      ) {
        this.clockCorrectionDialog.error = "Enter valid clock times.";
        return;
      }

      const payload = {
        user_shift_id: record.userShiftID,
        clock_in_time: clockInValue,
        clock_out_time: clockOutValue || null,
      };

      this.clockCorrectionDialog = {
        ...this.clockCorrectionDialog,
        saving: true,
        error: "",
      };

      try {
        if (this.clockCorrectionDialog.mode === "create") {
          await clockInOutServices.create(payload);
        } else {
          await clockInOutServices.update(record.id, payload);
        }

        const activeUser = this.editDialog.open ? this.editDialog.user : this.viewDialog.user;
        await this.loadClockHistoryForUser(activeUser);
        this.closeClockCorrectionDialog();
      } catch (error) {
        this.clockCorrectionDialog = {
          ...this.clockCorrectionDialog,
          saving: false,
          error: error?.response?.data?.message || "Could not save clock change.",
        };
      }
    },

    async saveEditUserDialog() {
      const user = this.editDialog.user;
      const userID = this.getUserId(user);
      if (!userID) return;

      const currentPositionIDs = new Set(this.getWorkerPositionIDs(user).map((id) => String(id)));
      const nextPositionIDs = new Set(this.editDialog.form.positionIDs.map((id) => String(id)));
      const positionIDsToAdd = [...nextPositionIDs].filter((id) => !currentPositionIDs.has(id));
      const positionIDsToRemove = [...currentPositionIDs].filter((id) => !nextPositionIDs.has(id));

      this.editDialog.saving = true;
      this.editDialog.error = "";

      try {
        await userServices.update(userID, {
          status: this.editDialog.form.status,
        });

        await Promise.all([
          ...positionIDsToAdd.map((positionID) =>
            userPostionServices.create({ userID, positionID })
          ),
          ...positionIDsToRemove.map((positionID) =>
            userPostionServices.deleteByPair(userID, positionID)
          ),
        ]);

        await this.loadWorkers();
        const refreshedUser =
          this.workers.find((worker) => String(this.getUserId(worker)) === String(userID)) || user;
        this.editDialog.user = refreshedUser;
        this.closeEditUserDialog();
      } catch (error) {
        console.error("Failed to save user edits:", error?.response?.data || error);
        this.editDialog.error = error?.response?.data?.message || "Failed to save worker changes.";
      } finally {
        this.editDialog.saving = false;
      }
    },

    openManagePositionsDialog(userID = null) {
      this.managePositionsDialog = {
        open: true,
        saving: false,
        deletingID: null,
        assignmentSaving: false,
        error: "",
        pendingUserID: userID,
        selectedPositionID: null,
        form: {
          open: false,
          positionID: null,
          title: "",
          color: getDefaultPositionColor(),
        },
        assignment: {
          open: false,
          selectedUserIDs: [],
        },
      };
    },

    closeManagePositionsDialog() {
      this.managePositionsDialog = {
        open: false,
        saving: false,
        deletingID: null,
        assignmentSaving: false,
        error: "",
        pendingUserID: null,
        selectedPositionID: null,
        form: {
          open: false,
          positionID: null,
          title: "",
          color: getDefaultPositionColor(),
        },
        assignment: {
          open: false,
          selectedUserIDs: [],
        },
      };
    },

    resetManagePositionForm() {
      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        error: "",
        form: {
          open: false,
          positionID: null,
          title: "",
          color: getDefaultPositionColor(),
        },
      };
    },

    startEditManagedPosition(position) {
      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        error: "",
        selectedPositionID: this.getPositionId(position),
        form: {
          open: true,
          positionID: this.getPositionId(position),
          title: position?.title || "",
          color: this.getManagedPositionColor(position),
        },
        assignment: {
          ...this.managePositionsDialog.assignment,
          open: false,
          selectedUserIDs: [],
        },
      };
    },

    openManagedPositionAssignments(position) {
      const positionID = this.getPositionId(position);
      const selectedUserIDs = this.workers
        .filter((worker) => {
          const userID = String(this.getUserId(worker) ?? "");
          const positions = this.workerPositionsByUserID[userID] || [];
          return positions.some(
            (workerPosition) => String(this.getPositionId(workerPosition)) === String(positionID)
          );
        })
        .map((worker) => this.getUserId(worker));

      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        error: "",
        selectedPositionID: positionID,
        assignment: {
          open: true,
          selectedUserIDs,
        },
        form: {
          ...this.managePositionsDialog.form,
          open: false,
        },
      };
    },

    closeManagedPositionAssignments() {
      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        assignment: {
          open: false,
          selectedUserIDs: [],
        },
      };
    },

    async submitManagedPosition() {
      const title = this.managePositionsDialog.form.title.trim();
      const targetUserID = this.managePositionsDialog.pendingUserID;
      const editingPositionID = this.managePositionsDialog.form.positionID;
      if (!title) {
        this.managePositionsDialog.error = "Position name is required.";
        return;
      }

      let departmentID = this.managerDepartmentID;

      if (!departmentID) {
        const context = await this.loadManagerContext();
        departmentID = context.departmentID;
      }

      if (!departmentID) {
        this.managePositionsDialog.error = "Unable to determine the manager's department.";
        return;
      }

      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        saving: true,
        error: "",
      };

      try {
        let response;
        const color = normalizePositionColor(
          this.managePositionsDialog.form.color,
          getDefaultPositionColor()
        );
        if (editingPositionID) {
          response = await positionServices.update(editingPositionID, {
            title,
            departmentID,
            color,
          });
        } else {
          response = await positionServices.create({
            title,
            departmentID,
            color,
            isActive: true,
          });
        }

        const createdPosition = response?.data || response;
        await this.loadPositions(departmentID);
        await this.loadWorkerPositions();

        const affectedPositionID = editingPositionID || this.getPositionId(createdPosition);
        this.managePositionsDialog = {
          ...this.managePositionsDialog,
          selectedPositionID: affectedPositionID,
        };
        if (!editingPositionID && affectedPositionID) {
          const worker = this.workers.find(
            (item) => String(this.getUserId(item)) === String(targetUserID)
          );
          if (worker) {
            await this.assignWorkerPosition(worker, affectedPositionID);
          }
        }

        this.managePositionsDialog = {
          ...this.managePositionsDialog,
          saving: false,
          error: "",
          pendingUserID: null,
          form: {
            open: false,
            positionID: null,
            title: "",
            color: getDefaultPositionColor(),
          },
        };
      } catch (error) {
        console.error("Failed to create position:", error?.response?.data || error);
        this.managePositionsDialog = {
          ...this.managePositionsDialog,
          saving: false,
          error: error?.response?.data?.message || "Failed to create position.",
        };
      }
    },

    async deleteManagedPosition(position) {
      const positionID = this.getPositionId(position);
      if (!positionID) return;

      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        deletingID: positionID,
        error: "",
      };

      try {
        await positionServices.delete(positionID);
        await this.loadPositions(this.managerDepartmentID);
        await this.loadWorkerPositions();

        if (this.managePositionsDialog.form.positionID === positionID) {
          this.resetManagePositionForm();
        }

        if (String(this.managePositionsDialog.selectedPositionID) === String(positionID)) {
          this.managePositionsDialog = {
            ...this.managePositionsDialog,
            selectedPositionID: null,
            assignment: {
              open: false,
              selectedUserIDs: [],
            },
          };
        }
      } catch (error) {
        console.error("Failed to delete position:", error?.response?.data || error);
        this.managePositionsDialog = {
          ...this.managePositionsDialog,
          deletingID: null,
          error: error?.response?.data?.message || "Failed to delete position.",
        };
        return;
      }

      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        deletingID: null,
      };
    },

    async saveManagedPositionAssignments() {
      const positionID = this.managePositionsDialog.selectedPositionID;
      if (!positionID) return;

      const selectedUserIDs = new Set(
        this.managePositionsDialog.assignment.selectedUserIDs.map((id) => String(id))
      );
      const currentUserIDs = new Set(
        this.getManagedPositionWorkers().map((worker) => String(this.getUserId(worker)))
      );

      const toAdd = [...selectedUserIDs].filter((id) => !currentUserIDs.has(id));
      const toRemove = [...currentUserIDs].filter((id) => !selectedUserIDs.has(id));

      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        assignmentSaving: true,
        error: "",
      };

      try {
        await Promise.all([
          ...toAdd.map((userID) => userPostionServices.create({ userID, positionID })),
          ...toRemove.map((userID) => userPostionServices.deleteByPair(userID, positionID)),
        ]);
        await this.loadWorkerPositions();
      } catch (error) {
        console.error("Failed to save position assignments:", error?.response?.data || error);
        this.managePositionsDialog = {
          ...this.managePositionsDialog,
          assignmentSaving: false,
          error: error?.response?.data?.message || "Failed to save worker assignments.",
        };
        return;
      }

      this.managePositionsDialog = {
        ...this.managePositionsDialog,
        assignmentSaving: false,
        assignment: {
          open: false,
          selectedUserIDs: [],
        },
      };
    },

    async assignWorkerPosition(worker, value) {
      const userID = this.getUserId(worker);
      const userKey = String(userID ?? "");

      if (!value) {
        return;
      }

      if (value === "__add_new__") {
        this.workerPositionSelections = {
          ...this.workerPositionSelections,
          [userKey]: null,
        };
        this.openManagePositionsDialog(userID);
        return;
      }

      if (!userID) {
        return;
      }

      this.savingPositionUserIDs = {
        ...this.savingPositionUserIDs,
        [userKey]: true,
      };
      try {
        await userPostionServices.create({
          userID,
          positionID: value,
        });

        await this.loadWorkerPositions();
      } catch (error) {
        console.error("Failed to assign position:", error?.response?.data || error);
      } finally {
        this.workerPositionSelections = {
          ...this.workerPositionSelections,
          [userKey]: null,
        };
        this.savingPositionUserIDs = {
          ...this.savingPositionUserIDs,
          [userKey]: false,
        };
      }
    },

    async loadCalendarDataForUser(user) {
      const userID = this.getUserId(user);
      if (!userID) return;

      this.userCalendarEvents = [];
      try {
        const departmentID = await this.getManagerDepartmentID();
        const [schedulesRes, assignmentsRes, unavailabilityBlocks] = await Promise.all([
          scheduleServices.getAll({
            departmentID,
            type: "official",
            limit: 200,
          }),
          userShiftServices.getAll({ userID }),
          this.fetchUserUnavailability(userID),
        ]);
        const officialSchedules = Array.isArray(schedulesRes?.schedules) ? schedulesRes.schedules : [];
        const officialScheduleIDs = new Set(
          officialSchedules
            .map((schedule) => Number(schedule?.ID))
            .filter((id) => Number.isFinite(id) && id > 0)
        );

        const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
        const shiftIDs = assignments
          .map((row) => row?.shiftID)
          .filter((id) => Number.isFinite(Number(id)))
          .map((id) => Number(id));

        const shiftEvents =
          shiftIDs.length === 0
            ? []
            : (await Promise.all(shiftIDs.map((id) => shiftServices.get(id))))
                .filter(
                  (shift) =>
                    !!shift &&
                    officialScheduleIDs.has(Number(shift.scheduleID))
                )
                .map((shift) => {
                  const position = this.availablePositions.find(
                    (item) => String(this.getPositionId(item)) === String(shift.positionID)
                  );

                  return {
                    id: `shift-${shift.ID}`,
                    title: position?.title || "Assigned Shift",
                    start: `${shift.shift_date}T${String(shift.start_time || "").slice(0, 5)}:00`,
                    end: `${shift.shift_date}T${String(shift.end_time || "").slice(0, 5)}:00`,
                    kind: "shift",
                    color: getPositionColor(position, shift.positionID),
                    textColor: "#ffffff",
                    extendedProps: {
                      shiftID: shift.ID,
                      positionID: shift.positionID || null,
                    },
                  };
                });

        const unavailabilityEvents = unavailabilityBlocks
          .map((block) => this.normalizeUnavailabilityEvent(block))
          .filter(Boolean);

        this.userCalendarEvents = [...unavailabilityEvents, ...shiftEvents];
      } catch (e) {
        console.error("Failed to load user calendar data:", e?.response?.data || e);
        this.userCalendarEvents = [];
      }

      this.$nextTick(() => {
        setTimeout(() => {
          this.$refs.userCalendar?.updateSize();
          this.$refs.editUserCalendar?.updateSize();
        }, 100);
      });
    },

    async reloadUserCalendarData() {
      await this.loadCalendarDataForUser(this.viewDialog.user);
    },

    async reloadEditUserCalendarData() {
      await this.loadCalendarDataForUser(this.editDialog.user);
    },
  },
};
</script>

<style scoped>
.manager-user-tabs {
  flex: 0 0 auto;
  position: relative;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.manager-user-dialog-body {
  overflow: auto;
  min-height: 0;
}

.manager-user-window {
  min-height: 0;
}

.manage-position-form-card {
  background: #fff;
  border-color: rgba(139, 30, 30, 0.14);
}

.position-color-swatch {
  display: inline-block;
  width: 28px;
  height: 18px;
  margin-right: 18px;
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 4px;
  vertical-align: middle;
}

.fill-height {
  height: 100%;
}

.manage-position-list-card :deep(table tbody tr.manage-position-add-row) {
  cursor: pointer;
}

.manage-position-table-scroll {
  max-height: 34vh;
  overflow-y: auto;
}

.manage-position-assignment-card {
  max-height: 55vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.manage-position-assignment-content {
  flex: 1 1 auto;
  min-height: 0;
}

.manage-position-assignment-list {
  height: 26vh;
  overflow-y: scroll;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  padding-right: 8px;
  background: #fff;
}

.manage-position-assignment-actions {
  flex: 0 0 auto;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  padding-top: 12px;
}

.edit-user-details-card {
  max-width: 620px;
}

.edit-position-list {
  max-height: 26vh;
  overflow-y: auto;
  padding-right: 8px;
}

.clock-correction-error {
  color: #b3261e;
  font-size: 0.9rem;
  font-weight: 600;
}

.clock-edit-btn {
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: none;
}
</style>
