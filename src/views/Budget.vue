<template>
  <v-container fluid class="pa-6 bg-grey-lighten-4" style="min-height: 100vh;">
    <v-row>
      <!-- LEFT PANEL -->
      <v-col cols="12" md="3">
        <v-card class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <div class="d-flex flex-column ga-2">
            <v-btn color="primary" variant="flat" block @click="activePanel = 'overview'">
              Overview
            </v-btn>
            <v-btn color="primary" :variant="activePanel === 'costs' ? 'flat' : 'tonal'" block @click="activePanel = 'costs'">
              Costs
            </v-btn>
            <v-btn color="primary" :variant="activePanel === 'settings' ? 'flat' : 'tonal'" block @click="activePanel = 'settings'">
              Budget Settings
            </v-btn>
          </div>
        </v-card>

        <v-card v-if="activePanel === 'costs'" class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Add Cost</h3>

          <v-text-field
            v-model="newCost.name"
            label="Cost Name"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <v-text-field
            v-model.number="newCost.amount"
            label="Amount"
            type="number"
            min="0"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <v-btn
            color="primary"
            block
            :loading="isAddingCost"
            :disabled="!canAddCost"
            @click="addCost"
          >
            + Add Cost
          </v-btn>
        </v-card>

        <v-card v-if="activePanel === 'settings'" class="mb-4 pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Budget Settings</h3>

          <v-text-field
            v-model.number="budgetForm.total_budget"
            label="Total Budget"
            type="number"
            min="0"
            variant="solo"
            density="compact"
            hide-details
            class="mb-3"
          />

          <v-btn
            color="primary"
            block
            :loading="isSavingBudget"
            :disabled="!canSaveBudget"
            @click="saveBudget"
          >
            Save Budget
          </v-btn>
        </v-card>

        <v-card class="pa-4 bg-grey-lighten-3" elevation="1">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Summary</h3>

          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-body-2">Total Budget</span>
            <span class="font-weight-bold text-body-2">${{ formatCurrency(totalBudget) }}</span>
          </div>

          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-body-2">Budget Used</span>
            <span class="font-weight-bold text-body-2">${{ formatCurrency(budgetUsed) }}</span>
          </div>

          <div class="d-flex align-center justify-space-between">
            <span class="text-body-2">Available</span>
            <span class="font-weight-bold text-body-2">${{ formatCurrency(availableBudget) }}</span>
          </div>
        </v-card>
      </v-col>

      <!-- RIGHT PANEL -->
      <v-col cols="12" md="9">
        <div class="d-flex align-center justify-space-between mb-3 px-1">
          <div>
            <div class="text-h6 font-weight-bold">Budget</div>
            <div class="text-body-2 text-medium-emphasis">
              Department budget overview and cost tracking
            </div>
          </div>
        </div>

        <v-card elevation="2" class="pa-6 bg-white rounded-lg mb-4">
          <div class="d-flex flex-column align-center">
            <div class="donut-wrap mb-4">
              <svg width="260" height="260" viewBox="0 0 220 220">
                <circle
                  cx="110"
                  cy="110"
                  r="70"
                  fill="none"
                  stroke="#e0e0e0"
                  stroke-width="24"
                />
                <circle
                  cx="110"
                  cy="110"
                  r="70"
                  fill="none"
                  stroke="#1976d2"
                  stroke-width="24"
                  stroke-linecap="round"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="dashOffset"
                  transform="rotate(-90 110 110)"
                />
              </svg>

              <div class="donut-center">
                <div class="text-subtitle-2 font-weight-bold">Total Budget</div>
                <div class="text-h6">${{ formatCurrency(totalBudget) }}</div>
                <div class="text-body-2 mt-2">Available: ${{ formatCurrency(availableBudget) }}</div>
                <div class="text-body-2">Used: ${{ formatCurrency(budgetUsed) }}</div>
              </div>
            </div>
          </div>
        </v-card>

        <v-card elevation="2" class="pa-4 bg-white rounded-lg">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Cost Breakdown</div>
          </div>

          <v-table>
            <thead>
              <tr>
                <th class="text-left">Name</th>
                <th class="text-left">Amount</th>
                <th class="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="costs.length === 0">
                <td colspan="3" class="text-medium-emphasis">No costs added yet.</td>
              </tr>
              <tr v-for="cost in costs" :key="cost.ID">
                <td>
                  <div v-if="editingCostID === cost.ID">
                    <v-text-field
                      v-model="editForm.name"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </div>
                  <div v-else>{{ cost.name }}</div>
                </td>
                <td>
                  <div v-if="editingCostID === cost.ID">
                    <v-text-field
                      v-model.number="editForm.amount"
                      type="number"
                      min="0"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </div>
                  <div v-else>${{ formatCurrency(cost.amount) }}</div>
                </td>
                <td>
                  <div class="d-flex ga-2">
                    <template v-if="editingCostID === cost.ID">
                      <v-btn size="small" color="primary" variant="tonal" @click="saveEdit(cost.ID)">
                        Save
                      </v-btn>
                      <v-btn size="small" variant="text" @click="cancelEdit">
                        Cancel
                      </v-btn>
                    </template>
                    <template v-else>
                      <v-btn size="small" color="primary" variant="tonal" @click="startEdit(cost)">
                        Edit
                      </v-btn>
                      <v-btn size="small" color="error" variant="tonal" @click="deleteCost(cost.ID)">
                        Delete
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

