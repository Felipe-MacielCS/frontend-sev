<script setup>
import { ref, onMounted, computed } from "vue";
import Utils from "../config/utils.js";

import ExercisePlanServices from "../services/exerciseplanServices.js";
import CoachServices from "../services/coachServices.js";
import ExerciseServices from "../services/exerciseServices.js";
import ExercisePoolServices from "../services/exercisepoolServices.js";
import AthleteServices from "../services/athleteServices.js";
import PlanAssignmentServices from "../services/planAssignmentServices.js";

const currentUser = ref(Utils.getStore("user") || {});
const currentCoachID = ref(null);
const currentPlanAssignments = ref([]);

const search = ref("");
const plans = ref([]);
const coaches = ref([]);
const loading = ref(true);

const deleteDialog = ref(false);
const planToDelete = ref(null);

const editDialog = ref(false);
const planToEdit = ref(null);
const editedPlan = ref({});

const viewDialog = ref(false);
const planToView = ref(null);

const addDialog = ref(false);
const newPlan = ref({
  name: "",
  description: "",
});

const getCoachName = (coachID) => {
  const coach = coaches.value.find((c) => c.coachID === coachID);
  return coach ? coach.user?.name || `Coach #${coachID}` : `Coach #${coachID}`;
};

const fetchCoaches = async () => {
  try {
    const res = await CoachServices.getAll();
    const data = res.data ?? res;
    coaches.value = data || [];
    console.log("Loaded coaches:", coaches.value);

    if (currentUser.value && currentUser.value.userID) {
      const mine = coaches.value.find(
        (c) =>
          c.userID === currentUser.value.userID ||
          c.user?.userID === currentUser.value.userID
      );
      if (mine) {
        currentCoachID.value = mine.coachID;
        console.log("Current coach ID:", currentCoachID.value);
      } else {
        console.warn(
          "No coach profile found for current userID:",
          currentUser.value.userID
        );
      }
    }
  } catch (err) {
    console.error("Error fetching coaches:", err);
  }
};

const exercises = ref([]);
const poolEntries = ref([]); 

const manageDialog = ref(false);
const planForExercises = ref(null);

const newPoolEntry = ref({
  exerciseID: null,
  sets: null,
  repetitions: null,
});

const editPoolDialog = ref(false);
const poolEntryToEdit = ref(null);
const editedPoolEntry = ref({});

const exerciseOptions = computed(() =>
  exercises.value.map((e) => ({
    title: e.name || `Exercise #${e.exerciseID}`,
    value: e.exerciseID,
  }))
);

const planExercises = computed(() => {
  if (!planForExercises.value) return [];
  return poolEntries.value
    .filter((pe) => pe.planID === planForExercises.value.id)
    .map((pe) => {
      const ex = exercises.value.find((e) => e.exerciseID === pe.exerciseID);
      return {
        planID: pe.planID,
        exerciseID: pe.exerciseID,
        sets: pe.sets,
        repetitions: pe.repetitions,
        exerciseName: ex?.name || `Exercise #${pe.exerciseID}`,
      };
    });
});

const athletes = ref([]);
const assignDialog = ref(false);
const planToAssign = ref(null);
const selectedAthletes = ref([]);

const fetchAthletes = async () => {
  try {
    const res = await AthleteServices.getAll();
    const data = res.data ?? res;
    athletes.value = data || [];
    console.log("Loaded athletes:", athletes.value);
  } catch (err) {
    console.error("Error fetching athletes:", err);
  }
};

const athleteOptions = computed(() =>
  athletes.value.map((a) => ({
    title: a.user?.name || `Athlete #${a.athleteID}`,
    value: a.athleteID,
  }))
);

const openAssignDialog = async (plan) => {
  planToAssign.value = plan;
  selectedAthletes.value = [];
  currentPlanAssignments.value = [];
  assignDialog.value = true;

  try {
    const res = await PlanAssignmentServices.getAll({ planID: plan.id });
    const data = res.data ?? res;
    const ids = (data || []).map((row) => row.athleteID);

    currentPlanAssignments.value = ids;
    selectedAthletes.value = [...ids];
    console.log("Loaded assignments for plan", plan.id, ":", ids);
  } catch (err) {
    console.error("Error fetching assignments for plan:", err);
  }
};


