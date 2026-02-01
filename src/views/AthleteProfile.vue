<template>
  <v-container class="dashboard-container" fluid>
    <v-row justify="center">
      <v-col cols="12" md="8">

       
        <v-card elevation="4" class="pa-6">
          <v-row>
           
            <v-col cols="12" md="4" class="d-flex justify-center align-center">
              <v-avatar size="150" class="mb-4">
                <v-icon size="120">mdi-account-circle</v-icon>
              </v-avatar>
            </v-col>

            
            <v-col cols="12" md="8" class="d-flex flex-column justify-center">
              <h1 class="font-weight-bold text-h4">{{ athlete.name }}</h1>
              <v-btn color="primary" class="mt-4" @click="openEdit">
                Edit Profile
              </v-btn>
            </v-col>
          </v-row>

          
          <v-card class="pa-4 mt-4" color="#b8ced8">
            <p><strong>Weight:</strong> {{ athlete.weight }} lb</p>
            <p><strong>Height:</strong> {{ athlete.height }}</p>
            <p><strong>Age:</strong> {{ athlete.age }}</p>
            <p><strong>Sport:</strong> {{ athlete.sport }}</p>
          </v-card>
        </v-card>
      </v-col>
    </v-row>

    
    <v-dialog v-model="editDialog" max-width="600px">
      <v-card class="pa-6">
        <h2 class="mb-4">Edit Profile</h2>

        <h2 class="mb-2">Edit Profile</h2>
        <p class="mb-4"><strong>Name:</strong> {{ athlete.name }}</p>

        <v-form v-model="isValid" v-slot="{ validate }">
          
          <v-text-field
            v-model="editForm.weight"
            label="Weight (lb)"
            :rules="[rules.required, rules.number]"
          />
          <v-text-field
            v-model="editForm.height"
            label="Height"
            :rules="[rules.required]"
          />
          <v-text-field
            v-model="editForm.age"
            label="Age"
            :rules="[rules.required, rules.number]"
          />
          <v-text-field
            v-model="editForm.sport"
            label="Sport"
            :rules="[rules.required]"
          />

          <v-card-actions class="mt-4">
            <v-spacer></v-spacer>
            <v-btn color="grey" @click="editDialog = false">Cancel</v-btn>
 
            <v-btn color="primary" @click="saveEdit(validate)">Save Changes</v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Utils from "../config/utils.js";
import athleteServices from "../services/athleteServices";


const athlete = ref({
  name: "",
  weight: "",
  height: "",
  age: "",
  sport: ""
});

const editDialog = ref(false);
const editForm = ref({});
const isValid = ref(false);


const athleteId = ref(null);


const rules = {
  required: (v) => !!v || "This field is required.",
  number: (v) => (!isNaN(Number(v)) && v !== "") || "Must be a number.",
  min2: (v) => (v && v.length >= 2) || "Must be at least 2 characters."
};


const mapAthlete = (data) => ({
  name: data.user?.name || data.name || "",
  weight: data.weight ?? "",
  height: data.height ?? "",
  age: data.age ?? "",
  sport: data.sport?.name || data.sport || ""
});


const loadAthlete = async () => {
  const user = Utils.getStore("user");

  if (!user) {
    console.error("No logged-in user found in local storage.");
    return;
  }

  
  if (user.athleteID) {
    athleteId.value = user.athleteID;

    const res = await athleteServices.get(athleteId.value);
    const data = res.data ?? res;

    athlete.value = mapAthlete(data);
    return;
  }

 
  const res = await athleteServices.getAll();
  const list = res.data ?? res;

  const found = (list || []).find((a) => a.userID === user.userID);

  if (!found) {
    console.warn("Could not find athlete record for userID:", user.userID);
    return;
  }

  athleteId.value = found.athleteID;
  athlete.value = mapAthlete(found);
};


onMounted(async () => {
  try {
    await loadAthlete();
  } catch (err) {
    console.error("Error loading athlete profile:", err);
  }
});


function openEdit() {
  editForm.value = { ...athlete.value };
  editDialog.value = true;
}


async function saveEdit(validate) {
  const valid = validate();
  if (!valid) return;

  if (!athleteId.value) {
    console.error("No athleteId available for update.");
    return;
  }

  try {
    await athleteServices.update(athleteId.value, {
      weight: editForm.value.weight,
      height: editForm.value.height,
      age: editForm.value.age,
      sport: editForm.value.sport,
    });

    athlete.value = {
      ...athlete.value,           
      weight: editForm.value.weight,
      height: editForm.value.height,
      age: editForm.value.age,
      sport: editForm.value.sport,
    };

    editDialog.value = false;
  } catch (err) {
    console.error("Error updating athlete profile:", err);
  }
}

</script>


<style scoped>
h1 {
  font-size: 32px;
}
p {
  font-size: 18px;
}
.dashboard-container {
  padding-top: 80px; 
}
</style>