export default {
  name: "Budget",
  data() {
    return {
      activePanel: "overview",
      managerDepartmentID: null,

      budget: null,
      costs: [],

      budgetForm: {
        total_budget: 30000,
      },

      newCost: {
        name: "",
        amount: null,
      },

      editForm: {
        name: "",
        amount: null,
      },

      editingCostID: null,

      isLoading: false,
      isSavingBudget: false,
      isAddingCost: false,

      snackbar: {
        show: false,
        message: "",
        color: "success",
      },
    };
  },

  computed: {
    totalBudget() {
      return Number(this.budget?.total_budget || this.budgetForm.total_budget || 0);
    },

    budgetUsed() {
      return this.costs.reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
    },

    availableBudget() {
      return Math.max(this.totalBudget - this.budgetUsed, 0);
    },

    percentUsed() {
      if (!this.totalBudget) return 0;
      return Math.min((this.budgetUsed / this.totalBudget) * 100, 100);
    },

    circumference() {
      return 2 * Math.PI * 70;
    },

    dashOffset() {
      return this.circumference * (1 - this.percentUsed / 100);
    },

    canAddCost() {
      return !!String(this.newCost.name || "").trim() && Number(this.newCost.amount) > 0;
    },

    canSaveBudget() {
      return Number(this.budgetForm.total_budget) >= 0;
    },
  },

  async mounted() {
    await this.bootstrapBudgetPage();
  },

  methods: {
    showMessage(message, color = "success") {
      this.snackbar = {
        show: true,
        message,
        color,
      };
    },

    formatCurrency(value) {
      return Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },

    getCurrentUser() {
      const raw = localStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;
      return stored?.user ?? stored ?? null;
    },

    async getManagerDepartmentID() {
      const currentUser = this.getCurrentUser();
      const managerID = currentUser?.ID ?? currentUser?.id ?? currentUser?.userID;
      if (!managerID) return null;

      const linksRes = await departmentUsersServices.getByUser(managerID);
      const links = Array.isArray(linksRes)
        ? linksRes
        : Array.isArray(linksRes?.departmentusers)
          ? linksRes.departmentusers
          : Array.isArray(linksRes?.data)
            ? linksRes.data
            : [];

      const managerLink =
        links.find((l) => String(l.role || "").trim().toLowerCase() === "manager") || links[0];

      return managerLink?.departmentID ?? null;
    },

    async bootstrapBudgetPage() {
      try {
        this.isLoading = true;
        this.managerDepartmentID = await this.getManagerDepartmentID();

        if (!this.managerDepartmentID) {
          this.showMessage("No department found for this manager.", "error");
          return;
        }

        await this.loadBudget();
      } catch (e) {
        console.error(e);
        this.showMessage("Failed to load budget page.", "error");
      } finally {
        this.isLoading = false;
      }
    },

    async loadBudget() {
      try {
        const res = await budgetServices.getByDepartment(this.managerDepartmentID);
        const payload = res?.data || res || {};

        this.budget = payload.budget || null;
        this.costs = Array.isArray(payload.costs) ? payload.costs : [];

        if (this.budget) {
          this.budgetForm.total_budget = Number(this.budget.total_budget || 0);
        }
      } catch (e) {
        console.error(e);
        this.showMessage("Failed to load budget data.", "error");
      }
    },

    async saveBudget() {
      try {
        this.isSavingBudget = true;

        const res = await budgetServices.saveDepartmentBudget(this.managerDepartmentID, {
          total_budget: Number(this.budgetForm.total_budget || 0),
        });

        const payload = res?.data || res || {};
        this.budget = payload.budget || payload;

        await this.loadBudget();
        this.showMessage("Budget saved.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to save budget.", "error");
      } finally {
        this.isSavingBudget = false;
      }
    },

    async addCost() {
      try {
        this.isAddingCost = true;

        await budgetServices.addCost({
          departmentID: this.managerDepartmentID,
          name: String(this.newCost.name || "").trim(),
          amount: Number(this.newCost.amount || 0),
        });

        this.newCost = {
          name: "",
          amount: null,
        };

        await this.loadBudget();
        this.showMessage("Cost added.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to add cost.", "error");
      } finally {
        this.isAddingCost = false;
      }
    },

    startEdit(cost) {
      this.editingCostID = cost.ID;
      this.editForm = {
        name: cost.name,
        amount: Number(cost.amount || 0),
      };
    },

    cancelEdit() {
      this.editingCostID = null;
      this.editForm = {
        name: "",
        amount: null,
      };
    },

    async saveEdit(id) {
      try {
        await budgetServices.updateCost(id, {
          name: String(this.editForm.name || "").trim(),
          amount: Number(this.editForm.amount || 0),
        });

        this.cancelEdit();
        await this.loadBudget();
        this.showMessage("Cost updated.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to update cost.", "error");
      }
    },

    async deleteCost(id) {
      try {
        await budgetServices.deleteCost(id);
        await this.loadBudget();
        this.showMessage("Cost deleted.");
      } catch (e) {
        console.error(e);
        this.showMessage(e?.response?.data?.message || "Failed to delete cost.", "error");
      }
    },
  },
};
</script>

<style scoped>
.donut-wrap {
  position: relative;
  width: 260px;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.donut-center {
  position: absolute;
  text-align: center;
  width: 160px;
}
</style>