const saveAssignments = async () => {
  if (!planToAssign.value?.id) return;

  try {
    const oldSet = new Set(currentPlanAssignments.value);
    const newSet = new Set(selectedAthletes.value);

    const toAdd = [...newSet].filter((id) => !oldSet.has(id));
    const toRemove = [...oldSet].filter((id) => !newSet.has(id));

    await Promise.all([
      ...toAdd.map((athleteID) =>
        PlanAssignmentServices.create({
          planID: planToAssign.value.id,
          athleteID,
        })
      ),
      ...toRemove.map((athleteID) =>
        PlanAssignmentServices.delete(planToAssign.value.id, athleteID)
      ),
    ]);

    console.log(
      "Assignments updated for plan",
      planToAssign.value.id,
      "Added:",
      toAdd,
      "Removed:",
      toRemove
    );

    currentPlanAssignments.value = [...newSet];

    assignDialog.value = false;
  } catch (err) {
    console.error("Assign plan failed:", err);
  }
};


const fetchPlans = async () => {
  loading.value = true;
  try {
    const res = await ExercisePlanServices.getAll();
    const data = res.data ?? res;

    let raw = data || [];

    if (currentCoachID.value) {
      raw = raw.filter((p) => p.coachID === currentCoachID.value);
    }

    plans.value = raw.map((p) => ({
      id: p.planID,
      name: p.name || "Untitled Plan",
      description: p.description || "",
      coachID: p.coachID,
    }));

    console.log("Loaded plans for this coach:", plans.value);
  } catch (err) {
    console.error("Error fetching exercise plans:", err);
  } finally {
    loading.value = false;
  }
};

const fetchExercises = async () => {
  try {
    const res = await ExerciseServices.getAll();
    const data = res.data ?? res;
    exercises.value = data || [];
    console.log("Loaded exercises for pool:", exercises.value);
  } catch (err) {
    console.error("Error fetching exercises:", err);
  }
};

const fetchPoolEntries = async () => {
  try {
    const res = await ExercisePoolServices.getAll();
    const data = res.data ?? res;
    poolEntries.value = data || [];
    console.log("Loaded exercise pool entries:", poolEntries.value);
  } catch (err) {
    console.error("Error fetching exercise pool entries:", err);
  }
};

onMounted(async () => {
  await fetchCoaches();
  await Promise.all([
    fetchPlans(),
    fetchExercises(),
    fetchPoolEntries(),
    fetchAthletes(),
  ]);
});

const filteredPlans = computed(() =>
  plans.value.filter((p) =>
    p.name.toLowerCase().includes(search.value.toLowerCase())
  )
);

const viewPlan = (plan) => {
  planToView.value = plan;
  viewDialog.value = true;
};

const confirmDelete = (plan) => {
  planToDelete.value = plan;
  deleteDialog.value = true;
};

const performDelete = async () => {
  try {
    await ExercisePlanServices.delete(planToDelete.value.id);
    plans.value = plans.value.filter((p) => p.id !== planToDelete.value.id);
    console.log("Exercise plan deleted");
  } catch (err) {
    console.error("Delete plan failed:", err);
  } finally {
    deleteDialog.value = false;
  }
};

const confirmEdit = (plan) => {
  planToEdit.value = plan;
  editedPlan.value = { ...plan };
  editDialog.value = true;
};

const saveEdit = async () => {
  if (!editedPlan.value.name?.trim()) {
    return;
  }

  try {
    await ExercisePlanServices.update(editedPlan.value.id, {
      name: editedPlan.value.name,
      description: editedPlan.value.description,
      coachID: editedPlan.value.coachID,
    });

    const idx = plans.value.findIndex((p) => p.id === editedPlan.value.id);
    if (idx !== -1) {
      plans.value[idx] = { ...editedPlan.value };
    }

    console.log("Exercise plan updated");
  } catch (err) {
    console.error("Update plan failed:", err);
  } finally {
    editDialog.value = false;
  }
};

const openAddDialog = () => {
  newPlan.value = {
    name: "",
    description: "",
  };
  addDialog.value = true;
};

const saveNewPlan = async () => {
  if (!newPlan.value.name?.trim() || !currentCoachID.value) {
    console.warn("Missing plan name or currentCoachID");
    return;
  }

  try {
    const res = await ExercisePlanServices.create({
      name: newPlan.value.name,
      description: newPlan.value.description,
      coachID: currentCoachID.value,
    });

    const p = res.data ?? res;

    plans.value.push({
      id: p.planID,
      name: p.name || "Untitled Plan",
      description: p.description || "",
      coachID: p.coachID,
    });

    console.log("Exercise plan created");
    addDialog.value = false;
  } catch (err) {
    console.error("Create plan failed:", err);
  }
};

const openManageExercises = (plan) => {
  planForExercises.value = plan;
  manageDialog.value = true;
};

