import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const db = new Database(
    path.join(dataDir, "logforge.db")
);


db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
                                        id TEXT PRIMARY KEY,
                                        filename TEXT NOT NULL,
                                        content TEXT NOT NULL,
                                        parsed TEXT,
                                        created_at INTEGER NOT NULL
    );
`);



export type StoredLog = {
    id:string;
    filename:string;
    content:string;
    parsed?:string;
    created_at:number;
};



export function createLog(
    log:StoredLog
){

    db.prepare(`
    INSERT INTO logs
    (
      id,
      filename,
      content,
      parsed,
      created_at
    )
    VALUES
    (
      @id,
      @filename,
      @content,
      @parsed,
      @created_at
    )
  `).run(log);

}



export function getLog(
    id:string
){

    return db.prepare(`
    SELECT *
    FROM logs
    WHERE id = ?
  `).get(id) as StoredLog | undefined;

}