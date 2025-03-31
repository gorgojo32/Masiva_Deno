// deno-lint-ignore-file
import { Context } from "../Dependencies/dependencias.ts";
import { XLSX } from "../Dependencies/dependencias.ts";
import { insertarEstudiantesMasivo, listarEstudiantes } from "../Models/estudiantesModels.ts";
import { ensureDir } from "https://deno.land/std@0.220.1/fs/ensure_dir.ts";
import { basename, join } from "https://deno.land/std@0.220.1/path/mod.ts";

// Implementación mejorada para form-data
export const procesarExcelEstudiantes = async (ctx: Context) => {
  const { request, response } = ctx;
  console.log("=== INICIO PROCESAMIENTO EXCEL ===");
  console.log("Headers de la solicitud:", Object.fromEntries(request.headers.entries()));

  let filePath = "";

  try {
    // Verificar si hay un cuerpo en la solicitud
    if (!request.hasBody) {
      console.log("ERROR: No hay cuerpo en la solicitud");
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se ha enviado ningún archivo",
      };
      return;
    }
    console.log("La solicitud tiene cuerpo");

    // Crear directorio temporal para guardar el archivo
    const uploadDir = join(Deno.cwd(), "uploads", "excel");
    await ensureDir(uploadDir);
    console.log(`Directorio para uploads creado: ${uploadDir}`);

    // Mejorar el acceso al form-data
    try {
      const formData = await request.body({ type: "form-data" }).value;
      const data = await formData.read({ maxSize: 10 * 1024 * 1024 }); // 10MB máximo
      
      console.log("Form-data obtenido:", {
        tieneFiles: !!data.files,
        cantidadFiles: data.files ? data.files.length : 0,
        fields: Object.keys(data.fields || {})
      });

      // Verificar si hay un archivo
      const file = data.files?.[0];
      if (!file) {
        console.log("ERROR: No se encontró archivo en form-data");
        response.status = 400;
        response.body = {
          success: false,
          msg: "No se encontró ningún archivo en la solicitud",
        };
        return;
      }

      console.log("Archivo recibido - Propiedades:", Object.keys(file));
      
      // Obtener el nombre del archivo - manejo seguro
      const originalFilename = file.originalName || file.name || file.filename || "archivo.xlsx";
      console.log("Nombre original del archivo:", originalFilename);

      // Verificar que sea un archivo Excel
      if (!originalFilename.toLowerCase().endsWith('.xlsx') && !originalFilename.toLowerCase().endsWith('.xls')) {
        console.log(`ERROR: El archivo no tiene extensión Excel: ${originalFilename}`);
        response.status = 400;
        response.body = {
          success: false,
          msg: "El archivo debe ser de tipo Excel (.xlsx o .xls)",
        };
        return;
      }

      // Crear nombre único para el archivo
      const timestamp = Date.now();
      const safeFileName = basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${timestamp}_${safeFileName}`;
      filePath = join(uploadDir, uniqueFileName);
      console.log(`Ruta para guardar el archivo: ${filePath}`);

      // Acceder directamente al contenido del archivo - Método mejorado
      let fileContent = null;
      
      // Si file tiene tipo Blob, extrae su contenido
      if (file && typeof file.content !== 'undefined') {
        console.log("Usando file.content directamente");
        fileContent = file.content;
        console.log(`Contenido encontrado: ${fileContent.length} bytes`);
    }
      
      // Si file.content existe y es un Uint8Array
      if (!fileContent && file.content && file.content instanceof Uint8Array) {
        console.log("Contenido encontrado en file.content");
        fileContent = file.content;
        console.log(`Contenido encontrado en file.content: ${fileContent.length} bytes`);
      }
      
      // Si file.content existe pero no es un Uint8Array (podría ser string o ArrayBuffer)
      if (!fileContent && file.content) {
        try {
          if (typeof file.content === 'string') {
            console.log("Contenido es un string, convirtiéndolo a Uint8Array");
            const encoder = new TextEncoder();
            fileContent = encoder.encode(file.content);
          } else if (file.content instanceof ArrayBuffer) {
            console.log("Contenido es un ArrayBuffer, convirtiéndolo a Uint8Array");
            fileContent = new Uint8Array(file.content);
          }
        } catch (e) {
          console.error("Error al convertir contenido:", e);
        }
      }
      
      // Intenta leer archivo directamente del disco temporal si existe una ruta
      if (!fileContent && file && typeof file.filename === 'string') {
        try {
            console.log(`Intentando leer desde archivo: ${file.filename}`);
            fileContent = await Deno.readFile(file.filename);
            console.log(`Archivo leído: ${fileContent.length} bytes`);
        } catch (e) {
            console.error("Error al leer archivo:", e);
        }
    }
      
      // Nuevo intento usando la propiedad 'bytes'
      if (!fileContent && (file as any).bytes) {
        console.log("Intentando leer bytes directamente");
        fileContent = (file as any).bytes;
        console.log(`Bytes extraídos: ${fileContent.length}`);
      }
      
      // Si aún no tenemos contenido, pero tenemos una ruta
      if (!fileContent && file.filename) {
        try {
          const possiblePath = file.filename;
          console.log(`Intentando leer desde posible ruta de archivo: ${possiblePath}`);
          fileContent = await Deno.readFile(possiblePath);
          console.log(`Archivo leído desde posible ruta: ${fileContent.length} bytes`);
        } catch (e) {
          console.error("Error al leer desde posible ruta:", e);
        }
      }

      // Si no pudimos obtener el contenido, enviar error
      if (!fileContent || fileContent.length === 0) {
        console.log("ERROR: No se pudo obtener el contenido del archivo");
        response.status = 400;
        response.body = {
          success: false,
          msg: "El archivo está vacío o no se pudo leer su contenido. Por favor, intente usar el método alternativo con Base64.",
          errorCode: "CONTENT_EXTRACTION_FAILED",
          useBase64Alternative: true
        };
        return;
      }

      // Guardar el archivo en disco
      console.log(`Guardando archivo con ${fileContent.length} bytes`);
      await Deno.writeFile(filePath, fileContent);
      
      // Verificar que el archivo se guardó correctamente
      const fileStats = await Deno.stat(filePath);
      console.log(`Archivo guardado en disco. Tamaño: ${fileStats.size} bytes`);

      // Continuar con el procesamiento del archivo
      await procesarArchivoExcel(filePath, response);
      
    } catch (formError) {
      console.error("ERROR al procesar el form-data:", formError);
      response.status = 500;
      response.body = {
        success: false,
        msg: "Error al procesar el archivo: " + (formError instanceof Error ? formError.message : String(formError)),
        useBase64Alternative: true
      };
    }
  } catch (generalError) {
    console.error("ERROR GENERAL:", generalError);
    response.status = 500;
    response.body = {
      success: false,
      msg: "Error al procesar la solicitud",
      details: generalError instanceof Error ? generalError.message : String(generalError),
    };
  } finally {
    // Asegurarse de que el archivo temporal se elimine
    if (filePath) {
      try {
        await Deno.remove(filePath);
        console.log(`Archivo temporal eliminado en finally: ${filePath}`);
      } catch {
        // Ignorar errores si el archivo ya no existe
      }
    }
    console.log("=== FIN PROCESAMIENTO EXCEL ===");
  }
};

// El resto del código permanece igual
export const procesarExcelBase64 = async (ctx: Context) => {
  // Implementación existente...
  const { request, response } = ctx;
  console.log("=== INICIO PROCESAMIENTO EXCEL BASE64 ===");
  
  let filePath = "";
  
  try {
    // Verificar si hay un cuerpo en la solicitud
    if (!request.hasBody) {
      console.log("ERROR: No hay cuerpo en la solicitud");
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se ha enviado ningún archivo",
      };
      return;
    }
    
    // Obtener el body JSON
    const body = await request.body({ type: "json" }).value;
    console.log("Body JSON recibido con propiedades:", Object.keys(body));
    
    // Verificar si contiene los campos necesarios
    if (!body.filename || !body.content) {
      console.log("ERROR: JSON incompleto, falta filename o content");
      response.status = 400;
      response.body = {
        success: false,
        msg: "Los datos enviados están incompletos. Se requiere filename y content.",
      };
      return;
    }
    
    // Extraer filename y content base64
    const { filename, content } = body;
    console.log(`Archivo recibido: ${filename}, tamaño base64: ${content.length} caracteres`);
    
    // Verificar que sea un archivo Excel
    if (!filename.toLowerCase().endsWith('.xlsx') && !filename.toLowerCase().endsWith('.xls')) {
      console.log(`ERROR: El archivo no tiene extensión Excel: ${filename}`);
      response.status = 400;
      response.body = {
        success: false,
        msg: "El archivo debe ser de tipo Excel (.xlsx o .xls)",
      };
      return;
    }
    
    // Decodificar el base64
    try {
      // Eliminar prefijo "data:application/..." si existe
      let base64Data = content;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }
      
      // Decodificar Base64 a binario
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`Base64 decodificado: ${bytes.length} bytes`);
      
      // Crear directorio temporal para guardar el archivo
      const uploadDir = join(Deno.cwd(), "uploads", "excel");
      await ensureDir(uploadDir);
      
      // Crear nombre único para el archivo
      const timestamp = Date.now();
      const safeFileName = basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${timestamp}_${safeFileName}`;
      filePath = join(uploadDir, uniqueFileName);
      
      // Guardar el archivo en disco
      await Deno.writeFile(filePath, bytes);
      console.log(`Archivo guardado en: ${filePath}`);
      
      // Verificar que el archivo se guardó correctamente
      const fileStats = await Deno.stat(filePath);
      console.log(`Archivo guardado en disco. Tamaño: ${fileStats.size} bytes`);
      
      // Continuar con el procesamiento del archivo
      await procesarArchivoExcel(filePath, response);
      
    } catch (base64Error) {
      console.error("ERROR al decodificar Base64:", base64Error);
      response.status = 400;
      response.body = {
        success: false,
        msg: "Error al decodificar el contenido Base64: " + 
          (base64Error instanceof Error ? base64Error.message : String(base64Error))
      };
    }
  } catch (generalError) {
    console.error("ERROR GENERAL:", generalError);
    response.status = 500;
    response.body = {
      success: false,
      msg: "Error al procesar la solicitud",
      details: generalError instanceof Error ? generalError.message : String(generalError),
    };
  } finally {
    // Asegurarse de que el archivo temporal se elimine
    if (filePath) {
      try {
        await Deno.remove(filePath);
        console.log(`Archivo temporal eliminado en finally: ${filePath}`);
      } catch {
        // Ignorar errores si el archivo ya no existe
      }
    }
    console.log("=== FIN PROCESAMIENTO EXCEL BASE64 ===");
  }
};

