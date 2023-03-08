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
    destination: (req, file, cd) => {
        cd(null, 'upload/images/');
    },
    filename: (req, file, cd) => {
        const newFrilename = file.originalname;
        cd(null, newFrilename);
    }
});
// upload 객체 생성
const upload = multer({ storage: storage });
// upload 경로로 post 요청 시 응답 구현
app.post('/upload', upload.single('file'), (req, res) => {
    res.send({
        imgUrl: req.file.filename
    });
});

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
    const {m_name, m_nickname, m_email1, m_email2, m_pw, m_pwch, m_phone, m_Y, m_M, m_D, m_id} = req.body;
    console.log(req.body);
    if(mytextpass != '' && mytextpass != undefined) {
        bcrypt.genSalt(saltRounds, function(err, hash) {
            myPass = hash;
            conn.query(`insert into member(m_name, m_nickname, m_email1, m_email2, m_pw, m_pwch, m_phone, m_Y, m_M, m_D, m_id)
            values(?,?,?,?,?,?,?,?,?,?,?)`, [m_name, m_nickname, m_email1, m_email2, m_pw, m_pwch, m_phone, m_Y, m_M, m_D, m_id],
            (err, result, fields) => {
                if(result) {
                    console.log('회원가입 성공');
                    res.send('ok');
                } else {
                    console.log(err);
                }
            });
        });
    } 
});

// 닉네임 중복확인
app.post('/nickname', async (req, res) => {
    const { nickname } = req.body;
    conn.query(`select * from member where m_nickname = '${nickname}'`,
    (err, result, fields) => {
        if(result) {
            res.send(result[0]);
        }else {
            console.log(err);
        }
    });
});

// 나누어져있는 email을 하나로 합쳐 새로운 컬럼에 업데이트
app.patch('/updateid', async (req, res) => {
    const { m_no } = req.body;
    conn.query(`update member set m_id = concat('m_email1', '@', 'm_email2') where m_no = ${m_no}`,
    (err, result, fields) => {
        if(result) {
            console.log('업데이트 성공');
            res.send(result);
        }else {
            console.log('업데이트 실패');
        }
    });
});

// 로그인 요청
app.post('/login', async (req, res) => {
    const { userid, userpass } = req.body;
    conn.query(`select * from member where m_id = '${userid}'`,
    (err, result, fields) => {
        if(result != undefined && result[0] != undefined) {
            bcrypt.compare(userpass, result[0].m_pw, function(err, newPw) {
                if(newPw) {
                    console.log('로그인 성공');
                    res.send(result);
                }else {
                    console.log('로그인 실패');
                }
            });
        }else {
            console.log(err);
        }
    });
});


// 서버 작동
app.listen(port, () => {
    console.log('서버 작동중 ...');
});