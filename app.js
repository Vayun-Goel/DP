const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');

function insertIntoSortedArray(sortedArray, element) {
    const index = sortedArray.findIndex(item => item > element);
    const insertIndex = index !== -1 ? index : sortedArray.length;
    sortedArray.splice(insertIndex, 0, element);
    return sortedArray;
}

const db = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : 'Vayun314',
    database : 'DP_test'
})

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json({ limit: '10mb' }));

db.connect(err =>{
    if(err) throw err;
    console.log('connected to db');
})

app.post('/check_appload',async (req,res)=>{
    try {
        const image = fs.readFileSync('images/pic1.jpeg');
        console.log("finished reading the file");
        const response = await axios.post('http://localhost:8000/appload_image', {
          course_name: "DP",
          image: image.toString('base64')
        });
        console.log(response.data);
        res.send(response.data);
      } 
      catch (error) {
        console.error(error);
    }
});

app.post('/appload_image',async (req,res)=>{
    const { course_name, image} = req.body;
    console.log("hi i am here");
    const imageBuffer = Buffer.from(image, 'base64');
    // fs.writeFileSync('uploaded_image.jpg', imageBuffer);
    try {
        const response = await axios.post('http://127.0.0.1:5000/upload', {
          image: imageBuffer.toString('base64')
        });
        console.log(response.data);
        const { face_images } = response.data;
        face_images.forEach((encodedImage, index) => {
            const decodedImage = Buffer.from(encodedImage, 'base64');
            fs.writeFileSync(`images/face_image_${index}.jpg`, decodedImage);
        });
      } 
      catch (error) {
        console.error(error);
    }
    res.send("working")
});

// for marking attendence based on confidence score list
app.post('/mark_attendence', (req,res)=> {
    const { course_name, data } = req.body;
    const sql = `SELECT student_id FROM student_enrolment WHERE course_id='${course_name}'`

    let hashMap = {};

    db.query(sql, (err,result) =>{
        if(err) throw err;
        result.forEach(row => {
            hashMap[row.student_id] = [];
        })
        console.log(hashMap);
        // data.sort((a, b) => b[0] - a[0]);
        // console.log(data);
        for (let i = 0; i < data.length; i++) {
        let key = data[i][1];
        if (hashMap.hasOwnProperty(key)) 
            {
                sortedList = insertIntoSortedArray(hashMap[key], data[i][0]);
                if(sortedList.length > 5)
                {
                    sortedList = sortedList.slice(0, 5);
                }
                hashMap[key] = sortedList;
                // hashMap[key].push(data[i][0]); 
            }
        }
        console.log(hashMap);
        for (const key in hashMap) {
            console.log("Entering the loop");
            let p_a = hashMap[key].length === 0 ? 0 : 1;
            console.log([key, p_a, hashMap[key]]);
            const vector = JSON.stringify(hashMap[key]); 
            const sql =
              `INSERT INTO DP_2024_summer 
              (student_id, p_or_a, vector) VALUES
              ("${key}", ${p_a}, '${vector}');`; 
            db.query(sql, (err, result) => {
              if (err) throw err;
              console.log(result);
            });
          } 
        db.end();
        res.send("hashMap");
    })

    
})

// to add a new course attendence table for every new course
app.post('/add_new_course', (req, res) => {
    const { course_name, year, semester } = req.body;
    console.log(`Received form data: Course Name - ${course_name}, Year - ${year}, Semester - ${semester}`);
    const sql = `
    CREATE TABLE ${course_name}_${year}_${semester} (
    student_id VARCHAR(255),
    p_or_a VARCHAR(1),
    vector VARCHAR(255),
    FOREIGN KEY (student_id) REFERENCES student(student_id)
  )
`;
    db.query(sql, (err,result) =>{
    if(err) throw err;
    console.log(result);
    })

    res.send(`Received form data: Course Name - ${course_name}, Year - ${year}, Semester - ${semester}`);
});

//create a new database
app.get('/createdb', (req,res) => {
    let sql = 'CREATE DATABASE samplesql';
    db.query(sql, (err,result) => {
        if(err) throw err;
        res.send('Database created');
    });
});

app.listen('8000', () => {
    console.log('server started');
})