// express
const express = require('express');
// cors 
const cors = require('cors');
// mysql
const mysql = require('mysql');
// multer
const multer = require('multer');
// bcrypt
const bcrypt = require('bcrypt');
//암호화 글자수
const saltRounds = 10;
const path = require('path');
const mime = require('mime-types');
const { v4:uuid } = require('uuid');
const { log } = require('console');
const { SlowBuffer } = require('buffer');

// 서버 생성
const app  = express();
// 포트번호 지정 
const port = 8080;
// cors 이슈 막기
app.use(cors());
// json 형태로 변환
app.use(express.json());
// upload폴더를 클라이언트에서 접근 가능하도록 설정
app.use('/upload', express.static('upload'));

// storage 생성
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, `${uuid()}.${mime.extension(file.mimetype)}`);
    }
});
// upload 객체 생성
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype)) {
            cb(null, true);
        }else {
            cb(new Error("해당 파일의 형식을 지원하지 않습니다."), false);
        }
    },
    limits: { fileSize: 1024 * 1024 * 5 }
});
// upload 경로로 post 요청 시 응답 구현
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.status(200).json(req.file);
});
app.use('/images', express.static(path.join(__dirname, '/images')));

// mysql 연결
const conn = mysql.createConnection({
    host: 'hera-para.cyrwjcvax6mc.ap-northeast-1.rds.amazonaws.com',
    user: 'admin',
    password: '12345678',
    database: 'Written_Forest'
});
conn.connect();

// 회원가입 요청
app.post('/join', async (req, res) => {
    const mytextpass = req.body.m_pw;
    let myPass = '';
    const {m_name, m_nickname, m_email1, m_email2, m_pw, m_pwch, m_phone, m_Y, m_M, m_D} = req.body;
    // m_id 컬럼에 admin@gmail.com 이런 식으로 나오게 문자열 합쳐주기
    const m_id = m_email1 + "@" + m_email2;
    if(mytextpass != '' && mytextpass != undefined) {
        bcrypt.genSalt(saltRounds, function (err, salt) {
            //hash메소드 호출되면 인자로 넣어준 비밀번호를 암호화하여
            // 콜백함수 안 hash로 돌려준다.
            bcrypt.hash(mytextpass, salt, function (err, hash) {
                myPass = hash;
                console.log(myPass)
                //쿼리작성
                conn.query(`insert into member(m_name, m_nickname, m_email1, m_email2, m_pw, m_pwch, m_phone, m_Y, m_M, m_D, m_id)
                values(?,?,?,?,?,?,?,?,?,?,?)`, [m_name, m_nickname, m_email1, m_email2, myPass, m_pwch, m_phone, m_Y, m_M, m_D, m_id],
                (err, result, fields) => {
                    if(result) {
                        console.log('회원가입 성공');
                        res.send('ok');
                    } else {
                        console.log(err);
                    }
                });
            });
        });
    } 
});

// 닉네임 중복확인
app.get('/nickcheck/:m_nickname', async (req, res) => {
    const { m_nickname } = req.params;
    conn.query(`select * from member where m_nickname = '${m_nickname}'`,
    (err, result, fields) => {
        if(result) {
            console.log(result);
            res.send(result[0]);
        }else {
            console.log(err);
        }
    });
});


// 로그인 요청
app.post('/login', async (req, res) => {
    const { userid, userpw } = req.body;
    console.log(req.body);
    conn.query(`select * from member where m_id = '${userid}'`,
    (err, result, fields) => {
        console.log(result);
        if(result != undefined && result[0] != undefined) {
            bcrypt.compare(userpw, result[0].m_pw, function(err, newPw) {
                console.log(newPw);
                console.log(userpw);
                if(newPw) {
                    console.log('로그인 성공');
                    res.send(result);
                }else {
                    console.log('로그인 실패');
                    console.log(err);
                }
            });
        }
    });
});

// 아이디 찾기 요청
app.post('/findid', async (req, res) => {
    const { username, userphone } = req.body;
    conn.query(`select * from member where m_name = '${username}' and m_phone = '${userphone}'`,
    (err, result, fields) => {
        if(result != undefined && result[0] != undefined) {
            console.log('OK');
            res.send(result[0].m_id);
        } else {
            console.log(err);
        }
    });
});

// 비밀번호 찾기 요청
app.post('/findpw', async (req, res) => {
    const { username, userid } = req.body;
    conn.query(`select * from member where m_name = '${username}' and m_id = '${userid}'`,
    (err, result, fields) => {
        if(result != undefined && result[0] != undefined) {
            console.log('OK');
            res.send(result[0].m_pwch);
        } else {
            console.log(err);
        }
    });
});

// 비밀번호 변경 요청
app.post('/newpw', async (req, res) => {
    const {newpw, newpwCh, userid} = req.body;
    const mytextpass = newpw;
    let myPass = '';
    if(mytextpass != '' && mytextpass != undefined) {
        bcrypt.genSalt(saltRounds, function(err, salt) {
            bcrypt.hash(mytextpass, salt, function(err, hash) {
                myPass = hash;
                console.log(myPass);
                conn.query(`update member set m_pw = '${myPass}' and m_pwch = '${newpwCh}' where m_id = '${userid}'`,
                (err, result, fields) => {
                    if(result) {
                        console.log('비밀번호 변경 성공');
                        res.send(result);
                    }else {
                        console.log(err);
                    }
                });
            });
        });
    }
});

// 글 등록 요청 post
app.post('/postUpdate', async (req, res) => {
    const {title, content } = req.body;
    conn.query(`insert into posts(p_title, p_content, p_date) values('${title}', '${content}', date_format(now(), '%y.%m.%d. %H:%i'))`
    , (err, result, fields) => {
         res.send(result);
    });
});

// 등록된 글 가져오기 get
app.get('/posts', async (req, res) => {
    conn.query('select * from posts limit 8', (err, result, fields) => {
        res.send(result);
    });
});
app.get('/post/:no', async (req, res) => {
    const { no } = req.params;
    conn.query(`select * from posts where p_no = ${no}`,
    (err, result, fields) => {
        res.send(result);
    });
    
});


// 서버 작동
app.listen(port, () => {
    console.log('서버 작동중 ...');
});