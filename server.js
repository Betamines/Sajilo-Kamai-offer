const express = require('express');
const admin = require('firebase-admin');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cookieParser());

// ... (Firebase initialization यहाँ छ जस्ताको तस्तै)

// Common Style for User Pages
const globalStyle = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');
        body { font-family: 'Poppins', sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
        .btn { display: inline-block; padding: 15px 30px; background: #27ae60; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; margin-top: 20px; transition: 0.3s; }
        .btn:hover { background: #219150; transform: scale(1.05); }
    </style>
`;

// 1. Verify Route (Modern)
app.get('/verify/:linkId', async (req, res) => {
    try {
        const linkId = req.params.linkId;
        const doc = await db.collection('links').doc(linkId).get();
        if (!doc.exists) return res.status(404).send('<h1>Link Not Found</h1>');

        const sessionId = uuidv4();
        res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 3600000 });
        await db.collection('pending_verifications').doc(sessionId).set({ linkId, timestamp: new Date() });

        res.send(`
            ${globalStyle}
            <div class="card">
                <h2>Verify Link</h2>
                <p>Click the button below to complete the verification process.</p>
                <a href="${doc.data().url}" class="btn">Start Verification</a>
            </div>
        `);
    } catch (e) { res.status(500).send('Server Error'); }
});

// 2. Finish Route (Modern)
app.get('/finish/:linkId', async (req, res) => {
    try {
        const linkId = req.params.linkId;
        const sessionId = req.cookies.sessionId;
        
        if (!sessionId) return res.status(403).send('Access Denied');

        const pendingRef = db.collection('pending_verifications').doc(sessionId);
        const pendingDoc = await pendingRef.get();

        if (!pendingDoc.exists || pendingDoc.data().linkId !== linkId) return res.status(403).send('Invalid path');

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await db.collection('generated_codes').add({ code, linkId, timestamp: new Date() });
        await pendingRef.delete();
        res.clearCookie('sessionId');

        res.send(`
            ${globalStyle}
            <div class="card">
                <h1 style="color: #27ae60;">Success!</h1>
                <p>Your verification code is:</p>
                <h2 style="font-size: 40px; color: #333; margin: 20px 0;">${code}</h2>
                <p>Copy this code to proceed.</p>
            </div>
        `);
    } catch (e) { res.status(500).send('Server Error'); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
