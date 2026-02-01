<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import AthleteServices from "../services/athleteServices.js";
import GoalServices from "../services/goalServices.js";
import ExerciseServices from "../services/exerciseServices.js";

const router = useRouter();

const loading = ref(true);
const search = ref("");

// Logged-in athlete info
const athleteId = ref(null);
const athleteName = ref("Athlete");

// Data
const goals = ref([]);
const allExercises = ref([]);

// Dialog state
const viewDialog = ref(false);
const goalToView = ref(null);

const editDialog = ref(false);
const editedGoal = ref({});

const addDialog = ref(false);
const newGoal = ref({
  exerciseID: null,
  type: "",
  target: null,
  metric: "",
  status: "",
  deadline: null,
});

const deleteDialog = ref(false);
const goalToDelete = ref(null);

// ---------- Helpers ----------

// Load all exercises so we can map exerciseID -> name
const fetchExercises = async () => {
  const res = await ExerciseServices.getAll();
  const data = res.data ?? res;
  allExercises.value = data || [];
};

// Map exerciseID => exercise name
const exerciseMap = computed(() => {
  const m = new Map();
  allExercises.value.forEach((e) => m.set(e.exerciseID, e.name));
  return m;
});

// Load the currently logged-in athlete
const loadAthlete = async () => {
  const user = Utils.getStore("user"); // whatever you store after login

  if (!user) {
    console.error("No logged-in user found in local storage.");
    return;
  }

  const res = await AthleteServices.getAll();
  const list = res.data ?? res;

  // Backend returns userID on athlete row
  const athlete = (list || []).find((a) => a.userID === user.userID);

  if (athlete) {
    athleteId.value = athlete.athleteID;
    athleteName.value = athlete.user?.name || "Athlete";
  } else {
    console.warn("Could not find athlete record for userID:", user.userID);
  }
};

// Load ONLY this athlete's goals
const fetchGoals = async () => {
  if (!athleteId.value) return;

  const res = await GoalServices.getAll();
  const data = res.data ?? res;

  goals.value = (data || [])
    .filter((g) => g.athleteID === athleteId.value)
    .map((g) => ({
      id: g.goalID,
      exerciseID: g.exerciseID,
      exerciseName: exerciseMap.value.get(g.exerciseID) || "Exercise",
      target: g.target,
      metric: g.metric,
      status: g.status,
      deadline: g.deadline?.slice?.(0, 10) || g.deadline || "",
      type: g.type,
    }));
};

// Init page
onMounted(async () => {
  try {
    await loadAthlete();
    await fetchExercises();
    await fetchGoals();
  } catch (err) {
    console.error("Error loading athlete goals:", err);
  } finally {
    loading.value = false;
  }
});

// Search filter
const filteredGoals = computed(() =>
  goals.value.filter((g) =>
    g.exerciseName.toLowerCase().includes(search.value.toLowerCase())
  )
);

// ---------- View / Edit / Add handlers ----------

const viewGoal = (goal) => {
  goalToView.value = { ...goal };
  viewDialog.value = true;
};

const openEditGoal = (goal) => {
  editedGoal.value = { ...goal };
  editDialog.value = true;
};

const saveEdit = async () => {
  try {
    await GoalServices.update(editedGoal.value.id, {
      type: editedGoal.value.type,
      target: editedGoal.value.target,
      metric: editedGoal.value.metric,
      deadline: editedGoal.value.deadline || null,
      status: editedGoal.value.status,
      athleteID: athleteId.value,
      exerciseID: editedGoal.value.exerciseID,
    });

    // update local list
    const idx = goals.value.findIndex((g) => g.id === editedGoal.value.id);
    if (idx !== -1) {
      goals.value[idx] = {
        ...editedGoal.value,
        exerciseName:
          exerciseMap.value.get(editedGoal.value.exerciseID) ||
          goals.value[idx].exerciseName,
      };
    }
  } catch (err) {
    console.error("Error updating goal:", err);
  } finally {
    editDialog.value = false;
  }
};

const openAddDialog = () => {
  newGoal.value = {
    exerciseID: null,
    type: "",
    target: null,
    metric: "",
    status: "",
    deadline: null,
  };
  addDialog.value = true;
};

const saveNewGoal = async () => {
  if (!newGoal.value.exerciseID || !athleteId.value) return;

  try {
    const exerciseName =
      exerciseMap.value.get(newGoal.value.exerciseID) || "Exercise";

    const res = await GoalServices.create({
      type: newGoal.value.type || exerciseName,
      target: newGoal.value.target ?? 0,
      metric: newGoal.value.metric || "",
      deadline: newGoal.value.deadline || null,
      status: newGoal.value.status || "Not started",
      athleteID: athleteId.value,
      exerciseID: newGoal.value.exerciseID,
    });

    const created = res.data ?? res;

    goals.value.push({
      id: created.goalID,
      exerciseID: created.exerciseID,
      exerciseName,
      target: created.target,
      metric: created.metric,
      status: created.status,
      deadline: created.deadline?.slice?.(0, 10) || created.deadline || "",
      type: created.type,
    });

    addDialog.value = false;
  } catch (err) {
    console.error("Error creating goal:", err);
  }
};

const openDeleteGoal = (goal) => {
  goalToDelete.value = { ...goal };
  deleteDialog.value = true;
};

