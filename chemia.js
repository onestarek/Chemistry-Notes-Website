require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path')
const https = require('https');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const multer = require('multer');
const app = express();
const cors = require('cors');
const mysql = require('mysql')

const privateKey = fs.readFileSync(process.env.privateKey, 'utf8');
const certificate = fs.readFileSync(process.env.certificate, 'utf8');

const credentials = { key: privateKey, cert: certificate };

const resetSessions = () => {
    app.use(async (req, res, next) => {
        try {
            await new Promise((resolve, reject) => {
                req.session.destroy(err => {
                    if (err) {
                        console.error("Error destroying session: ", err);
                        return reject(err);
                    }
                    console.log('Wylogowano ' + new Date())
                    resolve();
                });
            });

            await new Promise((resolve, reject) => {
                req.logout(err => {
                    if (err) {
                        console.error("Error logging out: ", err);
                        return reject(err);
                    }
                    console.log('Wylogowano ' + new Date())
                    resolve();
                });
            });

            res.redirect('/');
        } catch (err) {
            next(err);
        }
    });
};


const getTimeUntilNextFullHourUTC = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCMinutes(0, 0, 0);
    nextHour.setUTCHours(now.getUTCHours() + 1);

    return nextHour - now;
};

const scheduleSessionReset = () => {
    const timeUntilNextHour = getTimeUntilNextFullHourUTC();
    setTimeout(() => {
        resetSessions();
        setInterval(resetSessions, 3600000);
    }, timeUntilNextHour);
};

const db = mysql.createConnection({
    host: process.env.ip,
    user: process.env.user,
    password: process.env.pass,
    database: process.env.db
});
db.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

function getUsersFromDatabase() {
    return new Promise((resolve, reject) => {
        const query = 'SELECT username, password, displayname FROM users';
        db.query(query, (err, results) => {
            if (err) {
                console.error("Błąd podczas pobierania użytkowników:", err);
                return reject(err);
            }
            resolve(results);
        });
    });
}

let users = [];

getUsersFromDatabase()
    .then(data => {
        users = data;
        console.log(users);
    })
    .catch(err => {
        console.error("Błąd:", err);
    });

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}
function mapClassToFolder(className) {
    const classMapping = {
        'I': 'klasaI',
        'II': 'klasaII',
        'III': 'klasaIII',
        'IV': 'klasaIV'
    };
    return classMapping[className] || 'unknownClass';
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const classDir = mapClassToFolder(req.body.class);
        const scopeDir = req.body.scope === 'Podstawowy' ? 'podstawa' : 'rozszerzenie';
        const uploadPath = path.join(__dirname, 'public', 'files', scopeDir, classDir);

        fs.mkdir(uploadPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Błąd tworzenia folderu:', err);
                cb(err);
            } else {
                cb(null, uploadPath);
            }
        });
    },
    filename: function (req, file, cb) {
        const sanitizedTitle = req.body.title.replace(/[^a-zA-Z0-9-_]/g, '');
        cb(null, `${sanitizedTitle}.pdf`);
    }
});

const upload = multer({ storage: storage });

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 3600000
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.json());
app.use(cors({
    origin: process.env.ORIGIN
}));

scheduleSessionReset();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/pages/main.html');
});
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.user = { username: user.username, displayname: user.displayname };
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Niepoprawny login lub hasło!' });
    }
});

app.get('/admin-panel', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/pages/admin-panel.html');
});

app.post('/admin-panel/user-info', isAuthenticated, (req, res) => {
    if (req.session && req.session.user) {
        res.json({ username: req.session.user.username, displayname: req.session.user.displayname });
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

app.post('/admin-panel/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, message: 'Błąd przy dodawaniu pliku.' });
    }
});
app.post('/admin-panel/delete', (req, res) => {
    const { filePath } = req.body;

    if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    const fullPath = path.join(__dirname, 'public', filePath);

    fs.unlink(fullPath, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).json({ success: false, message: 'Error deleting file' });
        }

        res.json({ success: true, message: 'File deleted' });
    });
});

app.get('/api/files', (req, res) => {
    const baseDir = path.join(__dirname, 'public', 'files');
    const scopes = ['podstawa', 'rozszerzenie'];

    let result = { success: true, scopes: [] };

    scopes.forEach(scope => {
        const scopePath = path.join(baseDir, scope);
        const classes = fs.readdirSync(scopePath).filter(classDir => fs.lstatSync(path.join(scopePath, classDir)).isDirectory());

        let scopeObj = { scopeName: scope, classes: [] };

        classes.forEach(className => {
            const classPath = path.join(scopePath, className);
            const files = fs.readdirSync(classPath).filter(file => fs.lstatSync(path.join(classPath, file)).isFile());

            let fileDetails = files.map(file => {
                const filePath = path.join(classPath, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    lastModified: stats.mtime
                };
            });

            scopeObj.classes.push({ className, files: fileDetails });
        });

        result.scopes.push(scopeObj);
    });

    res.json(result);
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Błąd podczas wylogowywania!' });
        }
        res.redirect('/');
    });
});

app.use((req, res, next) => {
    res.status(404).send("Sorry, can't find that!");
});

const httpsServer = https.createServer(credentials, app);
httpsServer.listen(4555, () => {
    console.log('Serwer uruchomiony na porcie 4555.');
});
