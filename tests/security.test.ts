import {beforeAll,afterAll,expect,test,vi} from 'vitest';
import {NetlifyDB} from '@netlify/database-dev';
import {createHash} from 'node:crypto';
vi.mock('@netlify/identity',()=>({getUser:async()=>null}));
import handler from '../netlify/functions/api.mts';
import {database} from '../server/auth';
import telegramStatus from '../netlify/functions/telegram-status.mts';
import telegramWebhook from '../netlify/functions/telegram-webhook.mts';
let db:NetlifyDB;
beforeAll(async()=>{db=new NetlifyDB();process.env.NETLIFY_DB_URL=await db.start();await db.applyMigrations('netlify/database/migrations');for(const [id,role] of [['student','student'],['teacher','teacher'],['stranger','student'],['admin','admin']]){await db.query('INSERT INTO tm_users(id,name,role) VALUES($1,$1,$2)',[id,role]);await db.query('INSERT INTO tm_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'1 hour\')',[createHash('sha256').update(id.padEnd(43,'x')).digest('hex'),id])}},30000);
afterAll(async()=>{await database().pool.end();await db.stop()});
async function action(name:string,payload:any={},user='student',origin='https://testme.example'){const req=new Request('https://testme.example/api/action',{method:'POST',headers:{origin,'content-type':'application/json',cookie:`__Host-tm_session=${user.padEnd(43,'x')}`},body:JSON.stringify({action:name,payload})});const r=await handler(req);return {status:r.status,...await r.json()}}
test('answer keys cannot be requested through course detail',async()=>{expect((await action('course.detail',{id:'math-basics'})).status).toBe(404)});
test('Pro content and admin mutations reject students',async()=>{expect((await action('course.detail',{id:'advanced-math'})).status).toBe(403);expect((await action('admin.list',{entity:'users'})).status).toBe(403)});
test('cross-origin mutations rejected',async()=>{expect((await action('class.create',{name:'X',subject:'math'},'teacher','https://evil.example')).status).toBe(403)});
test('Telegram rejects forged webhook and binds challenge consumption to browser',async()=>{
 process.env.TELEGRAM_WEBHOOK_SECRET='test-webhook-secret';
 const forged=await telegramWebhook(new Request('https://testme.example/.netlify/functions/telegram-webhook',{method:'POST',body:'{}'}));expect(forged.status).toBe(403);
 const challenge='c'.repeat(43),browser='b'.repeat(43),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
 await db.query('INSERT INTO tm_telegram_challenges(token_hash,browser_hash,expires_at,telegram_id,telegram_name,confirmation_code,confirmed_at) VALUES($1,$2,now()+interval \'5 minutes\',$3,$4,$5,now())',[hash(challenge),hash(browser),'12345','Telegram user','123456']);
 const request=(b:string)=>new Request('https://testme.example/.netlify/functions/telegram-status',{method:'POST',headers:{origin:'https://testme.example',cookie:`__Host-tm_challenge=${challenge}.${b}`}});
 expect((await telegramStatus(request('x'.repeat(43)))).status).toBe(410);
 const success=await telegramStatus(request(browser));expect(success.status).toBe(200);expect(success.headers.get('set-cookie')).toContain('HttpOnly');expect((await success.json()).user.role).toBe('student');
 expect((await telegramStatus(request(browser))).status).toBe(410);
});
test('server scores, rejects replay, hides answer keys before submit',async()=>{const start=await action('test.start',{id:'math-basics'});expect(start.status).toBe(200);expect(start.data.questions[0]).not.toHaveProperty('answer');const result=await action('test.submit',{attemptId:start.data.attemptId,answers:{m1:'1',m2:'2',m3:'1'},score:999});expect(result.data.percent).toBe(100);expect(result.data.grade).toBe(5);expect((await action('test.submit',{attemptId:start.data.attemptId,answers:{}})).status).toBe(409)});
test('class membership, homework, notification and grade permissions',async()=>{const c=await action('class.create',{name:'Matematika',subject:'math'},'teacher');expect(c.data.code).toHaveLength(6);expect((await action('class.detail',{id:c.data.id},'stranger')).status).toBe(403);await action('class.join',{code:c.data.code});await action('class.assign',{classId:c.data.id,testId:'math-basics',title:'Vazifa',deadline:new Date(Date.now()+3600000).toISOString()},'teacher');const detail=await action('class.detail',{id:c.data.id});const assignmentId=detail.data.assignments[0].id;const a=await action('test.start',{id:'math-basics',assignmentId});await action('test.submit',{attemptId:a.data.attemptId,answers:{m1:'1'}});const d=await action('class.detail',{id:c.data.id},'teacher');const submissionId=d.data.submissions[0].id;expect((await action('class.grade',{submissionId,grade:5},'stranger')).status).toBe(403);expect((await action('class.grade',{submissionId,grade:1},'teacher')).status).toBe(400);expect((await action('class.grade',{submissionId,grade:4,comment:'Yaxshi'},'teacher')).status).toBe(200)});
