'use strict';

const expect = require('chai').expect;
const Spotify = require('../spotify')

const PLAYLIST_ID =  '5kwoz8LrXIoCI6NxS2oL9c'
const USER_ID = 'nimkus';
describe('test.spotify', function () {

let spotify;
    it('should authorize', (done)=> {
        spotify = new Spotify();
        spotify.authorize()
            .then((res)=> {
                console.log(res)
                done();
            })
            .catch((err)=>{
                console.log(err)
                done(err);
            })
    });

    it('should list users playlists', (done)=> {
        spotify.listPlaylists(USER_ID)
            .then((res)=> {
                done();
            })
            .catch((err)=>{
                console.log(err)
                done(err);
            })
    });

    it('should list tracks of a playlist', (done)=> {
        spotify.listPlaylistTracks(USER_ID, PLAYLIST_ID)
            .then((res)=> {
                done();
            })
            .catch((err)=>{
                console.log(err)
                done(err);
            })
    });

    it('should list artists of a playlist', (done)=> {
        spotify.listPlaylistArtists(USER_ID, PLAYLIST_ID)
            .then((res)=> {
                done();
            })
            .catch((err)=>{
                console.log(err)
                done(err);
            })
    });
    it('should list genres of a playlist', (done)=> {
        spotify.getPlaylistGenres(USER_ID, PLAYLIST_ID)
            .then((res)=> {
                console.log(res);
                done();
            })
            .catch((err)=> {
                console.log(err)
                done(err);
            })
    })

    it('should list genres for all genres', (done)=> {
        spotify.getArchiveGenres(USER_ID)
            .then((res)=> {
                console.log(res);
                done();
            })
            .catch((err)=> {
                console.log(err)
                done(err);
            })
    })
});


