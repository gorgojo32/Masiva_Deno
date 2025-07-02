# Student Management API with Deno

This application is a backend server built with Deno that provides a complete REST API for student management operations. The system includes full CRUD functionality, Excel file import/export capabilities, and bulk operations for efficient data handling.

## Features

- **Complete CRUD Operations:** Create, read, update, and delete student records
- **Excel Import/Export:** Import students from Excel files and export student data to Excel format
- **Bulk Operations:** Insert multiple students at once for efficient data management
- **Data Validation:** Comprehensive input validation using Zod schemas
- **MySQL Integration:** Robust database operations with transaction support
- **CORS Enabled:** Configured to work with frontend applications from different domains
- **Error Handling:** Comprehensive logging and error handling system
- **Excel Processing:** Advanced Excel file processing with intelligent column mapping

## Technologies

- **Deno:** Modern and secure TypeScript runtime
- **Oak Framework:** Web framework for Deno similar to Express.js
- **MySQL:** Relational database for data persistence
- **SheetJS (XLSX):** Excel file processing library
- **Zod:** Runtime type validation and schema definition
- **TypeScript:** For strong typing and better development experience

## Installation

### Required Extensions for Visual Studio Code
Before running the project, make sure you install the following extensions in VS Code:

**Required Extensions:**

- **Deno (denoland)** - REQUIRED
  - Provides full support for Deno runtime
  - Enables intellisense, debugging, and formatting
  - 
<div align="center">
  <table>
    <tr><td style="padding: 10px; background: white;">
         <img src="https://github.com/user-attachments/assets/689a97f9-ede9-4baa-8b32-47c9a220452c" width="500" style="border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
    </td></tr>
  </table>
</div>

**Recommended Extensions:**

- **ESLint (Microsoft)** - Improves TypeScript code quality
- **JavaScript and TypeScript Nightly (Microsoft)** - Advanced TypeScript support
- **Error Lens (Alexander)** - Improved error visualization
- **REST Client (Huachao Mao)** - For testing API endpoints

  <div align="center">
  <table>
    <tr>
      <td style="padding: 10px; background: white;">
        <img src="https://github.com/user-attachments/assets/e23af0e5-724b-4ec6-9ec2-df0880d881da" width="450">
      </td>
      <td style="padding: 10px; background: white;">
        <img src="https://github.com/user-attachments/assets/2934ca6b-264b-4382-a16b-d44cb11106df" width="450">
      </td>
    </tr>
    <tr>
      <td style="padding: 10px; background: white;">
        <img src="https://github.com/user-attachments/assets/16f88379-4f4e-4946-9056-3a83ea136d8e" width="450">
      </td>
      <td style="padding: 10px; background: white;">
        <img src="https://github.com/user-attachments/assets/f63e52cd-7eda-4421-82e4-d10ca54cd744" width="450">
      </td>
    </tr>
  </table>
</div>

### Prerequisites

Make sure you have the following installed on your system:
- **Deno runtime**
- **MySQL server** running locally
- **Database:** `gestionestudiantes` created in MySQL

### Database Setup

1. **Create the database:**
   ```sql
   CREATE DATABASE gestionestudiantes;
   ```

2. **Create the students table:**
   ```sql
   USE gestionestudiantes;
   
   CREATE TABLE estudiantes (
     id_estudiante INT AUTO_INCREMENT PRIMARY KEY,
     nombre VARCHAR(100) NOT NULL,
     apellido VARCHAR(100) NOT NULL,
     email VARCHAR(150) UNIQUE NOT NULL,
     telefono VARCHAR(20) NOT NULL,
     carrera VARCHAR(150) NOT NULL,
     semestre INT NOT NULL,
     promedio DECIMAL(3,2) NOT NULL,
     fecha_registro DATE NOT NULL,
     estado TINYINT(1) DEFAULT 1
   );
   ```

### Configuration

1. **Update database connection:**
   Edit `Models/conexion.ts` with your MySQL credentials:
   ```typescript
   export const Conexion = await new Client().connect({
       hostname: "localhost",
       username: "root",
       db: "gestionestudiantes",
       password: "your_password", // Add your MySQL password
   });
   ```

2. **Run the application:**
   ```bash
   deno run --allow-net --allow-read --allow-env --allow-write --allow-sys app.ts
   ```

## Usage

### Available Endpoints

#### **Base URL:** `http://localhost:8000`

#### **Student Management Routes**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/estudiantes` | Retrieve all students |
| `POST` | `/estudiantes` | Create a new student |
| `PUT` | `/estudiantes/:id` | Update student by ID |
| `DELETE` | `/estudiantes/:id` | Delete student by ID |
| `POST` | `/estudiantes/masivo` | Bulk insert multiple students |

#### **Excel Operations Routes**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/estudiantes/importar-excel` | Import students from Excel file |
| `GET` | `/estudiantes/exportar-excel` | Export all students to Excel file |

### API Usage Examples

#### List all students
```bash
curl -X GET "http://localhost:8000/estudiantes"
```

#### Create a new student
```bash
curl -X POST "http://localhost:8000/estudiantes" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Carlos",
    "apellido": "Pérez López",
    "email": "juan.perez@ejemplo.com",
    "telefono": "5551234567",
    "carrera": "Ingeniería en Sistemas",
    "semestre": 3,
    "promedio": 8.5,
    "fecha_registro": "2024-01-15",
    "estado": 1
  }'
```

