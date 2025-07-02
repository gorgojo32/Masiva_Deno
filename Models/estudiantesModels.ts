import { z } from "../Dependencies/dependencias.ts";
import { Conexion } from "./conexion.ts";

// Correct typing for state using a literal union
type EstadoType = 0 | 1;

// Interface defining the structure of student data
interface EstudianteData {
  id_estudiante?: number;    // Optional student ID (auto-generated)
  nombre: string;            // First name (required)
  apellido: string;          // Last name (required)
  email: string;             // Email address (required)
  telefono: string;          // Phone number (required)
  carrera: string;           // Academic program/major (required)
  semestre: number;          // Current semester (required)
  promedio: number;          // Grade point average (required)
  fecha_registro: Date;      // Registration date (required)
  estado: EstadoType;        // Status: 0 = inactive, 1 = active
}

// Validation schema for students using Zod
const EstudianteSchema = z.object({
  id_estudiante: z.number().optional(),
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido: z.string().min(1, "El apellido es requerido"),
  email: z.string().email("Email inválido"),
  telefono: z.string().min(1, "El teléfono es requerido"),
  carrera: z.string().min(1, "La carrera es requerida"),
  semestre: z.number().min(1, "El semestre debe ser mayor a 0"),
  promedio: z.number().min(0, "El promedio debe ser mayor o igual a 0").max(10, "El promedio debe ser menor o igual a 10"),
  fecha_registro: z.date(),
  estado: z.union([z.literal(0), z.literal(1)])
});

/**
 * Retrieves all students from the database
 * @returns Promise with success status and student data array
 */
export const listarEstudiantes = async () => {
  try {
    // Execute SQL query to fetch all student records
    const { rows: estudiantes } = await Conexion.execute(
      'SELECT id_estudiante, nombre, apellido, email, telefono, carrera, semestre, promedio, fecha_registro, estado ' +
      'FROM estudiantes'
    );
    return {
      success: true,
      data: estudiantes as EstudianteData[],
    };
  } catch (error) {
    console.error("Error en listarEstudiantes:", error);
    // Handle Zod validation errors specifically
    if (error instanceof z.ZodError) {
      return { success: false, msg: error.message };
    } else {
      return { success: false, msg: "Error en el servidor" };
    }
  }
};

/**
 * Inserts a new student into the database
 * @param estudiante - Student data object to be inserted
 * @returns Promise with success status and insertion details
 */
