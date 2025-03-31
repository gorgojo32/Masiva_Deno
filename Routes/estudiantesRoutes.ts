import { Router } from "../Dependencies/dependencias.ts"; 
import { 
  deleteEstudiante, 
  getEstudiantes, 
  postEstudiante, 
  putEstudiante, 
  postEstudiantesMasivo 
} from "../Controller/estudiantesController.ts"; 
import { 
  procesarExcelEstudiantes, 
  exportarEstudiantesExcel 
} from "../Controller/excelController.ts"; 

const routerEstudiantes = new Router(); 

// Rutas CRUD básicas
routerEstudiantes.get("/estudiantes", getEstudiantes); 
routerEstudiantes.post("/estudiantes", postEstudiante); 
routerEstudiantes.put("/estudiantes/:id_estudiante", putEstudiante); 
routerEstudiantes.delete("/estudiantes/:id_estudiante", deleteEstudiante); 

// Rutas para manejo masivo y Excel
routerEstudiantes.post("/estudiantes/masivo", postEstudiantesMasivo); 

// Rutas para Excel - ELIMINAR EL MIDDLEWARE
routerEstudiantes.post("/estudiantes/importar-excel", procesarExcelEstudiantes); 
routerEstudiantes.get("/estudiantes/exportar-excel", exportarEstudiantesExcel); 

export { routerEstudiantes };