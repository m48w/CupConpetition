import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tempDataPlugin } from "./server/tempDataPlugin";

export default defineConfig({
  plugins: [react(), tempDataPlugin()],
});
