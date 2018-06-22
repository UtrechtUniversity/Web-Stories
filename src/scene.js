import {change, checkConditions, enterLocation, player, updateDebugStats}
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

let sceneChanged = false;
let cList = {};

const recordSceneChange = function () {
    /* To keep track of when a scene has triggered the start of another
    scene (in a consequence) */
    sceneChanged = true;
};

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

const advanceScene = function (c) {
    /* This function runs every time when a player clicks a button during a
    scene. c = the choice the player has just made */
    let responseList;
    let responseFound = false;
    let responseMsgFound = false;
    let selectedResponse;
    updateDebugStats();

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

    // ===============RESPONSES===============
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
                    Conditions of this response are met: use this one
                    ELSE proceed with next response to see if that one meets
                    the conditions
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
                replaceById("text", parse(selectedResponse.response), 0, player.locationNext);
            }, fadeTime);

            if (
                typeof selectedResponse.response === "string" &&
                selectedResponse.response !== ""
            ) {
                responseMsgFound = true;
            }
        }
    }

    // Run consequences of choice
    if (c !== "start") {
        /* Every item in the consequences list is an object with a type,
        obj and amnt, and sometimes feedback. */
        let changeArray = cList[c].consequences;
        change(changeArray);
    }

    updateDebugStats();

    /*
    We don't want the code below to run if consequences have triggered a new
    scene or location! The if-statement makes sure that the location is only
    changed when we go from player.location inScene to another one. This is
    necessary, because INSIDE a scene the location can also be changed through
    the changeLoc consequence. After the changeLoc this code below will also
    still run, thus entering a location twice (and thereby erasing the feedback
    message) Apart from that: a consequence can also be that a new scene has
    been triggered. Once that scene ends this code will again, run. So we have
    to prevent entering the next location when either the location or scene has
    been changed which is what scene.changeLoc is for.
    */
    if (
        player.location !== player.locationNext && !sceneChanged &&
        player.inScene
    ) {

        if (responseFound) {
            let newChoices = selectedResponse.newChoices;
            let choiceCount = newChoices.length;

            if (choiceCount === 0 && responseMsgFound) {

                // There are no follow-ups, but we want a "continue" button
                let newLocName = player.locationNext;

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

        } else {
            // No responses: go to location
            /*
            setTimeout(function () {
                fadeIn("container");
            }, fadeTime);
            */

            let playerLocRef = LocationList.get(player.location);

            if (playerLocRef.name === "In scene") {
                enterLocation(player.locationNext);
            }
        }

    }
};

const startScene = function (newCList) {

    player.setLocation("locScene");
    player.setInObject(false);

    cList = newCList;
    sceneChanged = false;

    advanceScene("start");

};

export default "loaded";
export {
    sceneChanged,
    recordSceneChange,
    disableChoice,
    startScene,
    advanceScene
};