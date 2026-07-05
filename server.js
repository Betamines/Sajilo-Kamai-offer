const express = require('express');
const admin = require('firebase-admin');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cookieParser());

// Firebase Initialize
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// १. मुख्य होम पेज (Cannot GET / फिक्स गर्न)
app.get('/', (req, res) => {
    res.send('<h1>सर्भर अनलाइन छ!</h1><p>यो पेज काम गरिरहेको छ।</p>');
});

// २. भेरिफाई रुट
app.get('/verify/:linkId', async (req, res) => {
    try {
        const linkId = req.params.linkId;
        const doc = await db.collection('links').doc(linkId).get();
        
        if (!doc.exists) {
            return res.status(404).send('<h1>लिङ्क भेटिएन!</h1>');
        }

        const data = doc.data(); 
        const sessionId = req.cookies.sessionId || uuidv4();
        res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 86400000 });

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await db.collection('generated_codes').add({
            code: code,
            sessionId: sessionId,
            linkId: linkId,
            timestamp: new Date(),
            ip: req.ip
        });

        res.send(`
            <div style="text-align:center; margin-top:50px; font-family: sans-serif;">
                <h1>सफलतापूर्वक पूरा भयो!</h1>
                <h2 style="color: blue;">तपाईंको कोड: ${code}</h2>
                <a href="${data.url}"><button style="padding:15px 30px; font-size:20px;">कन्टिन्यू गर्नुहोस्</button></a>
            </div>
        `);
    } catch (error) {
        res.status(500).send('सर्भर एरर!');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
