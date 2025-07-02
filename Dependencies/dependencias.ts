// Oak framework exports for building web applications and APIs
export { Application, Router, Context, isHttpError } from "https://deno.land/x/oak@v11.1.0/mod.ts";
// Zod library for runtime type validation and schema definition
export { z } from "https://deno.land/x/zod@v3.24.1/mod.ts";
// MySQL client for database connectivity and operations
export { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";
// CORS middleware for handling Cross-Origin Resource Sharing
export { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
// SheetJS library for Excel file processing (read/write .xlsx/.xls files)
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.19.3/package/xlsx.mjs";
export { XLSX };