// Función para procesar el archivo Excel una vez guardado
async function procesarArchivoExcel(filePath: string, response: any) {
  try {
    // Leer el archivo para procesarlo
    const xlsxData = await Deno.readFile(filePath);
    console.log(`Archivo Excel leído: ${xlsxData.length} bytes`);
    
    // Si el archivo está vacío o es muy pequeño para ser un Excel, error
    if (xlsxData.length < 100) {
      throw new Error("El archivo es demasiado pequeño para ser un Excel válido");
    }
    
    // Intentar procesarlo con SheetJS
    console.log("Procesando con XLSX.read...");
    let workbook;
    
    try {
      // Intento #1: Configuración normal
      workbook = XLSX.read(xlsxData, {
        type: "array",
        cellDates: true,
        cellText: false,
        cellNF: true,
        cellStyles: true,
        dateNF: 'yyyy-mm-dd'
      });
    } catch (e) {
      console.error("Error en primer intento de lectura XLSX:", e);
      
      // Intento #2: Configuración alternativa
      console.log("Intentando configuración alternativa...");
      workbook = XLSX.read(xlsxData, {
        type: "buffer",
        raw: true
      });
    }
    
    console.log("Workbook procesado:", {
      tieneHojas: !!workbook.SheetNames,
      cantidadHojas: workbook.SheetNames ? workbook.SheetNames.length : 0,
      hojas: workbook.SheetNames
    });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("El archivo Excel no contiene hojas");
    }
    
    // Obtener la primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log(`Usando hoja: ${sheetName}`);
    
    // Extraer datos como JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      blankrows: false,
      raw: false
    });
    
    console.log(`Datos extraídos: ${jsonData.length} filas`);
    if (jsonData.length > 0) {
      console.log("Ejemplo de la primera fila:", jsonData[0]);
    }
    
    if (!jsonData || jsonData.length === 0) {
      throw new Error("No se pudieron extraer datos del archivo Excel");
    }
    
    // Procesar los datos para insertarlos
    const estudiantes = prepararDatosEstudiantes(jsonData);
    console.log(`Estudiantes procesados: ${estudiantes.length}`);
    
    // Insertarlos en la base de datos
    const resultado = await insertarEstudiantesMasivo(estudiantes);
    console.log("Resultado de la inserción:", resultado);
    
    // Responder al cliente
    if (resultado.success) {
      response.status = 200;
      response.body = resultado;
    } else {
      response.status = 400;
      response.body = resultado;
    }
    
  } catch (excelError) {
    console.error("ERROR al procesar el archivo Excel:", excelError);
    response.status = 400;
    response.body = {
      success: false,
      msg: "Error al procesar el archivo Excel: " + (excelError instanceof Error ? excelError.message : String(excelError)),
    };
  }
}