const confirmDeleteGoal = async () => {
  if (!goalToDelete.value) return;

  try {
    await GoalServices.delete(goalToDelete.value.id);

    goals.value = goals.value.filter(
      (g) => g.id !== goalToDelete.value.id
    );
    console.log("Goal deleted");
  } catch (error) {
    console.error("Delete goal failed:", error);
  } finally {
    deleteDialog.value = false;
    goalToDelete.value = null;
  }
};

// ---------- NEW: navigate to progress page ----------
const goToProgress = (goal) => {
  router.push(`/athlete/goals/${goal.id}/progress`);
};
</script>

<template>
  <v-container class="goals-container" fluid>
    <!-- Centered title with space under navbar -->
    <v-row justify="center">
      <v-col cols="12">
        <h2 class="goals-title text-center font-weight-bold">
          {{ athleteName }}'s Goals
        </h2>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <v-btn
            color="black"
            class="text-white"
            prepend-icon="mdi-plus"
            @click="openAddDialog"
          >
            Add Goal
          </v-btn>

          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search goals"
            variant="outlined"
            density="compact"
            hide-details
            class="w-50 small-input"
          />
        </div>

        <v-table class="goal-table" density="comfortable">
          <thead>
            <tr>
              <th class="text-left">Goal (Exercise)</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="2" class="text-center py-6">
                <v-progress-circular indeterminate color="black" />
              </td>
            </tr>

            <tr v-else-if="filteredGoals.length === 0">
              <td colspan="2" class="text-center py-4">
                No goals yet. Click "Add Goal" to create one.
              </td>
            </tr>

            <tr v-else v-for="goal in filteredGoals" :key="goal.id">
              <td>{{ goal.exerciseName }}</td>
              <td class="text-right">
                <v-btn
                  icon="mdi-eye"
                  variant="text"
                  color="black"
                  @click="viewGoal(goal)"
                />
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  color="black"
                  @click="openEditGoal(goal)"
                />
                <!-- NEW: progress button -->
                <v-btn
                  icon="mdi-chart-line"
                  variant="text"
                  color="green"
                  @click="goToProgress(goal)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  color="red"
                  @click="openDeleteGoal(goal)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <!-- View Goal Dialog -->
    <v-dialog v-model="viewDialog" max-width="400">
      <v-card>
        <v-card-title class="font-weight-bold">
          {{ goalToView?.exerciseName }} Goal
        </v-card-title>

        <v-card-text>
          <p><strong>Type:</strong> {{ goalToView?.type }}</p>
          <p><strong>Target:</strong> {{ goalToView?.target }}</p>
          <p><strong>Metric:</strong> {{ goalToView?.metric }}</p>
          <p><strong>Status:</strong> {{ goalToView?.status }}</p>
          <p><strong>Deadline:</strong> {{ goalToView?.deadline || "—" }}</p>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="viewDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Goal Dialog -->
    <v-dialog v-model="editDialog" max-width="420">
      <v-card>
        <v-card-title class="font-weight-bold">Edit Goal</v-card-title>

        <v-card-text>
          <v-text-field
            v-model="editedGoal.type"
            label="Goal Name / Type"
            density="compact"
          />
          <v-text-field
            v-model.number="editedGoal.target"
            label="Target"
            type="number"
            density="compact"
          />
          <v-text-field
            v-model="editedGoal.metric"
            label="Metric"
            density="compact"
          />
          <v-text-field
            v-model="editedGoal.status"
            label="Status"
            density="compact"
          />
          <v-text-field
            v-model="editedGoal.deadline"
            label="Deadline"
            type="date"
            density="compact"
          />
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn color="green" variant="elevated" @click="saveEdit">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Goal Dialog -->
    <v-dialog v-model="addDialog" max-width="420">
      <v-card>
        <v-card-title class="font-weight-bold">Add New Goal</v-card-title>

        <v-card-text>
          <v-select
            v-model="newGoal.exerciseID"
            :items="allExercises"
            item-title="name"
            item-value="exerciseID"
            label="Exercise *"
            density="compact"
          />
          <v-text-field
            v-model="newGoal.type"
            label="Goal Name / Type"
            density="compact"
          />
          <v-text-field
            v-model.number="newGoal.target"
            label="Target"
            type="number"
            density="compact"
          />
          <v-text-field
            v-model="newGoal.metric"
            label="Metric"
            density="compact"
          />
          <v-text-field
            v-model="newGoal.status"
            label="Status"
            density="compact"
          />
          <v-text-field
            v-model="newGoal.deadline"
            label="Deadline"
            type="date"
            density="compact"
          />
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="addDialog = false">Cancel</v-btn>
          <v-btn color="green" variant="elevated" @click="saveNewGoal">
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Goal Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="font-weight-bold">
          Delete Goal
        </v-card-title>

        <v-card-text>
          Are you sure you want to delete the goal
          <strong>{{ goalToDelete?.exerciseName }}</strong>?
          This action cannot be undone.
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-btn color="red" variant="elevated" @click="confirmDeleteGoal">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.goals-container {
  padding-top: 100px;
  padding-bottom: 32px;
  max-width: 100%;
}

.goals-title {
  margin-bottom: 24px;
}

.goal-table {
  width: 100%;
  background-color: #d9d9d9;
  border-radius: 12px;
}

.small-input {
  max-height: 36px;
  font-size: 0.85rem;
}

.small-input .v-field__input {
  padding: 4px 8px;
}
</style>
