const express = require('express');
const admin = require('firebase-admin');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cookieParser());

// Firebase Initialize (Render को Environment Variable बाट)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// युजरको लागि Redirect र Code Verify रुट
app.get('/verify/:linkId', async (req, res) => {
    try {
        const linkId = req.params.linkId;
        
        // १. फायरबेसबाट एडमिनले राखेको लिङ्क तान्ने
        const doc = await db.collection('links').doc(linkId).get();
        
        if (!doc.exists) {
            return res.status(404).send('<h1>लिङ्क सेट गरिएको छैन!</h1>');
        }

        const data = doc.data(); 
        const sessionId = req.cookies.sessionId || uuidv4();
        res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 86400000 });

        // २. यूनिक कोड जेनेरेट गर्ने (हरेक पटक नयाँ)
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // ३. कोड र ट्रयाकिङ डेटा फायरबेसमा सेभ गर्ने
        await db.collection('generated_codes').add({
            code: code,
            sessionId: sessionId,
            linkId: linkId,
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        // ४. युजरलाई कोड देखाउने
        res.send(`
            <div style="text-align:center; margin-top:50px; font-family: sans-serif;">
                <h1>सफलतापूर्वक पूरा भयो!</h1>
                <h2 style="color: blue;">तपाईंको कोड: ${code}</h2>
                <p>यो कोड आफ्नो एपमा कपि गर्नुहोस्।</p>
                <a href="${data.url}">
                    <button style="padding:15px 30px; font-size:20px; cursor:pointer;">URL मा जानुहोस्</button>
                </a>
            </div>
        `);

    } catch (error) {
        console.error(error);
        res.status(500).send('सर्भरमा समस्या आयो!');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  
