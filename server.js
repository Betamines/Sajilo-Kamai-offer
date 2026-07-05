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

// 1. Verify Route: Redirects to Shortener
app.get('/verify/:linkId', async (req, res) => {
    try {
        const linkId = req.params.linkId;
        const doc = await db.collection('links').doc(linkId).get();
        
        if (!doc.exists) {
            return res.status(404).send('<h1>Link not found!</h1>');
        }

        const data = doc.data(); 
        
        // Set a session cookie to track that the user started the offer
        res.cookie(`started_${linkId}`, 'true', { httpOnly: true, maxAge: 600000 }); // 10 minutes expiry

        // Redirect directly to the shortener link saved in DB
        res.redirect(data.url);
    } catch (error) {
        res.status(500).send('Server Error!');
    }
});

// 2. Finish Route: Generates code after completion
app.get('/finish/:linkId', async (req, res) => {
    try {
        const linkId = req.params.linkId;
        
        // Check if the user actually went through the verify route first
        if (!req.cookies[`started_${linkId}`]) {
            return res.status(403).send('<h1>Error: Offer not completed!</h1><p>Please complete the offer first.</p>');
        }

        // Generate Code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to Firebase
        await db.collection('generated_codes').add({
            code: code,
            linkId: linkId,
            timestamp: new Date(),
            status: "Completed"
        });

        // Clear the cookie so it can't be reused
        res.clearCookie(`started_${linkId}`);

        res.send(`
            <div style="text-align:center; margin-top:50px; font-family: sans-serif;">
                <h1>Success!</h1>
                <h2 style="color: green;">Your Code: ${code}</h2>
                <p>You have successfully completed the offer.</p>
            </div>
        `);
    } catch (error) {
        res.status(500).send('Server Error!');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
