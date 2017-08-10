Transmission = require('transmission');
Path = require('path');

transmission = new Transmission({
	port: '9091',
	host: '127.0.0.1',
	username: '',
	password: '',
});

// Informations about deamon

function getTransmissionStats() {
	transmission.sessionStats();
}

// Controlling queue

exports.addTorrentUrlToQueue = (url) => {
	transmission.addUrl(url, {
		'download-dir': Path.join(__dirname, '../Downloads'),
	}, (err, result) => {
		if (err) {
			return console.log(err);
		}
		id = result.id;
		console.log('Just added a new torrent.');
		console.log(`Torrent ID: ${id}`);
		return id;
	});
};

exports.addTorrentFileToQueue = (file) => {
	transmission.addUrl(file, callback(err, result));
};

exports.removeTorrentFromQueue = (torrentId) => {
	transmission.remove(id, callback(err, result));
};

exports.startAllActiveTorrent = () => {
	transmission.active((err, result) => {
		if (err) {
			console.log(err);
		} else {
			for (i = 0; i < result.torrents.length; i + 1) {
				stopTorrents(result.torrents[i].id);
			}
		}
	});
};

exports.stopAllActiveTorrents = () => {
	transmission.active((err, result) => {
		if (err) {
			console.log(err);
		} else {
			for (i = 0; i < result.torrents.length; i + 1) {
				stopTorrents(result.torrents[i].id);
			}
		}
	});
};

// Controlling torrents

exports.startTorrent = (torrentId) => {
	transmission.start(torrentId, (err, result) => {});
};

exports.stopTorrent = (torrentId) => {
	transmission.stop(torrentId, (err, result) => {});
};

exports.getTorrentInformations = (torrentId) => {
	console.log('Getting infos');
	transmission.get(torrentId, callback = (err, result) => {
		console.log('Inside callback');
		console.log(result);
		if (err) {
			console.log('CALLBACK ERROR');
			throw err;
		}
		if (result.torrents.length > 0) {
			console.log('CALLBACK OK');
			console.log(result.torrents[0]);
			/*
			console.log('Name = ' + result.torrents[0].name);
			console.log('Download Rate = ' + result.torrents[0].rateDownload / 1000);
			console.log('Upload Rate = ' + result.torrents[0].rateUpload / 1000);
			console.log('Completed = ' + result.torrents[0].percentDone * 100);
			console.log('ETA = ' + result.torrents[0].eta / 3600);
			console.log('Status = ' + getStatusType(result.torrents[0].status));
			*/
		}
		console.log('END OF CALLBACK');
	});
};

exports.getAllActiveTorrents = () => {
	transmission.active(callback = (err, result) => {
		if (err) {
			console.log(err);
		} else {
			for (i = 0; i < result.torrents.length; i + 1) {
				console.log(result.torrents[i].id);
				console.log(result.torrents[i].name);
			}
		}
	});
};
