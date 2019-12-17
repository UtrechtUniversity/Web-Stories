import {change, checkConditions, requestLocChange, player, updateDebugStats}
    from "./main.js";
import {
    fadeIn,
    fadeOut,
    fadeTime,
    replaceById
} from "./display.js";
import {
    addToButtonQueue,
    createButtons,
    hideMenu,
    menuActive
} from "./menu.js";
import {LocationList} from "./classes.js";
import {parse} from "./parse.js";

/* The scene system is the only system that doesn't use a queue-system
for stacking jobs, because every button in a scene gets a "once" event
handler, which makes it impossible for the player to trigger multiple
events at once by clicking rapidly. */

let cList = {};

const disableChoice = function (c) {
    if (
        cList[c].enabled !== undefined &&
        typeof cList[c].enabled === "boolean"
    ) {
        cList[c].enabled = false;
        return true;
    } else {
        console.log("Error: scene.js/disableChoice: choice not found");
        return false;
    }
};

const advanceScene = function (c, reload) {
    /* This function runs every time a player clicks a button during a
    scene. c = the choice the player has just made. */

    let responseList;
    let responseFound = false;
    let responseMsgFound = false;
    let selectedResponse;
    let thisEventID = player.eventID;
    updateDebugStats();

    if (typeof(Storage) !== "undefined") {
        // Save where we are
        localStorage.setItem("scene", c);
    }

    if (menuActive) {
        /*
        Hide menu BEFORE changing player.inScene value, because else you
        will stay inside the object and then you won't return to the correct
        location afterwards...
        */
        hideMenu();
    }

    player.inScene = true;
    updateDebugStats();
    fadeOut("text");
    fadeOut("choices");

    /* CONSEQUENCES
    Every item in the consequences list is an object with a type,
    obj and amnt, and sometimes feedback.
    Don't run consequences if this particular choice has already
    been displayed before. This is the case when a player stops
    in the middle of a scene and continues their playthrough later */
    if (!reload) {
        let changeArray = cList[c].consequences;
        change(changeArray);
    }

    /* Consequences might have triggered a scene or location change!
    Do not proceed if any of that happened. Check is done by recording
    the eventID in thisEventID at the beginning of this function. */
    if (player.eventID === thisEventID) {

        // RESPONSES
        responseList = cList[c].responses;

        if (responseList.length > 0) {

            // Check every response to see if it meets the conditions
            let j = 0;
            let cond;

            while (j < responseList.length && !responseFound) {

                cond = responseList[j].conditions;

                if (cond !== undefined) {
                    if (checkConditions(cond, false)) {
                        /*
                        When conditions of this response are met: use this
                        response, ELSE proceed with next response to see if
                        that one meets the conditions
                        */
                        selectedResponse = responseList[j];
                        responseFound = true;
                    }
                } else {
                    // No conditions for this response, so we can use it.
                    responseFound = true;
                }
                j += 1;
            }

            if (responseFound) {
                // Print the response on screen
                setTimeout(function () {
                    replaceById(
                        "text",
                        parse(selectedResponse.response),
                        0,
                        player.currentLoc
                    );
                }, fadeTime);

                if (
                    typeof selectedResponse.response === "string" &&
                    selectedResponse.response !== ""
                ) {
                    responseMsgFound = true;
                }

                let newChoices = selectedResponse.newChoices;
                let choiceCount = newChoices.length;

                if (choiceCount === 0 && responseMsgFound) {

                    // There are no follow-ups, but we want a "continue" button
                    let newLocName = player.currentLoc;

                    addToButtonQueue(
                        "Continue",
                        newLocName,
                        "changeLoc",
                        newLocName
                    );

                    setTimeout(function () {
                        createButtons();
                    }, fadeTime);

                } else {

                    // There are responses and follow-ups
                    newChoices.forEach(function (nextChoice) {
                        if (cList[nextChoice].enabled) {
                            addToButtonQueue(
                                cList[nextChoice].choice,
                                nextChoice,
                                "advanceScene",
                                nextChoice
                            );
                        }
                    });

                    setTimeout(function () {
                        createButtons();
                    }, fadeTime);
                }

                setTimeout(function () {
                    fadeIn("text");
                    fadeIn("choices");
                }, fadeTime);
            }
        }

        if (responseList.length < 1 || !responseFound) {
            // No responses: go to location
            let playerLocRef = LocationList.get(player.currentSpace);
            if (playerLocRef.name === "In scene") {
                requestLocChange(player.currentLoc);
            }
        }
    }
};

const startScene = function (newCList, startChoice) {
    let reloading = false;
    if (startChoice !== "start") {
        // Resuming a previous scene
        reloading = true;
    } else {
        // Starting a new scene
        player.setLocation("locScene");
    }

    player.setInObject(false);
    player.upEventID();
    cList = newCList;

    advanceScene(startChoice, reloading);
};

export default "loaded";
export {
    disableChoice,
    startScene,
    advanceScene
};