/**
 * Vuetify3 Plugin
 */
import { createVuetify } from "vuetify";

// Misc
import { loadFonts } from "./webfontloader";
loadFonts();

// Styles
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

const myCustomLightTheme = {
  dark: false,
  colors: {
    primary: "#80162B",
    secondary: "#E1E1E1",
    accent: "#47121D",
    success: "#47121D",
    error: "#EE5044",
    teal: "#63BAC0",
    blue: "#196CA2",
    yellow: "#F8C545",
    darkblue: "#032F45",
  },
};

const myCustomDarkTheme = {
  dark: true,
  colors: {
    primary: "#b44a5f",
    secondary: "#1f2430",
    accent: "#d46a7f",
    success: "#3f8f62",
    error: "#ff7b72",
    teal: "#63bac0",
    blue: "#5fa8ff",
    yellow: "#f8c545",
    darkblue: "#0f1722",
    background: "#11161d",
    surface: "#1b222c",
  },
};

const vuetify = createVuetify({
  theme: {
    defaultTheme: "myCustomLightTheme",
    themes: {
      myCustomLightTheme,
      myCustomDarkTheme,
    },
  },
  icons: {
    defaultSet: "mdi",
  },
});

export default vuetify;
