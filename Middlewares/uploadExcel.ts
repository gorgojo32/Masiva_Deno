import { Context } from "../Dependencies/dependencias.ts";
import { ensureDir } from "https://deno.land/std@0.220.1/fs/ensure_dir.ts";
import { basename, join } from "https://deno.land/std@0.220.1/path/mod.ts";

export const uploadExcelMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
  const { request, response } = ctx;

  try {
    // Comprobar si hay un cuerpo en la solicitud
    if (!request.hasBody) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se ha enviado ningún archivo",
      };
      return;
    }

    // Crear directorio para almacenar archivos
    const uploadDir = join(Deno.cwd(), "uploads", "excel");
    await ensureDir(uploadDir);

    // Usar tipos 'any' para evitar errores de TypeScript
    const anyRequest = request as any;

    // Obtener form-data directamente
    let formData: any;
    try {
      // Intentar acceder a formData() si existe
      if (typeof anyRequest.formData === 'function') {
        formData = await anyRequest.formData();
      }
      // Alternativa: intentar acceder a multipart() si existe
      else if (typeof anyRequest.multipart === 'function') {
        formData = await anyRequest.multipart();
      }
      // Alternativa: acceder directamente a métodos de body
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

    if (!formData) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se pudo procesar el formulario",
      };
      return;
    }

    // Encontrar el archivo (usando diferentes posibles estructuras)
    let file: any = null;

    // Opción 1: formData tiene files como array
    if (Array.isArray(formData.files) && formData.files.length > 0) {
      file = formData.files[0];
    }
    // Opción 2: formData tiene un método get
    else if (typeof formData.get === 'function') {
      try {
        file = formData.get('file');
      } catch (e) {
        console.error("Error con formData.get:", e);
      }
    }

    if (!file) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se encontró ningún archivo en la solicitud",
      };
      return;
    }

    // Intentar obtener el nombre del archivo
    let fileName = '';
    let fileContent: Uint8Array | null = null;

    if (typeof file === 'string') {
      // El archivo podría ser solo una ruta en algunos casos
      fileName = basename(file);
      fileContent = await Deno.readFile(file);
    } else {
      // Intentar diferentes propiedades donde podría estar el nombre del archivo
      fileName = file.filename || file.originalName || file.name || 'archivo.xlsx';

      // Intentar diferentes propiedades donde podrían estar los datos del archivo
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

    if (!fileContent) {
      response.status = 400;
      response.body = {
        success: false,
        msg: "No se pudieron leer los datos del archivo",
      };
      return;
    }

    // Verificar que sea un archivo Excel
    // En el archivo uploadExcel.ts
    // Añade estos console.log
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

    // Guardar el archivo en la ubicación definitiva
    const timestamp = Date.now();
    const safeFileName = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${timestamp}_${safeFileName}`;
    const filePath = join(uploadDir, uniqueFileName);

    await Deno.writeFile(filePath, fileContent);

    // Guardar información en el estado
    ctx.state.uploadedFile = {
      name: fileName,
      path: filePath,
      size: fileContent.length,
    };

    // Continuar al siguiente middleware
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