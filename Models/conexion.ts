import {Client} from "../Dependencies/dependencias.ts";

// Database connection configuration using MySQL client
// Establishes connection to local MySQL database 'gestionestudiantes'

export const Conexion = await new Client().connect({
    hostname: "localhost",
    username: "root",
    db: "gestionestudiantes",
    password: "",
})