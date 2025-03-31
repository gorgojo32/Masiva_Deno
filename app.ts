import { Application, Router, oakCors } from "./Dependencies/dependencias.ts";
import { routerEstudiantes } from "./Routes/estudiantesRoutes.ts";
import { uploadExcelMiddleware } from "./Middlewares/uploadExcel.ts";

const app = new Application();

app.use(oakCors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(routerEstudiantes.routes());
app.use(routerEstudiantes.allowedMethods());

console.log('Servidor corriendo por el puerto 8000');
try {
  await app.listen({port: 8000});
} catch (error) {
  console.error("Error al iniciar servidor:", error);
}