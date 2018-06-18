import {createSoundObj} from "./audio.js";
import {LocationList} from "./classes.js";
import {changeContainerClass, replaceById, fadeIn, fadeOut, fadeTime} from "./display.js";
import {enterLocation, player} from "./main.js";

const startCutscene = function (eventArray) {

    fadeOut("text", fadeTime);
    fadeOut("choices", fadeTime);

    // Preload all requirements (currently: only sounds)
    eventArray.forEach(function (event) {
        if (event.playSoundfile !== "no_sound") {

            let url = "story/audio/" + event.playSoundfile;

            // Store soundObj
            event.soundObj = createSoundObj(url, true);

        }
    });

    player.setLocation("locScene");
    player.setInObject(false);

    // Wait for fadeOuts to end
    setTimeout(function () {
        // Lets start with an empty page
        $("#text").html("");
        $("#choices").html("");
        fadeIn("text", 0);
        fadeIn("choices", 0);
        changeContainerClass(player.locationNext);
        triggerEvent(eventArray[0], eventArray);
    }, fadeTime);
};

const triggerEvent = function (event, eventArray) {
    // This function runs for every event in a scene

    let id = "event_" + eventArray.indexOf(event);
    let totalDuration = event.duration + event.inAnim;

    // 1. Play sound if specified
    if (event.playSoundfile !== "no_sound") {
        event.soundObj.play();
    }

    // 2. Either add or replace text
    if (event.type === "add") {
        // Add
        if (event.inAnim >= 0) {
            // Fade in
            $("<div id=\"" + id +
            "\" class=\"cutscene\">" +
            event.sectionHTML + "</div>").appendTo("#text").hide();

            $("#" + id).fadeIn(event.inAnim);
        }
    } else {
        // Replace
        let replaceWithHTML = "<div id=\"" + id +
        "\" class=\"cutscene\">" +
        event.sectionHTML + "</div>";

        if (event.inAnim > 0) {
            // Fade in, replaceById will handle this for us
            replaceById("text", replaceWithHTML, event.inAnim);

            /* We add the inAnim duration a second time to the total
            duration,because with a replace this duration is used for a fadeOut
            AND fadeIN, which are done in replaceById. */
            totalDuration += event.inAnim;
        } else {
            // Instant pop-in
            $("#text").html(replaceWithHTML);
        }
    }

    setTimeout(function () {
        /* When it ends:
        1. Check if it needs to disappear (outAnim value of 0)
        or fade out (outAnim value > 0) or stay on screen (value -1) */

        if (event.outAnim > 0) {
            console.log("start fading out " + id + " right meow!");
            $("#" + id).fadeOut(event.outAnim);
        } else if (event.outAnim === 0) {
            // Just get rid of it
            $("#" + id).remove();
        }

        // 2. If there is an onEnd specified: execute it
        if (event.onEnd === "fadeOutAll") {
            replaceById("text", "", fadeTime);
        }

        /* 3. Wait for fades to end, then fire next one in line, or if this
           is the last one, then enterLocation. */
        setTimeout (function () {
            let currentIndex = eventArray.indexOf(event);
            let lastIndex = eventArray.length - 1;
            if (currentIndex < lastIndex) {
                let nextIndex = currentIndex + 1;
                triggerEvent(eventArray[nextIndex], eventArray);
            } else {
                // Last one: go to location
                let playerLocRef = LocationList.get(player.location);

                if (playerLocRef.name === "In scene") {
                    enterLocation(player.locationNext);
                }
            }
        }, event.outAnim);

    }, totalDuration);
};

export default "loaded";
export {startCutscene};