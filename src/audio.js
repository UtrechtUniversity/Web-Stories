import {logError, updateDebugStats} from "./main.js";
import {LocationList} from "./classes.js";

/*
TRACKS refer to audio files that play in the background
and that are tied to a location.

SOUNDS refer to sound effects that can be triggered.

Tracks and sounds have the following parameters:
sound.filename
sound.howl (is a Howl object)
*/

let soundMuted = false;
let allTracks = [];
let allSounds = [];
let currentTrack = {
    filename: "no_sound"
};
let isPlayingAudio = false;
let fadeTime = 1000;

const fadeSoundIn = function () {

    currentTrack.howl.volume(0);
    currentTrack.howl.play();
    currentTrack.howl.fade(0, 1, fadeTime);

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

        thisTrack.howl.fade(1, 0, fadeTime);
        setTimeout(function () {

            thisTrack.howl.pause();
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
        currentTrack.howl.play();
    }

    $("#soundInfo").text("track changed: " + newTrack.filename);

    console.log("Starting playback for " + currentTrack.filename);

    if (
        !soundMuted && prevTrack.filename !== newTrack.filename &&
        prevTrack.filename !== "no_sound"
    ) {
        // There's a track playing and we need to crossfade into the new one
        prevTrack.howl.fade(1, 0, fadeTime);
        currentTrack.howl.fade(0, 1, fadeTime);

        setTimeout(function () {
            prevTrack.howl.pause();
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

                if (track.howl.state() === "unloaded") {
                    track.howl.load();
                    track.howl.once("load", function () {
                        playTrack(track);
                    });
                } else if (track.howl.state() === "loading") {
                    track.howl.once("load", function () {
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
        let track = "";

        if (loc.locSnd !== "no_sound") {

            let exists = false;
            let i = 0;

            while (i < allTracks.length) {
                track = allTracks[i];

                if (track.filename === loc.locSnd) {
                    exists = true;
                    break;
                }

                i += 1;
            }

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
            if (currentTrack.howl.state() === "loaded") {
                fadeSoundIn();
            } else {
                currentTrack.howl.load();
                currentTrack.howl.once("load", function () {
                    fadeSoundIn();
                });
            }

        }
        $("#soundBtn").removeClass("sound_off");
        $("#soundBtn").addClass("sound_on");

    } else {
        // Mute
        soundMuted = true;
        if (currentTrack.filename !== "no_sound") {
            fadeSoundOut();
        }
        $("#soundBtn").removeClass("sound_on");
        $("#soundBtn").addClass("sound_off");
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
        i += 1;
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

const loadSound = function (url) {
    // 1 Check if the sound already exists in allSounds
    let found = false;
    let sound = "";
    let soundIndex;
    let j = 0;

    while (j < allSounds.length) {
        sound = allSounds[j];

        if (sound.filename === url) {
            // It exists, so just return its index number
            found = true;
            soundIndex = j;
            break;
        }

        j += 1;
    }

    // 2 If not, then create a new sound object
    if (!found) {
        let extPattern = /(?:\.([^.]+))?$/;
        let ext = extPattern.exec(url)[1];
        if (
            // Need better validation of actual MIME-types, not just extension
            ext !== undefined && (ext === "mp3" || ext === "wav" ||
            ext === "ogg" || ext === "aac" || ext === "flac")
        ) {
            let newSoundObj = {};
            newSoundObj.filename = url;
            newSoundObj.howl = createSoundObj(url, true);

            if (newSoundObj.howl instanceof Howl) {
                allSounds.push(newSoundObj);

                /* If no sound was found then j will have the same
                value as allSounds.length, which will correspond to the index
                our newly created sound will get */
                soundIndex = j;
            } else {
                // Something went wrong
                logError("could not create new Howl sound object");
                soundIndex = -1;
            }
        } else {
            logError("soundfile format not supported");
            soundIndex = -1;
        }
    }

    // 3 Return index nr
    return soundIndex;
};

const playSound = function (i) {
    if (!soundMuted && allSounds[i] !== undefined) {
        allSounds[i].howl.play();
    }
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
    createSoundObj,
    loadSound,
    playSound
};