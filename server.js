require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

let passed = new Set();
const PASSED_FILE = './passed.json';

if (fs.existsSync(PASSED_FILE)) {
    passed = new Set(JSON.parse(fs.readFileSync(PASSED_FILE)));
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/authorize/:uuid', (req, res) => {
    res.sendFile(__dirname + '/public/captcha.html');
});

app.post('/verify', async (req, res) => {
    const { uuid, 'g-recaptcha-response': token } = req.body;
    if (!uuid || !token) return res.status(400).send('Ошибка валидации');

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${token}`;
    try {
        const response = await axios.post(verifyUrl);
        if (response.data.success) {
            passed.add(uuid);
            fs.writeFileSync(PASSED_FILE, JSON.stringify([...passed]));
            res.send('✅ Вы прошли капчу. Можете вернуться в игру.');
        } else {
            res.send('❌ Капча не пройдена. Попробуйте снова.');
        }
    } catch (err) {
        res.status(500).send('Ошибка при проверке капчи');
    }
});

app.get('/status/:uuid', (req, res) => {
    const { uuid } = req.params;
    res.json({ verified: passed.has(uuid) });
});

app.listen(port, () => {
    console.log(`Капча-сервер слушает на порту ${port}`);
});
