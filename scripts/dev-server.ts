import {createServer} from 'node:http';
import {NetlifyDB} from '@netlify/database-dev';
const db=new NetlifyDB({directory:'.local-db'});
process.env.NETLIFY_DB_URL=await db.start();
await db.applyMigrations('./netlify/database/migrations');
const api=(await import('../netlify/functions/api.mts')).default;
const me=(await import('../netlify/functions/auth-me.mts')).default;
const config=(await import('../netlify/functions/auth-config.mts')).default;
createServer(async(req,res)=>{try{const chunks:Buffer[]=[];for await(const c of req)chunks.push(c);const path=req.url||'/';const request=new Request('http://localhost:5173'+path,{method:req.method,headers:req.headers as Record<string,string>,body:['GET','HEAD'].includes(req.method||'GET')?undefined:Buffer.concat(chunks)});const handler=path.startsWith('/api/')?api:path.endsWith('auth-me')?me:path.endsWith('auth-config')?config:null;const out=handler?await handler(request):Response.json({error:'Kirish xizmati faqat Netlify deployida mavjud.'},{status:503});res.writeHead(out.status,Object.fromEntries(out.headers));res.end(await out.text())}catch{res.writeHead(500);res.end(JSON.stringify({error:'Server xatosi'}))}}).listen(8788,'127.0.0.1',()=>console.log('Local DB API ready on 8788'));
