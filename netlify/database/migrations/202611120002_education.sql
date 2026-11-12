CREATE TABLE tm_content (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK(kind IN ('courses','modules','tests','tournaments','settings')),
  data jsonb NOT NULL,
  published boolean NOT NULL DEFAULT false,
  pro boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tm_content_kind ON tm_content(kind,published);
CREATE TABLE tm_progress (
  user_id text REFERENCES tm_users(id) ON DELETE CASCADE,
  course_id text REFERENCES tm_content(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,course_id,lesson_id)
);
CREATE TABLE tm_classes (
  id text PRIMARY KEY,
  teacher_id text NOT NULL REFERENCES tm_users(id),
  name text NOT NULL,
  subject text NOT NULL,
  code text UNIQUE NOT NULL CHECK (length(code)=6),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tm_members (
  class_id text REFERENCES tm_classes(id) ON DELETE CASCADE,
  user_id text REFERENCES tm_users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(class_id,user_id)
);
CREATE TABLE tm_assignments (
  id text PRIMARY KEY,
  class_id text NOT NULL REFERENCES tm_classes(id) ON DELETE CASCADE,
  test_id text NOT NULL REFERENCES tm_content(id),
  title text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  deadline timestamptz NOT NULL,
  allow_late boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tm_attempts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES tm_users(id),
  test_id text NOT NULL REFERENCES tm_content(id),
  assignment_id text REFERENCES tm_assignments(id),
  tournament_id text REFERENCES tm_content(id),
  snapshot jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  submitted_at timestamptz,
  answers jsonb,
  score integer,
  total integer,
  percent integer,
  duration integer,
  UNIQUE(user_id,tournament_id)
);
CREATE INDEX tm_attempts_user ON tm_attempts(user_id,submitted_at);
CREATE TABLE tm_submissions (
  id text PRIMARY KEY,
  assignment_id text NOT NULL REFERENCES tm_assignments(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES tm_users(id),
  attempt_id text NOT NULL REFERENCES tm_attempts(id),
  grade integer CHECK(grade BETWEEN 2 AND 5),
  feedback text NOT NULL DEFAULT '',
  graded_at timestamptz,
  UNIQUE(assignment_id,user_id)
);
CREATE TABLE tm_messages (
  id text PRIMARY KEY,
  class_id text NOT NULL REFERENCES tm_classes(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES tm_users(id),
  body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
  reply_to text REFERENCES tm_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tm_messages_class ON tm_messages(class_id,created_at);
CREATE TABLE tm_notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES tm_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tm_enrollments (
  tournament_id text REFERENCES tm_content(id) ON DELETE CASCADE,
  user_id text REFERENCES tm_users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tournament_id,user_id)
);
CREATE TABLE tm_audit (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES tm_users(id),
  action text NOT NULL,
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO tm_content(id,kind,published,pro,data) VALUES
('platform','settings',true,false,'{"proPrice":49000,"currency":"UZS","paymentUrl":"","supportEmail":"","name":"TestMe","grading":{"five":86,"four":71,"three":56}}'),
('algebra-start','courses',true,false,'{"title":"Algebra: ilk qadamlar","subject":"math","level":"Boshlang‘ich","description":"Tenglamalar, foizlar va mantiqiy fikrlashni sodda misollarda o‘rganing.","teacher":"TestMe jamoasi","duration":36,"lessons":[{"id":"equations","title":"Tenglamalar bilan tanishuv","duration":12,"content":"Tenglama ikki ifodaning tengligidir. 2x + 4 = 10 bo‘lsa, ikki tomondan 4 ni ayiring: 2x = 6. So‘ng ikkala tomonni 2 ga bo‘ling: x = 3.","videoUrl":""},{"id":"percent","title":"Foiz va ulushlar","duration":12,"content":"Foiz — yuzdan bir ulush. 200 ning 15 foizi 200 × 15 / 100 = 30. Narx 20 foiz kamayganda eski narxni 0.8 ga ko‘paytiring.","videoUrl":""},{"id":"practice","title":"Amaliy masalalar","duration":12,"content":"Mahsulot 150 000 so‘m. 10 foiz chegirmadan keyin 135 000 so‘m bo‘ladi. Foizni topish uchun qiymatni 100 ga bo‘lib, foiz soniga ko‘paytiring.","videoUrl":""}]}'),
('physics-motion','courses',true,false,'{"title":"Fizika: harakat olami","subject":"physics","level":"Boshlang‘ich","description":"Tezlik, masofa va vaqt orasidagi bog‘liqlikni kashf eting.","teacher":"TestMe jamoasi","duration":24,"lessons":[{"id":"speed","title":"Tezlik nima?","duration":12,"content":"Tezlik — vaqt birligida bosib o‘tilgan masofa: v = s / t. 100 metrni 20 soniyada bosib o‘tilsa, tezlik 5 m/s bo‘ladi.","videoUrl":""},{"id":"force","title":"Kuch va Nyuton qonuni","duration":12,"content":"Nyutonning ikkinchi qonuni F = ma. 2 kg jismga 3 m/s² tezlanish berish uchun 6 N kuch kerak.","videoUrl":""}]}'),
('english-foundation','courses',true,false,'{"title":"English: yangi boshlanish","subject":"english","level":"A1","description":"Kundalik ingliz tili va grammatikaga mustahkam poydevor.","teacher":"TestMe jamoasi","duration":30,"lessons":[{"id":"hello","title":"Hello, world!","duration":15,"content":"Hello — salom. Good morning — xayrli tong. How are you? — Qalaysiz? I am fine, thank you — Yaxshiman, rahmat.","videoUrl":""},{"id":"be","title":"Am, is, are","duration":15,"content":"I bilan am, he/she/it bilan is, you/we/they bilan are ishlatiladi. I am a student. She is a teacher. They are friends.","videoUrl":""}]}'),
('advanced-math','courses',true,true,'{"title":"Matematika: keyingi bosqich","subject":"math","level":"O‘rta","description":"Funksiyalar va tenglamalarni chuqurroq o‘rganing.","teacher":"TestMe jamoasi","duration":15,"lessons":[{"id":"functions","title":"Chiziqli funksiya","duration":15,"content":"y = kx + b chiziqli funksiya bo‘lib, uning grafigi to‘g‘ri chiziqdir. k qiyalikni, b esa y o‘qi bilan kesishish nuqtasini belgilaydi.","videoUrl":""}]}'),
('math-2026','modules',true,false,'{"title":"Matematika 2026","subject":"math","level":"Boshlang‘ich","year":2026,"description":"Hisoblash va algebra asoslarini mustahkamlang.","testIds":["math-basics"]}'),
('physics-2026','modules',true,false,'{"title":"Fizika 2026","subject":"physics","level":"Boshlang‘ich","year":2026,"description":"Harakat, kuch va energiya bo‘yicha mashqlar.","testIds":["physics-basics"]}'),
('english-2026','modules',true,false,'{"title":"Ingliz tili 2026","subject":"english","level":"A1","year":2026,"description":"Grammar va vocabulary bo‘yicha bilimlaringizni tekshiring.","testIds":["english-basics"]}'),
('math-pro','modules',true,true,'{"title":"Algebra Pro","subject":"math","level":"O‘rta","year":2026,"description":"Murakkabroq tenglamalarga tayyorlaning.","testIds":["math-advanced"]}'),
('math-basics','tests',true,false,'{"title":"Algebra va foizlar","subject":"math","duration":300,"passPercent":60,"questions":[{"id":"m1","text":"2x + 4 = 10. x nechaga teng?","options":["2","3","4","5"],"answer":"1","explanation":"2x = 10 − 4 = 6, shuning uchun x = 3."},{"id":"m2","text":"200 ning 15 foizi nechaga teng?","options":["15","20","30","40"],"answer":"2","explanation":"200 × 15 / 100 = 30."},{"id":"m3","text":"2 + 3 × 4 = ?","options":["20","14","24","18"],"answer":"1","explanation":"Avval ko‘paytirish: 3 × 4 = 12. Keyin 2 + 12 = 14."}]}'),
('physics-basics','tests',true,false,'{"title":"Harakat va kuch","subject":"physics","duration":300,"passPercent":60,"questions":[{"id":"p1","text":"100 metrni 20 soniyada bosib o‘tgan jismning tezligi?","options":["2 m/s","5 m/s","20 m/s","50 m/s"],"answer":"1","explanation":"v = s/t = 100/20 = 5 m/s."},{"id":"p2","text":"Kuchning SI birligi?","options":["Joul","Vatt","Nyuton","Paskal"],"answer":"2","explanation":"Kuch Nyutonda (N) o‘lchanadi."},{"id":"p3","text":"2 kg massaga 3 m/s² tezlanish beradigan kuch?","options":["1.5 N","5 N","6 N","9 N"],"answer":"2","explanation":"F = ma = 2 × 3 = 6 N."}]}'),
('english-basics','tests',true,false,'{"title":"Grammar: to be","subject":"english","duration":300,"passPercent":60,"questions":[{"id":"e1","text":"I ___ a student.","options":["is","are","am","be"],"answer":"2","explanation":"I olmoshi bilan am ishlatiladi."},{"id":"e2","text":"She ___ from London.","options":["are","am","be","is"],"answer":"3","explanation":"She olmoshi bilan is ishlatiladi."},{"id":"e3","text":"Good morning nimani anglatadi?","options":["Xayrli tun","Xayrli tong","Xayr","Rahmat"],"answer":"1","explanation":"Good morning — xayrli tong."}]}'),
('math-advanced','tests',true,true,'{"title":"Chiziqli funksiyalar","subject":"math","duration":180,"passPercent":60,"questions":[{"id":"a1","text":"y = 2x + 3 va x = 4 bo‘lsa, y = ?","options":["8","9","11","14"],"answer":"2","explanation":"y = 2 × 4 + 3 = 11."},{"id":"a2","text":"y = 3x − 2 funksiyaning qiyaligi nechaga teng?","options":["−2","2","3","−3"],"answer":"2","explanation":"y = kx + b da qiyalik k ga teng, bu yerda k = 3."}]}');
