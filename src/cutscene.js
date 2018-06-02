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

    // 1. Play sound if specified
    if (event.playSoundfile !== "no_sound") {
        event.soundObj.play();
    }

    // 2. Either add or replace text
    if (event.type === "add") {
        // Add
        if (event.inAnim === "fade") {
            // Fade in

            $("<div id=\"" + id +
            "\" class=\"cutscene\">" +
            event.sectionHTML + "</div>").appendTo("#text").hide();

            $("#" + id).fadeIn(500);


        } else {
            // Instant pop-in
            $("#text").append("<div id=\"" + id + "\" class=\"cutscene\">" + event.sectionHTML +
            "</div>");
        }

    } else {
        // Replace
        if (event.inAnim === "fade") {
            // Fade in, replaceById will handle this for us
            replaceById("text", event.sectionHTML, fadeTime);
        } else {
            // Instant pop-in
            $("#text").html(event.sectionHTML);
        }
    }

    setTimeout(function () {
        /* When it ends:
        1. Check if it needs to disappear or fade out
            or stay onscreen (persist) */

        if (event.outAnim === "fade" && event.outAnim !== "persist") {
            $("#" + id).fadeOut(500);

        } else if (event.outAnim !== "fade" && event.outAnim !== "persist") {
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
        }, fadeTime * 2);

    }, event.duration);
};

export default "loaded";
export {startCutscene};