// Función de utilidad para preparar los datos de estudiantes
function prepararDatosEstudiantes(jsonData: any[]) {
  return jsonData.map((row: any, index: number) => {
    // Estas son las posibles claves que podríamos encontrar en el Excel
    const posiblesClaves = {
      nombre: ['nombre', 'name', 'firstname', 'first_name', 'first name'],
      apellido: ['apellido', 'lastname', 'surname', 'last_name', 'last name'],
      email: ['email', 'correo', 'mail', 'e-mail', 'correo_electronico'],
      telefono: ['telefono', 'phone', 'tel', 'celular', 'mobile', 'telephone'],
      carrera: ['carrera', 'career', 'program', 'programa', 'degree'],
      semestre: ['semestre', 'semester', 'periodo', 'term'],
      promedio: ['promedio', 'average', 'gpa', 'calificacion', 'grade', 'score'],
      fecha_registro: ['fecha_registro', 'date', 'fecha', 'registro', 'registration_date', 'created_at'],
      estado: ['estado', 'status', 'active', 'activo', 'is_active']
    };

    // Función para encontrar una clave en el objeto row
    const encontrarClave = (posibles: string[]): string | null => {
      // Convertir todas las claves a minúsculas para comparación
      const keysLower: Record<string, string> = {};
      Object.keys(row).forEach(key => {
        keysLower[key.toLowerCase()] = key;
      });

      // Buscar coincidencia
      for (const posible of posibles) {
        if (keysLower[posible.toLowerCase()]) {
          return keysLower[posible.toLowerCase()];
        }
      }
      return null;
    };

    // Función para extraer un valor según las posibles claves
    const extraerValor = (claves: string[]): any => {
      const clave = encontrarClave(claves);
      return clave ? row[clave] : null;
    };

    // Extraer valores
    const nombre = String(extraerValor(posiblesClaves.nombre) || "").trim();
    const apellido = String(extraerValor(posiblesClaves.apellido) || "").trim();
    const email = String(extraerValor(posiblesClaves.email) || "").trim();
    const telefono = String(extraerValor(posiblesClaves.telefono) || "").trim();
    const carrera = String(extraerValor(posiblesClaves.carrera) || "").trim();
    
    // Conversión segura de números
    const semestreRaw = extraerValor(posiblesClaves.semestre);
    const semestre = !isNaN(Number(semestreRaw)) ? Number(semestreRaw) : 1;
    
    const promedioRaw = extraerValor(posiblesClaves.promedio);
    const promedio = !isNaN(Number(promedioRaw)) ? Number(promedioRaw) : 0;
    
    // Procesar fecha
    const fechaRaw = extraerValor(posiblesClaves.fecha_registro);
    let fecha_registro = new Date();
    
    if (fechaRaw) {
      if (fechaRaw instanceof Date) {
        fecha_registro = fechaRaw;
      } else if (typeof fechaRaw === 'string') {
        const timestamp = Date.parse(fechaRaw);
        if (!isNaN(timestamp)) {
          fecha_registro = new Date(timestamp);
        }
      } else if (typeof fechaRaw === 'number') {
        // Excel almacena fechas como números de serie
        const excelEpoch = new Date(1899, 11, 30);
        const msPerDay = 24 * 60 * 60 * 1000;
        fecha_registro = new Date(excelEpoch.getTime() + fechaRaw * msPerDay);
      }
    }
    
    // Procesar estado
    const estadoRaw = extraerValor(posiblesClaves.estado);
    let estado: 0 | 1 = 1; // Por defecto activo
    
    if (estadoRaw !== null && estadoRaw !== undefined) {
      if (typeof estadoRaw === 'boolean') {
        estado = estadoRaw ? 1 : 0;
      } else if (typeof estadoRaw === 'string') {
        const estadoStr = estadoRaw.toLowerCase().trim();
        if (['0', 'false', 'no', 'inactive', 'inactivo'].includes(estadoStr)) {
          estado = 0;
        }
      } else if (typeof estadoRaw === 'number') {
        estado = estadoRaw === 0 ? 0 : 1;
      }
    }

    // Si no encontramos campos clave, intentar adivinar por posición
    if (!nombre && !apellido && !email) {
      console.log(`Fila ${index + 1}: No se encontraron campos clave, utilizando valores por posición`);
      
      // Obtener todas las claves y valores
      const claves = Object.keys(row);
      const valores = Object.values(row);
      
      // Usar primera columna como nombre si existe
      if (claves.length > 0 && valores[0]) {
        return {
          nombre: String(valores[0] || "").trim() || `Estudiante${index + 1}`,
          apellido: String(valores[1] || "").trim() || `Apellido${index + 1}`,
          email: String(valores[2] || "").trim() || `estudiante${index + 1}@ejemplo.com`,
          telefono: String(valores[3] || "").trim() || "0000000000",
          carrera: String(valores[4] || "").trim() || "No especificada",
          semestre: !isNaN(Number(valores[5])) ? Number(valores[5]) : 1,
          promedio: !isNaN(Number(valores[6])) ? Number(valores[6]) : 0,
          fecha_registro: fecha_registro,
          estado: estado
        };
      }
    }

    // Valores por defecto para campos obligatorios faltantes
    return {
      nombre: nombre || `Estudiante${index + 1}`,
      apellido: apellido || `Apellido${index + 1}`,
      email: email || `estudiante${index + 1}@ejemplo.com`,
      telefono: telefono || "0000000000",
      carrera: carrera || "No especificada",
      semestre: semestre,
      promedio: promedio,
      fecha_registro: fecha_registro,
      estado: estado
    };
  });
}

