const express = require('express');
const authController = require('./Controllers/authController');
const userController = require('./Controllers/userController');
const fetchController = require('./Controllers/fetchController');
const torrentController = require('./Controllers/torrentController');
const { catchErrors } = require('./Handlers/errorHandlers');

const router = express.Router();

router.get('/', (req, res) => {
	const user = req.user || null;
	res.render('home', { title: 'Home', user });
});

router.get('/torrent', (req, res) => {
	res.render('torrent', { title: 'torrent' });
});

router.post('/torrent/AddMagnetLink', (req, res) => {
	torrentController.addTorrentUrlToQueue(req.body.magnet);
	res.render('torrent', { title: 'torrent' });
});

router.post('/torrent/getTorrentInfo', (req, res) => {
	torrentController.getTorrentInformations(req.body.id);
	res.render('torrent', { title: 'torrent' });
});

// Local Auth and Registration
router.post('/register/local',
	userController.validateData,
	userController.registerUser,
	authController.loginNoRedirect);
router.post('/login/local', authController.loginNoRedirect);

// Google Auth and Registration
router.get('/login/google', authController.loginGoogle);
router.get('/login/google/cb', authController.loginGoogleCb);

// 42 Auth and Registration
router.get('/login/42', authController.login42);
router.get('/login/42/cb', authController.login42Cb);
router.get('/logout', authController.logout);

router.get('/login/hasAccount', catchErrors(authController.hasAccount));

// Fetchers
router.get('/fetch', fetchController.fetchArchive);

// Export Routes
module.exports = router;
