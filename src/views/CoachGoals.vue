<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import GoalServices from "../services/goalServices.js";
import ExerciseServices from "../services/exerciseServices.js";
import AthleteServices from "../services/athleteServices.js";

const route = useRoute();
const router = useRouter();

const athleteId = Number(route.params.athleteId);

const search = ref("");
const loading = ref(true);

const athleteName = ref("Athlete");
const goals = ref([]);
const allExercises = ref([]);

const deleteDialog = ref(false);
const goalToDelete = ref(null);

const editDialog = ref(false);
const goalToEdit = ref(null);
const editedGoal = ref({});

const viewDialog = ref(false);
const goalToView = ref(null);

const addDialog = ref(false);
const newGoal = ref({
  exerciseID: null,
  target: null,
  metric: "",
  status: "",
  deadline: null,
  type: "",
});

const exerciseMap = computed(() => {
  const m = new Map();
  allExercises.value.forEach((e) => {
    m.set(e.exerciseID, e.name);
  });
  return m;
});

const filteredGoals = computed(() =>
  goals.value.filter((g) =>
    g.exerciseName.toLowerCase().includes(search.value.toLowerCase())
  )
);

const availableExercisesForAdd = computed(() => {
  const usedIds = new Set(goals.value.map((g) => g.exerciseID));
  return allExercises.value.filter((e) => !usedIds.has(e.exerciseID));
});

const fetchAthleteName = async () => {
  try {
    const res = await AthleteServices.getAll();
    const data = res.data ?? res;
    const athlete = (data || []).find((a) => a.athleteID === athleteId);
    athleteName.value =
      athlete?.user?.name || athlete?.name || `Athlete #${athleteId}`;
  } catch (err) {
    console.error("Error fetching athlete name:", err);
    athleteName.value = `Athlete #${athleteId}`;
  }
};

const fetchExercises = async () => {
  const res = await ExerciseServices.getAll();
  const data = res.data ?? res;

  allExercises.value = (data || []).map((e) => ({
    exerciseID: e.exerciseID,
    name: e.name || "Untitled",
  }));
};

const fetchGoalsForAthlete = async () => {
  const res = await GoalServices.getAll();
  const data = res.data ?? res;

  const rawGoals = (data || []).filter(
    (g) => g.athleteID === athleteId
  );

  goals.value = rawGoals.map((g) => ({
    id: g.goalID,
    exerciseID: g.exerciseID,
    exerciseName:
      exerciseMap.value.get(g.exerciseID) ||
      `Exercise #${g.exerciseID}`,
    target: g.target,
    metric: g.metric,
    status: g.status,
    deadline: g.deadline,
    type: g.type,
  }));

  return rawGoals.length;
};

const seedGoalsIfNeeded = async () => {
  const count = await fetchGoalsForAthlete();
  if (count > 0) return;

  if (!allExercises.value.length) return;

  try {
    await Promise.all(
      allExercises.value.map((ex) =>
        GoalServices.create({
          type: ex.name,
          target: 0,
          metric: "",
          deadline: null,
          status: "Not started",
          athleteID: athleteId,
          exerciseID: ex.exerciseID,
        })
      )
    );
    await fetchGoalsForAthlete();
  } catch (err) {
    console.error("Error seeding goals:", err);
  }
};

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([fetchAthleteName(), fetchExercises()]);
    await seedGoalsIfNeeded();
  } catch (err) {
    console.error("Error loading coach goals page:", err);
  } finally {
    loading.value = false;
  }
});

const viewGoal = (goal) => {
  goalToView.value = goal;
  viewDialog.value = true;
};

const confirmDelete = (goal) => {
  goalToDelete.value = goal;
  deleteDialog.value = true;
};

const performDelete = async () => {
  try {
    await GoalServices.delete(goalToDelete.value.id);
    goals.value = goals.value.filter((g) => g.id !== goalToDelete.value.id);
  } catch (err) {
    console.error("Error deleting goal:", err);
  } finally {
    deleteDialog.value = false;
  }
};

const confirmEdit = (goal) => {
  goalToEdit.value = goal;
  editedGoal.value = { ...goal };
  editDialog.value = true;
};

const saveEdit = async () => {
  try {
    await GoalServices.update(editedGoal.value.id, {
      type: editedGoal.value.type,
      target: editedGoal.value.target,
      metric: editedGoal.value.metric,
      deadline: editedGoal.value.deadline,
      status: editedGoal.value.status,
      exerciseID: editedGoal.value.exerciseID,
      athleteID: athleteId,
    });

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
    target: null,
    metric: "",
    status: "",
    deadline: null,
    type: "",
  };
  addDialog.value = true;
};

