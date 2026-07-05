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

// १. अफर पेज (युजरले सुरुमा यहाँ आउँछन्)
app.get('/verify/:linkId', async (req, res) => {
    const linkId = req.params.linkId;
    const doc = await db.collection('links').doc(linkId).get();
    
    if (!doc.exists) return res.status(404).send('<h1>लिङ्क भेटिएन!</h1>');

    const data = doc.data();
    
    res.send(`
        <div style="text-align:center; margin-top:50px; font-family: sans-serif;">
            <h1>अफर पूरा गर्नुहोस्!</h1>
            <p>कृपया तलको बटन थिचेर अफर पूरा गर्नुहोस् र पछि यहाँ फर्केर 'भेरिफाई' बटन थिच्नुहोस्।</p>
            <a href="${data.url}" target="_blank">
                <button style="padding:15px 30px; font-size:20px; background:blue; color:white;">अफरमा जानुहोस्</button>
            </a>
            <br><br>
            <a href="/success/${linkId}">
                <button style="padding:10px 20px; font-size:16px; background:green; color:white;">काम पूरा भयो, कोड हेर्नुहोस्</button>
            </a>
        </div>
    `);
});

// २. सक्सेस पेज (यहाँ कोड जेनेरेट र सेभ हुन्छ)
app.get('/success/:linkId', async (req, res) => {
    try {
        const linkId = req.params.linkId;
        const sessionId = req.cookies.sessionId || uuidv4();
        res.cookie('sessionId', sessionId, { httpOnly: true, maxAge: 86400000 });

        // कोड जेनेरेट गर्ने
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Firebase मा सुरक्षित गर्ने (Admin ले यहाँबाट हेर्न सक्छन्)
        await db.collection('generated_codes').add({
            code: code,
            linkId: linkId,
            timestamp: new Date(),
            status: "Completed"
        });

        res.send(`
            <div style="text-align:center; margin-top:50px; font-family: sans-serif;">
                <h1>बधाई छ!</h1>
                <h2 style="color: green;">तपाईंको कोड: ${code}</h2>
                <p>यो कोड एडमिनलाई पठाइएको छ।</p>
            </div>
        `);
    } catch (error) {
        res.status(500).send('त्रुटि भयो!');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
