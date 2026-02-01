<script setup>
import { ref, onMounted } from "vue";
import ExerciseServices from "../services/exerciseServices.js";

const search = ref("");
const exercises = ref([]);
const loading = ref(true);

const deleteDialog = ref(false);
const exerciseToDelete = ref(null);

const editDialog = ref(false);
const exerciseToEdit = ref(null);
const editedExercise = ref({});

const viewDialog = ref(false);
const exerciseToView = ref(null);

const addDialog = ref(false);
const newExercise = ref({
  name: "",
  muscle_group: "",
  equipment: "",
  description: "",
});

const fetchExercises = async () => {
  loading.value = true;
  try {
    const res = await ExerciseServices.getAll();
    const data = res.data ?? res; 

    exercises.value = (data || []).map((e) => ({
      id: e.exerciseID,
      name: e.name || "Untitled",
      equipment: e.equipment || "None",
      description: e.description || "",
      muscle_group: e.muscle_group || "N/A",
    }));

    console.log("Loaded exercises:", exercises.value);
  } catch (error) {
    console.error("Error fetching exercises:", error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchExercises);

const viewExercise = (exercise) => {
  exerciseToView.value = exercise;
  viewDialog.value = true;
};

const confirmDelete = (exercise) => {
  exerciseToDelete.value = exercise;
  deleteDialog.value = true;
};

const performDelete = async () => {
  try {
    await ExerciseServices.delete(exerciseToDelete.value.id);

    exercises.value = exercises.value.filter(
      (e) => e.id !== exerciseToDelete.value.id
    );
    console.log("Exercise deleted");
  } catch (error) {
    console.error("Delete failed:", error);
  } finally {
    deleteDialog.value = false;
  }
};

const confirmEdit = (exercise) => {
  exerciseToEdit.value = exercise;
  editedExercise.value = { ...exercise };
  editDialog.value = true;
};

const saveEdit = async () => {
  try {
    await ExerciseServices.update(editedExercise.value.id, {
      name: editedExercise.value.name,
      equipment: editedExercise.value.equipment,
      description: editedExercise.value.description,
      muscle_group: editedExercise.value.muscle_group,
    });

    const index = exercises.value.findIndex(
      (e) => e.id === editedExercise.value.id
    );
    if (index !== -1) {
      exercises.value[index] = { ...editedExercise.value };
    }

    console.log("Exercise updated");
  } catch (error) {
    console.error("Edit failed:", error);
  } finally {
    editDialog.value = false;
  }
};

const filteredExercises = () =>
  exercises.value.filter((e) =>
    e.name.toLowerCase().includes(search.value.toLowerCase())
  );

const openAddDialog = () => {
  newExercise.value = {
    name: "",
    muscle_group: "",
    equipment: "",
    description: "",
  };
  addDialog.value = true;
};

const saveNewExercise = async () => {
  if (!newExercise.value.name.trim()) {
    return;
  }

  try {
    const res = await ExerciseServices.create({
      name: newExercise.value.name,
      equipment: newExercise.value.equipment || null,
      description: newExercise.value.description || null,
      muscle_group: newExercise.value.muscle_group || null,
    });

    const created = res.data ?? res;

    exercises.value.push({
      id: created.exerciseID,
      name: created.name || "None",
      equipment: created.equipment || "None",
      description: created.description || "",
      muscle_group: created.muscle_group || "",
    });

    console.log("Exercise created");
    addDialog.value = false;
  } catch (error) {
    console.error("Create failed:", error);
  }
};
</script>


<template>
  <v-container class="exercises-container" fluid>
    <v-row justify="center" class="mt-10">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <v-btn
            color="black"
            class="text-white"
            prepend-icon="mdi-plus"
            @click="openAddDialog"
          >
            Add Exercise
          </v-btn>

          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search Exercise"
            density="compact"
            variant="outlined"
            hide-details
            class="w-50 small-input"
          />
        </div>

        <!-- Table -->
        <v-table class="exercise-table" density="comfortable">
          <thead>
            <tr>
              <th class="text-left">Exercise Name</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading row -->
            <tr v-if="loading">
              <td colspan="2" class="text-center py-6">
                <v-progress-circular indeterminate color="black" />
              </td>
            </tr>

            <!-- Data rows -->
            <tr
              v-else
              v-for="exercise in filteredExercises()"
              :key="exercise.id"
            >
              <td>{{ exercise.name }}</td>
              <td class="text-right">
                <v-btn
                  icon="mdi-account-details-outline"
                  size="small"
                  color="black"
                  variant="text"
                  @click="viewExercise(exercise)"
                />
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  color="black"
                  variant="text"
                  @click="confirmEdit(exercise)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  color="black"
                  variant="text"
                  @click="confirmDelete(exercise)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- Delete dialog -->
        <v-dialog v-model="deleteDialog" max-width="400">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Delete Exercise
            </v-card-title>
            <v-card-text>
              <p>Are you sure you want to delete this exercise?</p>
              <p><strong>Exercise Name:</strong> {{ exerciseToDelete?.name }}</p>
              <p>
                <strong>Muscle Group:</strong>
                {{ exerciseToDelete?.muscle_group }}
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

        <!-- Edit dialog -->
        <v-dialog v-model="editDialog" max-width="500">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Edit — {{ exerciseToEdit?.name }}
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="editedExercise.name"
                label="Name"
                density="compact"
              />
              <v-text-field
                v-model="editedExercise.muscle_group"
                label="Muscle Group"
                density="compact"
              />
              <v-text-field
                v-model="editedExercise.equipment"
                label="Equipment"
                density="compact"
              />
              <v-textarea
                v-model="editedExercise.description"
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

        <!-- View dialog -->
        <v-dialog v-model="viewDialog" max-width="500">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Exercise Details
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <strong>Name:</strong> {{ exerciseToView?.name }}
                </v-list-item>
                <v-list-item>
                  <strong>Muscle Group:</strong>
                  {{ exerciseToView?.muscle_group }}
                </v-list-item>
                <v-list-item>
                  <strong>Equipment:</strong>
                  {{ exerciseToView?.equipment }}
                </v-list-item>
                <v-list-item>
                  <strong>Description:</strong>
                  {{ exerciseToView?.description || "—" }}
                </v-list-item>
              </v-list>
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

        <!-- Add dialog -->
        <v-dialog v-model="addDialog" max-width="500">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Add Exercise
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="newExercise.name"
                label="Name *"
                density="compact"
                required
              />
              <v-text-field
                v-model="newExercise.muscle_group"
                label="Muscle Group"
                density="compact"
              />
              <v-text-field
                v-model="newExercise.equipment"
                label="Equipment"
                density="compact"
              />
              <v-textarea
                v-model="newExercise.description"
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
              <v-btn color="green" variant="elevated" @click="saveNewExercise">
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
.exercises-container {
  padding-top: 50px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding-left: 2;
  padding-right: 2;
}

.exercise-table {
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
</style>
