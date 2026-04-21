<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <v-col cols="12">
        <v-card class="pa-4 mb-4 bg-white rounded-lg" elevation="2">
          <div class="d-flex flex-wrap align-center justify-space-between ga-4">
            <div>
              <div class="text-h5 font-weight-bold">Weekly Payroll</div>
              <div class="text-body-2 text-medium-emphasis">
                {{ selectedWeekLabel }}
              </div>
            </div>

            <div style="min-width: 220px;">
              <v-text-field
                v-model="selectedDate"
                label="Select a Date"
                type="date"
                variant="solo"
                density="compact"
                hide-details
                @update:modelValue="onDateSelected"
              />
            </div>

            <div class="payroll-summary-stats">
              <div class="payroll-summary-stat">
                <div class="text-caption text-medium-emphasis">Total Hours Worked</div>
                <div class="text-h6 font-weight-bold">{{ formatHours(totalHoursWorked) }}</div>
              </div>
              <div class="payroll-summary-stat">
                <div class="text-caption text-medium-emphasis">Weekly Total Payroll</div>
                <div class="text-h6 font-weight-bold">${{ formatCurrency(totalPayroll) }}</div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="pa-4 bg-grey-lighten-3" elevation="1">
          <div class="d-flex flex-column ga-3">
            <v-btn color="primary" variant="tonal" block @click="goToCurrentWeek">
              Go To Current Week
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <v-card elevation="2" class="pa-4 bg-white rounded-lg">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Payroll Entries</div>
          </div>

          <v-table>
            <thead>
              <tr>
                <th class="text-left">Employee</th>
                <th class="text-left">Position</th>
                <th class="text-left">Clocked Hours</th>
                <th class="text-left">Hours Used</th>
                <th class="text-left">Base Rate</th>
                <th class="text-left">Rate Used</th>
                <th class="text-left">Total</th>
                <th class="text-left">Notes</th>
                <th class="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="entries.length === 0">
                <td colspan="9" class="text-medium-emphasis">
                  No payroll entries found for this week.
                </td>
              </tr>

              <tr v-for="entry in entries" :key="entry.user_shift_id">
                <td>{{ entry.employee_name }}</td>
                <td>{{ entry.position_name || "-" }}</td>
                <td>{{ formatHours(entry.base_hours) }}</td>

                <td>
                  <div v-if="editingID === entry.user_shift_id">
                    <v-text-field
                      v-model.number="editForm.override_hours"
                      class="payroll-inline-input"
                      type="number"
                      step="0.25"
                      min="0"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </div>
                  <div v-else>{{ formatHours(entry.effective_hours) }}</div>
                </td>

                <td>${{ formatCurrency(entry.base_rate) }}</td>

                <td>
                  <div v-if="editingID === entry.user_shift_id">
                    <v-text-field
                      v-model.number="editForm.override_hourly_rate"
                      class="payroll-inline-input"
                      type="number"
                      step="0.01"
                      min="0"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </div>
                  <div v-else>${{ formatCurrency(entry.effective_rate) }}</div>
                </td>

                <td>${{ formatCurrency(entry.total_pay) }}</td>

                <td>
                  <div v-if="editingID === entry.user_shift_id">
                    <v-text-field
                      v-model="editForm.notes"
                      class="payroll-inline-input payroll-inline-notes"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </div>
                  <div v-else>{{ entry.notes || "-" }}</div>
                </td>

                <td>
                  <div class="d-flex ga-2">
                    <template v-if="editingID === entry.user_shift_id">
                      <v-btn
                        size="small"
                        color="primary"
                        variant="tonal"
                        @click="saveOverride(entry.user_shift_id)"
                      >
                        Save
                      </v-btn>
                      <v-btn
                        size="small"
                        color="warning"
                        variant="tonal"
                        @click="clearOverride(entry.user_shift_id)"
                      >
                        Clear
                      </v-btn>
                      <v-btn size="small" variant="text" @click="cancelEdit">
                        Cancel
                      </v-btn>
                    </template>
                    <template v-else>
                      <v-btn
                        size="small"
                        color="primary"
                        variant="tonal"
                        @click="startEdit(entry)"
                      >
                        Edit
                      </v-btn>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
      location="bottom right"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import budgetServices from "../services/budgetServices.js";
import departmentUsersServices from "../services/departmentUsersServices.js";
import Utils from "../config/utils.js";