const saveNewPoolEntry = async () => {
  if (!planForExercises.value?.id || !newPoolEntry.value.exerciseID) return;

  try {
    const res = await ExercisePoolServices.create({
      planID: planForExercises.value.id,
      exerciseID: newPoolEntry.value.exerciseID,
      sets: newPoolEntry.value.sets,
      repetitions: newPoolEntry.value.repetitions,
    });

    const row = res.data ?? res;
    poolEntries.value.push(row);

    console.log("Exercise added to plan");
    newPoolEntry.value = { exerciseID: null, sets: null, repetitions: null };
  } catch (err) {
    console.error("Create pool entry failed:", err);
  }
};

const deletePoolEntry = async (exerciseID, planID) => {
  try {
    await ExercisePoolServices.delete(exerciseID, planID);
    poolEntries.value = poolEntries.value.filter(
      (pe) => !(pe.exerciseID === exerciseID && pe.planID === planID)
    );
    console.log("Exercise removed from plan");
  } catch (err) {
    console.error("Delete pool entry failed:", err);
  }
};

const openEditPoolEntry = (entry) => {
  poolEntryToEdit.value = entry;
  editedPoolEntry.value = {
    exerciseID: entry.exerciseID,
    planID: entry.planID,
    sets: entry.sets,
    repetitions: entry.repetitions,
  };
  editPoolDialog.value = true;
};

