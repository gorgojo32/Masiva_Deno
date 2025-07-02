// deno-lint-ignore-file
import { Context } from "../Dependencies/dependencias.ts";
import { XLSX } from "../Dependencies/dependencias.ts";
import { insertarEstudiantesMasivo, listarEstudiantes } from "../Models/estudiantesModels.ts";
import { ensureDir } from "https://deno.land/std@0.220.1/fs/ensure_dir.ts";
import { basename, join } from "https://deno.land/std@0.220.1/path/mod.ts";

/**
 * Enhanced controller function to process Excel files containing student data
 * Handles multipart form-data uploads and processes Excel files for bulk student import
 * @param ctx - Oak framework context containing request and response objects
 */
export const procesarExcelEstudiantes = async (ctx: Context) => {
  const { request, response } = ctx;
  console.log("Headers de la solicitud:", Object.fromEntries(request.headers.entries()));

  let filePath = "";

  try {
    // Verify that the request contains a body
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

    // Create temporary directory to save the uploaded file
    const uploadDir = join(Deno.cwd(), "uploads", "excel");
    await ensureDir(uploadDir);
    console.log(`Directorio para uploads creado: ${uploadDir}`);

    // Enhanced approach to access form-data
    try {
      // Read form-data with size limit (10MB maximum)
      const formData = await request.body({ type: "form-data" }).value;
      const data = await formData.read({ maxSize: 10 * 1024 * 1024 }); // 10MB maximum
      
      console.log("Form-data obtenido:", {
        tieneFiles: !!data.files,
        cantidadFiles: data.files ? data.files.length : 0,
        fields: Object.keys(data.fields || {})
      });

      // Verify that a file is present in the form-data
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
      
      // Get the original filename with safe fallback options
      const originalFilename = file.originalName || file.name || file.filename || "archivo.xlsx";
      console.log("Nombre original del archivo:", originalFilename);

      // Validate that the uploaded file is an Excel file
      if (!originalFilename.toLowerCase().endsWith('.xlsx') && !originalFilename.toLowerCase().endsWith('.xls')) {
        console.log(`ERROR: El archivo no tiene extensión Excel: ${originalFilename}`);
        response.status = 400;
        response.body = {
          success: false,
          msg: "El archivo debe ser de tipo Excel (.xlsx o .xls)",
        };
        return;
      }

      // Create unique filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const safeFileName = basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${timestamp}_${safeFileName}`;
      filePath = join(uploadDir, uniqueFileName);
      console.log(`Ruta para guardar el archivo: ${filePath}`);

      // Enhanced method to access file content - multiple fallback strategies
      let fileContent = null;
      
      // Strategy 1: Direct access to file.content
      if (file && typeof file.content !== 'undefined') {
        console.log("Usando file.content directamente");
        fileContent = file.content;
        console.log(`Contenido encontrado: ${fileContent.length} bytes`);
    }
      
      // Strategy 2: Check if file.content is a Uint8Array
      if (!fileContent && file.content && file.content instanceof Uint8Array) {
        console.log("Contenido encontrado en file.content");
        fileContent = file.content;
        console.log(`Contenido encontrado en file.content: ${fileContent.length} bytes`);
      }
      
      // Strategy 3: Handle different content types (string or ArrayBuffer)
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
      
      // Strategy 4: Try reading from temporary disk file path
      if (!fileContent && file && typeof file.filename === 'string') {
        try {
            console.log(`Intentando leer desde archivo: ${file.filename}`);
            fileContent = await Deno.readFile(file.filename);
            console.log(`Archivo leído: ${fileContent.length} bytes`);
        } catch (e) {
            console.error("Error al leer archivo:", e);
        }
    }
      
      // Strategy 5: Try reading bytes property directly
      if (!fileContent && (file as any).bytes) {
        console.log("Intentando leer bytes directamente");
        fileContent = (file as any).bytes;
        console.log(`Bytes extraídos: ${fileContent.length}`);
      }
      
      // Strategy 6: Try reading from possible file path
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

      // Return error if file content couldn't be extracted
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

      // Save the file to disk for processing
      console.log(`Guardando archivo con ${fileContent.length} bytes`);
      await Deno.writeFile(filePath, fileContent);
      
      // Verify that the file was saved correctly
      const fileStats = await Deno.stat(filePath);
      console.log(`Archivo guardado en disco. Tamaño: ${fileStats.size} bytes`);

      // Continue with Excel file processing
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
    // Ensure temporary file is deleted in all cases
    if (filePath) {
      try {
        await Deno.remove(filePath);
        console.log(`Archivo temporal eliminado en finally: ${filePath}`);
      } catch {
        // Ignore errors if file doesn't exist
      }
    }
    console.log("=== FIN PROCESAMIENTO EXCEL ===");
  }
};

/**
 * Alternative controller function to process Excel files sent as Base64 encoded data
 * Handles JSON requests containing filename and Base64 encoded file content
 * @param ctx - Oak framework context containing request and response objects
 */
export const procesarExcelBase64 = async (ctx: Context) => {
  const { request, response } = ctx;
  console.log("=== INICIO PROCESAMIENTO EXCEL BASE64 ===");
  
  let filePath = "";
  
  try {
    // Verify that the request contains a body
    if (!request.hasBody) {
      console.log("ERROR: No hay cuerpo en la solicitud");
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se ha enviado ningún archivo",
      };
      return;
    }
    
    // Parse JSON body from the request
    const body = await request.body({ type: "json" }).value;
    console.log("Body JSON recibido con propiedades:", Object.keys(body));
    
    // Verify that required fields are present
    if (!body.filename || !body.content) {
      console.log("ERROR: JSON incompleto, falta filename o content");
      response.status = 400;
      response.body = {
        success: false,
        msg: "Los datos enviados están incompletos. Se requiere filename y content.",
      };
      return;
    }
    
    // Extract filename and Base64 content
    const { filename, content } = body;
    console.log(`Archivo recibido: ${filename}, tamaño base64: ${content.length} caracteres`);
    
    // Validate that the file is an Excel file
    if (!filename.toLowerCase().endsWith('.xlsx') && !filename.toLowerCase().endsWith('.xls')) {
      console.log(`ERROR: El archivo no tiene extensión Excel: ${filename}`);
      response.status = 400;
      response.body = {
        success: false,
        msg: "El archivo debe ser de tipo Excel (.xlsx o .xls)",
      };
      return;
    }
    
    // Decode Base64 content to binary data
    try {
      // Remove data URL prefix if present (e.g., "data:application/...")
      let base64Data = content;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }
      
      // Decode Base64 to binary string, then to Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`Base64 decodificado: ${bytes.length} bytes`);
      
      // Create temporary directory for file storage
      const uploadDir = join(Deno.cwd(), "uploads", "excel");
      await ensureDir(uploadDir);
      
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const safeFileName = basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${timestamp}_${safeFileName}`;
      filePath = join(uploadDir, uniqueFileName);
      
      // Save decoded file to disk
      await Deno.writeFile(filePath, bytes);
      console.log(`Archivo guardado en: ${filePath}`);
      
      // Verify that the file was saved correctly
      const fileStats = await Deno.stat(filePath);
      console.log(`Archivo guardado en disco. Tamaño: ${fileStats.size} bytes`);
      
      // Continue with Excel file processing
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
    // Ensure temporary file is deleted in all cases
    if (filePath) {
      try {
        await Deno.remove(filePath);
        console.log(`Archivo temporal eliminado en finally: ${filePath}`);
      } catch {
        // Ignore errors if file doesn't exist
      }
    }
    console.log("=== FIN PROCESAMIENTO EXCEL BASE64 ===");
  }
};

/**
 * Internal function to process an Excel file once it's saved to disk
 * Reads the Excel file, extracts student data, and performs bulk insertion
 * @param filePath - Path to the saved Excel file on disk
 * @param response - Response object to send results back to client
 */
async function procesarArchivoExcel(filePath: string, response: any) {
  try {
    // Read the Excel file from disk
    const xlsxData = await Deno.readFile(filePath);
    console.log(`Archivo Excel leído: ${xlsxData.length} bytes`);
    
    // Validate that file is not empty or too small to be a valid Excel file
    if (xlsxData.length < 100) {
      throw new Error("El archivo es demasiado pequeño para ser un Excel válido");
    }
    
    // Process the Excel file using SheetJS with fallback strategies
    console.log("Procesando con XLSX.read...");
    let workbook;
    
    try {
      // Attempt 1: Standard configuration with full features
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
      
      // Attempt 2: Alternative configuration for problematic files
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
    
    // Validate that the workbook contains sheets
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("El archivo Excel no contiene hojas");
    }
    
    // Get the first sheet for processing
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log(`Usando hoja: ${sheetName}`);
    
    // Extract data as JSON from the worksheet
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",          // Default value for empty cells
      blankrows: false,    // Skip blank rows
      raw: false          // Convert values to strings
    });
    
    console.log(`Datos extraídos: ${jsonData.length} filas`);
    if (jsonData.length > 0) {
      console.log("Ejemplo de la primera fila:", jsonData[0]);
    }
    
    // Validate that data was successfully extracted
    if (!jsonData || jsonData.length === 0) {
      throw new Error("No se pudieron extraer datos del archivo Excel");
    }
    
    // Process the extracted data to prepare for database insertion
    const estudiantes = prepararDatosEstudiantes(jsonData);
    console.log(`Estudiantes procesados: ${estudiantes.length}`);
    
    // Insert processed students into the database
    const resultado = await insertarEstudiantesMasivo(estudiantes);
    console.log("Resultado de la inserción:", resultado);
    
    // Send response to client based on insertion result
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

/**
 * Utility function to prepare student data from Excel JSON
 * Maps Excel column headers to database fields with intelligent field detection
 * @param jsonData - Array of objects representing Excel rows
 * @returns Array of processed student objects ready for database insertion
 */
function prepararDatosEstudiantes(jsonData: any[]) {
  return jsonData.map((row: any, index: number) => {
    // Define possible column headers that could be found in Excel files
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

    /**
     * Helper function to find a matching key in the row object
     * Performs case-insensitive matching against possible column names
     * @param posibles - Array of possible column names to search for
     * @returns The actual key found in the row object, or null if not found
     */
    const encontrarClave = (posibles: string[]): string | null => {
      // Convert all row keys to lowercase for comparison
      const keysLower: Record<string, string> = {};
      Object.keys(row).forEach(key => {
        keysLower[key.toLowerCase()] = key;
      });

      // Search for a match among possible column names
      for (const posible of posibles) {
        if (keysLower[posible.toLowerCase()]) {
          return keysLower[posible.toLowerCase()];
        }
      }
      return null;
    };

    /**
     * Helper function to extract a value using possible column names
     * @param claves - Array of possible column names for this field
     * @returns The value found, or null if no matching column is found
     */
    const extraerValor = (claves: string[]): any => {
      const clave = encontrarClave(claves);
      return clave ? row[clave] : null;
    };

    // Extract and clean string values with fallbacks
    const nombre = String(extraerValor(posiblesClaves.nombre) || "").trim();
    const apellido = String(extraerValor(posiblesClaves.apellido) || "").trim();
    const email = String(extraerValor(posiblesClaves.email) || "").trim();
    const telefono = String(extraerValor(posiblesClaves.telefono) || "").trim();
    const carrera = String(extraerValor(posiblesClaves.carrera) || "").trim();
    
    // Safe numeric conversions with defaults
    const semestreRaw = extraerValor(posiblesClaves.semestre);
    const semestre = !isNaN(Number(semestreRaw)) ? Number(semestreRaw) : 1;
    
    const promedioRaw = extraerValor(posiblesClaves.promedio);
    const promedio = !isNaN(Number(promedioRaw)) ? Number(promedioRaw) : 0;
    
    // Process registration date with multiple format handling
    const fechaRaw = extraerValor(posiblesClaves.fecha_registro);
    let fecha_registro = new Date();
    
    if (fechaRaw) {
      if (fechaRaw instanceof Date) {
        // Already a Date object
        fecha_registro = fechaRaw;
      } else if (typeof fechaRaw === 'string') {
        // Try to parse string date
        const timestamp = Date.parse(fechaRaw);
        if (!isNaN(timestamp)) {
          fecha_registro = new Date(timestamp);
        }
      } else if (typeof fechaRaw === 'number') {
        // Excel stores dates as serial numbers (days since 1899-12-30)
        const excelEpoch = new Date(1899, 11, 30);
        const msPerDay = 24 * 60 * 60 * 1000;
        fecha_registro = new Date(excelEpoch.getTime() + fechaRaw * msPerDay);
      }
    }
    
    // Process status field with multiple format handling
    const estadoRaw = extraerValor(posiblesClaves.estado);
    let estado: 0 | 1 = 1; // Default to active
    
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

    // Fallback strategy: use positional values if key fields are missing
    if (!nombre && !apellido && !email) {
      console.log(`Fila ${index + 1}: No se encontraron campos clave, utilizando valores por posición`);
      
      // Get all keys and values from the row
      const claves = Object.keys(row);
      const valores = Object.values(row);
      
      // Use first columns as default fields if they exist
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

    // Return processed student object with defaults for missing required fields
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

/**
 * Controller function to export all students to an Excel file
 * Generates a downloadable Excel file containing all student records
 * @param ctx - Oak framework context containing response object
 */
export const exportarEstudiantesExcel = async (ctx: Context) => {
  const { response } = ctx;
  console.log("=== INICIO EXPORTACIÓN EXCEL ===");

  try {
    // Retrieve all students from the database
    console.log("Obteniendo lista de estudiantes...");
    const resultado = await listarEstudiantes();
    console.log(`Resultado de listarEstudiantes:`, {
      exito: resultado.success,
      cantidadDatos: resultado.data ? resultado.data.length : 0
    });
    
    // Check if students data is available for export
    if (!resultado.success || !resultado.data || resultado.data.length === 0) {
      console.log("No hay estudiantes para exportar");
      response.status = 404;
      response.body = {
        success: false,
        msg: "No hay estudiantes para exportar",
      };
      return;
    }

    // Create a new Excel workbook and worksheet
    console.log("Creando libro de Excel...");
    const workbook = XLSX.utils.book_new();
    
    // Prepare data for Excel export (convert dates to proper format)
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
      fecha_registro: new Date(estudiante.fecha_registro), // Ensure proper Date format
      estado: estudiante.estado
    }));
    
    console.log(`Datos preparados: ${datosExportar.length} filas`);
    
    // Create worksheet from the processed student data
    console.log("Creando hoja de trabajo...");
    const worksheet = XLSX.utils.json_to_sheet(datosExportar);
    console.log("Hoja creada con éxito");
    
    // Add the worksheet to the workbook
    console.log("Agregando hoja al libro...");
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estudiantes");
    
    // Generate Excel file as buffer
    console.log("Generando buffer Excel...");
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    console.log(`Buffer generado: ${excelBuffer.length} bytes`);
    
    // Configure response headers for file download
    const fechaActual = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    const nombreArchivo = `estudiantes_${fechaActual}.xlsx`;
    console.log(`Configurando respuesta para descarga: ${nombreArchivo}`);
    
    // Set response with proper headers for Excel file download
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