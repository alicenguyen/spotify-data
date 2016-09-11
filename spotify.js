'use strict';

require('dotenv').config();

const _ = require('underscore');
const async = require('async');
const request = require('superagent');
const Promise = require('bluebird');
const utils = require('./utils');


class Spotify {

    /**
     * Request authorization to access data
     */
    authorize() {
        let self = this;
        return new Promise((resolve, reject) => {
            const basicAuth = new Buffer(`${process.env.SPOTIFY_CLIENT}:${process.env.SPOTIFY_SECRET}`).toString('base64');
            request.post('https://accounts.spotify.com/api/token')
                .set({Authorization: `Basic ${basicAuth}`})
                .send('grant_type=client_credentials')
                .end((err, res) => {
                    if (err) return reject(err);
                    self.accessToken = res.body.access_token;
                    return resolve(res.body);
                });
        })
    }


    listPlaylists(userId) {
        let self = this;
        console.log(self)
        return new Promise((resolve, reject) => {
            request.get(`https://api.spotify.com/v1/users/${userId}/playlists`)
                .set({Authorization: `Bearer ${self.accessToken}`})
                .end((err, res) => {
                    if (err) return reject(err);
                    return resolve(res.body);
                });
        })
    }


    listPlaylistTracks(userId, playlistId) {
        let self = this;
        console.log(self)
        return new Promise((resolve, reject) => {
            request.get(`https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`)
                .set({Authorization: `Bearer ${self.accessToken}`})
                .end((err, res) => {
                    if (err) return reject(err);
                    return resolve(res.body);
                });
        })
    }

    listPlaylistArtists(userId, playlistId) {
        let self = this;
        return new Promise((resolve, reject) => {
            request.get(`https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`)
                .set({Authorization: `Bearer ${self.accessToken}`})
                .end((err, res) => {
                    if (err) return reject(err);
                    let artists = [];
                    res.body.items.forEach((item) => {
                        item.track.artists.forEach((artist) => {
                            artists.push(artist.id)
                        })
                    })
                    artists = _.uniq(artists);
                    return resolve(artists);
                });
        })
    }

    getPlaylistGenres(userId, playlistId) {
        return new Promise((resolve, reject) => {
            this.listPlaylistArtists(userId, playlistId)
                .then((artists) => {
                    let self = this;

                    let genres = [];
                    let artistSets = utils.breakDownBy(artists, 50);

                    async.each(artistSets, (artists, next) => {
                        let artistIds = artists.join(',');
                        let query = `ids=${artistIds}`;
                        request.get(`https://api.spotify.com/v1/artists?${query}`)
                            .set({Authorization: `Bearer ${self.accessToken}`})
                            .end((err, res) => {
                                if (err) next(err)
                                res.body.artists.forEach((item) => {
                                    item.genres.forEach((g) => {
                                        genres.push(g);
                                    })
                                })
                                next(null);
                            });
                    }, (err) => {
                        if (err) return reject(err);
                        genres = _.uniq(genres)
                        resolve(genres);
                    })
                }).catch(reject);
        })
    }


    getArchiveGenres(userId) {
        return new Promise((resolve, reject) => {
            async.waterfall([
                (next) => {
                    /* get users playlists */
                    this.listPlaylists(userId)
                        .then((res) => {
                            let playlists = [];
                            res.items.forEach((p) => {
                                const name = p.name;
                                if (name.indexOf('.2016') > -1) {
                                    const images = p.images;
                                    const id = p.id;
                                    playlists.push({name, id, images});
                                }
                            })
                            next(null, playlists);
                        }).catch(next);
                },
                (playlists, next) => {
                    let list = [];
                    async.each(playlists, (p, cb) => {
                        /* Get playlist genres */
                        this.getPlaylistGenres(userId, p.id)
                            .then((genres) => {
                                p.genres = genres;
                                list.push(p)
                                cb(null)
                            }).catch(cb)
                    }, (err) => {
                        if (err) return next(err);
                        next(null, list)
                    })
                }
            ], (err, playlists) => {
                if (err) reject(err);
                resolve(playlists);
            })
        })
    }

}

module.exports = Spotify;
