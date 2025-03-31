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

export const getEstudiantes = async (ctx: Context) => {
  const { response } = ctx;
  try {
    const result = await listarEstudiantes();
    if (result.success) {
      response.status = 200;
      response.body = {
        success: true,
        data: result.data,
      };
    } else {
      response.status = 400;
      response.body = {
        success: false,
        msg: "No fue posible cargar la lista de estudiantes",
      };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status = 400;
      response.body = { success: false, msg: error.message };
    } else {
      response.status = 500;
      response.body = { success: false, msg: "Error de servidor" };
    }
  }
};

export const postEstudiante = async (ctx: Context) => {
  const { request, response } = ctx;

  try {
    // Verificar contenido de la solicitud
    const contentLength = request.headers.get("Content-Length");
    if (!contentLength || contentLength === "0") {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Cuerpo de la solicitud vacío",
      };
      return;
    }

    const body = await request.body.json();
    console.log("Datos Recibidos:", body);

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

    // Validación básica
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

    const estudianteData = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      carrera: carrera.trim(),
      semestre: semestre,
      promedio: promedio,
      fecha_registro: fecha_registro ? new Date(fecha_registro) : new Date(),
      estado: estado as (0 | 1),
    };

    const result = await insertarEstudiante(estudianteData);

    response.status = result.success ? 201 : 400;
    response.body = result;
  } catch (error) {
    console.error("Error en postEstudiante:", error);
    response.status = 500;
    response.body = { success: false, msg: "Error interno del servidor" };
  }
};

export const putEstudiante = async (ctx: Context) => {
  const { request, response } = ctx;
  try {
    const id_estudiante = (ctx as any).params?.id_estudiante;
    // Verificar si el ID es válido
    if (!id_estudiante) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "ID de estudiante no proporcionado",
      };
      return;
    }

    // Verificar contenido de la solicitud
    const contentLength = request.headers.get("Content-Length");
    if (!contentLength || contentLength === "0") {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Cuerpo de la solicitud vacío",
      };
      return;
    }

    const body = await request.body.json();
    console.log("Datos Recibidos:", body);

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

    // Validación básica
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

    const fechaConvertida = fecha_registro ? new Date(fecha_registro) : new Date();
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

export const deleteEstudiante = async (ctx: Context) => {
  const { response } = ctx;
  try {
    const id_estudiante = (ctx as any).params?.id_estudiante;

    if (!id_estudiante) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "ID de estudiante no proporcionado",
      };
      return;
    }

    const result = await eliminarEstudiante(parseInt(id_estudiante));

    if (result.success) {
      response.status = 200;
      response.body = result;
    } else {
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

export const postEstudiantesMasivo = async (ctx: Context) => {
  const { request, response } = ctx;
  
  try {
    // Verificar contenido de la solicitud
    const contentLength = request.headers.get("Content-Length");
    if (!contentLength || contentLength === "0") {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Cuerpo de la solicitud vacío",
      };
      return;
    }
    
    const body = await request.body.json();
    console.log("Datos Recibidos para inserción masiva:", body);
    
    if (!Array.isArray(body) || body.length === 0) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "Se esperaba un array de estudiantes",
      };
      return;
    }
    
    // Validar y preparar los datos de estudiantes
    const estudiantes = body.map(estudiante => {
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
      
      return {
        nombre: (nombre || "").toString().trim(),
        apellido: (apellido || "").toString().trim(),
        email: (email || "").toString().trim(),
        telefono: (telefono || "").toString().trim(),
        carrera: (carrera || "").toString().trim(),
        semestre: Number(semestre || 1),
        promedio: Number(promedio || 0),
        fecha_registro: fecha_registro ? new Date(fecha_registro) : new Date(),
        estado: Number(estado) === 0 ? 0 : 1 as (0 | 1), // Aquí está la corrección
      };
    });
    
    const result = await insertarEstudiantesMasivo(estudiantes);
    
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