const saveEditedPoolEntry = async () => {
  try {
    await ExercisePoolServices.update(
      editedPoolEntry.value.exerciseID,
      editedPoolEntry.value.planID,
      {
        sets: editedPoolEntry.value.sets,
        repetitions: editedPoolEntry.value.repetitions,
      }
    );

    const idx = poolEntries.value.findIndex(
      (pe) =>
        pe.exerciseID === editedPoolEntry.value.exerciseID &&
        pe.planID === editedPoolEntry.value.planID
    );
    if (idx !== -1) {
      poolEntries.value[idx] = {
        ...poolEntries.value[idx],
        sets: editedPoolEntry.value.sets,
        repetitions: editedPoolEntry.value.repetitions,
      };
    }

    console.log("Pool entry updated");
  } catch (err) {
    console.error("Update pool entry failed:", err);
  } finally {
    editPoolDialog.value = false;
  }
};
</script>
<template>
  <v-container class="plans-container" fluid>
    <v-row justify="center" class="mt-10">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <v-btn
            color="black"
            class="text-white"
            prepend-icon="mdi-plus"
            @click="openAddDialog"
          >
            Add Exercise Plan
          </v-btn>
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search Plan"
            density="compact"
            variant="outlined"
            hide-details
            class="w-50 small-input"
          />
        </div>
        <v-table class="plans-table" density="comfortable">
          <thead>
            <tr>
              <th class="text-left">Plan Name</th>
              <th class="text-left">Coach</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="3" class="text-center py-6">
                <v-progress-circular indeterminate color="black" />
              </td>
            </tr>

            <tr v-else v-for="plan in filteredPlans" :key="plan.id">
              <td>{{ plan.name }}</td>
              <td>{{ getCoachName(plan.coachID) }}</td>
              <td class="text-right">
                <v-btn
                  icon="mdi-account-details-outline"
                  size="small"
                  color="black"
                  variant="text"
                  @click="viewPlan(plan)"
                />
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  color="black"
                  variant="text"
                  @click="confirmEdit(plan)"
                />
                <v-btn
                  icon="mdi-clipboard-list-outline"
                  size="small"
                  color="black"
                  variant="text"
                  @click="openManageExercises(plan)"
                />
                <v-btn
                  icon="mdi-account-multiple-outline"
                  size="small"
                  color="black"
                  variant="text"
                  @click="openAssignDialog(plan)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  color="black"
                  variant="text"
                  @click="confirmDelete(plan)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-dialog v-model="deleteDialog" max-width="400">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Delete Exercise Plan
            </v-card-title>
            <v-card-text>
              <p>Are you sure you want to delete this plan?</p>
              <p><strong>Plan Name:</strong> {{ planToDelete?.name }}</p>
              <p>
                <strong>Coach:</strong>
                {{ planToDelete ? getCoachName(planToDelete.coachID) : "" }}
              </p>
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
        <v-dialog v-model="editDialog" max-width="520">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Edit — {{ planToEdit?.name }}
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="editedPlan.name"
                label="Plan Name *"
                density="compact"
              />
              <v-text-field
                :model-value="getCoachName(editedPlan.coachID)"
                label="Coach"
                density="compact"
                readonly
              />
              <v-textarea
                v-model="editedPlan.description"
                label="Description"
                rows="3"
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
        <v-dialog v-model="addDialog" max-width="520">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Add Exercise Plan
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="newPlan.name"
                label="Plan Name *"
                density="compact"
                required
              />
              <v-text-field
                :model-value="currentUser?.name || 'Current Coach'"
                label="Coach"
                density="compact"
                readonly
              />
              <v-textarea
                v-model="newPlan.description"
                label="Description"
                rows="3"
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
              <v-btn color="green" variant="elevated" @click="saveNewPlan">
                Add
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-dialog v-model="viewDialog" max-width="500">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Plan Details
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <strong>Name:</strong> {{ planToView?.name }}
                </v-list-item>
                <v-list-item>
                  <strong>Coach:</strong>
                  {{ planToView ? getCoachName(planToView.coachID) : "" }}
                </v-list-item>
                <v-list-item>
                  <strong>Description:</strong>
                  {{ planToView?.description || "—" }}
                </v-list-item>
              </v-list>
              <div class="mt-4 text-caption text-grey-darken-1">
                To manage exercises (sets &amp; reps), use the clipboard icon in the
                plans table.
              </div>
            </v-card-text>

            <v-card-actions class="justify-end">
              <v-btn
                color="grey"
                variant="outlined"
                @click="viewDialog = false"
              >
                Close
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-dialog v-model="manageDialog" max-width="700">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Manage Exercises — {{ planForExercises?.name }}
            </v-card-title>

            <v-card-text>

              <v-row class="mb-4 add-exercise-row" align="center">
                <v-col cols="5">
                  <v-select
                    v-model="newPoolEntry.exerciseID"
                    :items="exerciseOptions"
                    label="Exercise"
                    density="compact"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model="newPoolEntry.sets"
                    type="number"
                    label="Sets"
                    density="compact"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="3">
                  <v-text-field
                    v-model="newPoolEntry.repetitions"
                    type="number"
                    label="Reps"
                    density="compact"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="1" class="d-flex justify-center">
                  <v-btn
                    icon="mdi-plus"
                    color="black"
                    variant="elevated"
                    class="add-btn"
                    @click="saveNewPoolEntry"
                  />
                </v-col>
              </v-row>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th class="text-center">Sets</th>
                    <th class="text-center">Reps</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="planExercises.length === 0">
                    <td colspan="4" class="text-center py-4">
                      No exercises in this plan yet.
                    </td>
                  </tr>
                  <tr
                    v-for="entry in planExercises"
                    :key="entry.planID + '-' + entry.exerciseID"
                  >
                    <td>{{ entry.exerciseName }}</td>
                    <td class="text-center">{{ entry.sets }}</td>
                    <td class="text-center">{{ entry.repetitions }}</td>
                    <td class="text-right">
                      <v-btn
                        icon="mdi-pencil"
                        size="small"
                        variant="text"
                        @click="openEditPoolEntry(entry)"
                      />
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        @click="deletePoolEntry(entry.exerciseID, entry.planID)"
                      />
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn color="grey" variant="outlined" @click="manageDialog = false">
                Close
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-dialog v-model="editPoolDialog" max-width="400">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Edit Sets / Reps
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="editedPoolEntry.sets"
                type="number"
                label="Sets"
                density="compact"
              />
              <v-text-field
                v-model="editedPoolEntry.repetitions"
                type="number"
                label="Reps"
                density="compact"
              />
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn
                color="grey"
                variant="outlined"
                @click="editPoolDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn color="green" variant="elevated" @click="saveEditedPoolEntry">
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>


        <v-dialog v-model="assignDialog" max-width="500">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Assign Plan — {{ planToAssign?.name }}
            </v-card-title>
            <v-card-text>
              <v-autocomplete
                v-model="selectedAthletes"
                :items="athleteOptions"
                label="Select Athletes"
                multiple
                chips
                closable-chips
                density="compact"
                variant="outlined"
              />
              <div class="mt-2 text-caption text-grey-darken-1">
              </div>
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn
                color="grey"
                variant="outlined"
                @click="assignDialog = false"
              >
                Cancel
              </v-btn>
              <v-btn color="green" variant="elevated" @click="saveAssignments">
                Save
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
.plans-container {
  padding-top: 50px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding-left: 2;
  padding-right: 2;
}

.plans-table {
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

.v-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.small-input {
  max-height: 36px;
  font-size: 0.85rem;
}

.small-input .v-field__input {
  padding: 4px 8px;
}

/* Manage-exercises row layout */
.add-exercise-row {
  padding-right: 8px;
}

/* Square black + button */
.add-btn {
  background-color: black !important;
  color: white !important;
  border-radius: 10px !important;
  width: 42px !important;
  height: 42px !important;
  margin-top: 4px;
}

.add-exercise-row .v-col {
  padding-right: 6px;
}
</style>
