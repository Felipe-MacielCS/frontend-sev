<script setup>
import SocialLogin from "../components/SocialLogin.vue";
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
      width="500"
      height="300"
      style="background-color: #e0e0e0; border-radius: 16px;"
    >
      <h2 class="mb-6 text-center font-weight-bold">Login</h2>

      <SocialLogin />

      <div class="mt-4 mb-2 text-center font-weight-medium">Or</div>

      <v-btn color="grey-darken-1" variant="elevated" class="text-white px-8" @click="goToSignUp">
        SIGN UP
      </v-btn>
    </v-card>
  </div>
</v-sheet>

</template>


<script>
export default {
  methods: {
    goToSignUp() {
      this.$router.push("/signup");
    },
  },
};
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