export default {
  name: "Budget",
  data() {
    return {
      managerDepartmentID: null,
      selectedDate: "",
      selectedWeekStart: "",
      entries: [],
      totalHoursWorked: 0,
      totalPayroll: 0,
      editingID: null,

      editForm: {
        override_hours: null,
        override_hourly_rate: null,
        notes: "",
      },

      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },

  computed: {
    selectedWeekEnd() {
      if (!this.selectedWeekStart) return "";
      const start = new Date(`${this.selectedWeekStart}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return this.toISODate(end);
    },

    selectedWeekLabel() {
      if (!this.selectedWeekStart || !this.selectedWeekEnd) return "";
      return `${this.selectedWeekStart} to ${this.selectedWeekEnd}`;
    },
  },

  async mounted() {
    const today = new Date();
    this.selectedDate = this.toISODate(today);
    this.selectedWeekStart = this.getStartOfWeek(today);
    await this.bootstrapPayrollPage();
  },

  methods: {
    getErrorMessage(error, fallback) {
      return (
        error?.response?.data?.message ||
        error?.message ||
        fallback
      );
    },

    showMessage(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },

    formatCurrency(value) {
      return Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },

    formatHours(value) {
      return Number(value || 0).toFixed(2);
    },

    toISODate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    },

    getStartOfWeek(date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      return this.toISODate(start);
    },

    onDateSelected() {
      if (!this.selectedDate) return;
      this.selectedWeekStart = this.getStartOfWeek(
        new Date(`${this.selectedDate}T00:00:00`)
      );
      this.loadPayroll();
    },

    goToCurrentWeek() {
      const today = new Date();
      this.selectedDate = this.toISODate(today);
      this.selectedWeekStart = this.getStartOfWeek(today);
      this.loadPayroll();
    },

    getCurrentUser() {
      const stored = Utils.getStore("user");
      return stored?.user ?? stored ?? null;
    },

    normalizeLinks(response) {
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.departmentusers)) return response.departmentusers;
      if (Array.isArray(response?.data)) return response.data;
      return [];
    },

    async getManagerDepartmentID() {
      const currentUser = this.getCurrentUser();
      const managerID = currentUser?.ID ?? currentUser?.id ?? currentUser?.userID;
      if (!managerID) return null;

      const linksRes = await departmentUsersServices.getByUser(managerID);
      const links = this.normalizeLinks(linksRes);

      const managerLink =
        links.find((l) => String(l.role || "").trim().toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },

    async bootstrapPayrollPage() {
      try {
        this.managerDepartmentID = await this.getManagerDepartmentID();

        if (!this.managerDepartmentID) {
          this.showMessage("No department found for this manager.", "error");
          return;
        }

        await this.loadPayroll();
      } catch (e) {
        console.error("Failed to bootstrap payroll page:", e?.response?.data || e);
        this.showMessage(this.getErrorMessage(e, "Failed to load payroll page."), "error");
      }
    },

    async loadPayroll() {
      try {
        const res = await budgetServices.getWeeklyPayroll(
          this.managerDepartmentID,
          this.selectedWeekStart
        );

        const payload = res?.data || res || {};
        this.entries = Array.isArray(payload.entries) ? payload.entries : [];
        this.totalHoursWorked = Number(payload.total_hours || 0);
        this.totalPayroll = Number(payload.total_payroll || 0);
      } catch (e) {
        console.error("Failed to load weekly payroll:", e?.response?.data || e);
        this.showMessage(this.getErrorMessage(e, "Failed to load weekly payroll."), "error");
      }
    },

    startEdit(entry) {
      this.editingID = entry.user_shift_id;
      this.editForm = {
        override_hours: Number(entry.effective_hours || 0),
        override_hourly_rate: Number(entry.effective_rate || 0),
        notes: entry.notes || "",
      };
    },

    cancelEdit() {
      this.editingID = null;
      this.editForm = {
        override_hours: null,
        override_hourly_rate: null,
        notes: "",
      };
    },

    async saveOverride(userShiftID) {
      try {
        await budgetServices.saveOverride(userShiftID, {
          departmentID: this.managerDepartmentID,
          week_start: this.selectedWeekStart,
          override_hours: Number(this.editForm.override_hours || 0),
          override_hourly_rate: Number(this.editForm.override_hourly_rate || 0),
          notes: String(this.editForm.notes || "").trim(),
        });

        this.cancelEdit();
        await this.loadPayroll();
        this.showMessage("Weekly payroll override saved.");
      } catch (e) {
        console.error("Failed to save payroll override:", e?.response?.data || e);
        this.showMessage(this.getErrorMessage(e, "Failed to save override."), "error");
      }
    },

    async clearOverride(userShiftID) {
      try {
        await budgetServices.clearOverride(
          userShiftID,
          this.managerDepartmentID,
          this.selectedWeekStart
        );

        this.cancelEdit();
        await this.loadPayroll();
        this.showMessage("Override cleared.");
      } catch (e) {
        console.error("Failed to clear payroll override:", e?.response?.data || e);
        this.showMessage(this.getErrorMessage(e, "Failed to clear override."), "error");
      }
    },
  },
};
</script>

<style scoped>
.payroll-inline-input {
  min-width: 110px;
}

.payroll-inline-notes {
  min-width: 180px;
}

.payroll-inline-input :deep(.v-field) {
  background: rgba(255, 255, 255, 0.96);
}

.payroll-inline-input :deep(.v-field__input),
.payroll-inline-input :deep(input),
.payroll-inline-input :deep(textarea) {
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
  opacity: 1 !important;
}

.payroll-inline-input :deep(input[type="number"]) {
  text-align: right;
}

.payroll-summary-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  justify-content: flex-end;
}

.payroll-summary-stat {
  min-width: 150px;
}
</style>
