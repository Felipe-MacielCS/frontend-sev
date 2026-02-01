<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import SocialLogin from "../components/SocialLogin.vue";


const selectedRole = ref(null);

const selectRole = (role) => {
  selectedRole.value = role; 
  sessionStorage.setItem("signupRole", role); 
};
</script>

<template>
  <v-sheet
    class="d-flex flex-column align-center"
    height="100vh"
    width="100vw"
    style="background-color: #f2f2f2; overflow: hidden; margin: 0; padding: 0;"
  >
    <div class="d-flex flex-column align-center mt-10">
      <v-card
        class="pa-8 d-flex flex-column align-center justify-center"
        elevation="5"
        width="600"
        style="background-color: #e0e0e0; border-radius: 16px;"
      >
        <template v-if="!selectedRole">
          <h2 class="mb-8 text-center font-weight-bold">What are you?</h2>
          <div class="d-flex justify-space-around w-100">
          
            <v-card
              class="pa-6 d-flex flex-column align-center"
              elevation="2"
              width="200"
              @click="selectRole('athlete')"
              style="cursor:pointer;"
            >
              <v-icon size="64" color="black">mdi-weight-lifter</v-icon>
              <v-btn class="mt-4" color="grey-darken-1" variant="elevated">
                I am an Athlete!
              </v-btn>
            </v-card>

            <v-card
              class="pa-6 d-flex flex-column align-center"
              elevation="2"
              width="200"
              @click="selectRole('coach')"
              style="cursor:pointer;"
            >
              <v-icon size="64" color="black">mdi-whistle</v-icon>
              <v-btn class="mt-4" color="grey-darken-1" variant="elevated">
                I am a Coach!
              </v-btn>
            </v-card>
          </div>
        </template>

        <template v-else>
          <h2 class="mb-6 text-center font-weight-bold">
            Sign up as {{ selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) }}
          </h2>

          <SocialLogin />

          <v-btn
            class="mt-6"
            color="grey-darken-1"
            variant="elevated"
            @click="selectedRole = null"
          >
            Go Back
          </v-btn>
        </template>
      </v-card>
    </div>
  </v-sheet>
</template>
