import {replaceById} from "./display.js";
import {updateDebugStats} from "./main.js";
import {LocationList} from "./classes.js";

/*
Tracks have the following format:
track.filename
track.sound (is a Howl object)
*/

let soundMuted = false;
let allTracks = [];
let currentTrack = {
    filename: "no_sound"
};
let isPlayingAudio = false;
let fadeTime = 1000;

const fadeSoundIn = function () {

    currentTrack.sound.volume(0);
    currentTrack.sound.play();
    currentTrack.sound.fade(0, 1, fadeTime);

    $("#soundInfo").text("playing " + currentTrack.filename);

    isPlayingAudio = true;

};

const fadeSoundOut = function () {
    /* thisTrack prevents weird behaviour
    in the setTimeout, because currentTrack
    can be something completely different
    once it passes */
    let thisTrack = currentTrack;

    $("#soundInfo").text("fading out");

    if (thisTrack.filename !== "no_sound") {

        thisTrack.sound.fade(1, 0, fadeTime);
        setTimeout(function () {

            thisTrack.sound.pause();
            $("#soundInfo").text("playback paused");
        }, fadeTime);
    }

    isPlayingAudio = false;
};

const playTrack = function (newTrack) {

    // This function assumes the track has been loaded!

    let prevTrack = currentTrack;
    currentTrack = newTrack;
    if (!soundMuted) {
        currentTrack.sound.play();
    }

    $("#soundInfo").text("track changed: " + newTrack.filename);

    console.log("Starting playback for " + currentTrack.filename);

    if (
        !soundMuted && prevTrack.filename !== newTrack.filename &&
        prevTrack.filename !== "no_sound"
    ) {
        // There's a track playing and we need to crossfade into the new one
        prevTrack.sound.fade(1, 0, fadeTime);
        currentTrack.sound.fade(0, 1, fadeTime);

        setTimeout(function () {
            prevTrack.sound.pause();
        }, 2000);

    } else if (
        !soundMuted && prevTrack.filename !== newTrack.filename &&
        prevTrack.filename === "no_sound"
    ) {
        // No track is playing, so just fade in.
        $("#soundInfo").text("fade in");

        fadeSoundIn();
    } else if (soundMuted && prevTrack.filename !== newTrack.filename) {

       $("#soundInfo").text("sound is muted, only updated currentTrack");

    }

};

const changeTrack = function (newSnd) {
    /* newSnd contains the filename from the
    soundfile as set in locations.js */
    if (newSnd !== currentTrack.filename) {

        if (newSnd !== "no_sound") {
            // First find the track in allTracks
            let found = false;
            let trackNr;
            let i = 0;

            while (i < allTracks.length && !found) {
                if (allTracks[i].filename === newSnd) {
                    found = true;
                    trackNr = i;
                }
                i += 1;
            }

            if (found && !soundMuted) {
                let track = allTracks[trackNr];

                if (track.sound.state() === "unloaded") {
                    track.sound.load();
                    track.sound.once("load", function () {
                        playTrack(track);
                    });
                } else if (track.sound.state() === "loading") {
                    track.sound.once("load", function () {
                        playTrack(track);
                    });
                } else {
                    playTrack(track);
                }
            } else if (found && soundMuted) {
                // Only update currentTrack
                currentTrack = allTracks[trackNr];
            }

        } else {
            /* Just stop playing the current track if the new location
            has "no_sound", unless sound was muted already! */

            if (!soundMuted) {
                fadeSoundOut(currentTrack);
            }

            // Wait until fade out is complete before changing the currentTrack
            setTimeout(function () {
                currentTrack = {
                    filename: "no_sound",
                    audioElement: null
                };
                updateDebugStats();
                $("#soundInfo").text("playback stopped");
            }, fadeTime);
        }
    }
};

const initAudio = function (preloadAudio) {
    /* This function takes all soundfiles from the locations, creates
    Howler objects for every sound, preloads the ones from preLoadAudio,
    and then puts the audio objects in the allTracks array*/
    LocationList.forEach(function (loc) {

        let toPreload = false;

        if (loc.locSnd !== "no_sound") {

            let exists = false;

            allTracks.forEach(function (track) {
                if (track.filename === loc.locSnd) {
                    exists = true;
                }
            });

            // In case it doesn't: create Howl object and add it to the list
            if (!exists) {
                let url = "story/audio/" + loc.locSnd;

                /* Check if preLoadAudio contains this url, and if so: have it
                preload, unless sound is muted */
                if (!soundMuted) {
                    preloadAudio.forEach(function (preloadFile) {
                        preloadFile = "story/audio/" + preloadFile;
                        if (url === preloadFile) {
                            toPreload = true;
                            console.log ("Preloading " + url);
                        }
                    });
                }

                let sound = new Howl({
                    src: [url],
                    loop: true,
                    volume: 0,
                    preload: toPreload
                });

                let newTrack = {
                    filename: loc.locSnd,
                    sound: sound
                };
                allTracks.push(newTrack);
            }
        }
    });
};

const muteSound = function () {
    // This works as a switch
    if (soundMuted) {
        // Unmute
        soundMuted = false;
        if (currentTrack.filename !== "no_sound") {
            if (currentTrack.sound.state() === "loaded") {
                fadeSoundIn();
            } else {
                currentTrack.sound.load();
                currentTrack.sound.once("load", function () {
                    fadeSoundIn();
                });
            }

        }
        $("#muteButton").removeClass("off");
        $("#muteButton").addClass("on");

    } else {
        // Mute
        soundMuted = true;
        if (currentTrack.filename !== "no_sound") {
            fadeSoundOut();
        }
        $("#muteButton").removeClass("on");
        $("#muteButton").addClass("off");
    }
};

const setAudioFadeTime = function (newFadeTime) {
    if (typeof newFadeTime === "number" && newFadeTime >= 0) {
        fadeTime = newFadeTime;
    }
};

const setCurrentTrack = function (track) {
    currentTrack = track;
    isPlayingAudio = true;
    $("#soundInfo").text("playing: " + currentTrack.filename);
};

const getAudioTrack = function (filename) {
    let found = false;
    let trackNr;
    let i = 0;

    while (i < allTracks.length && !found) {
        if (allTracks[i].filename === filename) {
            found = true;
            trackNr = i;
        }
    }

    if (found) {
        let track = allTracks[trackNr];
        return track;
    } else {
        return null;
    }
};

const createSoundObj = function (url, toPreload) {

    if (soundMuted) {
        // Override toPreload parameter when sound is muted
        toPreload = false;
    }

    return new Howl({
        src: [url],
        loop: false,
        volume: 1,
        preload: toPreload
    });

};

export default "loaded";
export {
    isPlayingAudio,
    changeTrack,
    initAudio,
    muteSound,
    setAudioFadeTime,
    setCurrentTrack,
    soundMuted,
    getAudioTrack,
    createSoundObj
};