import { Context } from "../Dependencies/dependencias.ts";
import { ensureDir } from "https://deno.land/std@0.220.1/fs/ensure_dir.ts";
import { basename, join } from "https://deno.land/std@0.220.1/path/mod.ts";

/**
 * Middleware function to handle Excel file uploads
 * Processes multipart form data and saves Excel files to the uploads directory
 * @param ctx - Oak framework context object containing request and response
 * @param next - Next middleware function in the chain
 */
export const uploadExcelMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
  const { request, response } = ctx;

  try {
    // Check if the request contains a body
    if (!request.hasBody) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se ha enviado ningún archivo",
      };
      return;
    }

    // Create directory structure for storing uploaded Excel files
    const uploadDir = join(Deno.cwd(), "uploads", "excel");
    await ensureDir(uploadDir);

    // Use 'any' type to avoid TypeScript errors with dynamic form data access
    const anyRequest = request as any;

    // Attempt to get form data using various available methods
    let formData: any;
    try {
      // Try to access formData() method if available
      if (typeof anyRequest.formData === 'function') {
        formData = await anyRequest.formData();
      }
      // Alternative: try multipart() method if available
      else if (typeof anyRequest.multipart === 'function') {
        formData = await anyRequest.multipart();
      }
      // Alternative: access body methods directly
      else {
        const bodyAny = anyRequest.body as any;
        if (typeof bodyAny.value?.read === 'function') {
          formData = await bodyAny.value.read();
        }
        else if (typeof bodyAny.read === 'function') {
          formData = await bodyAny.read();
        }
      }
    } catch (e) {
      console.error("Error accediendo al formulario:", e);
    }

    // Return error if form data couldn't be processed
    if (!formData) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se pudo procesar el formulario",
      };
      return;
    }

    // Locate the uploaded file using different possible data structures
    let file: any = null;

    // Option 1: formData has files as an array
    if (Array.isArray(formData.files) && formData.files.length > 0) {
      file = formData.files[0];
    }
    // Option 2: formData has a get method (standard FormData interface)
    else if (typeof formData.get === 'function') {
      try {
        file = formData.get('file');
      } catch (e) {
        console.error("Error con formData.get:", e);
      }
    }

    // Return error if no file was found
    if (!file) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se encontró ningún archivo en la solicitud",
      };
      return;
    }

    // Initialize variables for file processing
    let fileName = '';
    let fileContent: Uint8Array | null = null;

    // Handle different file object structures
    if (typeof file === 'string') {
      // File might be just a path in some cases
      fileName = basename(file);
      fileContent = await Deno.readFile(file);
    } else {
      // Try different properties where filename might be stored
      fileName = file.filename || file.originalName || file.name || 'archivo.xlsx';

      // Try different properties where file data might be stored
      if (file.content) {
        fileContent = file.content;
      } else if (file.data) {
        fileContent = file.data;
      } else if (file.bytes) {
        fileContent = file.bytes;
      } else if (typeof file.path === 'string' || typeof file.filename === 'string') {
        const filePath = file.path || file.filename;
        fileContent = await Deno.readFile(filePath);
      }
    }

    // Return error if file content couldn't be read
    if (!fileContent) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se pudieron leer los datos del archivo",
      };
      return;
    }

    // Validate that the uploaded file is an Excel file
    // Add debug logging for file type validation
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      console.log("Error en middleware - Tipo de archivo rechazado:", fileName);
      console.log("Tipo MIME detectado:", file.filename ? "Con filename" : "Sin filename");
      response.status = 400;
      response.body = {
        success: false,
        msg: "El archivo debe ser de tipo Excel (.xlsx o .xls)",
      };
      return;
    }

    // Save the file to permanent storage location
    const timestamp = Date.now();
    // Sanitize filename by removing special characters
    const safeFileName = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    // Create unique filename with timestamp prefix
    const uniqueFileName = `${timestamp}_${safeFileName}`;
    const filePath = join(uploadDir, uniqueFileName);

    // Write file content to disk
    await Deno.writeFile(filePath, fileContent);

    // Store file information in context state for next middleware
    ctx.state.uploadedFile = {
      name: fileName,
      path: filePath,
      size: fileContent.length,
    };

    // Continue to the next middleware in the chain
    await next();
  } catch (error) {
    console.error("Error al procesar archivo Excel:", error);
    response.status = 500;
    response.body = {
      success: false,
      msg: "Error al procesar el archivo Excel",
      details: error instanceof Error ? error.message : String(error),
    };
  }
};