// Exportar estudiantes a Excel
export const exportarEstudiantesExcel = async (ctx: Context) => {
  const { response } = ctx;
  console.log("=== INICIO EXPORTACIÓN EXCEL ===");

  try {
    // Obtener todos los estudiantes desde la base de datos
    console.log("Obteniendo lista de estudiantes...");
    const resultado = await listarEstudiantes();
    console.log(`Resultado de listarEstudiantes:`, {
      exito: resultado.success,
      cantidadDatos: resultado.data ? resultado.data.length : 0
    });
    
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      console.log("No hay estudiantes para exportar");
      response.status = 404;
      response.body = {
        success: false,
        msg: "No hay estudiantes para exportar",
      };
      return;
    }

    // Crear un nuevo libro de trabajo y una hoja
    console.log("Creando libro de Excel...");
    const workbook = XLSX.utils.book_new();
    
    // Preparar los datos para el Excel (convertir fechas a formato adecuado)
    console.log("Preparando datos para exportación...");
    const datosExportar = resultado.data.map(estudiante => ({
      id_estudiante: estudiante.id_estudiante,
      nombre: estudiante.nombre,
      apellido: estudiante.apellido,
      email: estudiante.email,
      telefono: estudiante.telefono,
      carrera: estudiante.carrera,
      semestre: estudiante.semestre,
      promedio: estudiante.promedio,
      fecha_registro: new Date(estudiante.fecha_registro),
      estado: estudiante.estado
    }));
    
    console.log(`Datos preparados: ${datosExportar.length} filas`);
    
    // Crear una hoja de trabajo a partir de los datos
    console.log("Creando hoja de trabajo...");
    const worksheet = XLSX.utils.json_to_sheet(datosExportar);
    console.log("Hoja creada con éxito");
    
    // Agregar la hoja de trabajo al libro
    console.log("Agregando hoja al libro...");
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estudiantes");
    
    // Escribir el libro a un buffer
    console.log("Generando buffer Excel...");
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    console.log(`Buffer generado: ${excelBuffer.length} bytes`);
    
    // Configurar la respuesta para descargar el archivo
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `estudiantes_${fechaActual}.xlsx`;
    console.log(`Configurando respuesta para descarga: ${nombreArchivo}`);
    
    response.status = 200;
    response.headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.headers.set("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
    response.body = excelBuffer;
    
    console.log("Respuesta configurada exitosamente");
  } catch (error) {
    console.error("ERROR al generar archivo Excel con estudiantes:", error);
    console.error("Stacktrace:", error instanceof Error ? error.stack : "No disponible");
    response.status = 500;
    response.body = {
      success: false,
      msg: "Error al generar archivo Excel con estudiantes",
      details: error instanceof Error ? error.message : String(error),
    };
  } finally {
    console.log("=== FIN EXPORTACIÓN EXCEL ===");
  }
};