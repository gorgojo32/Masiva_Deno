// Import Router class from Oak framework for route definition
import { Router } from "../Dependencies/dependencias.ts"; 

// Import controller functions for basic CRUD operations on students
import { 
  deleteEstudiante,     // Controller function to delete a student
  getEstudiantes,       // Controller function to retrieve all students
  postEstudiante,       // Controller function to create a new student
  putEstudiante,        // Controller function to update an existing student
  postEstudiantesMasivo // Controller function for bulk student insertion
} from "../Controller/estudiantesController.ts"; 

// Import Excel-specific controller functions for file operations
import { 
  procesarExcelEstudiantes,  // Controller function to process Excel imports
  exportarEstudiantesExcel   // Controller function to export students to Excel
} from "../Controller/excelController.ts"; 

// Create a new router instance for student-related routes
const routerEstudiantes = new Router(); 

// Basic CRUD routes for student management
routerEstudiantes.get("/estudiantes", getEstudiantes);                    // GET - Retrieve all students
routerEstudiantes.post("/estudiantes", postEstudiante);                   // POST - Create a new student
routerEstudiantes.put("/estudiantes/:id_estudiante", putEstudiante);      // PUT - Update student by ID
routerEstudiantes.delete("/estudiantes/:id_estudiante", deleteEstudiante); // DELETE - Remove student by ID

// Routes for bulk operations and mass data handling
routerEstudiantes.post("/estudiantes/masivo", postEstudiantesMasivo);     // POST - Bulk insert multiple students

// Excel file handling routes (middleware removed as per comment)
routerEstudiantes.post("/estudiantes/importar-excel", procesarExcelEstudiantes); // POST - Import students from Excel file
routerEstudiantes.get("/estudiantes/exportar-excel", exportarEstudiantesExcel);  // GET - Export students to Excel file

// Export the configured router for use in the main application
export { routerEstudiantes };