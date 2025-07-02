// Import core Oak framework components and CORS middleware
import { Application, Router, oakCors } from "./Dependencies/dependencias.ts";
// Import student-related routes configuration
import { routerEstudiantes } from "./Routes/estudiantesRoutes.ts";
// Import Excel upload middleware (currently unused but available)
import { uploadExcelMiddleware } from "./Middlewares/uploadExcel.ts";

// Create new Oak application instance
const app = new Application();

/**
 * Configure Cross-Origin Resource Sharing (CORS) middleware
 * Allows web applications from specified origins to access this API
 * Essential for frontend applications running on different ports
 */
app.use(oakCors({
  // Allow requests from local development servers (React/Vue/Angular dev servers)
  origin: ["http://localhost:5173", "http://localhost:5174"],
  // Specify allowed HTTP methods for cross-origin requests
  methods: ["GET", "POST", "PUT", "DELETE"],
  // Define which headers clients can send in requests
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Register student routes - handles all /estudiantes endpoints
app.use(routerEstudiantes.routes());
// Enable HTTP method override and validation for student routes
app.use(routerEstudiantes.allowedMethods());

// Log server startup message
console.log('Servidor corriendo por el puerto 8000');

// Start the HTTP server with error handling
try {
  // Listen on port 8000 for incoming HTTP requests
  await app.listen({port: 8000});
} catch (error) {
  // Handle and log any server startup errors
  console.error("Error al iniciar servidor:", error);
}