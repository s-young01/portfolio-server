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
// moment
const moment =require('moment-timezone');

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
// upload폴더 클라이언트에서 접근 가능하도록 설정
app.use('/upload', express.static('upload'));

// storage 생성
// diskStorage : 이미지를 저장해주는 저장소 역할을 함
const storage = multer.diskStorage({
    // 어디에 저장할지 경로를 설정.
    destination: (req, file, cd) => {
        cd(null, 'upload/');
    },
    filename: (req, file, cd) => {
        // 파일 이름은 직접 지정한 이름으로 저장하도록 설정.
        const newFilename = file.originalname;
        cd(null, newFilename);
    }
});
// upload객체 생성
const upload = multer({storage: storage});
// upload경로로 post요청 왔을 시 응답 구현
// .single('') : 지정한 경로로 요청이 왔을 때 객체의key이름을 받아 처리해서 넣어줌
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
    database: 'Written_Forest',
    dateStrings: 'true'
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
    conn.query(`select * from member where m_id = '${userid}'`,
    (err, result, fields) => {
        console.log(result);
        if(result != undefined && result[0] != undefined) {
            bcrypt.compare(userpw, result[0].m_pw, function(err, newPw) {
                if(newPw) {
                    console.log('로그인 성공');
                    // 로그인 성공 시 파라미터 값으로 넘겨 줄 닉네임 값 변수에 저장
                    let usernickname = result[0].m_nickname;
                    res.send(result);
                }
            });
        }else {
            console.log('로그인 실패');
            console.log(err);
            res.send("실패")
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
            res.send(result[0]);
        } else {
            console.log(err);
        }
    });
});

// 비밀번호 변경 요청
app.patch('/newpw', async (req, res) => {
    const {newpw, newpwCh, userid} = req.body;
    const mytextpass = newpw;
    console.log(userid)
    console.log(mytextpass)
    let myPass = '';
    if(mytextpass != '' && mytextpass != undefined) {
        bcrypt.genSalt(saltRounds, function(err, salt) {
            bcrypt.hash(mytextpass, salt, function(err, hash) {
                myPass = hash;
                console.log(myPass);
                console.log(newpwCh)
                conn.query(`update member set m_pw = '${myPass}', m_pwch = '${newpwCh}' where m_id = '${userid}'`,
                (err, result, fields) => {
                    console.log(result)
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
    const { title, content, writer, img } = req.body;
    const date = moment().tz('Asia/Seoul').format('YY.MM.DD HH:mm');
    conn.query(`insert into posts(p_title, p_content, p_date, p_writer, p_img) 
    values('${title}', '${content}', '${date}', '${writer}', '${img}')`,
    (err, result, fields) => {
        if(result) {
            res.send(result);
        }else {
            console.log(err);
        }   
    });
});

// 등록된 글 가져오기 get
app.get('/posts/:userpath', async (req, res) => {
    const { userpath } = req.params;
    console.log(userpath);
    if(userpath != undefined) {
        conn.query(`select * from posts where p_writer = '${userpath}' limit 8`, (err, result, fields) => {
            if(result) {
                console.log(result);
                res.send(result);
            }else {
                console.log(err);
            }
        });
    }else {
        console.log('사용자가 없습니다.');
    }
});
app.get('/post/:no/:userpath', async (req, res) => {
    const { no, userpath } = req.params;
    // console.log(req.params);
    conn.query(`select * from posts where p_no = ${no} and p_writer = '${userpath}'`,
    (err, result, fields) => {
        if(result) {
            res.send(result);
        }else {
            console.log(err);
        }
    });
});


// 서버 작동
app.listen(port, () => {
    console.log('서버 작동중 ...');
});