#### Update a student
```bash
curl -X PUT "http://localhost:8000/estudiantes/1" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Carlos",
    "apellido": "Pérez López",
    "email": "juancarlos.perez@ejemplo.com",
    "telefono": "5551234567",
    "carrera": "Ingeniería en Sistemas Computacionales",
    "semestre": 4,
    "promedio": 9.1,
    "fecha_registro": "2023-08-15",
    "estado": 1
  }'
```

#### Delete a student
```bash
curl -X DELETE "http://localhost:8000/estudiantes/12"
```


#### Export students to Excel
```bash
curl -X GET "http://localhost:8000/estudiantes/exportar-excel" \
  --output estudiantes.xlsx
```

### Excel Import Format

When importing students via Excel, the system supports flexible column naming. The following column headers are recognized:

| Spanish | English Alternatives |
|---------|---------------------|
| `nombre` | `name`, `firstname`, `first_name`, `first name` |
| `apellido` | `lastname`, `surname`, `last_name`, `last name` |
| `email` | `correo`, `mail`, `e-mail`, `correo_electronico` |
| `telefono` | `phone`, `tel`, `celular`, `mobile`, `telephone` |
| `carrera` | `career`, `program`, `programa`, `degree` |
| `semestre` | `semester`, `periodo`, `term` |
| `promedio` | `average`, `gpa`, `calificacion`, `grade`, `score` |
| `fecha_registro` | `date`, `fecha`, `registro`, `registration_date` |
| `estado` | `status`, `active`, `activo`, `is_active` |

## Project Structure

```
STUDENT-API-DENO/
├── Controller/
│   ├── estudiantesController.ts  // Main CRUD controllers
│   └── excelController.ts        // Excel import/export controllers
├── Dependencies/
│   └── dependencias.ts           // Centralized dependencies
├── Middlewares/
│   └── uploadExcel.ts           // Excel file upload middleware
├── Models/
│   ├── conexion.ts              // MySQL database connection
│   └── estudiantesModels.ts     // Student data models and DB operations
├── Routes/
│   └── estudiantesRoutes.ts     // Route definitions
├── uploads/
│   └── excel/                   // Temporary Excel file storage
├── app.ts                       // Main entry point
└── deno.json                    // Deno configuration
```

## Data Validation

The system uses Zod schemas for comprehensive data validation:

### Student Schema
```typescript
{
  id_estudiante: number (optional),
  nombre: string (required, min 1 char),
  apellido: string (required, min 1 char),
  email: string (required, valid email format),
  telefono: string (required, min 1 char),
  carrera: string (required, min 1 char),
  semestre: number (required, min 1),
  promedio: number (required, 0-10 range),
  fecha_registro: Date (required),
  estado: 0 | 1 (required, 0=inactive, 1=active)
}
```

## Error Handling

The API provides comprehensive error handling with detailed messages:

- **Validation Errors:** Field-specific validation messages
- **Database Errors:** Connection and query error handling
- **File Processing Errors:** Excel import/export error handling
- **HTTP Errors:** Proper status codes and error messages

## Security Features

- **Input Validation:** All inputs validated using Zod schemas
- **SQL Injection Prevention:** Parameterized queries for all database operations
- **CORS Configuration:** Controlled cross-origin access
- **File Type Validation:** Excel file format verification
- **Transaction Support:** Database transactions for data consistency

## Performance Features

- **Bulk Operations:** Efficient batch processing for multiple records
- **Database Transactions:** Ensures data consistency during bulk operations
- **Batch Processing:** Excel imports processed in configurable batch sizes
- **Memory Management:** Temporary file cleanup and resource management

## Testing with REST Client

If you have the REST Client extension installed in VS Code, you can create a `.rest` file with the following requests:

```http
### List all students
GET http://localhost:8000/estudiantes

### Create a new student
POST http://localhost:8000/estudiantes
Content-Type: application/json

{
  "nombre": "Juan Carlos",
  "apellido": "Pérez López",
  "email": "juan.perez@ejemplo.com",
  "telefono": "5551234567",
  "carrera": "Ingeniería en Sistemas",
  "semestre": 3,
  "promedio": 8.5,
  "fecha_registro": "2024-01-15",
  "estado": 1
}

### Update a student
PUT http://localhost:8000/estudiantes/1
Content-Type: application/json

{
  "nombre": "Juan Carlos",
  "apellido": "Pérez López",
  "email": "juancarlos.perez@ejemplo.com",
  "telefono": "5551234567",
  "carrera": "Ingeniería en Sistemas Computacionales",
  "semestre": 4,
  "promedio": 9.1,
  "fecha_registro": "2023-08-15",
  "estado": 1
}

### Delete a student
DELETE http://localhost:8000/estudiantes/12

### Export students to Excel
GET http://localhost:8000/estudiantes/exportar-excel

### Import students from Excel file
POST http://localhost:8000/estudiantes/importar-excel
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="estudiantes.xlsx"
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

< ./path/to/your/estudiantes.xlsx
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

## Common Issues and Solutions

### Excel Import Issues
- **File format:** Ensure files are in .xlsx or .xls format
- **Column headers:** Use supported column names (case-insensitive)
- **Data types:** Ensure numeric fields contain valid numbers
- **Email format:** Verify email addresses are properly formatted

### Database Connection Issues
- **MySQL service:** Ensure MySQL server is running
- **Credentials:** Verify database connection settings in `conexion.ts`
- **Database exists:** Confirm `gestionestudiantes` database is created
- **Table structure:** Ensure `estudiantes` table exists with correct schema

### Permission Issues
- **Deno permissions:** Ensure all required flags are provided when running
- **File system:** Check write permissions for uploads directory
- **Network access:** Verify network permissions for database connections
