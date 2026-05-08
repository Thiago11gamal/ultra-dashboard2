// vite.config.js
import { defineConfig } from "file:///C:/Users/antun.BOOK-201QO8FPFE/Downloads/ultra-patched/ultra-patched/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/antun.BOOK-201QO8FPFE/Downloads/ultra-patched/ultra-patched/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/antun.BOOK-201QO8FPFE/Downloads/ultra-patched/ultra-patched/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ["VITE_", "ID_", "BALDE_", "CHAVE_", "TOKEN_"],
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    target: "es2022",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom", "zustand"],
          charts: ["recharts", "html-to-image", "jspdf"],
          motion: ["framer-motion"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/analytics"],
          graphics: ["three", "tsparticles", "react-tsparticles"]
        }
      }
    }
  },
  // ─── VITEST ───────────────────────────────────────────────────────────────
  test: {
    environment: "node",
    // engine puro — sem DOM
    globals: true,
    // describe/it/expect sem import
    include: ["src/**/*.test.js", "src/**/*.test.jsx", "src/**/*.spec.js", "tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/engine/**", "src/utils/coachLogic.js"]
    }
  }
  // ──────────────────────────────────────────────────────────────────────────
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbnR1bi5CT09LLTIwMVFPOEZQRkVcXFxcRG93bmxvYWRzXFxcXHVsdHJhLXBhdGNoZWRcXFxcdWx0cmEtcGF0Y2hlZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYW50dW4uQk9PSy0yMDFRTzhGUEZFXFxcXERvd25sb2Fkc1xcXFx1bHRyYS1wYXRjaGVkXFxcXHVsdHJhLXBhdGNoZWRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2FudHVuLkJPT0stMjAxUU84RlBGRS9Eb3dubG9hZHMvdWx0cmEtcGF0Y2hlZC91bHRyYS1wYXRjaGVkL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCksIHRhaWx3aW5kY3NzKCldLFxuICBlbnZQcmVmaXg6IFsnVklURV8nLCAnSURfJywgJ0JBTERFXycsICdDSEFWRV8nLCAnVE9LRU5fJ10sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgc3RyaWN0UG9ydDogZmFsc2UsXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiAnZXMyMDIyJyxcbiAgICBtaW5pZnk6ICdlc2J1aWxkJyxcbiAgICBjc3NNaW5pZnk6IHRydWUsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbScsICd6dXN0YW5kJ10sXG4gICAgICAgICAgY2hhcnRzOiBbJ3JlY2hhcnRzJywgJ2h0bWwtdG8taW1hZ2UnLCAnanNwZGYnXSxcbiAgICAgICAgICBtb3Rpb246IFsnZnJhbWVyLW1vdGlvbiddLFxuICAgICAgICAgIGZpcmViYXNlOiBbJ2ZpcmViYXNlL2FwcCcsICdmaXJlYmFzZS9hdXRoJywgJ2ZpcmViYXNlL2ZpcmVzdG9yZScsICdmaXJlYmFzZS9hbmFseXRpY3MnXSxcbiAgICAgICAgICBncmFwaGljczogWyd0aHJlZScsICd0c3BhcnRpY2xlcycsICdyZWFjdC10c3BhcnRpY2xlcyddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBWSVRFU1QgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIHRlc3Q6IHtcbiAgICBlbnZpcm9ubWVudDogJ25vZGUnLCAgICAgICAgLy8gZW5naW5lIHB1cm8gXHUyMDE0IHNlbSBET01cbiAgICBnbG9iYWxzOiB0cnVlLCAgICAgICAgICAgICAgLy8gZGVzY3JpYmUvaXQvZXhwZWN0IHNlbSBpbXBvcnRcbiAgICBpbmNsdWRlOiBbJ3NyYy8qKi8qLnRlc3QuanMnLCAnc3JjLyoqLyoudGVzdC5qc3gnLCAnc3JjLyoqLyouc3BlYy5qcycsICd0ZXN0cy8qKi8qLnRlc3QuanMnXSxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsXG4gICAgICBpbmNsdWRlOiBbJ3NyYy9lbmdpbmUvKionLCAnc3JjL3V0aWxzL2NvYWNoTG9naWMuanMnXSxcbiAgICB9LFxuICB9LFxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBZLFNBQVMsb0JBQW9CO0FBQ3ZhLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUV4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztBQUFBLEVBQ2hDLFdBQVcsQ0FBQyxTQUFTLE9BQU8sVUFBVSxVQUFVLFFBQVE7QUFBQSxFQUN4RCxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osUUFBUSxDQUFDLFNBQVMsYUFBYSxvQkFBb0IsU0FBUztBQUFBLFVBQzVELFFBQVEsQ0FBQyxZQUFZLGlCQUFpQixPQUFPO0FBQUEsVUFDN0MsUUFBUSxDQUFDLGVBQWU7QUFBQSxVQUN4QixVQUFVLENBQUMsZ0JBQWdCLGlCQUFpQixzQkFBc0Isb0JBQW9CO0FBQUEsVUFDdEYsVUFBVSxDQUFDLFNBQVMsZUFBZSxtQkFBbUI7QUFBQSxRQUN4RDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxNQUFNO0FBQUEsSUFDSixhQUFhO0FBQUE7QUFBQSxJQUNiLFNBQVM7QUFBQTtBQUFBLElBQ1QsU0FBUyxDQUFDLG9CQUFvQixxQkFBcUIsb0JBQW9CLG9CQUFvQjtBQUFBLElBQzNGLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFNBQVMsQ0FBQyxpQkFBaUIseUJBQXlCO0FBQUEsSUFDdEQ7QUFBQSxFQUNGO0FBQUE7QUFFRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
