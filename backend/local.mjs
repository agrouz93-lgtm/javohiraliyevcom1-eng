import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
try{process.loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw error;}
let db,server;
if(!process.env.DATABASE_URL){
  const directory=resolve('.usta-data');
  await mkdir(directory,{recursive:true});
  db=await PGlite.create(directory);
  await db.exec(await readFile('backend/schema.sql','utf8'));
  server=new PGLiteSocketServer({db,host:'127.0.0.1',port:55434});
  await server.start();
  process.env.DATABASE_URL='postgresql://postgres@127.0.0.1:55434/postgres?sslmode=disable';
  console.log('Mahalliy doimiy baza .usta-data papkasida ochildi.');
}
const backend=spawn(resolve('.venv/Scripts/python.exe'),['-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8000'],{stdio:'inherit',env:process.env});
let stopping=false;
async function stop(){if(stopping)return;stopping=true;backend.kill();await server?.stop();await db?.close();}
process.on('SIGINT',()=>void stop());
process.on('SIGTERM',()=>void stop());
backend.on('exit',()=>void stop());
