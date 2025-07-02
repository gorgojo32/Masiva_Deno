// deno-lint-ignore-file
import { z } from "../Dependencies/dependencias.ts";
import { Context } from "../Dependencies/dependencias.ts";
import {
  actualizarEstudiante,
  eliminarEstudiante,
  insertarEstudiante,
  listarEstudiantes,
  insertarEstudiantesMasivo
} from "../Models/estudiantesModels.ts";

/**
 * Controller function to retrieve all students from the database
 * Handles GET requests to fetch the complete list of students
 * @param ctx - Oak framework context containing request and response objects
 */
export const getEstudiantes = async (ctx: Context) => {
  const { response } = ctx;
  try {
    // Call the model function to retrieve all students
    const result = await listarEstudiantes();
    if (result.success) {
      // Send successful response with student data
      response.status = 200;
      response.body = {
        success: true,
        data: result.data,
      };
    } else {
      // Send error response if retrieval failed
      response.status = 400;
      response.body = {
        success: false,
        msg: "No fue posible cargar la lista de estudiantes",
      };
    }
  } catch (error) {
    // Handle different types of errors
    if (error instanceof z.ZodError) {
      // Zod validation error
      response.status = 400;
      response.body = { success: false, msg: error.message };
    } else {
      // Generic server error
      response.status = 500;
      response.body = { success: false, msg: "Error de servidor" };
    }
  }
};

/**
 * Controller function to create a new student record
 * Handles POST requests with student data validation and insertion
 * @param ctx - Oak framework context containing request and response objects
 */
export const postEstudiante = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    // Verify that the request contains content
    const contentLength = request.headers.get("Content-Length");
    if (!contentLength || contentLength === "0") {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Cuerpo de la solicitud vacío",
      };
      return;
    }

    // Parse JSON body from the request
    const body = await request.body.json();
    console.log("Datos Recibidos:", body);

    // Extract student data from request body
    const {
      nombre,
      apellido,
      email,
      telefono,
      carrera,
      semestre,
      promedio,
      fecha_registro,
      estado,
    } = body;

    // Perform comprehensive field validation
    if (
      !nombre || typeof nombre !== "string" || nombre.trim() === "" ||
      !apellido || typeof apellido !== "string" || apellido.trim() === "" ||
      !email || typeof email !== "string" || email.trim() === "" ||
      !telefono || typeof telefono !== "string" || telefono.trim() === "" ||
      !carrera || typeof carrera !== "string" || carrera.trim() === "" ||
      typeof semestre !== "number" || semestre < 1 ||
      typeof promedio !== "number" || promedio < 0 || promedio > 10 ||
      (estado !== 0 && estado !== 1)
    ) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Datos inválidos. Verifique los campos enviados.",
      };
      return;
    }

    // Prepare validated student data object
    const estudianteData = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      carrera: carrera.trim(),
      semestre: semestre,
      promedio: promedio,
      fecha_registro: fecha_registro ? new Date(fecha_registro) : new Date(), // Use provided date or current date
      estado: estado as (0 | 1),
    };

    // Call model function to insert the new student
    const result = await insertarEstudiante(estudianteData);

    // Send appropriate response based on insertion result
    response.status = result.success ? 201 : 400;
    response.body = result;
  } catch (error) {
    console.error("Error en postEstudiante:", error);
    response.status = 500;
    response.body = { success: false, msg: "Error interno del servidor" };
  }
};

/**
 * Controller function to update an existing student record
 * Handles PUT requests with student ID and updated data
 * @param ctx - Oak framework context containing request, response, and route parameters
 */