const saveNewGoal = async () => {
  if (!newGoal.value.exerciseID) return;

  try {
    const exerciseName =
      exerciseMap.value.get(newGoal.value.exerciseID) || "Exercise";

    const res = await GoalServices.create({
      type: newGoal.value.type || exerciseName,
      target: newGoal.value.target ?? 0,
      metric: newGoal.value.metric || "",
      deadline: newGoal.value.deadline || null,
      status: newGoal.value.status || "Not started",
      athleteID: athleteId,
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
      deadline: created.deadline,
      type: created.type,
    });

    addDialog.value = false;
  } catch (err) {
    console.error("Error creating goal:", err);
  }
};

const goToProgress = (goal) => {
  router.push({
    name: "coachGoalProgress",
    params: {
      athleteId,
      goalId: goal.id,
    },
  });
};
</script>

<template>
  <v-container class="goals-container" fluid>
    <v-row justify="center" class="mt-10">
      <v-col cols="12">
        <h2 class="text-center mb-8 font-weight-bold">
          {{ athleteName }}'s Goals
        </h2>

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
            placeholder="Search Goal"
            density="compact"
            variant="outlined"
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

            <tr
              v-else
              v-for="goal in filteredGoals"
              :key="goal.id"
            >
              <td>{{ goal.exerciseName }}</td>
              <td class="text-right">
                <v-btn
                  icon="mdi-account-details-outline"
                  size="small"
                  color="black"
                  variant="text"
                  @click="viewGoal(goal)"
                />
                <v-btn
                  icon="mdi-chart-line"
                  size="small"
                  color="black"
                  variant="text"
                  @click="goToProgress(goal)"
                />
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  color="black"
                  variant="text"
                  @click="confirmEdit(goal)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  color="black"
                  variant="text"
                  @click="confirmDelete(goal)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- delete dialog -->
        <v-dialog v-model="deleteDialog" max-width="400">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Delete Goal
            </v-card-title>
            <v-card-text>
              <p>
                Are you sure you want to remove this exercise from
                {{ athleteName }}'s goals?
              </p>
              <p><strong>Exercise:</strong> {{ goalToDelete?.exerciseName }}</p>
            </v-card-text>

            <v-card-actions class="justify-end">
              <v-btn
                color="grey"
                variant="outlined"
                @click="deleteDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn color="red" variant="elevated" @click="performDelete">
                Delete
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- edit dialog -->
        <v-dialog v-model="editDialog" max-width="520">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Edit Goal — {{ goalToEdit?.exerciseName }}
            </v-card-title>
            <v-card-text>
              <v-select
                v-model="editedGoal.exerciseID"
                :items="allExercises"
                item-title="name"
                item-value="exerciseID"
                label="Exercise"
                density="compact"
              />
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
                label="Metric (e.g. reps, lbs)"
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
              <v-btn
                color="grey"
                variant="outlined"
                @click="editDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn color="green" variant="elevated" @click="saveEdit">
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- view dialog -->
        <v-dialog v-model="viewDialog" max-width="500">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Goal Details — {{ goalToView?.exerciseName }}
            </v-card-title>

            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <strong>Exercise:</strong> {{ goalToView?.exerciseName }}
                </v-list-item>

                <v-list-item>
                  <strong>Goal Type:</strong> {{ goalToView?.type || "—" }}
                </v-list-item>

                <v-list-item>
                  <strong>Target:</strong> {{ goalToView?.target ?? "—" }}
                </v-list-item>

                <v-list-item>
                  <strong>Metric:</strong> {{ goalToView?.metric || "—" }}
                </v-list-item>

                <v-list-item>
                  <strong>Status:</strong>
                  {{ goalToView?.status || "Not started" }}
                </v-list-item>

                <v-list-item>
                  <strong>Deadline:</strong>
                  {{ goalToView?.deadline || "—" }}
                </v-list-item>
              </v-list>
            </v-card-text>

            <v-card-actions class="justify-end">
              <v-btn color="grey" variant="outlined" @click="viewDialog = false">
                Close
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- add dialog -->
        <v-dialog v-model="addDialog" max-width="520">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Add Goal
            </v-card-title>
            <v-card-text>
              <v-select
                v-model="newGoal.exerciseID"
                :items="availableExercisesForAdd"
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
                label="Metric (e.g. reps, lbs)"
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
              <v-btn
                color="grey"
                variant="outlined"
                @click="addDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn color="green" variant="elevated" @click="saveNewGoal">
                Add
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <div class="text-right mt-3">
          <v-btn
            text
            class="text-grey-darken-2 text-decoration-underline"
            variant="plain"
          >
            View More
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.goals-container {
  padding-top: 50px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding-left: 2;
  padding-right: 2;
}

.goal-table {
  width: 100%;
  max-width: 100%;
  background-color: #d9d9d9;
  border-radius: 12px;
  margin: 20px auto;
}

th {
  font-weight: 700;
  color: black;
  background-color: #d9d9d9;
  text-align: left;
  padding: 12px;
}

td {
  background-color: #d9d9d9;
  border-top: 1px solid #bdbdbd;
}

.small-input {
  max-height: 36px;
  font-size: 0.85rem;
}

.small-input .v-field__input {
  padding: 4px 8px;
}
</style>
