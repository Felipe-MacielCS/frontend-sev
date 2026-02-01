<script setup>
import { ref, onMounted } from "vue";
import AthleteServices from "../services/athleteServices.js";
import UserServices from "../services/userServices.js";

const search = ref("");
const selectedSport = ref("All Sports");
const sports = ["All Sports"];
const athletes = ref([]);
const loading = ref(true);

const fetchAthletes = async () => {
  try {
    const res = await AthleteServices.getAll();
    athletes.value = res.map((a) => ({
      id: a.athleteID,
      name: a.user?.name || "Unknown",
      email: a.user?.email || "",
      sport: a.sport || "N/A",
      age: a.age || "-",
      weight: a.weight || "-",
      height: a.height || "-",
      isAdmin: a.user?.isAdmin || false,
    }));
    console.log("Loaded athletes:", athletes.value);
  } catch (error) {
    console.error("Error fetching athletes:", error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchAthletes);

const deleteDialog = ref(false);
const athleteToDelete = ref(null);

const editDialog = ref(false);
const athleteToEdit = ref(null);
const editedAthlete = ref({});

const viewDialog = ref(false);
const athleteToView = ref(null);

const viewAthlete = (athlete) => {
  athleteToView.value = athlete;
  viewDialog.value = true;
};

const confirmDelete = (athlete) => {
  athleteToDelete.value = athlete;
  deleteDialog.value = true;
};

const performDelete = async () => {
  try {
    await AthleteServices.delete(athleteToDelete.value.id);
    athletes.value = athletes.value.filter(a => a.id !== athleteToDelete.value.id);
  } catch (error) {
    console.error("Delete failed:", error);
  } finally {
    deleteDialog.value = false;
  }
};

const confirmEdit = (athlete) => {
  athleteToEdit.value = athlete;
  editedAthlete.value = { ...athlete };
  editDialog.value = true;
};

const saveEdit = async () => {
  try {
    await AthleteServices.update(editedAthlete.value.id, {
      sport: editedAthlete.value.sport,
      age: editedAthlete.value.age,
      weight: editedAthlete.value.weight,
      height: editedAthlete.value.height,
    });

    await UserServices.update(editedAthlete.value.id, {
      isAdmin: editedAthlete.value.isAdmin,
    });

    const index = athletes.value.findIndex(a => a.id === editedAthlete.value.id);
    if (index !== -1) {
      athletes.value[index] = { ...editedAthlete.value };
    }

    console.log("Athlete and admin status updated");
  } catch (error) {
    console.error("Edit failed:", error);
  } finally {
    editDialog.value = false;
  }
};

</script>

<template>
  <v-container class="athletes-container" fluid>
    <v-row justify="center" class="mt-10">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <!-- <v-select
            v-model="selectedSport"
            :items="sports"
            label="Sports"
            density="compact"
            variant="outlined"
            class="w-25 small-input"
          ></v-select> -->

          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search Athlete"
            density="compact"
            variant="outlined"
            hide-details
            class="w-50 small-input"
          ></v-text-field>
        </div>

        <v-table class="athlete-table" density="comfortable">
          <thead>
            <tr>
              <th class="text-left">Athlete Name</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="athlete in athletes.filter((a) =>
                a.name.toLowerCase().includes(search.toLowerCase())
              )"
              :key="athlete.name"
            >
              <td>{{ athlete.name }}</td>
              <td class="text-right">
                <v-btn
                  icon="mdi-account-details-outline"
                  size="small"
                  color="black"
                  variant="text"
                  @click="viewAthlete(athlete)"
                ></v-btn>
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  color="black"
                  variant="text"
                  @click="confirmEdit(athlete)"
                ></v-btn>
                <v-btn
                icon="mdi-delete"
                size="small"
                color="black"
                variant="text"
                @click="confirmDelete(athlete)"
                ></v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-dialog v-model="deleteDialog" max-width="400">
            <v-card>
                <v-card-title class="text-h6 font-weight-bold">Delete</v-card-title>
                <v-card-text>
                <p>Are you sure you want to delete this athlete?</p>
                <p><strong>Athlete Name:</strong> {{ athleteToDelete?.name }}</p>
                <p><strong>Sport:</strong> {{ athleteToDelete?.sport }} </p>
                </v-card-text>

                <v-card-actions class="justify-end">
                <v-btn color="grey" variant="outlined" @click="deleteDialog = false">
                    Cancel
                </v-btn>
                <v-btn color="red" variant="elevated" @click="performDelete">
                    Delete
                </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="editDialog" max-width="400">
            <v-card>
                <v-card-title class="text-h6 font-weight-bold">Edit — {{ athleteToEdit?.name }}</v-card-title>
                <v-card-text>
                <v-text-field v-model="editedAthlete.sport" label="Sport" density="compact"></v-text-field>
                <v-text-field v-model="editedAthlete.age" label="Age" type="number" density="compact"></v-text-field>
                <v-text-field v-model="editedAthlete.weight" label="Weight" type="number" density="compact"></v-text-field>
                <v-text-field v-model="editedAthlete.height" label="Height" type="number" density="compact"></v-text-field>
                <v-switch v-model="editedAthlete.isAdmin" label="Is Admin?" color="green" hide-details></v-switch>
                </v-card-text>

                <v-card-actions class="justify-end">
                <v-btn color="grey" variant="outlined" @click="editDialog = false">
                    Cancel
                </v-btn>
                <v-btn color="green" variant="elevated" @click="saveEdit">
                    Save
                </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="viewDialog" max-width="450">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">
              Athlete Details
            </v-card-title>

            <v-card-text>
              <v-list density="compact">
                <v-list-item><strong>Name:</strong> {{ athleteToView?.name }}</v-list-item>
                <v-list-item><strong>Email:</strong> {{ athleteToView?.email }}</v-list-item>
                <v-list-item><strong>Sport:</strong> {{ athleteToView?.sport }}</v-list-item>
                <v-list-item><strong>Age:</strong> {{ athleteToView?.age }}</v-list-item>
                <v-list-item><strong>Weight:</strong> {{ athleteToView?.weight }} kg</v-list-item>
                <v-list-item><strong>Height:</strong> {{ athleteToView?.height }} cm</v-list-item>
                <v-list-item>
                    <strong>Admin Status:</strong>
                    <v-chip
                      :color="athleteToView?.isAdmin ? 'green' : 'grey'"
                      label
                      class="ml-2"
                    >
                      {{ athleteToView?.isAdmin ? 'Admin' : 'Athlete' }}
                    </v-chip>
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
.athletes-container {
  padding-top: 50px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding-left: 2;
  padding-right: 2;
}

.athlete-table {
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