export const putEstudiante = async (ctx: Context) => {
  const { request, response } = ctx;
  try {
    // Extract student ID from route parameters
    const id_estudiante = (ctx as any).params?.id_estudiante;
    // Validate that student ID is provided
    if (!id_estudiante) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "ID de estudiante no proporcionado",
      };
      return;
    }

    // Verify that the request contains content
    const contentLength = request.headers.get("Content-Length");
    if (!contentLength || contentLength === "0") {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Cuerpo de la solicitud vacío",
      };
      return;
    }

    // Parse JSON body from the request
    const body = await request.body({ type: "json" }).value;
    console.log("Datos Recibidos:", body);

    // Extract updated student data from request body
    const {
      nombre,
      apellido,
      email,
      telefono,
      carrera,
      semestre,
      promedio,
      fecha_registro,
      estado,
    } = body;

    // Perform comprehensive field validation for update
    if (
      !nombre || typeof nombre !== "string" || nombre.trim() === "" ||
      !apellido || typeof apellido !== "string" || apellido.trim() === "" ||
      !email || typeof email !== "string" || email.trim() === "" ||
      !telefono || typeof telefono !== "string" || telefono.trim() === "" ||
      !carrera || typeof carrera !== "string" || carrera.trim() === "" ||
      typeof semestre !== "number" || semestre < 1 ||
      typeof promedio !== "number" || promedio < 0 || promedio > 10 ||
      (estado !== 0 && estado !== 1)
    ) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Datos inválidos. Verifique los campos enviados.",
      };
      return;
    }

    // Process registration date (use provided date or current date)
    const fechaConvertida = fecha_registro ? new Date(fecha_registro) : new Date();
    
    // Call model function to update the student record
    const result = await actualizarEstudiante(parseInt(id_estudiante), {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      carrera: carrera.trim(),
      semestre: semestre,
      promedio: promedio,
      fecha_registro: fechaConvertida,
      estado: estado as (0 | 1),
    });

    // Send appropriate response based on update result
    if (result.success) {
      response.status = 200;
      response.body = {
        success: true,
        msg: "Estudiante actualizado correctamente",
      };
    } else {
      response.status = 400;
      response.body = {
        success: false,
        msg: result.msg || "No se pudo actualizar el estudiante",
      };
    }
  } catch (error) {
    console.error("Error en putEstudiante:", error);
    response.status = 500;
    response.body = {
      success: false,
      msg: "Error interno del servidor",
    };
  }
};

/**
 * Controller function to delete a student record
 * Handles DELETE requests with student ID parameter
 * @param ctx - Oak framework context containing response and route parameters
 */
export const deleteEstudiante = async (ctx: Context) => {
  const { response } = ctx;
  try {
    // Extract student ID from route parameters
    const id_estudiante = (ctx as any).params?.id_estudiante;

    // Validate that student ID is provided
    if (!id_estudiante) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "ID de estudiante no proporcionado",
      };
      return;
    }

    // Call model function to delete the student
    const result = await eliminarEstudiante(parseInt(id_estudiante));

    // Send appropriate response based on deletion result
    if (result.success) {
      response.status = 200;
      response.body = result;
    } else {
      // Student not found
      response.status = 404;
      response.body = result;
    }
  } catch (error) {
    response.status = 500;
    response.body = {
      success: false,
      msg: "Error interno del servidor",
    };
  }
};

/**
 * Controller function for bulk insertion of multiple students
 * Handles POST requests with an array of student data objects
 * @param ctx - Oak framework context containing request and response objects
 */
export const postEstudiantesMasivo = async (ctx: Context) => {
  const { request, response } = ctx;
  
  try {
    // Verify that the request contains content
    const contentLength = request.headers.get("Content-Length");
    if (!contentLength || contentLength === "0") {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Cuerpo de la solicitud vacío",
      };
      return;
    }
    
    // Parse JSON body expecting an array of students
    const body = await request.body.json();
    console.log("Datos Recibidos para inserción masiva:", body);
    
    // Validate that body is an array with content
    if (!Array.isArray(body) || body.length === 0) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Se esperaba un array de estudiantes",
      };
      return;
    }
    
    // Process and validate each student in the array
    const estudiantes = body.map(estudiante => {
      // Extract data from each student object
      const {
        nombre,
        apellido,
        email,
        telefono,
        carrera,
        semestre,
        promedio,
        fecha_registro,
        estado,
      } = estudiante;
      
      // Return processed student object with safe type conversions and defaults
      return {
        nombre: (nombre || "").toString().trim(),
        apellido: (apellido || "").toString().trim(),
        email: (email || "").toString().trim(),
        telefono: (telefono || "").toString().trim(),
        carrera: (carrera || "").toString().trim(),
        semestre: Number(semestre || 1),
        promedio: Number(promedio || 0),
        fecha_registro: fecha_registro ? new Date(fecha_registro) : new Date(),
        estado: Number(estado) === 0 ? 0 : 1 as (0 | 1), // Type correction for estado
      };
    });
    
    // Call model function for bulk insertion
    const result = await insertarEstudiantesMasivo(estudiantes);
    
    // Send appropriate response based on bulk insertion result
    response.status = result.success ? 201 : 400;
    response.body = result;
  } catch (error) {
    console.error("Error en postEstudiantesMasivo:", error);
    response.status = 500;
    response.body = { 
      success: false, 
      msg: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    };
  }
};