export const insertarEstudiante = async (estudiante: EstudianteData) => {
  try {
    // Validate student data against schema
    EstudianteSchema.parse(estudiante);

    // Execute INSERT query with parameterized values
    const result = await Conexion.execute(
      `INSERT INTO estudiantes (nombre, apellido, email, telefono, carrera, semestre, promedio, fecha_registro, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        estudiante.nombre,
        estudiante.apellido,
        estudiante.email,
        estudiante.telefono,
        estudiante.carrera,
        estudiante.semestre,
        estudiante.promedio,
        estudiante.fecha_registro,
        estudiante.estado,
      ],
    );
    return {
      success: true,
      message: "Estudiante insertado con éxito",
      insertId: result.lastInsertId,
    };
  } catch (error) {
    console.error("Error al insertar estudiante:", error);
    return { 
      success: false, 
      msg: "Error al insertar el estudiante",
      details: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Updates an existing student record in the database
 * @param id_Estudiante - ID of the student to update
 * @param estudianteData - Partial student data with fields to update
 * @returns Promise with success status and update details
 */
export const actualizarEstudiante = async (
  id_Estudiante: number,
  estudianteData: Partial<EstudianteData>,
) => {
  try {
    // Validate partial data if any fields are provided
    if (Object.keys(estudianteData).length > 0) {
      // Create partial schema for validation of optional fields
      const partialSchema = EstudianteSchema.partial();
      partialSchema.parse(estudianteData);
    }

    // Execute UPDATE query with all fields (some may be undefined)
    const result = await Conexion.execute(
      "UPDATE estudiantes SET nombre = ?, apellido = ?, email = ?, telefono = ?, carrera = ?, semestre = ?, promedio = ?, fecha_registro = ?, estado = ? WHERE id_estudiante = ?",
      [
        estudianteData.nombre,
        estudianteData.apellido,
        estudianteData.email,
        estudianteData.telefono,
        estudianteData.carrera,
        estudianteData.semestre,
        estudianteData.promedio,
        estudianteData.fecha_registro,
        estudianteData.estado,
        id_Estudiante,
      ],
    );
    
    // Check if any rows were affected (student exists and was updated)
    if (result && result.affectedRows && result.affectedRows > 0) {
      return { success: true, msg: "Estudiante actualizado correctamente" };
    } else {
      return { success: false, msg: `No se encontró el estudiante con ID ${id_Estudiante}` };
    }
  } catch (error) {
    console.error("Error al actualizar estudiante:", error);
    return { 
      success: false, 
      msg: "Error al actualizar el estudiante",
      details: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Deletes a student record from the database
 * @param estudianteId - ID of the student to delete
 * @returns Promise with success status and deletion details
 */
export const eliminarEstudiante = async (estudianteId: number) => {
  try {
    // Execute DELETE query for the specified student ID
    const result = await Conexion.execute(
      "DELETE FROM estudiantes WHERE id_estudiante = ?",
      [estudianteId],
    );
    
    // Log the result for debugging purposes
    console.log("Delete result:", result);
    
    // Check if any rows were affected (student existed and was deleted)
    if (result && result.affectedRows && result.affectedRows > 0) {
      return {
        success: true,
        msg: "Estudiante eliminado correctamente",
      };
    } else {
      return {
        success: false,
        msg: `No se encontró el estudiante con ID ${estudianteId}`,
      };
    }
  } catch (error) {
    console.error("Error al eliminar estudiante:", error);
    // Handle Zod validation errors specifically
    if (error instanceof z.ZodError) {
      return { success: false, msg: error.message };
    } else {
      return { 
        success: false, 
        msg: "Error al eliminar el estudiante",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

/**
 * Performs bulk insertion of multiple students using database transactions
 * @param estudiantes - Array of student data objects to insert
 * @returns Promise with success status, insertion count, and error details
 */
export const insertarEstudiantesMasivo = async (estudiantes: EstudianteData[]) => {
  // Early return if no students provided
  if (!estudiantes.length) {
    return {
      success: false,
      msg: "No hay estudiantes para insertar",
    };
  }

  const errores: { estudiante: string; error: string }[] = [];
  let insertados = 0;
  
  try {
    // Start database transaction for data consistency
    await Conexion.execute("START TRANSACTION");
    
    // Validate all students before attempting insertion
    const estudiantesValidos = [];
    for (const estudiante of estudiantes) {
      try {
        // Validate each student against the schema
        EstudianteSchema.parse(estudiante);
        estudiantesValidos.push(estudiante);
      } catch (error) {
        // Collect validation errors for reporting
        errores.push({
          estudiante: `${estudiante.nombre} ${estudiante.apellido}`,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Cancel operation if no valid students found
    if (estudiantesValidos.length === 0) {
      throw new Error("No hay estudiantes válidos para insertar");
    }
    
    // Process students in batches to avoid memory issues
    const BATCH_SIZE = 100; 
    
    for (let i = 0; i < estudiantesValidos.length; i += BATCH_SIZE) {
      const lote = estudiantesValidos.slice(i, i + BATCH_SIZE);
      
      // Create VALUES clause with placeholders for batch insert
      const values = lote.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      
      // Flatten all student data into a single parameter array
      const params: any[] | undefined = [];
      
      // Add each student's data to the parameters array
      lote.forEach(e => {
        params.push(
          e.nombre,
          e.apellido,
          e.email,
          e.telefono,
          e.carrera,
          e.semestre,
          e.promedio,
          e.fecha_registro,
          e.estado
        );
      });
      
      // Execute batch INSERT query
      const query = `
        INSERT INTO estudiantes 
        (nombre, apellido, email, telefono, carrera, semestre, promedio, fecha_registro, estado)
        VALUES ${values}
      `;
      
      const result = await Conexion.execute(query, params);
      
      // Count successfully inserted records
      if (result && result.affectedRows) {
        insertados += result.affectedRows;
      }
    }
    
    // Commit transaction if all insertions successful
    await Conexion.execute("COMMIT");
    
    return {
      success: true,
      message: `${insertados} estudiantes insertados con éxito`,
      errores: errores.length > 0 ? errores : undefined,
      insertados,
      totalProcesados: estudiantes.length
    };
  } catch (error) {
    // Rollback transaction on any error
    await Conexion.execute("ROLLBACK");
    
    console.error("Error en inserción masiva de estudiantes:", error);
    return {
      success: false,
      msg: "Error en la inserción masiva de estudiantes",
      details: error instanceof Error ? error.message : String(error),
      errores
    };
  }
};