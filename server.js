const express = require('express');
const admin = require('firebase-admin');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cookieParser());
app.use(express.json());

// Firebase Initialization
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Shared CSS for Modern UI
const style = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
        body { font-family: 'Poppins', sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; width: 90%; max-width: 400px; }
        h1 { color: #333; }
        .code-box { font-size: 32px; font-weight: bold; color: #27ae60; background: #e8f5e9; padding: 15px; border-radius: 10px; margin: 20px 0; }
        .btn { padding: 15px 30px; background: #4a90e2; color: white; border-radius: 50px; text-decoration: none; display: inline-block; }
    </style>
`;

// 1. Root Redirect
app.get('/', (req, res) => {
    res.redirect('https://sajilokamai.42web.io');
});

// 2. Verify: Entry Point
app.get('/verify/:linkId', async (req, res) => {
    try {
        const linkId = req.params.linkId;
        const userId = req.query.userid || 'Unknown'; // Capture User ID from URL
        
        const doc = await db.collection('links').doc(linkId).get();
        if (!doc.exists) return res.status(404).send('<h1>Link Not Found</h1>');

        // Create Session
        const sessionId = uuidv4();
        res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 3600000 }); // 1 Hour

        // Save "Ticket" to Firebase
        await db.collection('pending_verifications').doc(sessionId).set({
            linkId,
            userId,
            timestamp: new Date()
        });

        res.redirect(doc.data().url);
    } catch (e) { res.status(500).send('Server Error'); }
});

// 3. Finish: Security & Code Generation
app.get('/finish/:linkId', async (req, res) => {
    try {
        const linkId = req.params.linkId;
        const sessionId = req.cookies.sessionId;

        // Security: If no session, redirect to main site
        if (!sessionId) {
            return res.redirect('https://sajilokamai.42web.io');
        }

        // Validate Ticket
        const pendingRef = db.collection('pending_verifications').doc(sessionId);
        const pendingDoc = await pendingRef.get();

        if (!pendingDoc.exists || pendingDoc.data().linkId !== linkId) {
            return res.redirect(`https://sajilo-kamai-offer.onrender.com/verify/${linkId}`);
        }

        const userData = pendingDoc.data();
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Save Success
        await db.collection('generated_codes').add({
            code,
            linkId,
            userId: userData.userId,
            timestamp: new Date()
        });

        // Delete ticket & cookie
        await pendingRef.delete();
        res.clearCookie('sessionId');

        res.send(`
            ${style}
            <div class="card">
                <h1>Success!</h1>
                <p>User ID: <strong>${userData.userId}</strong></p>
                <div class="code-box">${code}</div>
                <p>Copy this code and return to the app.</p>
            </div>
        `);
    } catch (e) { res.status(500).send('Server Error'); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
